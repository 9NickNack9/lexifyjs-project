// src/app/api/me/contracts/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// BigInt-safe JSON
const serialize = (obj) =>
  JSON.parse(
    JSON.stringify(obj, (_, v) => (typeof v === "bigint" ? v.toString() : v))
  );

// Safe number parser for Decimal | number | "5"
const numify = (v) => {
  if (v == null) return null;
  const s = typeof v === "object" && v.toString ? v.toString() : String(v);
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
};

const safeNumber = (v) => (typeof v === "bigint" ? Number(v) : v);

// Pull *your* individual rating from provider.providerIndividualRating
const findMyIndividualRating = (provider, myUserId, myCompanyName) => {
  const bag = provider?.providerIndividualRating ?? null;
  if (!bag) return null;

  // Support object map OR array of entries
  let entry = null;

  if (Array.isArray(bag)) {
    entry =
      bag.find(
        (e) =>
          e?.key === String(myUserId) || e?.key === String(myCompanyName || "")
      ) || null;
    if (entry && typeof entry === "object") entry = entry.value ?? entry;
  } else if (typeof bag === "object") {
    entry = bag[String(myUserId)] || bag[String(myCompanyName || "")] || null;
  }

  if (!entry || typeof entry !== "object") return null;

  const q = numify(
    entry.providerQualityRating ?? entry.quality ?? entry.Quality
  );
  const c = numify(
    entry.providerCommunicationRating ??
      entry.communication ??
      entry.Communication
  );
  const b = numify(
    entry.providerBillingRating ?? entry.billing ?? entry.Billing
  );

  const parts = [q, c, b].filter((n) => typeof n === "number");
  if (!parts.length) return null;

  const avg = Number(
    (parts.reduce((s, v) => s + v, 0) / parts.length).toFixed(1)
  );

  return {
    total: avg,
    quality: q ?? null,
    communication: c ?? null,
    billing: b ?? null,
  };
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const me = await prisma.appUser.findUnique({
      where: { userId: BigInt(session.userId) },
      select: { companyName: true },
    });

    // IMPORTANT: include provider rating fields in the select
    const contracts = await prisma.contract.findMany({
      where: { request: { clientId: BigInt(session.userId) } },
      orderBy: { contractDate: "desc" },
      select: {
        contractId: true,
        contractDate: true,
        contractPrice: true,
        contractPriceCurrency: true,
        contractPriceType: true,
        providerId: true,
        request: {
          select: {
            requestId: true,
            title: true,
            currency: true,
            paymentRate: true,
            scopeOfWork: true,
            description: true,
            invoiceType: true,
            language: true,
            advanceRetainerFee: true,
          },
        },
        provider: {
          select: {
            userId: true,
            companyName: true,
            businessId: true,
            email: true,
            phone: true,

            // ⬇⬇ THESE FOUR ARE THE AGGREGATE RATING FIELDS ⬇⬇
            providerTotalRating: true,
            providerQualityRating: true,
            providerCommunicationRating: true,
            providerBillingRating: true,

            // ⬇ per-user ratings JSON (correct field name)
            providerIndividualRating: true,
          },
        },
      },
    });

    const shaped = contracts.map((c) => {
      const p = c.provider || {};

      // Aggregate rating: prefer providerTotalRating, else compute from subs
      const q = numify(p.providerQualityRating);
      const co = numify(p.providerCommunicationRating);
      const b = numify(p.providerBillingRating);
      const t = numify(p.providerTotalRating);

      const parts = [q, co, b].filter((n) => typeof n === "number");
      const computedTotal = parts.length
        ? Number((parts.reduce((s, v) => s + v, 0) / parts.length).toFixed(1))
        : null;

      const providerRating = {
        total: t ?? computedTotal,
        quality: q ?? null,
        communication: co ?? null,
        billing: b ?? null,
      };

      // Your individual rating (if present in providerIndividualRating)
      const myRating = findMyIndividualRating(
        p,
        session.userId,
        me?.companyName
      );

      return {
        contractId: safeNumber(c.contractId),
        contractDate: c.contractDate,
        contractPrice: numify(c.contractPrice),
        contractPriceCurrency:
          c.contractPriceCurrency || c.request?.currency || null,
        contractPriceType:
          c.contractPriceType || c.request?.paymentRate || null,

        provider: {
          userId: p.userId ? safeNumber(p.userId) : null,
          companyName: p.companyName || "—",
          businessId: p.businessId || "—",
          email: p.email || "—",
          phone: p.phone || "—",

          // pass raw rating fields too (useful for debugging/UI)
          providerTotalRating: t,
          providerQualityRating: q,
          providerCommunicationRating: co,
          providerBillingRating: b,
        },

        request: {
          id: c.request?.requestId ? safeNumber(c.request.requestId) : null,
          title: c.request?.title || "—",
          scopeOfWork: c.request?.scopeOfWork || "—",
          description: c.request?.description || "—",
          invoiceType: c.request?.invoiceType || "—",
          language: c.request?.language || "—",
          advanceRetainerFee: c.request?.advanceRetainerFee || "—",
        },

        myRating, // null → N/A in UI
        providerRating, // should be filled now
      };
    });

    return NextResponse.json(
      serialize({
        companyName: me?.companyName || null,
        contracts: shaped,
      })
    );
  } catch (e) {
    console.error("GET /api/me/contracts failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
