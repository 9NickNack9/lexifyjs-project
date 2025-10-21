import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/admin/contracts?search=&skip=&take=
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";
  const skip = Number(searchParams.get("skip") || 0);
  const take = Number(searchParams.get("take") || 10);

  const where = search
    ? {
        OR: [
          {
            request: {
              client: {
                companyName: { contains: search, mode: "insensitive" },
              },
            },
          },
          {
            provider: {
              companyName: { contains: search, mode: "insensitive" },
            },
          },
        ],
      }
    : {};

  const [total, data] = await Promise.all([
    prisma.contract.count({ where }),
    prisma.contract.findMany({
      where,
      skip,
      take,
      orderBy: { contractId: "desc" },
      select: {
        contractId: true,
        contractDate: true,
        contractPrice: true,
        request: {
          select: {
            title: true,
            client: { select: { companyName: true } },
          },
        },
        provider: { select: { companyName: true } }, // contract has providerId → provider user
      },
    }),
  ]);

  const contracts = data.map((c) => ({
    contractId: Number(c.contractId),
    contractDate: c.contractDate,
    contractPrice: c.contractPrice,
    clientCompanyName: c.request?.client?.companyName || "—",
    providerCompanyName: c.provider?.companyName || "—",
    requestTitle: c.request?.title || "—",
  }));

  return NextResponse.json({ total, contracts });
}
