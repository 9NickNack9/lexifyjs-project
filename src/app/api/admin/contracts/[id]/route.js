import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req, { params }) {
  const id = Number(params.id);
  const contract = await prisma.contract.findUnique({
    where: { contractId: BigInt(id) },
    include: {
      request: { include: { client: true } },
      provider: true,
    },
  });
  if (!contract)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(contract);
}

export async function DELETE(_req, { params }) {
  const id = Number(params.id);
  await prisma.contract.delete({ where: { contractId: BigInt(id) } });
  return NextResponse.json({ ok: true });
}
