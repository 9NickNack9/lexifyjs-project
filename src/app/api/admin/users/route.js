import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(req) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const skip = parseInt(searchParams.get("skip") || "0", 10);
  const take = parseInt(searchParams.get("take") || "10", 10);

  const where = search
    ? { companyName: { contains: search, mode: "insensitive" } }
    : {};

  const users = await prisma.appUser.findMany({
    where,
    skip,
    take,
    orderBy: { userId: "asc" },
    select: {
      userId: true,
      role: true,
      registerStatus: true,
      companyName: true,
      providerTotalRating: true,
      invoiceFee: true,
      _count: {
        select: {
          requests: true,
          offers: true,
          contractsClient: true,
          contractsProv: true,
        },
      },
    },
  });

  const total = await prisma.appUser.count({ where });

  return NextResponse.json({
    users: users.map((u) => ({
      ...u,
      userId: String(u.userId), // ✅ convert BigInt
      requestsCount: u._count.requests,
      offersCount: u._count.offers,
      contractsCount: u._count.contractsClient + u._count.contractsProv,
    })),
    hasMore: skip + take < total,
  });
}
