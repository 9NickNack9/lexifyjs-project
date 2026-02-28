import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { verify } from "otplib";
import { decryptMfaSecret } from "@/lib/crypto/mfaSecret";
import { generateRecoveryCodes } from "@/lib/crypto/recoveryCodes";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await req.json().catch(() => ({}));
  const token = String(code || "")
    .replace(/\D/g, "")
    .slice(0, 6);
  if (!token)
    return NextResponse.json({ error: "Missing code" }, { status: 400 });

  const userPkId = BigInt(session.userId);

  const row = await prisma.userAccount.findUnique({
    where: { userPkId },
    select: { twoFactorSecret: true },
  });

  if (!row?.twoFactorSecret) {
    return NextResponse.json(
      { error: "No MFA setup in progress" },
      { status: 400 },
    );
  }

  const secret = decryptMfaSecret(row.twoFactorSecret);

  const result = await verify({
    secret,
    token,
    window: 2, // tolerate small clock drift
  });

  if (!result.valid) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const { plaintext, stored } = generateRecoveryCodes(10);

  await prisma.userAccount.update({
    where: { userPkId },
    data: {
      twoFactorEnabled: true,
      twoFactorRecoveryCodes: stored,
    },
  });

  return NextResponse.json({
    twoFactorEnabled: true,
    recoveryCodes: plaintext,
  });
}
