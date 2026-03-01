import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// Normalize any historical value into a clean array of strings
function toStringArray(val) {
  if (Array.isArray(val)) return val.filter((v) => typeof v === "string");

  if (val && typeof val === "object") {
    if (Array.isArray(val.set))
      return val.set.filter((v) => typeof v === "string");
    if (Array.isArray(val.value))
      return val.value.filter((v) => typeof v === "string");
  }

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
  "all-notifications",
]);

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const row = await prisma.userAccount.findUnique({
    where: { userPkId: BigInt(session.userId) },
    select: {
      notificationPreferences: true,
    },
  });

  const prefs = toStringArray(row?.notificationPreferences);

  return NextResponse.json({ notificationPreferences: prefs });
}

export async function PATCH(req) {
  const session = await getServerSession(authOptions);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const { key, enabled } = body || {};
  if (!ALLOWED.has(key) || typeof enabled !== "boolean") {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const current = await prisma.userAccount.findUnique({
    where: { userPkId: BigInt(session.userId) },
    select: {
      notificationPreferences: true,
    },
  });

  const prev = toStringArray(current?.notificationPreferences);

  const next = enabled
    ? Array.from(new Set([...prev, key]))
    : prev.filter((k) => k !== key);

  // Write to practicalNotificationPreferences if available in your schema;
  // if not, swap this to notificationPreferences.
  await prisma.userAccount.update({
    where: { userPkId: BigInt(session.userId) },
    data: { notificationPreferences: next },
  });

  return NextResponse.json({ notificationPreferences: next });
}
