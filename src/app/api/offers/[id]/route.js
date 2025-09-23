import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const OfferPatch = z.object({
  offerPrice: z.union([z.string(), z.number()]).optional(),
  offerTitle: z.string().optional(),
  offerStatus: z.string().optional(),
  offerLawyer: z.string().optional(),
});

export async function GET(_, { params }) {
  const id = BigInt(params.id);
  const row = await prisma.offer.findUnique({ where: { offerId: id } });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req, { params }) {
  try {
    const id = BigInt(params.id);
    const body = await req.json();
    const data = OfferPatch.parse(body);

    const updated = await prisma.offer.update({
      where: { offerId: id },
      data: {
        ...data,
        offerPrice:
          data.offerPrice === undefined ? undefined : String(data.offerPrice),
      },
    });

    return NextResponse.json({ ok: true, offerId: updated.offerId });
  } catch {
    return NextResponse.json(
      { error: "Invalid payload or not found" },
      { status: 400 }
    );
  }
}

export async function DELETE(_, { params }) {
  const id = BigInt(params.id);
  await prisma.offer.delete({ where: { offerId: id } });
  return NextResponse.json({ ok: true });
}
