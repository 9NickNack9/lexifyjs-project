// src/app/api/providers/[id]/rating/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import {
  ratingAggregatesForDisplay,
  recomputeOverallAggregates,
  recomputePracticalRatings,
  sanitizeRating,
} from "@/lib/providerRatings";

function mapRequestToCategory(requestCategory, requestSubcategory) {
  const sub = (requestSubcategory || "").trim();
  const cat = (requestCategory || "").trim();

  if (sub === "Real Estate and Construction" || sub === "ICT and IT")
    return sub;

  if (cat === "Help with Contracts") return "Contracts";
  if (cat === "Day-to-day Legal Advice") return "Day-to-day Legal Advice";
  if (cat === "Help with Employment related Documents") return "Employment";
  if (cat === "Help with Dispute Resolution or Debt Collection")
    return "Dispute Resolution";
  if (cat === "Help with Mergers & Acquisitions") return "M&A";
  if (cat === "Help with Corporate Governance") return "Corporate Advisory";
  if (cat === "Help with Personal Data Protection") return "Data Protection";
  if (
    cat ===
    "Help with KYC (Know Your Customer) or Compliance related Questionnaire"
  )
    return "Compliance";
  if (cat === "Legal Training for Management and/or Personnel")
    return "Legal Training";
  if (cat === "Help with Banking & Finance Matters") return "Banking & Finance";

  return sub || cat || "Other";
}

const dec = (v) => (v == null ? 0 : Number(v));

function storedAggregatesDiffer(provider, computed) {
  return (
    dec(provider?.providerQualityRating) !== computed.avgQuality ||
    dec(provider?.providerCommunicationRating) !== computed.avgComm ||
    dec(provider?.providerBillingRating) !== computed.avgBilling ||
    dec(provider?.providerTotalRating) !== computed.totalAvg
  );
}

export async function GET(req, context) {
  const params = await context.params;
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const providerCompanyIdStr = params?.id;
  const providerCompanyId = providerCompanyIdStr
    ? BigInt(providerCompanyIdStr)
    : null;
  if (!providerCompanyId) return NextResponse.json({});

  const { searchParams } = new URL(req.url);
  const contractIdParam = searchParams.get("contractId");
  const contractId = contractIdParam ? BigInt(contractIdParam) : null;

  // Fetch provider COMPANY rating data
  const provider = await prisma.company.findUnique({
    where: { companyPkId: providerCompanyId },
    select: {
      providerIndividualRating: true,
      providerQualityRating: true,
      providerCommunicationRating: true,
      providerBillingRating: true,
      providerTotalRating: true,
    },
  });

  const arr = Array.isArray(provider?.providerIndividualRating)
    ? provider.providerIndividualRating
    : [];

  const computed = ratingAggregatesForDisplay(arr);

  if (
    arr.length > 0 &&
    storedAggregatesDiffer(provider, {
      avgQuality: computed.quality,
      avgComm: computed.communication,
      avgBilling: computed.billing,
      totalAvg: computed.total,
    })
  ) {
    try {
      await prisma.company.update({
        where: { companyPkId: providerCompanyId },
        data: {
          providerQualityRating: computed.quality,
          providerCommunicationRating: computed.communication,
          providerBillingRating: computed.billing,
          providerTotalRating: computed.total,
          providerPracticalRatings: computed.practical,
        },
      });
    } catch (err) {
      console.error("Failed to persist recomputed provider ratings:", err);
    }
  }

  const ratingCount = computed.ratingCount;

  // Only return "mine" when contractId is specified (contract-specific rating)
  const myCompanyId = session.companyId ? BigInt(session.companyId) : null;

  const mineRaw =
    contractId && myCompanyId
      ? arr.find(
          (r) =>
            String(r.raterCompanyPkId) === String(myCompanyId) &&
            String(r.contractId) === String(contractId),
        ) || null
      : null;

  const mine = mineRaw
    ? {
        ...mineRaw,
        quality: sanitizeRating(
          mineRaw.quality ?? mineRaw.providerQualityRating ?? 0,
        ),
        responsiveness: sanitizeRating(
          mineRaw.responsiveness ??
            mineRaw.communication ??
            mineRaw.providerCommunicationRating ??
            0,
        ),
        billing: sanitizeRating(
          mineRaw.billing ?? mineRaw.providerBillingRating ?? 0,
        ),
      }
    : null;

  const hasRealRatings = computed.hasRealRatings;

  const aggregates = hasRealRatings
    ? {
        quality: computed.quality,
        communication: computed.communication,
        billing: computed.billing,
        total: computed.total,
      }
    : { quality: 5.0, communication: 5.0, billing: 5.0, total: 5.0 };

  // Contracts between this purchaser COMPANY and this provider COMPANY, used by UI dropdown
  const contracts = myCompanyId
    ? await prisma.contract.findMany({
        where: {
          clientCompanyId: myCompanyId,
          providerCompanyId: providerCompanyId,
        },
        orderBy: { contractDate: "desc" },
        select: {
          contractId: true,
          requestId: true,
          contractDate: true,
          request: {
            select: {
              title: true,
              requestCategory: true,
              requestSubcategory: true,
            },
          },
        },
      })
    : [];

  const contractOut = contracts.map((c) => ({
    contractId: String(c.contractId),
    requestId: String(c.requestId),
    contractDate: c.contractDate,
    requestTitle: c.request?.title || "(Untitled Request)",
    requestCategory: c.request?.requestCategory || "",
    requestSubcategory: c.request?.requestSubcategory || "",
  }));

  return NextResponse.json({
    mine: mine || {},
    aggregates,
    hasRealRatings,
    ratingCount,
    contracts: contractOut,
  });
}

export async function POST(req, context) {
  const params = await context.params;
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const providerCompanyIdStr = params?.id;
  const providerCompanyId = providerCompanyIdStr
    ? BigInt(providerCompanyIdStr)
    : null;
  if (!providerCompanyId) {
    return NextResponse.json(
      { error: "Bad provider company id" },
      { status: 400 },
    );
  }

  const myCompanyId = session.companyId ? BigInt(session.companyId) : null;
  const myUserPkId = session.userId ? BigInt(session.userId) : null;
  if (!myCompanyId || !myUserPkId) {
    return NextResponse.json(
      { error: "Missing session company/user" },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const contractIdNum = body.contractId;
  const contractId = contractIdNum ? BigInt(contractIdNum) : null;

  if (!contractId) {
    return NextResponse.json(
      { error: "Missing contractId (must rate per contract)." },
      { status: 400 },
    );
  }

  const quality = sanitizeRating(body.quality);
  const responsiveness = sanitizeRating(body.responsiveness);
  const billing = sanitizeRating(body.billing);

  // Validate contract belongs to current COMPANY and provider COMPANY
  const contract = await prisma.contract.findFirst({
    where: {
      contractId,
      clientCompanyId: myCompanyId,
      providerCompanyId: providerCompanyId,
    },
    select: {
      contractId: true,
      requestId: true,
      request: {
        select: { requestCategory: true, requestSubcategory: true },
      },
    },
  });

  if (!contract) {
    return NextResponse.json(
      {
        error: "You can only rate providers for contracts you are a party to.",
      },
      { status: 403 },
    );
  }

  const category = mapRequestToCategory(
    contract.request?.requestCategory,
    contract.request?.requestSubcategory,
  );

  // Purchaser companyName for storage alongside the rating
  const purchaserCompany = await prisma.company.findUnique({
    where: { companyPkId: myCompanyId },
    select: { companyName: true },
  });

  // Read existing ratings array from provider COMPANY
  const provider = await prisma.company.findUnique({
    where: { companyPkId: providerCompanyId },
    select: { providerIndividualRating: true },
  });

  const arr = Array.isArray(provider?.providerIndividualRating)
    ? provider.providerIndividualRating
    : [];

  const now = new Date().toISOString();

  const newEntry = {
    raterUserPkId: String(myUserPkId),
    raterCompanyPkId: String(myCompanyId),
    raterCompanyName: purchaserCompany?.companyName || "Unknown Company",

    contractId: String(contract.contractId),
    requestId: String(contract.requestId),

    category,
    quality,
    responsiveness,
    communication: responsiveness,
    billing,
    subratings: [quality, responsiveness, billing],
    updatedAt: now,
  };

  // Upsert by (raterCompanyPkId + contractId)
  const idx = arr.findIndex(
    (r) =>
      String(r.raterCompanyPkId) === String(myCompanyId) &&
      String(r.contractId) === String(contract.contractId),
  );

  const next =
    idx >= 0
      ? [...arr.slice(0, idx), newEntry, ...arr.slice(idx + 1)]
      : [...arr, newEntry];

  const { avgQuality, avgComm, avgBilling, totalAvg } =
    recomputeOverallAggregates(next);

  const practical = recomputePracticalRatings(next);

  const updated = await prisma.company.update({
    where: { companyPkId: providerCompanyId },
    data: {
      providerIndividualRating: next,
      providerQualityRating: avgQuality,
      providerCommunicationRating: avgComm,
      providerBillingRating: avgBilling,
      providerTotalRating: totalAvg,
      providerPracticalRatings: practical,
    },
    select: {
      companyPkId: true,
      providerQualityRating: true,
      providerCommunicationRating: true,
      providerBillingRating: true,
      providerTotalRating: true,
    },
  });

  return NextResponse.json({
    ok: true,
    companyId: String(updated.companyPkId),
    aggregates: {
      quality: avgQuality,
      communication: avgComm,
      billing: avgBilling,
      total: totalAvg,
    },
    category,
  });
}
