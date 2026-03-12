import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const safeJson = (data, status = 200) =>
  new NextResponse(
    JSON.stringify(data, (_, v) => (typeof v === "bigint" ? Number(v) : v)),
    {
      status,
      headers: { "content-type": "application/json" },
    },
  );

export async function PUT(req, { params }) {
  const session = await requireAdmin();
  if (!session) {
    return safeJson({ error: "Forbidden" }, 403);
  }

  const { id } = await params;
  const companyPkId = Number.parseInt(id, 10);
  if (!Number.isFinite(companyPkId)) {
    return safeJson({ error: "Invalid company id" }, 400);
  }

  const body = await req.json();
  const invoiceFee = Number(body.invoiceFee);

  if (!Number.isFinite(invoiceFee) || invoiceFee < 0) {
    return safeJson({ error: "Invalid invoiceFee" }, 400);
  }

  const updated = await prisma.company.update({
    where: { companyPkId },
    data: { invoiceFee },
    select: {
      companyPkId: true,
      invoiceFee: true,
    },
  });

  return safeJson({
    ok: true,
    companyPkId: updated.companyPkId,
    invoiceFee: updated.invoiceFee,
  });
}
