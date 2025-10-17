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

  const mine = arr.find((r) => Number(r.raterId) === Number(session.userId));

  return NextResponse.json({
    mine: mine || {},
    aggregates: {
      quality: Number(provider?.providerQualityRating ?? 0),
      communication: Number(provider?.providerCommunicationRating ?? 0),
      billing: Number(provider?.providerBillingRating ?? 0),
      total: Number(provider?.providerTotalRating ?? 0),
    },
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

  // Guard: user must have at least one contract with the provider
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

  // Read existing ratings blob
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
    quality,
    responsiveness,
    billing,
    updatedAt: now,
  };

  let next = [];
  const idx = arr.findIndex((r) => Number(r.raterId) === raterIdNum);
  if (idx >= 0) {
    next = [...arr];
    next[idx] = newEntry;
  } else {
    next = [...arr, newEntry];
  }

  // ----- Recalculate aggregates -----
  const count = next.length || 1;

  const sumQuality = next.reduce((a, r) => a + Number(r.quality || 0), 0);
  const sumComm = next.reduce((a, r) => a + Number(r.responsiveness || 0), 0);
  const sumBilling = next.reduce((a, r) => a + Number(r.billing || 0), 0);

  const avgQuality = Number((sumQuality / count).toFixed(2));
  const avgComm = Number((sumComm / count).toFixed(2));
  const avgBilling = Number((sumBilling / count).toFixed(2));

  // Mean of per-rater means (keeps rater weights equal across categories)
  const perRaterMeans = next.map(
    (r) =>
      (Number(r.quality || 0) +
        Number(r.responsiveness || 0) +
        Number(r.billing || 0)) /
      3
  );
  const totalAvg = Number(
    (perRaterMeans.reduce((a, b) => a + b, 0) / perRaterMeans.length).toFixed(2)
  );

  const updated = await prisma.appUser.update({
    where: { userId: providerId },
    data: {
      providerIndividualRating: next,
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
