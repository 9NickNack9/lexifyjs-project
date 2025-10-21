import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const toNum = (d) => (d == null ? null : Number(d));
const safeNumber = (v) => (typeof v === "bigint" ? Number(v) : v);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const now = new Date();

    // expired + pending + (no contracts) + (contractResult === null if the field exists)
    const reqs = await prisma.request.findMany({
      where: {
        clientId: BigInt(session.userId),
        dateExpired: { lt: now },
        requestState: "PENDING",
        contract: { none: {} },
        // If your Request model has this column, keep it; if not, remove this line.
        contractResult: null,
      },
      orderBy: { dateCreated: "desc" },
      select: {
        requestId: true,
        title: true,
        primaryContactPerson: true,
        dateCreated: true,
        dateExpired: true,
        currency: true,
        details: true,
        // pull offers WITH provider + ratings for the table
        offers: {
          select: {
            offerPrice: true,
            offerLawyer: true,
            provider: {
              select: {
                companyName: true,
                providerTotalRating: true,
                providerQualityRating: true,
                providerCommunicationRating: true,
                providerBillingRating: true,
              },
            },
          },
        },
      },
    });

    const shaped = [];
    for (const r of reqs) {
      // Parse max price ("My Max. Price")
      let maximumPrice = null;
      const rawMax = r.details?.maximumPrice;
      if (rawMax !== undefined && rawMax !== null && rawMax !== "") {
        const mp = Number(String(rawMax).replace(/[^\d.]/g, ""));
        if (!Number.isNaN(mp)) maximumPrice = mp;
      }

      // Collect numeric offers
      const offers = (r.offers || [])
        .map((o) => ({
          offeredPrice: toNum(o.offerPrice),
          providerCompanyName: o.provider?.companyName || "—",
          providerContactPersonName: o.provider?.contactPersonName || "—",
          providerTotalRating: toNum(o.provider?.providerTotalRating),
          providerQualityRating: toNum(o.provider?.providerQualityRating),
          providerCommunicationRating: toNum(
            o.provider?.providerCommunicationRating
          ),
          providerBillingRating: toNum(o.provider?.providerBillingRating),
        }))
        .filter(
          (o) =>
            typeof o.offeredPrice === "number" && !Number.isNaN(o.offeredPrice)
        );

      if (!offers.length || typeof maximumPrice !== "number") continue;

      const allOverMax = offers.every((o) => o.offeredPrice > maximumPrice);
      if (!allOverMax) continue;

      // top 3 (lowest) offers with full info
      const topOffers = [...offers]
        .sort((a, b) => a.offeredPrice - b.offeredPrice)
        .slice(0, 3);

      shaped.push({
        requestId: safeNumber(r.requestId),
        requestTitle: r.title, // align with Awaiting table naming
        primaryContactPerson: r.primaryContactPerson,
        dateCreated: r.dateCreated,
        dateExpired: r.dateExpired,
        currency: r.currency,
        maxPrice: maximumPrice, // align with Awaiting table naming
        topOffers,
      });
    }

    return NextResponse.json({ requests: shaped });
  } catch (e) {
    console.error("overmax list failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
