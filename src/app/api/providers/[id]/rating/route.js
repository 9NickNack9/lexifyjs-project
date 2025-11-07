import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// Clamp to 0..5 in 0.5 steps
const sanitize = (n) => {
  const v = Math.max(0, Math.min(5, Number(n ?? 0)));
  return Math.round(v * 2) / 2;
};

export async function GET(_req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const providerId = parseInt(id, 10);
  if (!providerId) return NextResponse.json({});

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

  const mine =
    arr.find((r) => Number(r.raterId) === Number(session.userId)) || null;

  const hasRealRatings = arr.length > 0;

  // Default to 5.0s if nobody has rated yet
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

  return NextResponse.json({
    mine: mine || {},
    aggregates,
    hasRealRatings,
    ratingCount,
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
  const quality = sanitize(body.quality);
  const responsiveness = sanitize(body.responsiveness);
  const billing = sanitize(body.billing);

  // Must have at least one contract together
  const hadContract = await prisma.contract.findFirst({
    where: {
      clientId: Number(session.userId),
      providerId: providerId,
    },
    select: { contractId: true },
  });
  if (!hadContract) {
    return NextResponse.json(
      { error: "You can only rate providers you have contracted with." },
      { status: 403 }
    );
  }

  // Purchaser companyName for storage alongside the rating
  const purchaser = await prisma.appUser.findUnique({
    where: { userId: Number(session.userId) },
    select: { companyName: true },
  });
  const purchaserCompany = purchaser?.companyName || "Unknown Company";

  // Read existing ratings array
  const provider = await prisma.appUser.findUnique({
    where: { userId: providerId },
    select: { providerIndividualRating: true },
  });

  const arr = Array.isArray(provider?.providerIndividualRating)
    ? provider.providerIndividualRating
    : [];

  const now = new Date().toISOString();
  const raterIdNum = Number(session.userId);

  const newEntry = {
    raterId: raterIdNum,
    raterCompanyName: purchaserCompany, // ← store company name
    quality,
    responsiveness,
    billing,
    subratings: [quality, responsiveness, billing], // ← compact array if you want quick reads
    updatedAt: now,
  };

  // Upsert into array
  let next = [];
  const idx = arr.findIndex((r) => Number(r.raterId) === raterIdNum);
  if (idx >= 0) {
    next = [...arr];
    next[idx] = newEntry;
  } else {
    next = [...arr, newEntry];
  }

  // ----- Recalculate aggregates -----
  const firstEver = next.length === 1;

  let avgQuality, avgComm, avgBilling, totalAvg;

  if (firstEver) {
    // First ever rating: set to exactly this rating (don't average with 5s)
    avgQuality = quality;
    avgComm = responsiveness;
    avgBilling = billing;
    totalAvg = Number(((quality + responsiveness + billing) / 3).toFixed(2));
  } else {
    // Standard averaging across all entries
    const count = next.length;

    const sumQuality = next.reduce((a, r) => a + Number(r.quality || 0), 0);
    const sumComm = next.reduce((a, r) => a + Number(r.responsiveness || 0), 0);
    const sumBilling = next.reduce((a, r) => a + Number(r.billing || 0), 0);

    avgQuality = Number((sumQuality / count).toFixed(2));
    avgComm = Number((sumComm / count).toFixed(2));
    avgBilling = Number((sumBilling / count).toFixed(2));

    // Mean of per-rater means (equal weight per rater)
    const perRaterMeans = next.map(
      (r) =>
        (Number(r.quality || 0) +
          Number(r.responsiveness || 0) +
          Number(r.billing || 0)) /
        3
    );
    totalAvg = Number(
      (perRaterMeans.reduce((a, b) => a + b, 0) / perRaterMeans.length).toFixed(
        2
      )
    );
  }

  const updated = await prisma.appUser.update({
    where: { userId: providerId },
    data: {
      providerIndividualRating: next, // full history with company names
      providerQualityRating: avgQuality,
      providerCommunicationRating: avgComm,
      providerBillingRating: avgBilling,
      providerTotalRating: totalAvg,
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
  });
}
