import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import {
  mintTrustedDeviceToken,
  hashTrustedDeviceToken,
} from "@/lib/crypto/trustedDevice";
import { headers } from "next/headers";

async function getClientIp() {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return h.get("x-real-ip") || null;
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userPkId = BigInt(session.userId);

  const token = mintTrustedDeviceToken();
  const tokenHash = hashTrustedDeviceToken(token);

  const h = await headers();
  const ua = h.get("user-agent") || null;
  const ip = await getClientIp();

  // e.g. trust for 30 days
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.trustedDevice.create({
    data: {
      userPkId,
      tokenHash,
      userAgent: ua,
      ip,
      expiresAt,
    },
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set("lexify_td", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return res;
}
