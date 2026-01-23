// src/app/api/me/requests/awaiting/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { TURBOPACK_CLIENT_MIDDLEWARE_MANIFEST } from "next/dist/shared/lib/constants";

// BigInt-safe JSON helper
const serialize = (obj) =>
  JSON.parse(
    JSON.stringify(obj, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
  );

const toNum = (v) => {
  if (v == null) return null;
  const s = typeof v === "object" && v.toString ? v.toString() : String(v);
  const n = Number(s.replace?.(/[^\d.]/g, "") ?? s);
  return Number.isFinite(n) ? n : null;
};

const maxFromDetails = (details) => {
  const raw = details?.maximumPrice;
  if (raw === undefined || raw === null || raw === "") return null;
  return toNum(raw);
};

function toStringArray(val) {
  if (Array.isArray(val)) return val.map(String);
  if (!val) return [];
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed.map(String) : [val];
    } catch {
      return [val];
    }
  }
  if (typeof val === "object") {
    if (Array.isArray(val.set)) return val.set.map(String);
    if (Array.isArray(val.value)) return val.value.map(String);
  }
  return [];
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const meId = BigInt(session.userId);
    const now = new Date();

    const reqs = await prisma.request.findMany({
      where: {
        clientId: meId,
        OR: [
          { requestState: "ON HOLD", acceptDeadline: { gt: now } },
          { requestState: "CONFLICT_CHECK" },
        ],
      },
      orderBy: { dateCreated: "desc" },
      select: {
        requestId: true,
        title: true,
        dateCreated: true,
        dateExpired: true,
        acceptDeadline: true,
        currency: true,
        details: true,
        requestCategory: true,
        requestSubcategory: true,
        selectedOfferId: true,
        acceptDeadlinePausedRemainingMs: true,
        requestState: true,
        disqualifiedOfferIds: true,
        offers: {
          select: {
            offerId: true,
            offerPrice: true,
            offerExpectedPrice: true,
            offerLawyer: true,
            providerAdditionalInfo: true,
            provider: {
              select: {
                companyName: true,
                providerTotalRating: true,
                providerQualityRating: true,
                providerCommunicationRating: true,
                providerBillingRating: true,
                companyWebsite: true,
                providerIndividualRating: true,
                providerPracticalRatings: true,
              },
            },
            providerId: true,
            offerStatus: true,
            providerReferenceFiles: true,
          },
        },
      },
    });

    const shaped = reqs.map((r) => {
      const maxPrice = maxFromDetails(r.details);
      const disqSet = new Set(
        toStringArray(r.disqualifiedOfferIds).map(String), // use helper like in your select route
      );
      const offers = (r.offers || [])
        .filter((o) => (o.offerStatus || "").toUpperCase() !== "DISQUALIFIED")
        .filter((o) => !disqSet.has(String(o.offerId)))
        .map((o) => {
          const providerReferenceFiles = Array.isArray(o.providerReferenceFiles)
            ? o.providerReferenceFiles
            : [];

          return {
            offerId:
              typeof o.offerId === "bigint"
                ? o.offerId.toString()
                : String(o.offerId),
            providerId:
              typeof o.providerId === "bigint"
                ? o.providerId.toString()
                : String(o.providerId),

            offeredPrice: toNum(o.offerPrice),
            offerExpectedPrice: toNum(o.offerExpectedPrice), // number | null
            offerLawyer: o.offerLawyer || "—",
            providerAdditionalInfo: o.providerAdditionalInfo || "",
            providerCompanyName: o.provider?.companyName || "—",
            providerTotalRating: toNum(o.provider?.providerTotalRating) ?? null,
            providerQualityRating:
              toNum(o.provider?.providerQualityRating) ?? null,
            providerCommunicationRating:
              toNum(o.provider?.providerCommunicationRating) ?? null,
            providerBillingRating:
              toNum(o.provider?.providerBillingRating) ?? null,
            providerHasRatings:
              Array.isArray(o.provider?.providerIndividualRating) &&
              o.provider.providerIndividualRating.length > 0,
            providerRatingCount: Array.isArray(
              o.provider?.providerIndividualRating,
            )
              ? o.provider.providerIndividualRating.length
              : 0,
            providerPracticalRatings:
              o.provider?.providerPracticalRatings ?? null,
            providerCompanyWebsite: o.provider?.companyWebsite || null,

            // pass S3 reference files through to the client
            providerReferenceFiles,
          };
        })
        .filter((o) => typeof o.offeredPrice === "number")
        .sort((a, b) => a.offeredPrice - b.offeredPrice)
        .slice(0, 5);

      const canExtend =
        r.requestState === "ON HOLD" &&
        r.acceptDeadline &&
        new Date(r.acceptDeadline).getTime() > Date.now() &&
        !(r.details?.acceptDeadlineExtendedOnce === true);

      return {
        requestId:
          typeof r.requestId === "bigint"
            ? r.requestId.toString()
            : String(r.requestId),

        requestTitle: r.title,
        dateCreated: r.dateCreated,
        dateExpired: r.dateExpired,
        acceptDeadline: r.acceptDeadline,
        currency: r.currency,
        maxPrice, // number | null
        topOffers: offers,
        requestState: r.requestState,
        selectedOfferId: r.selectedOfferId?.toString?.() ?? null,
        pausedRemainingMs: r.acceptDeadlinePausedRemainingMs ?? null,
        canExtend,
        extendedOnce: r.details?.acceptDeadlineExtendedOnce === true,
        requestCategory: r.requestCategory ?? null,
        requestSubcategory: r.requestSubcategory ?? null,
      };
    });

    return NextResponse.json(serialize({ requests: shaped }));
  } catch (e) {
    console.error("GET /api/me/requests/awaiting failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const requestIdRaw = body?.requestId;
    if (!requestIdRaw) {
      return NextResponse.json({ error: "Missing requestId" }, { status: 400 });
    }

    const meId = BigInt(session.userId);
    const requestId = BigInt(requestIdRaw);
    const now = new Date();

    // load request owned by the purchaser
    const r = await prisma.request.findUnique({
      where: { requestId },
      select: {
        clientId: true,
        requestState: true,
        acceptDeadline: true,
        details: true,
      },
    });

    if (!r || String(r.clientId) !== String(meId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // only ON HOLD, not paused, and before deadline
    if (r.requestState !== "ON HOLD" || !r.acceptDeadline) {
      return NextResponse.json(
        { error: "Extension not allowed" },
        { status: 400 },
      );
    }
    if (new Date(r.acceptDeadline).getTime() <= now.getTime()) {
      return NextResponse.json(
        { error: "Deadline already passed" },
        { status: 400 },
      );
    }

    const details = r.details ?? {};
    if (details.acceptDeadlineExtendedOnce === true) {
      return NextResponse.json(
        { error: "Already extended once" },
        { status: 400 },
      );
    }

    const newDeadline = new Date(
      new Date(r.acceptDeadline).getTime() + 168 * 60 * 60 * 1000,
    );

    const currentDeadline = new Date(r.acceptDeadline);
    const remainingMs = Math.max(0, currentDeadline.getTime() - now.getTime());
    // Convert to hours with decimals
    const remainingHours = remainingMs / (1000 * 60 * 60);

    await prisma.request.update({
      where: { requestId },
      data: {
        acceptDeadline: newDeadline,
        details: {
          ...(details || {}),
          acceptDeadlineExtendedOnce: true,
          // Store HOW MUCH TIME WAS LEFT at the moment the user clicked
          // This is a number (ms) so it's easy to analyze or display later.
          acceptDeadlineExtendedAt: Number(remainingHours.toFixed(3)),
        },
      },
    });

    return NextResponse.json({
      ok: true,
      acceptDeadline: newDeadline.toISOString(),
      acceptDeadlineExtendedAt: Number(remainingHours.toFixed(3)),
    });
  } catch (e) {
    console.error("POST /api/me/requests/awaiting extend failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
