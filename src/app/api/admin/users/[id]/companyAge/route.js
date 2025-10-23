import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function PUT(req, { params }) {
  const session = await requireAdmin();
  if (!session)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const userId = parseInt(id, 10);
  const body = await req.json();
  const n = Number.parseInt(body.companyAge, 10);
  const age = Number.isFinite(n) && n >= 0 ? n : 0;

  // read current user to see if companyFoundingYear exists
  const user = await prisma.appUser.findUnique({
    where: { userId },
    select: { companyFoundingYear: true },
  });

  const currentYear = new Date().getFullYear();

  // If no founding year yet → derive it from the age the admin typed
  const data =
    typeof user?.companyFoundingYear === "number"
      ? { companyAge: age } // keep existing founding year as source of truth
      : {
          companyAge: age,
          companyFoundingYear: Math.max(0, currentYear - age),
        };

  const updated = await prisma.appUser.update({
    where: { userId },
    data,
    select: { companyAge: true, companyFoundingYear: true },
  });

  return NextResponse.json({
    ok: true,
    companyAge: updated.companyAge,
    companyFoundingYear: updated.companyFoundingYear ?? null,
  });
}
