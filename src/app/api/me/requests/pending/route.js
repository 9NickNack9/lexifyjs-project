// src/app/api/me/requests/pending/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// ---- helpers ----
const toNum = (d) => (d == null ? null : Number(d));
const safeNumber = (v) => (typeof v === "bigint" ? Number(v) : v);

const toNumberOrNull = (v) => {
  if (v == null) return null;
  const s = typeof v === "object" && v.toString ? v.toString() : String(v);
  const n = Number(s.replace?.(/[^\d.]/g, "") ?? s);
  return Number.isFinite(n) ? n : null;
};

// read details.offersDeadline if present, else dateExpired
const resolveOffersDeadline = (r) => {
  const d = r?.details?.offersDeadline;
  return d != null && d !== "" ? d : r.dateExpired || null;
};

// parse maximum price from details.maximumPrice (only place we read it)
const maxFromDetails = (details) => {
  const raw = details?.maximumPrice;
  if (raw === undefined || raw === null || raw === "") return null;
  const n = toNumberOrNull(raw);
  return n;
};

async function updateRequestContractYesNo(requestId, yesOrNo) {
  try {
    await prisma.request.update({
      where: { requestId },
      data: { contractResult: yesOrNo },
    });
  } catch {
    await prisma.request.update({
      where: { requestId },
      data: { contractStatus: yesOrNo },
    });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const meIdBig = BigInt(session.userId);

    const me = await prisma.appUser.findUnique({
      where: { userId: meIdBig },
      select: {
        winningOfferSelection: true, // "manual" | "Automatic"
        companyName: true,
        companyId: true,
        companyCountry: true,
      },
    });
    const winningMode = (
      me?.winningOfferSelection || "Automatic"
    ).toLowerCase();
    const now = new Date();

    //
    // 1) EXPIRY PASS for *your* PENDING requests that are past offersDeadline/dateExpired
    //
    const myPending = await prisma.request.findMany({
      where: {
        clientId: meIdBig,
        requestState: "PENDING",
      },
      select: {
        requestId: true,
        dateExpired: true,
        details: true,
        paymentRate: true,
        clientId: true,
        offers: {
          select: {
            offerId: true,
            offerPrice: true, // Decimal/string
            providerId: true, // BigInt
          },
        },
      },
    });

    for (const r of myPending) {
      const deadline = resolveOffersDeadline(r);
      const isPast = deadline
        ? new Date(deadline) <= now
        : r.dateExpired
        ? new Date(r.dateExpired) <= now
        : false;

      if (!isPast) continue;

      const offers = Array.isArray(r.offers) ? r.offers : [];
      const hasOffers = offers.length > 0;

      if (!hasOffers) {
        // EXPIRED + contractResult = "No"
        await prisma.request.update({
          where: { requestId: r.requestId },
          data: { requestState: "EXPIRED" },
        });
        await updateRequestContractYesNo(r.requestId, "No");
        continue;
      }

      if (winningMode === "manual") {
        // ON HOLD + acceptDeadline = dateExpired + 7 days
        const base = r.dateExpired ? new Date(r.dateExpired) : now;
        base.setDate(base.getDate() + 7);
        await prisma.request.update({
          where: { requestId: r.requestId },
          data: { requestState: "ON HOLD", acceptDeadline: base },
        });
        continue;
      }

      // Automatic selection
      const maxPriceNum = maxFromDetails(r.details); // null means "no max"
      const offersWithNum = offers
        .map((o) => ({ ...o, priceNum: toNumberOrNull(o.offerPrice) }))
        .filter((o) => o.priceNum != null);

      const lowest = offersWithNum.reduce(
        (best, cur) =>
          best == null || cur.priceNum < best.priceNum ? cur : best,
        null
      );

      const anyUnderMax =
        maxPriceNum == null
          ? offersWithNum.length > 0 // no max price ⇒ any offer qualifies
          : offersWithNum.some((o) => o.priceNum <= maxPriceNum);

      if (anyUnderMax && lowest) {
        // Create Contract (client = purchaser, provider = winning offer maker)
        // Auto-award (create once per requestId)
        await prisma.$transaction(async (tx) => {
          // 1) Ensure exactly one contract per requestId
          await tx.contract.upsert({
            where: { requestId: r.requestId }, // requires @unique on Contract.requestId
            update: {},
            create: {
              requestId: r.requestId,
              clientId: meIdBig, // purchaser
              providerId: lowest.providerId, // winner's provider
              contractPrice:
                lowest.offerPrice?.toString?.() ?? String(lowest.offerPrice),
            },
          });

          // 2) Mark the winning offer as WON
          await tx.offer.update({
            where: { offerId: lowest.offerId },
            data: { offerStatus: "WON" },
          });

          // 3) Mark all other offers on this request as LOST
          await tx.offer.updateMany({
            where: {
              requestId: r.requestId,
              offerId: { not: lowest.offerId },
            },
            data: { offerStatus: "LOST" },
          });

          // 4) Update the request state and contract result
          await tx.request.update({
            where: { requestId: r.requestId },
            data: { requestState: "EXPIRED" },
          });

          // contractResult or contractStatus = "Yes"
          try {
            await tx.request.update({
              where: { requestId: r.requestId },
              data: { contractResult: "Yes" },
            });
          } catch {
            await tx.request.update({
              where: { requestId: r.requestId },
              data: { contractStatus: "Yes" },
            });
          }
        });

        await prisma.request.update({
          where: { requestId: r.requestId },
          data: { requestState: "EXPIRED" },
        });
        await updateRequestContractYesNo(r.requestId, "Yes");
      } else {
        // ON HOLD + acceptDeadline = dateExpired + 7 days
        const base = r.dateExpired ? new Date(r.dateExpired) : now;
        base.setDate(base.getDate() + 7);
        await prisma.request.update({
          where: { requestId: r.requestId },
          data: { requestState: "ON HOLD", acceptDeadline: base },
        });
      }
    }

    //
    // 2) RETURN PENDING + ON HOLD requests for the table
    //
    const requests = await prisma.request.findMany({
      where: {
        clientId: meIdBig,
        requestState: { in: ["PENDING", "ON HOLD"] },
      },
      orderBy: { dateCreated: "desc" },
      select: {
        requestId: true,
        title: true,
        primaryContactPerson: true,
        dateCreated: true,
        dateExpired: true,
        requestState: true,
        paymentRate: true,
        currency: true,
        language: true,
        details: true,
        scopeOfWork: true,
        description: true,
        additionalBackgroundInfo: true,
        supplierCodeOfConductFiles: true,
        invoiceType: true,
        advanceRetainerFee: true,
        serviceProviderType: true,
        domesticOffers: true,
        providerSize: true,
        providerCompanyAge: true,
        providerMinimumRating: true,
        requestCategory: true,
        requestSubcategory: true,
        offers: {
          select: { offerPrice: true },
        },
      },
    });

    const shaped = requests.map((r) => {
      const offers = r.offers || [];
      const offerValues = offers
        .map((o) => toNum(o.offerPrice))
        .filter((n) => typeof n === "number" && !Number.isNaN(n));
      const offersReceived = offers.length;
      const bestOffer = offerValues.length ? Math.min(...offerValues) : null;

      // Maximum price only from details.maximumPrice
      const maximumPrice = maxFromDetails(r.details);

      const offersDeadline = resolveOffersDeadline(r);

      return {
        requestId: safeNumber(r.requestId),
        title: r.title,
        primaryContactPerson: r.primaryContactPerson,
        dateCreated: r.dateCreated,
        dateExpired: r.dateExpired,
        scopeOfWork: r.scopeOfWork,
        description: r.description,
        additionalBackgroundInfo: r.additionalBackgroundInfo || "",
        supplierCodeOfConductFiles: r.supplierCodeOfConductFiles || [],
        paymentRate: r.paymentRate,
        currency: r.currency,
        language: r.language,
        invoiceType: r.invoiceType,
        advanceRetainerFee: r.advanceRetainerFee,
        serviceProviderType: r.serviceProviderType,
        domesticOffers: r.domesticOffers,
        providerSize: r.providerSize,
        providerCompanyAge: r.providerCompanyAge,
        providerMinimumRating: r.providerMinimumRating,
        requestCategory: r.requestCategory,
        requestSubcategory: r.requestSubcategory || null,
        companyName: me?.companyName || null,
        companyId: me?.companyId || null,
        companyCountry: me?.companyCountry || null,
        details: r.details || {},
        offersDeadline,
        offersReceived,
        bestOffer,
        maximumPrice, // number | null
        requestState: r.requestState,
      };
    });

    return NextResponse.json({
      winningOfferSelection: me?.winningOfferSelection || "Automatic",
      companyName: me?.companyName || null,
      companyId: me?.companyId || null,
      companyCountry: me?.companyCountry || null,
      requests: shaped,
    });
  } catch (err) {
    console.error("GET /api/me/requests/pending failed:", err);
    return NextResponse.json(
      { error: "Server error loading pending requests" },
      { status: 500 }
    );
  }
}
