import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/providers/search?q=Acme
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  const where = {
    role: "PROVIDER",
    ...(q ? { companyName: { contains: q, mode: "insensitive" } } : {}),
  };

  const providers = await prisma.appUser.findMany({
    where,
    select: {
      userId: true,
      username: true,
      companyName: true,
    },
    orderBy: { companyName: "asc" },
    take: 20,
  });

  const out = providers.map((p) => ({
    userId: Number(p.userId),
    username: p.username,
    companyName: p.companyName,
  }));

  return NextResponse.json(out);
}
