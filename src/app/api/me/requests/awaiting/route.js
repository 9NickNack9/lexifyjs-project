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
    const reqs = await prisma.request.findMany({
      where: {
        clientId: BigInt(session.userId),
        dateExpired: { lt: now }, // expired
        requestState: "PENDING",
      },
      orderBy: { dateCreated: "desc" },
      select: {
        requestId: true,
        title: true,
        primaryContactPerson: true,
        dateCreated: true,
        dateExpired: true,
        currency: true,
        scopeOfWork: true,
        description: true,
        additionalBackgroundInfo: true,
        supplierCodeOfConductFiles: true,
        paymentRate: true,
        language: true,
        invoiceType: true,
        advanceRetainerFee: true,
        serviceProviderType: true,
        domesticOffers: true,
        providerSize: true,
        providerCompanyAge: true,
        providerMinimumRating: true,
        details: true,
        offers: { select: { offerPrice: true } },
      },
    });

    const shaped = reqs.map((r) => {
      const offerValues = (r.offers || [])
        .map((o) => toNum(o.offerPrice))
        .filter((n) => typeof n === "number" && !Number.isNaN(n));
      const bestOffer = offerValues.length ? Math.min(...offerValues) : null;

      let maximumPrice = null;
      const rawMax = r.details?.maximumPrice;
      if (rawMax !== undefined && rawMax !== null && rawMax !== "") {
        const mp = Number(String(rawMax).replace(/[^\d.]/g, ""));
        if (!Number.isNaN(mp)) maximumPrice = mp;
      }

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
        details: r.details || {},
        offersReceived: (r.offers || []).length,
        bestOffer,
        maximumPrice,
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
