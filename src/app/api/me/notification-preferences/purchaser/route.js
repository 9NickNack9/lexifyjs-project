// src/app/api/me/notification-preferences/purchaser/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// Normalize any historical value into a clean array of strings
function toStringArray(val) {
  // Already an array?
  if (Array.isArray(val)) return val.filter((v) => typeof v === "string");

  // JSON string?
  if (typeof val === "string") {
    // try to parse JSON
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        return parsed.filter((v) => typeof v === "string");
      }
      // non-array string content -> treat as single value
      return val ? [val] : [];
    } catch {
      // plain string, not JSON
      return val ? [val] : [];
    }
  }

  // Objects like Prisma.JsonObject -> not supported for this field; ignore
  return [];
}

// GET /api/me/notification-preferences/purchaser
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const row = await prisma.appUser.findUnique({
    where: { userId: BigInt(session.userId) },
    select: { notificationPreferences: true },
  });

  const prefs = toStringArray(row?.notificationPreferences);

  return NextResponse.json({ notificationPreferences: prefs });
}

// PATCH /api/me/notification-preferences/purchaser
// Body: { key: "no_offers" | "over_max_price" | "pending_offer_selection", enabled: boolean }
export async function PATCH(req) {
  const session = await getServerSession(authOptions);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  ]);
  if (!allowed.has(key) || typeof enabled !== "boolean") {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  // Load current and normalize
  const current = await prisma.appUser.findUnique({
    where: { userId: BigInt(session.userId) },
    select: { notificationPreferences: true },
  });

  const prev = toStringArray(current?.notificationPreferences);

  const next = enabled
    ? Array.from(new Set([...prev, key])) // add key once
    : prev.filter((k) => k !== key); // remove key

  // JSON column: write the array directly
  await prisma.appUser.update({
    where: { userId: BigInt(session.userId) },
    data: { notificationPreferences: next },
  });

  return NextResponse.json({ notificationPreferences: next });
}
