import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";

const OfferCreate = z.object({
  requestId: z.union([z.string(), z.number()]),
  providerId: z.union([z.string(), z.number()]).optional(),
  offerLawyer: z.string(),
  offerPrice: z.union([z.string(), z.number()]),
  offerTitle: z.string(),
  offerStatus: z.string().optional(),
});

export async function POST(req) {
  try {
    const body = await req.json();
    const parsed = OfferCreate.parse(body);

    const sessionUser = await getSessionUser();
    let providerId = null;

    if (sessionUser?.role === "PROVIDER") {
      providerId = sessionUser.userId;
    } else if (sessionUser?.role === "ADMIN" && parsed.providerId) {
      providerId = BigInt(String(parsed.providerId)); // admin can act on behalf
    } else if (parsed.providerId) {
      providerId = BigInt(String(parsed.providerId));
    }

    if (!providerId) {
      return NextResponse.json(
        {
          error:
            "providerId required (login as Provider/Admin or pass providerId)",
        },
        { status: 400 }
      );
    }

    const created = await prisma.offer.create({
      data: {
        requestId: BigInt(String(parsed.requestId)),
        providerId,
        offerLawyer: parsed.offerLawyer,
        offerPrice: String(parsed.offerPrice),
        offerTitle: parsed.offerTitle,
        offerStatus: parsed.offerStatus ?? "Pending",
      },
      select: { offerId: true },
    });

    return NextResponse.json({ ok: true, offerId: created.offerId });
  } catch (err) {
    if (err?.code === "P2002") {
      return NextResponse.json(
        { error: "You already submitted an offer for this request." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}

export async function GET() {
  const rows = await prisma.offer.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(rows);
}
