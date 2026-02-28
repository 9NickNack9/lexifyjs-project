// src/app/api/me/contracted-providers/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json([], { status: 200 });

  const myCompanyIdStr = session.companyId;
  const myCompanyId = myCompanyIdStr ? BigInt(myCompanyIdStr) : null;
  if (!myCompanyId) return NextResponse.json([], { status: 200 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();

  // Find all contracts where current user's COMPANY is the client
  const contracts = await prisma.contract.findMany({
    where: { clientCompanyId: myCompanyId },
    select: { providerCompanyId: true },
  });

  const providerCompanyIds = [
    ...new Set(
      contracts
        .map((c) => (c.providerCompanyId ? String(c.providerCompanyId) : null))
        .filter(Boolean),
    ),
  ];

  if (providerCompanyIds.length === 0) return NextResponse.json([]);

  const providers = await prisma.company.findMany({
    where: {
      companyPkId: { in: providerCompanyIds.map((x) => BigInt(x)) },
      role: "PROVIDER",
      ...(q ? { companyName: { contains: q, mode: "insensitive" } } : {}),
    },
    select: { companyPkId: true, companyName: true, companyWebsite: true },
    orderBy: { companyName: "asc" },
    take: 20,
  });

  const out = providers.map((c) => ({
    companyId: String(c.companyPkId),
    companyName: c.companyName,
    companyWebsite: c.companyWebsite || null,
  }));

  return NextResponse.json(out);
}
