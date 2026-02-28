import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function PUT(req, context) {
  const session = await requireAdmin();
  if (!session)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;
  const body = await req.json();

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
    const updated = await prisma.userAccount.update({
      where: { userPkId },
      data: { registerStatus: body.registerStatus },
    });

    return NextResponse.json({
      ...updated,
      userPkId: String(updated.userPkId),
      companyId: String(updated.companyId),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to update user account registerStatus" },
      { status: 500 },
    );
  }
}
