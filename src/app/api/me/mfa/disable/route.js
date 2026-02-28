import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { verify } from "otplib";
import { decryptMfaSecret } from "@/lib/crypto/mfaSecret";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await req.json().catch(() => ({}));
  const token = String(code || "").trim();
  if (!token)
    return NextResponse.json({ error: "Missing code" }, { status: 400 });

  const userPkId = BigInt(session.userId);

  const row = await prisma.userAccount.findUnique({
    where: { userPkId },
    select: { twoFactorEnabled: true, twoFactorSecret: true },
  });

  if (!row?.twoFactorEnabled || !row?.twoFactorSecret) {
    return NextResponse.json({ error: "MFA not enabled" }, { status: 400 });
  }

  const secret = decryptMfaSecret(row.twoFactorSecret);

  const result = await verify({
    secret,
    token,
    window: 1,
  });

  if (!result.valid) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  await prisma.userAccount.update({
    where: { userPkId },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  });

  return NextResponse.json({ twoFactorEnabled: false });
}
