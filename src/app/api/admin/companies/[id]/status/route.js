import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function PUT(req, context) {
  const session = await requireAdmin();
  if (!session)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;
  const body = await req.json();

  let companyPkId;
  try {
    companyPkId = BigInt(id);
  } catch {
    return NextResponse.json({ error: "Invalid company id" }, { status: 400 });
  }

  try {
    const updated = await prisma.company.update({
      where: { companyPkId },
      data: { registerStatus: body.registerStatus },
    });

    return NextResponse.json({
      ...updated,
      companyPkId: String(updated.companyPkId),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to update company registerStatus" },
      { status: 500 },
    );
  }
}
