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

  // Only search PROVIDERs
  const results = await prisma.appUser.findMany({
    where: {
      role: "PROVIDER",
      OR: q
        ? [
            { companyName: { contains: q, mode: "insensitive" } },
            { username: { contains: q, mode: "insensitive" } },
          ]
        : undefined,
    },
    select: {
      userId: true,
      username: true,
      companyName: true,
    },
    take: 10,
    orderBy: [{ companyName: "asc" }, { username: "asc" }],
  });

  return NextResponse.json(results);
}
