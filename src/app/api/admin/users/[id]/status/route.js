import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function PUT(req, context) {
  const session = await requireAdmin();
  if (!session)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params; // ✅ await here
  const body = await req.json();

  try {
    const updated = await prisma.appUser.update({
      where: { userId: parseInt(id, 10) },
      data: { registerStatus: body.registerStatus },
    });

    return NextResponse.json({
      ...updated,
      userId: String(updated.userId), // BigInt safe
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to update registerStatus" },
      { status: 500 }
    );
  }
}
