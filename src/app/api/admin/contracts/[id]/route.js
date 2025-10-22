import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Recursively convert BigInt → string so JSON.stringify works
const serialize = (obj) =>
  JSON.parse(
    JSON.stringify(obj, (_, v) => (typeof v === "bigint" ? v.toString() : v))
  );

export async function GET(_req, ctx) {
  let id;
  try {
    const { id: idParam } = await ctx.params; // await params per Next.js guidance
    id = BigInt(idParam);
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const contract = await prisma.contract.findUnique({
    where: { contractId: id },
    include: {
      request: { include: { client: true } },
      provider: true,
    },
  });

  if (!contract)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(serialize(contract));
}

export async function DELETE(_req, ctx) {
  let id;
  try {
    const { id: idParam } = await ctx.params; // await params per Next.js guidance
    id = BigInt(idParam);
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  await prisma.contract.delete({ where: { contractId: id } });
  return NextResponse.json({ ok: true });
}
