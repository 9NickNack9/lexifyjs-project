import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// GET /api/admin/requests?search=&skip=0&take=10
export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = (searchParams.get("search") || "").trim();
  const skip = Math.max(0, parseInt(searchParams.get("skip") || "0", 10));
  const take = Math.min(
    50,
    Math.max(1, parseInt(searchParams.get("take") || "10", 10))
  );

  const where = {
    ...(search
      ? { clientCompanyName: { contains: search, mode: "insensitive" } }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.request.count({ where }),
    prisma.request.findMany({
      where,
      orderBy: { dateCreated: "desc" },
      skip,
      take,
      select: {
        requestId: true,
        clientCompanyName: true,
        requestState: true,
        title: true,
        primaryContactPerson: true,
        offersDeadline: true,
        _count: { select: { offers: true } },
      },
    }),
  ]);

  const requests = rows.map((r) => ({
    requestId: Number(r.requestId),
    clientCompanyName: r.clientCompanyName,
    requestState: r.requestState,
    title: r.title,
    primaryContactPerson: r.primaryContactPerson,
    offersDeadline: r.offersDeadline
      ? new Date(r.offersDeadline).toISOString()
      : null,
    offersCount: r._count?.offers ?? 0,
  }));

  return NextResponse.json({ total, requests });
}
