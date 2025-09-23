import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const requestId = searchParams.get("requestId");
  if (!requestId)
    return NextResponse.json({ error: "requestId required" }, { status: 400 });

  const count = await prisma.offer.count({
    where: { requestId: BigInt(requestId) },
  });

  return NextResponse.json({ requestId: BigInt(requestId), count });
}
