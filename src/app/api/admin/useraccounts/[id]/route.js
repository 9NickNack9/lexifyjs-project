import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// BigInt-safe normalize
function normalize(obj) {
  return JSON.parse(
    JSON.stringify(obj, (_, v) => (typeof v === "bigint" ? String(v) : v)),
  );
}

export async function GET(_req, { params }) {
  const session = await requireAdmin();
  if (!session)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  let userPkId;
  try {
    userPkId = BigInt(id);
  } catch {
    return NextResponse.json(
      { error: "Invalid user account id" },
      { status: 400 },
    );
  }

  const account = await prisma.userAccount.findUnique({
    where: { userPkId },
    include: {
      company: true,
      createdRequests: true,
      createdOffers: true,
      trustedDevices: true,
      passwordResetTokens: true,
    },
  });

  if (!account) {
    return NextResponse.json(
      { error: "UserAccount not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(normalize(account));
}

export async function DELETE(_req, { params }) {
  const session = await requireAdmin();
  if (!session)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  let userPkId;
  try {
    userPkId = BigInt(id);
  } catch {
    return NextResponse.json(
      { error: "Invalid user account id" },
      { status: 400 },
    );
  }

  try {
    await prisma.userAccount.delete({ where: { userPkId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete user account" },
      { status: 500 },
    );
  }
}
