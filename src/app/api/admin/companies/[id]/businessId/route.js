import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function PUT(req, { params }) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyPkId = params?.id;
  if (!companyPkId) {
    return NextResponse.json({ error: "Missing company id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const businessIdRaw = (body?.businessId ?? "").toString().trim();

  if (!businessIdRaw) {
    return NextResponse.json(
      { error: "businessId is required" },
      { status: 400 },
    );
  }

  try {
    const updated = await prisma.company.update({
      where: { companyPkId: BigInt(companyPkId) },
      data: { businessId: businessIdRaw },
      select: { companyPkId: true, businessId: true },
    });

    return NextResponse.json({
      companyPkId: String(updated.companyPkId),
      businessId: updated.businessId,
    });
  } catch (e) {
    // Prisma unique constraint error (businessId is unique in your schema)
    if (e?.code === "P2002") {
      return NextResponse.json(
        { error: "That business ID is already in use." },
        { status: 409 },
      );
    }
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update businessId" },
      { status: 500 },
    );
  }
}
