import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = (body?.token || "").trim();
  const newPassword = (body?.newPassword || "").trim();

  if (!token || !newPassword) {
    return NextResponse.json(
      { error: "Missing token or password" },
      { status: 400 }
    );
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Password too short" }, { status: 400 });
  }

  const prt = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!prt || prt.usedAt || prt.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 400 }
    );
  }

  const hash = await bcrypt.hash(newPassword, 12);

  // Update password + mark token used (transaction)
  await prisma.$transaction([
    prisma.appUser.update({
      where: { userId: BigInt(prt.userId) },
      data: { passwordHash: hash },
    }),
    prisma.passwordResetToken.update({
      where: { token },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
