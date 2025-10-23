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

  const { id } = await params;
  const userId = parseInt(id, 10);
  const user = await prisma.appUser.findUnique({ where: { userId } });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(normalize(user)); // ✅ BigInt safe
}

export async function DELETE(_req, { params }) {
  const session = await requireAdmin();
  if (!session)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params; //  await params
  const userId = parseInt(id, 10);
  try {
    await prisma.appUser.delete({ where: { userId } });
    return NextResponse.json({ ok: true });
  } catch (_err) {
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
