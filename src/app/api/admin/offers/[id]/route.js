import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req, { params }) {
  const id = Number(params.id);
  const offer = await prisma.offer.findUnique({
    where: { offerId: BigInt(id) },
    include: {
      provider: true,
      request: { include: { client: true } },
    },
  });
  if (!offer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(offer);
}

export async function DELETE(_req, { params }) {
  const id = Number(params.id);
  await prisma.offer.delete({ where: { offerId: BigInt(id) } });
  return NextResponse.json({ ok: true });
}
