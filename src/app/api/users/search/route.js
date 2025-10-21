// app/api/users/search/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  // Robust provider search by companyName; avoid hardcoding role value that may differ in DB.
  // If you *must* filter by role, use: role: { in: ["PROVIDER","LEGAL_SERVICE_PROVIDER","SERVICE_PROVIDER"] }
  const where = {
    companyName: q ? { contains: q, mode: "insensitive" } : { not: null }, // allow listing when user starts typing
    role: { in: ["PROVIDER", "LEGAL_SERVICE_PROVIDER", "SERVICE_PROVIDER"] }, // <- optional, only if your enum supports these values
  };

  const results = await prisma.appUser.findMany({
    where,
    select: {
      userId: true,
      username: true,
      companyName: true,
    },
    take: 25,
    orderBy: [{ companyName: "asc" }, { username: "asc" }],
  });

  return NextResponse.json(results);
}
