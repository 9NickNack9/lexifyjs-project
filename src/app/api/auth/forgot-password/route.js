import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { notifyUserPasswordReset } from "@/lib/mailer";
import { headers } from "next/headers";

// Build absolute URL helper
function absoluteUrl(req, path) {
  const h = headers();
  const proto =
    h.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
  const host =
    h.get("x-forwarded-host") ?? h.get("host") ?? new URL(req.url).host;
  const runtimeBase = `${proto}://${host}`;
  const base = process.env.APP_ORIGIN || runtimeBase;
  return `${base}${path}`;
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = (body?.emailOrUsername || "").trim();
  if (!raw) return NextResponse.json({ ok: true }); // don't reveal user existence

  // Find user by username OR contactEmail (AppUser has no `email` field)
  const user = await prisma.appUser.findFirst({
    where: { OR: [{ username: raw }, { contactEmail: raw }] },
    select: {
      userId: true,
      contactEmail: true,
      companyContactPersons: true, // [{ firstName,lastName,email,telephone,position, ... }]
    },
  });

  // Always respond 200 for privacy; only proceed if user exists
  if (user?.userId != null) {
    const token = crypto.randomUUID(); // or randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.passwordResetToken.create({
      data: {
        userId: BigInt(user.userId),
        token,
        expiresAt,
      },
    });

    const resetUrl = absoluteUrl(
      req,
      `/reset-password/${encodeURIComponent(token)}`
    );

    // Pick recipient: prefer contactEmail; else first valid contact person email; else defer to mailer fallback
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const primary =
      (user.contactEmail &&
        EMAIL_RE.test(user.contactEmail) &&
        user.contactEmail) ||
      (Array.isArray(user.companyContactPersons)
        ? user.companyContactPersons.find((c) =>
            EMAIL_RE.test((c?.email || "").trim())
          )?.email || null
        : null) ||
      raw; // may be an email; mailer validates & falls back to support if invalid

    await notifyUserPasswordReset({ to: primary, resetUrl });
  }

  return NextResponse.json({ ok: true });
}
