// src/app/api/me/notification-preferences/provider/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// Normalize any historical value into a clean array of strings
function toStringArray(val) {
  // Plain array: ["foo","bar"]
  if (Array.isArray(val)) return val.filter((v) => typeof v === "string");

  // Legacy scalar-list writes: { set: ["foo","bar"] } or { value: [...] }
  if (val && typeof val === "object") {
    if (Array.isArray(val.set))
      return val.set.filter((v) => typeof v === "string");
    if (Array.isArray(val.value))
      return val.value.filter((v) => typeof v === "string");
  }

  // String/JSON string: '["foo"]' or "foo"
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

const ALLOWED = new Set([
  "no-winning-offer",
  "winner-conflict-check",
  "request-cancelled",
  "new-available-request",
]);

// GET /api/me/notification-preferences/provider
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

// PATCH /api/me/notification-preferences/provider
// Body: { key: "no-winning-offer" | "winner-conflict-check" | "request-cancelled" | "new-available-request", enabled: boolean }
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
  if (!ALLOWED.has(key) || typeof enabled !== "boolean") {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  // Load current and normalize
  const current = await prisma.appUser.findUnique({
    where: { userId: BigInt(session.userId) },
    select: { notificationPreferences: true },
  });

  const prev = toStringArray(current?.notificationPreferences);

  const next = enabled
    ? Array.from(new Set([...prev, key])) // add
    : prev.filter((k) => k !== key); // remove

  // Json column -> write array directly
  await prisma.appUser.update({
    where: { userId: BigInt(session.userId) },
    data: { notificationPreferences: next },
  });

  return NextResponse.json({ notificationPreferences: next });
}
