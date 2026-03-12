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

  const { providerType } = await req.json();

  const allowed = ["", "N/A", "Attorneys-at-law", "Law Firm"];
  const next = (providerType ?? "").trim();
  const value = allowed.includes(next) ? (next === "N/A" ? "" : next) : "";

  const updated = await prisma.company.update({
    where: { companyPkId },
    data: { providerType: value },
    select: {
      companyPkId: true,
      providerType: true,
    },
  });

  return safeJson({
    ok: true,
    companyPkId: updated.companyPkId,
    providerType: updated.providerType,
  });
}
