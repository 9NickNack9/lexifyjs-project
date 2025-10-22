import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Recursively convert all BigInt values to strings
const serialize = (obj) =>
  JSON.parse(
    JSON.stringify(obj, (_, v) => (typeof v === "bigint" ? v.toString() : v))
  );

export async function GET(_req, ctx) {
  let id;
  try {
    const { id: idParam } = await ctx.params;
    id = BigInt(idParam);
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const offer = await prisma.offer.findUnique({
    where: { offerId: id },
    include: {
      provider: true,
      request: { include: { client: true } },
    },
  });

  if (!offer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(serialize(offer));
}

export async function DELETE(_req, ctx) {
  let id;
  try {
    const { id: idParam } = await ctx.params;
    id = BigInt(idParam);
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  await prisma.offer.delete({ where: { offerId: id } });
  return NextResponse.json({ ok: true });
}
