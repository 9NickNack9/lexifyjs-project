// src/app/api/me/requests/pending/route.js
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// --- helpers (read-only shaping only) ---
const toNum = (d) => (d == null ? null : Number(d));
const safeNumber = (v) => (typeof v === "bigint" ? Number(v) : v);

// read details.offersDeadline if present, else dateExpired
const resolveOffersDeadline = (r) => {
  const d = r?.details?.offersDeadline;
  return d != null && d !== "" ? d : r.dateExpired || null;
};

// parse maximum price from details.maximumPrice (only for display)
const toNumberOrNull = (v) => {
  if (v == null) return null;
  const s = typeof v === "object" && v.toString ? v.toString() : String(v);
  const n = Number(s.replace?.(/[^\d.]/g, "") ?? s);
  return Number.isFinite(n) ? n : null;
};
const maxFromDetails = (details) => {
  const raw = details?.maximumPrice;
  if (raw === undefined || raw === null || raw === "") return null;
  return toNumberOrNull(raw);
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const meIdBig = BigInt(session.userId);

    // Read purchaser org meta (for header fields)
    const me = await prisma.appUser.findUnique({
      where: { userId: meIdBig },
      select: {
        winningOfferSelection: true, // for UI display only
        companyName: true,
        companyId: true,
        companyCountry: true,
      },
    });

    // READ-ONLY: just fetch PENDING/ON HOLD requests to show in the table.
    // All lifecycle mutations (expiry, auto-award, contract creation, emails)
    // are handled exclusively by the cron API.
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
        backgroundInfoFiles: true,
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
        assignmentType: true,
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
        backgroundInfoFiles: r.backgroundInfoFiles || [],
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
        assignmentType: r.assignmentType || null,
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
