import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// Utility: convert BigInt -> String recursively
function normalize(obj) {
  return JSON.parse(
    JSON.stringify(obj, (_, v) => (typeof v === "bigint" ? String(v) : v))
  );
}

export async function GET(_, { params }) {
  const session = await requireAdmin();
  if (!session)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = parseInt(params.id, 10);
  const user = await prisma.appUser.findUnique({ where: { userId: id } });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(normalize(user)); // ✅ BigInt safe
}

export async function DELETE(_, { params }) {
  const session = await requireAdmin();
  if (!session)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = parseInt(params.id, 10);
  try {
    await prisma.appUser.delete({ where: { userId: id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
