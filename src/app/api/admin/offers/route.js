import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/admin/offers?search=&skip=&take=
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";
  const skip = Number(searchParams.get("skip") || 0);
  const take = Number(searchParams.get("take") || 10);

  const where = search
    ? {
        OR: [
          {
            provider: {
              companyName: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
          {
            offerTitle: {
              contains: search,
              mode: "insensitive",
            },
          },
        ],
      }
    : {};

  const [total, data] = await Promise.all([
    prisma.offer.count({ where }),
    prisma.offer.findMany({
      where,
      skip,
      take,
      orderBy: { offerId: "desc" },
      select: {
        offerId: true,
        offerStatus: true,
        offerPrice: true,
        offerTitle: true,
        provider: { select: { companyName: true } },
      },
    }),
  ]);

  const offers = data.map((o) => ({
    offerId: Number(o.offerId),
    offerStatus: o.offerStatus,
    offerPrice: o.offerPrice,
    offerTitle: o.offerTitle || null,
    companyName: o.provider?.companyName || "—",
  }));

  return NextResponse.json({ total, offers });
}
