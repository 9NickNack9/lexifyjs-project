// app/api/users/search/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    if (!q) return NextResponse.json([]);

    // Search PROVIDER companies by companyName
    const results = await prisma.company.findMany({
      where: {
        // If your Company.role enum differs, adjust this value accordingly.
        role: "PROVIDER",
        companyName: { contains: q, mode: "insensitive" },
      },
      select: {
        companyPkId: true, // BigInt in Postgres
        companyName: true,
      },
      take: 25,
      orderBy: [{ companyName: "asc" }],
    });

    // Keep the response contract your UI expects:
    // { userId, username, companyName }
    const payload = results.map((r) => ({
      userId: r.companyPkId != null ? String(r.companyPkId) : null,
      username: null,
      companyName: r.companyName ?? null,
    }));

    return NextResponse.json(payload);
  } catch (err) {
    // Fallback serializer in case any nested BigInt sneaks in
    try {
      return new NextResponse(
        JSON.stringify(
          err?.message
            ? { error: err.message }
            : { error: "Internal Server Error" },
        ),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    } catch {
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 },
      );
    }
  }
}
