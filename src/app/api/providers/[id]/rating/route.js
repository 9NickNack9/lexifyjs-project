import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// Clamp to 0..5 in 0.5 steps
const sanitize = (n) => {
  const v = Math.max(0, Math.min(5, Number(n ?? 0)));
  return Math.round(v * 2) / 2;
};

function mapRequestToCategory(requestCategory, requestSubcategory) {
  const sub = (requestSubcategory || "").trim();
  const cat = (requestCategory || "").trim();

  // Special: use subcategory for these
  if (sub === "Real Estate and Construction" || sub === "ICT and IT")
    return sub;

  // Otherwise map categories
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

  // Fallback (keeps system resilient if you add new categories later)
  return sub || cat || "Other";
}

function recomputeOverallAggregates(entries) {
  if (!entries.length) {
    return {
      avgQuality: 5.0,
      avgComm: 5.0,
      avgBilling: 5.0,
      totalAvg: 5.0,
    };
  }

  const count = entries.length;
  const sumQuality = entries.reduce((a, r) => a + Number(r.quality || 0), 0);
  const sumComm = entries.reduce(
    (a, r) => a + Number(r.responsiveness || 0),
    0
  );
  const sumBilling = entries.reduce((a, r) => a + Number(r.billing || 0), 0);

  const avgQuality = Number((sumQuality / count).toFixed(2));
  const avgComm = Number((sumComm / count).toFixed(2));
  const avgBilling = Number((sumBilling / count).toFixed(2));

  const perEntryMeans = entries.map(
    (r) =>
      (Number(r.quality || 0) +
        Number(r.responsiveness || 0) +
        Number(r.billing || 0)) /
      3
  );
  const totalAvg = Number(
    (perEntryMeans.reduce((a, b) => a + b, 0) / perEntryMeans.length).toFixed(2)
  );

  return { avgQuality, avgComm, avgBilling, totalAvg };
}

function recomputePracticalRatings(entries) {
  // groups by category and averages the 3 subratings + total
  const grouped = new Map();

  for (const r of entries) {
    const category = (r.category || "Other").trim() || "Other";
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category).push(r);
  }

  const out = {};
  for (const [category, arr] of grouped.entries()) {
    const count = arr.length;

    const sumQuality = arr.reduce((a, r) => a + Number(r.quality || 0), 0);
    const sumComm = arr.reduce((a, r) => a + Number(r.responsiveness || 0), 0);
    const sumBilling = arr.reduce((a, r) => a + Number(r.billing || 0), 0);

    const quality = Number((sumQuality / count).toFixed(2));
    const responsiveness = Number((sumComm / count).toFixed(2));
    const billing = Number((sumBilling / count).toFixed(2));

    const perEntryMeans = arr.map(
      (r) =>
        (Number(r.quality || 0) +
          Number(r.responsiveness || 0) +
          Number(r.billing || 0)) /
        3
    );
    const total = Number(
      (perEntryMeans.reduce((a, b) => a + b, 0) / perEntryMeans.length).toFixed(
        2
      )
    );

    out[category] = { quality, responsiveness, billing, total, count };
  }

  return out;
}

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const providerId = parseInt(id, 10);
  if (!providerId) return NextResponse.json({});

  const { searchParams } = new URL(req.url);
  const contractIdParam = searchParams.get("contractId");
  const contractId = contractIdParam ? Number(contractIdParam) : null;

  // Fetch provider rating data
  const provider = await prisma.appUser.findUnique({
    where: { userId: providerId },
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

  const ratingCount = arr.length;

  // Only return "mine" when contractId is specified (contract-specific rating)
  const mine =
    contractId != null
      ? arr.find(
          (r) =>
            Number(r.raterId) === Number(session.userId) &&
            Number(r.contractId) === Number(contractId)
        ) || null
      : null;

  const hasRealRatings = arr.length > 0;

  const aggregates = hasRealRatings
    ? {
        quality: Number(provider?.providerQualityRating ?? 0),
        communication: Number(provider?.providerCommunicationRating ?? 0),
        billing: Number(provider?.providerBillingRating ?? 0),
        total: Number(provider?.providerTotalRating ?? 0),
      }
    : {
        quality: 5.0,
        communication: 5.0,
        billing: 5.0,
        total: 5.0,
      };

  // Contracts between this purchaser and this provider, used by UI dropdown
  const contracts = await prisma.contract.findMany({
    where: {
      clientId: Number(session.userId),
      providerId: providerId,
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
  });

  const contractOut = contracts.map((c) => ({
    contractId: Number(c.contractId),
    requestId: Number(c.requestId),
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

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const providerId = parseInt(id, 10);
  if (!providerId)
    return NextResponse.json({ error: "Bad provider id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const contractId = Number(body.contractId);

  if (!contractId) {
    return NextResponse.json(
      { error: "Missing contractId (must rate per contract)." },
      { status: 400 }
    );
  }

  const quality = sanitize(body.quality);
  const responsiveness = sanitize(body.responsiveness);
  const billing = sanitize(body.billing);

  // Validate contract belongs to current user and provider
  const contract = await prisma.contract.findFirst({
    where: {
      contractId: BigInt(contractId),
      clientId: BigInt(Number(session.userId)),
      providerId: BigInt(providerId),
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
      { status: 403 }
    );
  }

  const category = mapRequestToCategory(
    contract.request?.requestCategory,
    contract.request?.requestSubcategory
  );

  // Purchaser companyName for storage alongside the rating
  const purchaser = await prisma.appUser.findUnique({
    where: { userId: BigInt(Number(session.userId)) },
    select: { companyName: true },
  });
  const purchaserCompany = purchaser?.companyName || "Unknown Company";

  // Read existing ratings array
  const provider = await prisma.appUser.findUnique({
    where: { userId: BigInt(providerId) },
    select: { providerIndividualRating: true },
  });

  const arr = Array.isArray(provider?.providerIndividualRating)
    ? provider.providerIndividualRating
    : [];

  const now = new Date().toISOString();
  const raterIdNum = Number(session.userId);

  const newEntry = {
    raterId: raterIdNum,
    raterCompanyName: purchaserCompany,
    contractId: Number(contract.contractId),
    requestId: Number(contract.requestId),
    category,
    quality,
    responsiveness,
    billing,
    subratings: [quality, responsiveness, billing],
    updatedAt: now,
  };

  // Upsert by (raterId + contractId)
  const idx = arr.findIndex(
    (r) =>
      Number(r.raterId) === raterIdNum &&
      Number(r.contractId) === Number(contract.contractId)
  );

  const next =
    idx >= 0
      ? [...arr.slice(0, idx), newEntry, ...arr.slice(idx + 1)]
      : [...arr, newEntry];

  // Recompute overall provider aggregates
  const { avgQuality, avgComm, avgBilling, totalAvg } =
    recomputeOverallAggregates(next);

  // Recompute providerPracticalRatings per category
  const practical = recomputePracticalRatings(next);

  const updated = await prisma.appUser.update({
    where: { userId: BigInt(providerId) },
    data: {
      providerIndividualRating: next,
      providerQualityRating: avgQuality,
      providerCommunicationRating: avgComm,
      providerBillingRating: avgBilling,
      providerTotalRating: totalAvg,
      providerPracticalRatings: practical,
    },
    select: {
      userId: true,
      providerQualityRating: true,
      providerCommunicationRating: true,
      providerBillingRating: true,
      providerTotalRating: true,
    },
  });

  return NextResponse.json({
    ok: true,
    providerId: Number(updated.userId),
    aggregates: {
      quality: Number(updated.providerQualityRating ?? 0),
      communication: Number(updated.providerCommunicationRating ?? 0),
      billing: Number(updated.providerBillingRating ?? 0),
      total: Number(updated.providerTotalRating ?? 0),
    },
    category,
  });
}
