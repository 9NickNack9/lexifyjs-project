// src/app/api/me/requests/awaiting/route.js  (your file)
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// ...imports unchanged...

const toNum = (d) => (d == null ? null : Number(d));
const safeNumber = (v) => (typeof v === "bigint" ? Number(v) : v);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const me = await prisma.appUser.findUnique({
      where: { userId: BigInt(session.userId) },
      select: { winningOfferSelection: true, companyName: true },
    });

    // Only relevant when Manual
    if ((me?.winningOfferSelection || "").toLowerCase() !== "manual") {
      return NextResponse.json({
        companyName: me?.companyName || null,
        requests: [],
      });
    }

    const now = new Date();

    // 🔎 Fetch expired, pending, and WITHOUT contract
    const reqs = await prisma.request.findMany({
      where: {
        clientId: String(session.userId),
        dateExpired: { lt: now },
        requestState: "PENDING",
        // assumes Request has relation: contracts
        contract: { none: {} },
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
        // Pull all offers; we'll compute top-3 in JS
        offers: {
          select: {
            offerPrice: true,
            offerLawyer: true,
            // assumes relation Offer -> Provider with these fields
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

    const shaped = reqs.map((r) => {
      // maxPrice (a.k.a. "My Max. Price")
      let maximumPrice = null;
      const rawMax = r.details?.maximumPrice;
      if (rawMax !== undefined && rawMax !== null && rawMax !== "") {
        const mp = Number(String(rawMax).replace(/[^\d.]/g, ""));
        if (!Number.isNaN(mp)) maximumPrice = mp;
      }

      // Compute top 3 lowest offers with provider info
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
        )
        .sort((a, b) => a.offeredPrice - b.offeredPrice)
        .slice(0, 3);

      return {
        requestId: safeNumber(r.requestId),
        requestTitle: r.title, // <- table wants requestTitle
        primaryContactPerson: r.primaryContactPerson,
        dateCreated: r.dateCreated,
        dateExpired: r.dateExpired,
        currency: r.currency,
        maxPrice: maximumPrice, // <- table wants maxPrice
        topOffers: offers, // <- 3 best offers with provider info
      };
    });

    return NextResponse.json({
      companyName: me?.companyName || null,
      requests: shaped,
    });
  } catch (e) {
    console.error("awaiting list failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
