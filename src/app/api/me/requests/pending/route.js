// src/app/api/me/requests/pending/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// helpers
const toNum = (d) => (d == null ? null : Number(d));
const safeNumber = (v) => (typeof v === "bigint" ? Number(v) : v);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const me = await prisma.appUser.findUnique({
      where: { userId: BigInt(session.userId) },
      select: {
        winningOfferSelection: true,
        companyName: true,
        companyId: true,
        companyCountry: true,
      },
    });

    const requests = await prisma.request.findMany({
      where: {
        clientId: BigInt(session.userId),
        requestState: "PENDING",
      },
      orderBy: { dateCreated: "desc" },
      select: {
        requestId: true, // Int
        title: true,
        primaryContactPerson: true,
        dateCreated: true,
        dateExpired: true,
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
          select: {
            offerPrice: true, // Decimal -> string in JSON
          },
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

      let maximumPrice = null;
      const rawMax = r.details?.maximumPrice;
      if (rawMax !== undefined && rawMax !== null && rawMax !== "") {
        const mp = Number(String(rawMax).replace(/[^\d.]/g, ""));
        if (!Number.isNaN(mp)) maximumPrice = mp;
      }

      const offersDeadline =
        r.details?.offersDeadline != null && r.details?.offersDeadline !== ""
          ? r.details.offersDeadline
          : r.dateExpired || null;

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
        details: r.details || {},
        offersDeadline,
        offersReceived,
        bestOffer,
        maximumPrice,
        companyId: me?.companyId || null,
        companyCountry: me?.companyCountry || null,
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
