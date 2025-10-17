import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json([], { status: 200 }); // empty list if not logged in

  const meId = Number(session.userId);
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  // Find all contracts where current user is the client
  const contracts = await prisma.contract.findMany({
    where: { clientId: meId },
    select: { providerId: true },
  });

  const providerIds = [...new Set(contracts.map((c) => Number(c.providerId)))];
  if (providerIds.length === 0) return NextResponse.json([]);

  const where = {
    userId: { in: providerIds },
    role: "PROVIDER",
    ...(q ? { companyName: { contains: q, mode: "insensitive" } } : {}),
  };

  const providers = await prisma.appUser.findMany({
    where,
    select: { userId: true, username: true, companyName: true },
    orderBy: { companyName: "asc" },
    take: 20,
  });

  // normalize BigInt if needed
  const out = providers.map((p) => ({
    userId: Number(p.userId),
    username: p.username,
    companyName: p.companyName,
  }));

  return NextResponse.json(out);
}
