import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_, { params }) {
  const id = BigInt(params.id);
  const row = await prisma.contract.findUnique({ where: { contractId: id } });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}
