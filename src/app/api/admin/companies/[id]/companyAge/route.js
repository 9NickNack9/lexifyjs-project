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

  const currentYear = new Date().getFullYear();

  const company = await prisma.company.findUnique({
    where: { companyPkId },
    select: {
      companyAge: true,
      companyFoundingYear: true,
    },
  });

  const requestedAge = Number.parseInt(body.companyAge, 10);

  if (!Number.isFinite(requestedAge) || requestedAge < 0) {
    return safeJson({ error: "Invalid companyAge" }, 400);
  }

  /*
If founding year exists we derive the real age from it
to keep the system consistent.
*/
  const ageFromYear =
    typeof company?.companyFoundingYear === "number"
      ? currentYear - company.companyFoundingYear
      : null;

  /*
If the user changed the value in the field,
update both age and founding year.
*/
  const newAge = requestedAge;
  const newFoundingYear = newAge > 0 ? currentYear - newAge : null;

  const updated = await prisma.company.update({
    where: { companyPkId },
    data: {
      companyAge: newAge,
      companyFoundingYear: newFoundingYear,
    },
    select: {
      companyPkId: true,
      companyAge: true,
      companyFoundingYear: true,
    },
  });

  return safeJson({
    ok: true,
    companyPkId: updated.companyPkId,
    companyAge: updated.companyAge,
    companyFoundingYear: updated.companyFoundingYear,
  });
}
