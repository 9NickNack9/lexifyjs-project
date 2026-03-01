// src/app/api/me/notification-preferences/purchaser/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

function toStringArray(val) {
  if (Array.isArray(val)) return val.filter((v) => typeof v === "string");
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed))
        return parsed.filter((v) => typeof v === "string");
      return val ? [val] : [];
    } catch {
      return val ? [val] : [];
    }
  }
  return [];
}

function pickPrefs(row) {
  return toStringArray(row?.notificationPreferences);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await prisma.userAccount.findUnique({
    where: { userPkId: BigInt(session.userId) },
    select: {
      notificationPreferences: true,
    },
  });

  return NextResponse.json({ notificationPreferences: pickPrefs(row) });
}

export async function PATCH(req) {
  const session = await getServerSession(authOptions);
  if (!session?.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { key, enabled } = body || {};

  const allowed = new Set([
    "no_offers",
    "over_max_price",
    "pending_offer_selection",
    "all-notifications",
  ]);

  if (!allowed.has(key) || typeof enabled !== "boolean") {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const current = await prisma.userAccount.findUnique({
    where: { userPkId: BigInt(session.userId) },
    select: {
      notificationPreferences: true,
    },
  });

  const prev = pickPrefs(current);
  const next = enabled
    ? Array.from(new Set([...prev, key]))
    : prev.filter((k) => k !== key);

  // Write to the new field if present in your schema; if you *don’t* have it, switch to notificationPreferences.
  await prisma.userAccount.update({
    where: { userPkId: BigInt(session.userId) },
    data: { notificationPreferences: next },
  });

  return NextResponse.json({ notificationPreferences: next });
}
