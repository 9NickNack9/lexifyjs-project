import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(req) {
  const session = await requireAdmin();
  if (!session)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const skip = parseInt(searchParams.get("skip") || "0", 10);
  const take = parseInt(searchParams.get("take") || "10", 10);

  const where = search
    ? { companyName: { contains: search, mode: "insensitive" } }
    : {};

  const companies = await prisma.company.findMany({
    where,
    skip,
    take,
    orderBy: { companyPkId: "asc" },
    select: {
      companyPkId: true,
      role: true,
      registerStatus: true,
      companyName: true,
      companyAge: true,
      companyFoundingYear: true,
      providerType: true,
      providerTotalRating: true,
      invoiceFee: true,
      _count: {
        select: {
          requests: true,
          offers: true,
          contractsClient: true,
          contractsProv: true,
          members: true,
        },
      },
    },
  });

  const total = await prisma.company.count({ where });
  const currentYear = new Date().getFullYear();

  return NextResponse.json({
    companies: companies.map((c) => {
      const computedAge =
        typeof c.companyFoundingYear === "number"
          ? Math.max(0, currentYear - c.companyFoundingYear)
          : (c.companyAge ?? 0);

      return {
        ...c,
        companyPkId: String(c.companyPkId),
        companyAge: computedAge,
        requestsCount: c._count.requests,
        offersCount: c._count.offers,
        contractsCount: c._count.contractsClient + c._count.contractsProv,
        membersCount: c._count.members,
      };
    }),
    hasMore: skip + take < total,
    total,
  });
}
