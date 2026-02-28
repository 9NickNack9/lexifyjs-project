// src/app/api/providers/[id]/rating/route.js
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

function recomputeOverallAggregates(entries) {
  if (!entries.length) {
    return { avgQuality: 5.0, avgComm: 5.0, avgBilling: 5.0, totalAvg: 5.0 };
  }

  const count = entries.length;
  const sumQuality = entries.reduce((a, r) => a + Number(r.quality || 0), 0);
  const sumComm = entries.reduce(
    (a, r) => a + Number(r.responsiveness || 0),
    0,
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
      3,
  );
  const totalAvg = Number(
    (perEntryMeans.reduce((a, b) => a + b, 0) / perEntryMeans.length).toFixed(
      2,
    ),
  );

  return { avgQuality, avgComm, avgBilling, totalAvg };
}

function recomputePracticalRatings(entries) {
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
        3,
    );
    const total = Number(
      (perEntryMeans.reduce((a, b) => a + b, 0) / perEntryMeans.length).toFixed(
        2,
      ),
    );

    out[category] = { quality, responsiveness, billing, total, count };
  }

  return out;
}

const dec = (v) => (v == null ? 0 : Number(v));

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

  const ratingCount = arr.length;

  // Only return "mine" when contractId is specified (contract-specific rating)
  const myCompanyId = session.companyId ? BigInt(session.companyId) : null;

  const mine =
    contractId && myCompanyId
      ? arr.find(
          (r) =>
            String(r.raterCompanyPkId) === String(myCompanyId) &&
            String(r.contractId) === String(contractId),
        ) || null
      : null;

  const hasRealRatings = arr.length > 0;

  const aggregates = hasRealRatings
    ? {
        quality: dec(provider?.providerQualityRating),
        communication: dec(provider?.providerCommunicationRating),
        billing: dec(provider?.providerBillingRating),
        total: dec(provider?.providerTotalRating),
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

  const quality = sanitize(body.quality);
  const responsiveness = sanitize(body.responsiveness);
  const billing = sanitize(body.billing);

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
      quality: dec(updated.providerQualityRating),
      communication: dec(updated.providerCommunicationRating),
      billing: dec(updated.providerBillingRating),
      total: dec(updated.providerTotalRating),
    },
    category,
  });
}
