import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function PUT(req, { params }) {
  const session = await requireAdmin();
  if (!session)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = parseInt(params.id, 10);
  const body = await req.json();

  try {
    const updated = await prisma.appUser.update({
      where: { userId: id },
      data: { invoiceFee: body.invoiceFee },
    });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to update invoiceFee" },
      { status: 500 }
    );
  }
}
