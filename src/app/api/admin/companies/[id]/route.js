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
  let companyPkId;
  try {
    companyPkId = BigInt(id);
  } catch {
    return NextResponse.json({ error: "Invalid company id" }, { status: 400 });
  }

  const company = await prisma.company.findUnique({
    where: { companyPkId },
    include: {
      members: true,
      requests: true,
      offers: true,
      contractsClient: true,
      contractsProv: true,
    },
  });

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  return NextResponse.json(normalize(company));
}

export async function DELETE(_req, { params }) {
  const session = await requireAdmin();
  if (!session)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  let companyPkId;
  try {
    companyPkId = BigInt(id);
  } catch {
    return NextResponse.json({ error: "Invalid company id" }, { status: 400 });
  }

  try {
    await prisma.company.delete({ where: { companyPkId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete company" },
      { status: 500 },
    );
  }
}
