import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions = {
  session: { strategy: "jwt" },

  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const user = await prisma.appUser.findUnique({
          where: { username: credentials.username },
          select: {
            userId: true,
            username: true,
            passwordHash: true, // ✅ correct field
            role: true, // "ADMIN" | "PROVIDER" | "PURCHASER"
            registerStatus: true, // "pending" | "approved" | ...
            companyName: true,
          },
        });

        if (!user) return null;

        const ok = await bcrypt.compare(
          credentials.password,
          user.passwordHash || ""
        );
        if (!ok) return null;

        // 🚫 Block non-admin users whose registration is pending
        if (user.registerStatus === "pending" && user.role !== "ADMIN") {
          // Make the client-side signIn(...) get res.error === "REGISTER_PENDING"
          throw new Error("REGISTER_PENDING");
        }

        // Return minimal identity used for the JWT
        return {
          id: String(user.userId), // NextAuth expects string
          name: user.username,
          role: user.role,
          registerStatus: user.registerStatus,
          companyName: user.companyName,
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
        token.companyName = user.companyName ?? null;
      }

      // Optional: keep token fresh if registerStatus can change server-side
      if (!token.registerStatus || !token.role) {
        try {
          const row = await prisma.appUser.findUnique({
            where: { userId: BigInt(token.sub) },
            select: { role: true, registerStatus: true },
          });
          if (row) {
            token.role = row.role;
            token.registerStatus = row.registerStatus;
          }
        } catch (error) {
          console.error("JWT refresh error:", error);
        }
      }

      return token;
    },

    async session({ session, token }) {
      session.userId = token.sub;
      session.role = token.role;
      session.registerStatus = token.registerStatus;
      session.companyName = token.companyName;
      // (optional) keep username in session.user.name if you need it
      return session;
    },

    // Optional but nice: after sign-in, route pending users to /register-screening
    async redirect({ url, baseUrl, token }) {
      // Keep absolute/relative handling the same as NextAuth default
      const isRelative = url.startsWith("/");
      const isSameOrigin = url.startsWith(baseUrl);

      // If pending and not ADMIN -> force screening page
      if (token?.registerStatus === "pending" && token?.role !== "ADMIN") {
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
