// src/app/api/me/requests/awaiting/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { notifyProvidersRequestCancelled } from "@/lib/mailer";

function hasNotificationPreference(notificationPreferences, key) {
  if (!notificationPreferences) return false;

  if (Array.isArray(notificationPreferences)) {
    return notificationPreferences.map(String).includes(key);
  }

  if (typeof notificationPreferences === "string") {
    try {
      const parsed = JSON.parse(notificationPreferences);
      if (Array.isArray(parsed)) return parsed.map(String).includes(key);
      if (parsed && typeof parsed === "object") return parsed[key] === true;
    } catch {
      return notificationPreferences
        .split(",")
        .map((s) => s.trim())
        .includes(key);
    }
  }

  if (typeof notificationPreferences === "object") {
    if (Array.isArray(notificationPreferences.set)) {
      return notificationPreferences.set.map(String).includes(key);
    }
    if (Array.isArray(notificationPreferences.value)) {
      return notificationPreferences.value.map(String).includes(key);
    }
    return notificationPreferences[key] === true;
  }

  return false;
}

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

    // resolve purchaser companyId
    const ua = await prisma.userAccount.findUnique({
      where: { userPkId: BigInt(session.userId) },
      select: { companyId: true },
    });
    if (!ua?.companyId)
      return NextResponse.json({ error: "Company not found" }, { status: 404 });

    const now = new Date();

    const reqs = await prisma.request.findMany({
      where: {
        clientCompanyId: ua.companyId,
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
            providerCompanyId: true,
            providerCompany: {
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
            offerStatus: true,
            providerReferenceFiles: true,
          },
        },
      },
    });

    const shaped = reqs.map((r) => {
      const maxPrice = maxFromDetails(r.details);
      const disqSet = new Set(
        toStringArray(r.disqualifiedOfferIds).map(String),
      );

      const offers = (r.offers || [])
        .filter((o) => (o.offerStatus || "").toUpperCase() !== "DISQUALIFIED")
        .filter((o) => !disqSet.has(String(o.offerId)))
        .map((o) => ({
          offerId:
            typeof o.offerId === "bigint"
              ? o.offerId.toString()
              : String(o.offerId),
          providerId:
            typeof o.providerCompanyId === "bigint"
              ? o.providerCompanyId.toString()
              : String(o.providerCompanyId),

          offeredPrice: toNum(o.offerPrice),
          offerExpectedPrice: toNum(o.offerExpectedPrice),
          offerLawyer: o.offerLawyer || "—",
          providerAdditionalInfo: o.providerAdditionalInfo || "",
          providerCompanyName: o.providerCompany?.companyName || "—",
          providerTotalRating:
            toNum(o.providerCompany?.providerTotalRating) ?? null,
          providerQualityRating:
            toNum(o.providerCompany?.providerQualityRating) ?? null,
          providerCommunicationRating:
            toNum(o.providerCompany?.providerCommunicationRating) ?? null,
          providerBillingRating:
            toNum(o.providerCompany?.providerBillingRating) ?? null,
          providerHasRatings:
            Array.isArray(o.providerCompany?.providerIndividualRating) &&
            o.providerCompany.providerIndividualRating.length > 0,
          providerRatingCount: Array.isArray(
            o.providerCompany?.providerIndividualRating,
          )
            ? o.providerCompany.providerIndividualRating.length
            : 0,
          providerWebsite: o.providerCompany?.companyWebsite || "",
          providerPracticalRatings:
            o.providerCompany?.providerPracticalRatings ?? [],
          providerReferenceFiles: Array.isArray(o.providerReferenceFiles)
            ? o.providerReferenceFiles
            : [],
        }))
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
        maxPrice,
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

    const ua = await prisma.userAccount.findUnique({
      where: { userPkId: BigInt(session.userId) },
      select: { companyId: true },
    });
    if (!ua?.companyId)
      return NextResponse.json({ error: "Company not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const requestIdRaw = body?.requestId;
    if (!requestIdRaw)
      return NextResponse.json({ error: "Missing requestId" }, { status: 400 });

    const requestId = BigInt(requestIdRaw);
    const now = new Date();

    const r = await prisma.request.findUnique({
      where: { requestId },
      select: {
        clientCompanyId: true,
        requestState: true,
        acceptDeadline: true,
        details: true,
      },
    });

    if (!r || String(r.clientCompanyId) !== String(ua.companyId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

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
    const remainingHours = remainingMs / (1000 * 60 * 60);

    await prisma.request.update({
      where: { requestId },
      data: {
        acceptDeadline: newDeadline,
        details: {
          ...(details || {}),
          acceptDeadlineExtendedOnce: true,
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

export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ua = await prisma.userAccount.findUnique({
      where: { userPkId: BigInt(session.userId) },
      select: { companyId: true },
    });

    if (!ua?.companyId) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const requestIdRaw = body?.requestId;

    if (!requestIdRaw) {
      return NextResponse.json({ error: "Missing requestId" }, { status: 400 });
    }

    const requestId = BigInt(requestIdRaw);

    const request = await prisma.request.findUnique({
      where: { requestId },
      select: {
        requestId: true,
        title: true,
        clientCompanyId: true,
        requestState: true,
        offers: {
          select: {
            offerId: true,
            offerTitle: true,
            providerUser: {
              select: {
                email: true,
                notificationPreferences: true,
              },
            },
          },
        },
      },
    });

    if (!request || String(request.clientCompanyId) !== String(ua.companyId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!["ON HOLD", "CONFLICT_CHECK"].includes(request.requestState)) {
      return NextResponse.json(
        { error: "Request cannot be cancelled from this state" },
        { status: 400 },
      );
    }

    // Build per-provider email list:
    // - only valid email
    // - only if notificationPreferences contains "request_cancelled"
    // - one separate email per offerer
    const recipients = [];
    const seen = new Set();

    for (const offer of request.offers || []) {
      const email = offer?.providerUser?.email?.trim?.();
      const prefs = offer?.providerUser?.notificationPreferences;

      if (!email) continue;
      if (!hasNotificationPreference(prefs, "request-cancelled")) continue;

      // If same provider somehow has multiple offers, avoid sending duplicates.
      // Prefer first seen offerTitle.
      const dedupeKey = email.toLowerCase();
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      recipients.push({
        to: email,
        offerTitle: offer?.offerTitle || request.title || null,
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.offer.deleteMany({
        where: { requestId },
      });

      await tx.request.delete({
        where: { requestId },
      });
    });

    try {
      await notifyProvidersRequestCancelled({
        recipients: [
          ...recipients,
          {
            to: "support@lexify.online",
            offerTitle: null,
          },
        ],
      });
    } catch (mailErr) {
      console.error(
        "DELETE /api/me/requests/awaiting cancelled request but email send failed:",
        mailErr,
      );
    }

    return NextResponse.json({
      ok: true,
      deletedRequestId: requestId.toString(),
      notifiedProviders: recipients.length,
    });
  } catch (e) {
    console.error("DELETE /api/me/requests/awaiting failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
