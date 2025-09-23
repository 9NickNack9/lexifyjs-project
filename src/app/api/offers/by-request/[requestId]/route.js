import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_, { params }) {
  const requestId = BigInt(params.requestId);
  const rows = await prisma.offer.findMany({
    where: { requestId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(rows);
}
