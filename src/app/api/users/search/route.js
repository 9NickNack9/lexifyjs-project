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

    const results = await prisma.appUser.findMany({
      where: {
        role: "PROVIDER",
        companyName: { contains: q, mode: "insensitive" },
      },
      select: {
        userId: true, // likely BIGINT in Postgres → BigInt in JS
        username: true,
        companyName: true,
      },
      take: 25,
      orderBy: [{ companyName: "asc" }, { username: "asc" }],
    });

    // Serialize BigInt → string to avoid TypeError
    const payload = results.map((r) => ({
      ...r,
      userId: r.userId != null ? String(r.userId) : null,
    }));

    return NextResponse.json(payload);
  } catch (err) {
    // Fallback serializer in case any nested BigInt sneaks in
    try {
      return new NextResponse(
        JSON.stringify(
          err?.message
            ? { error: err.message }
            : { error: "Internal Server Error" }
        ),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    } catch {
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 }
      );
    }
  }
}
