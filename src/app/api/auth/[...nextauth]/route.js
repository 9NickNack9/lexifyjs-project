import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { cookies, headers } from "next/headers";
import { hashTrustedDeviceToken } from "@/lib/crypto/trustedDevice";
import { verifyRecoveryCode } from "@/lib/crypto/recoveryCodes";

async function getClientIp() {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return h.get("x-real-ip") || null;
}

async function isRateLimited(username, ip, kind) {
  const since = new Date(Date.now() - 10 * 60 * 1000); // 10 min window

  const failures = await prisma.authAttempt.count({
    where: {
      username,
      kind,
      success: false,
      createdAt: { gte: since },
      ...(ip ? { ip } : {}),
    },
  });

  // tune to taste:
  // - 8 bad passwords per 10 min per IP+username
  // - 8 bad MFA codes per 10 min per IP+username
  return failures >= 8;
}

async function recordAttempt({ username, ip, kind, success }) {
  try {
    await prisma.authAttempt.create({ data: { username, ip, kind, success } });
  } catch {
    // swallow
  }
}

async function isTrustedDevice(userPkId) {
  const cookieStore = await cookies();
  const td = cookieStore.get("lexify_td")?.value;
  if (!td) return false;

  const tokenHash = hashTrustedDeviceToken(td);
  const row = await prisma.trustedDevice.findUnique({
    where: { tokenHash },
    select: { userPkId: true, expiresAt: true },
  });

  if (!row) return false;
  if (String(row.userPkId) !== String(userPkId)) return false;
  if (row.expiresAt.getTime() < Date.now()) return false;

  await prisma.trustedDevice.update({
    where: { tokenHash },
    data: { lastUsedAt: new Date() },
  });

  return true;
}

export const authOptions = {
  session: { strategy: "jwt" },

  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        const username = credentials?.username?.trim();
        const password = credentials?.password ?? "";
        const ip = await getClientIp();

        if (!username || !password) return null;

        if (await isRateLimited(username, ip, "PASSWORD")) {
          throw new Error("RATE_LIMIT");
        }

        // UserAccount + Company
        const user = await prisma.userAccount.findUnique({
          where: { username },
          select: {
            userPkId: true,
            username: true,
            firstName: true,
            lastName: true,
            passwordHash: true,
            role: true, // "ADMIN" | "PROVIDER" | "PURCHASER"
            companyId: true,
            registerStatus: true,
            twoFactorEnabled: true,
            twoFactorSecret: true,
            twoFactorRecoveryCodes: true,
            company: {
              select: {
                companyName: true,
                role: true, // CompanyRole if you ever need it
              },
            },
          },
        });

        if (!user) return null;

        const ok = await bcrypt.compare(password, user.passwordHash || "");
        if (!ok) {
          await recordAttempt({
            username,
            ip,
            kind: "PASSWORD",
            success: false,
          });
          return null;
        }
        await recordAttempt({ username, ip, kind: "PASSWORD", success: true });

        const registerStatus = String(
          user.registerStatus ?? "PENDING",
        ).toUpperCase();

        // Block non-admin users whose COMPANY registration is pending
        if (registerStatus === "PENDING" && user.role !== "ADMIN") {
          throw new Error("REGISTER_PENDING");
        }

        if (user.twoFactorEnabled) {
          const trusted = await isTrustedDevice(user.userPkId);

          if (!trusted) {
            const raw0 = String(credentials?.otp ?? "").trim();
            const raw = ["undefined", "null"].includes(raw0.toLowerCase())
              ? ""
              : raw0;

            if (!raw) throw new Error("MFA_REQUIRED");

            const asDigits = raw.replace(/\D/g, "").slice(0, 6);
            const isTotp = /^\d{6}$/.test(asDigits);

            if (isTotp) {
              const { verify } = await import("otplib");
              const { decryptMfaSecret } =
                await import("@/lib/crypto/mfaSecret");

              if (!user.twoFactorSecret) throw new Error("MFA_MISCONFIGURED");

              const secret = decryptMfaSecret(user.twoFactorSecret);

              try {
                const result = await verify({
                  secret,
                  token: asDigits,
                  window: 2,
                });
                if (!result.valid) throw new Error("MFA_INVALID");
              } catch {
                await recordAttempt({
                  username,
                  ip,
                  kind: "MFA",
                  success: false,
                });
                throw new Error("MFA_INVALID");
              }

              await recordAttempt({ username, ip, kind: "MFA", success: true });
            } else {
              // recovery code path
              const codes = user.twoFactorRecoveryCodes || [];
              const res = verifyRecoveryCode(raw, codes);

              if (!res.ok) {
                await recordAttempt({
                  username,
                  ip,
                  kind: "MFA",
                  success: false,
                });
                throw new Error("MFA_INVALID");
              }

              const updated = [...codes];
              updated[res.idx] = {
                ...updated[res.idx],
                usedAt: new Date().toISOString(),
              };

              await prisma.userAccount.update({
                where: { userPkId: user.userPkId },
                data: { twoFactorRecoveryCodes: updated },
              });

              await recordAttempt({ username, ip, kind: "MFA", success: true });
            }
          }
        }

        // Return minimal identity used for the JWT
        return {
          id: String(user.userPkId), // NextAuth expects string
          name: user.username,
          firstName: user.firstName ?? null,
          lastName: user.lastName ?? null,
          role: user.role,
          registerStatus,
          companyId: String(user.companyId),
          companyName: user.company?.companyName ?? null,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // On initial sign-in, copy from authorize()
      if (user) {
        token.role = user.role;
        token.registerStatus = user.registerStatus;
        token.companyId = user.companyId ?? null;
        token.companyName = user.companyName ?? null;
        token.firstName = user.firstName ?? null;
        token.lastName = user.lastName ?? null;
      }

      // Optional: keep token fresh if company registerStatus can change server-side
      if (!token.registerStatus || !token.role) {
        try {
          const userPkId = token.sub ? BigInt(token.sub) : null;
          if (userPkId) {
            const row = await prisma.userAccount.findUnique({
              where: { userPkId },
              select: {
                role: true,
                registerStatus: true,
                firstName: true,
                lastName: true,
                company: {
                  select: { companyName: true },
                },
                companyId: true,
              },
            });

            if (row) {
              token.role = row.role;
              token.registerStatus = String(
                row.registerStatus ?? token.registerStatus ?? "PENDING",
              ).toUpperCase();
              token.companyId = row.companyId
                ? String(row.companyId)
                : token.companyId;
              token.companyName = row.company?.companyName ?? token.companyName;
              token.firstName = row.firstName ?? token.firstName;
              token.lastName = row.lastName ?? token.lastName;
            }
          }
        } catch (error) {
          console.error("JWT refresh error:", error);
        }
      }

      return token;
    },

    async session({ session, token }) {
      session.userId = token.sub; // userPkId as string
      session.role = token.role;
      session.registerStatus = token.registerStatus;
      session.companyId = token.companyId ?? null;
      session.companyName = token.companyName ?? null;
      session.firstName = token.firstName ?? null;
      session.lastName = token.lastName ?? null;
      return session;
    },

    async redirect({ url, baseUrl, token }) {
      const isRelative = url.startsWith("/");
      const isSameOrigin = url.startsWith(baseUrl);

      if (
        String(token?.registerStatus ?? "").toUpperCase() === "PENDING" &&
        token?.role !== "ADMIN"
      ) {
        return `${baseUrl}/register-screening`;
      }

      if (isRelative) return `${baseUrl}${url}`;
      if (isSameOrigin) return url;
      return baseUrl;
    },
  },

  pages: {
    signIn: "/login",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
