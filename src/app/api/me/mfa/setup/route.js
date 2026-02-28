// src/app/api/me/mfa/setup/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { generateSecret, generateURI } from "otplib";
import QRCode from "qrcode";
import { encryptMfaSecret } from "@/lib/crypto/mfaSecret";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userPkId = BigInt(session.userId);

  // 1) Create a new secret each time setup is requested
  const issuer = "LEXIFY OY";
  const label = `LEXIFY:${session?.companyName || session?.userId}`;
  const secret = generateSecret(); // base32
  const otpauth = generateURI({
    secret,
    label, // e.g. "LEXIFY Oy"
    issuer, // e.g. "LEXIFY"
  });

  // 2) Store encrypted secret even before enabled (enabled=false means "not active")
  await prisma.userAccount.update({
    where: { userPkId },
    data: {
      twoFactorSecret: encryptMfaSecret(secret),
      twoFactorEnabled: false,
    },
  });

  // 3) QR as data URL for UI <img src="...">
  const qrDataUrl = await QRCode.toDataURL(otpauth);

  return NextResponse.json({
    qrDataUrl,
    otpauth,
  });
}
