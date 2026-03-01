import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { notifyUserPasswordReset } from "@/lib/mailer";
import { headers } from "next/headers";

// Build absolute URL helper (Next dynamic APIs must be awaited)
async function absoluteUrl(req, path) {
  const h = await headers();
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

  // Find UserAccount by username OR email
  const user = await prisma.userAccount.findFirst({
    where: { OR: [{ username: raw }, { email: raw }] },
    select: { userPkId: true, email: true },
  });

  // Always respond 200 for privacy; only proceed if user exists
  if (user?.userPkId != null) {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.passwordResetTokenUser.create({
      data: {
        userId: BigInt(user.userPkId),
        token,
        expiresAt,
      },
    });

    const resetUrl = await absoluteUrl(
      req,
      `/reset-password/${encodeURIComponent(token)}`,
    );

    // Send to user email if valid; otherwise silently do nothing (still returns ok:true)
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const to =
      (user.email && EMAIL_RE.test(user.email) && user.email) ||
      (EMAIL_RE.test(raw) ? raw : null);

    if (to) {
      await notifyUserPasswordReset({ to, resetUrl });
    }
  }

  return NextResponse.json({ ok: true });
}
