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

  // Search across username/email and company name
  const role = searchParams.get("role") || "";

  const where = {
    ...(role ? { role } : {}),
    ...(search
      ? {
          OR: [
            { lastName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            {
              company: {
                companyName: { contains: search, mode: "insensitive" },
              },
            },
          ],
        }
      : {}),
  };

  const accounts = await prisma.userAccount.findMany({
    where,
    skip,
    take,
    orderBy: { userPkId: "asc" },
    select: {
      userPkId: true,
      role: true,
      registerStatus: true,
      username: true,
      email: true,
      companyId: true,
      firstName: true,
      lastName: true,
      company: { select: { companyName: true } },
      _count: {
        select: {
          createdRequests: true,
          createdOffers: true,
        },
      },
    },
  });

  const total = await prisma.userAccount.count({ where });

  return NextResponse.json({
    accounts: accounts.map((a) => ({
      ...a,
      userPkId: String(a.userPkId),
      companyId: String(a.companyId),
      companyName: a.company?.companyName || "—",
      requestsCount: a._count.createdRequests,
      offersCount: a._count.createdOffers,
    })),
    hasMore: skip + take < total,
    total,
  });
}
