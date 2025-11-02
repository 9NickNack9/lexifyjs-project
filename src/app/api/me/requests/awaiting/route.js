// src/app/api/me/requests/awaiting/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { TURBOPACK_CLIENT_MIDDLEWARE_MANIFEST } from "next/dist/shared/lib/constants";

// BigInt-safe JSON helper
const serialize = (obj) =>
  JSON.parse(
    JSON.stringify(obj, (_, v) => (typeof v === "bigint" ? v.toString() : v))
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
        requestState: "ON HOLD",
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
        selectedOfferId: true,
        acceptDeadlinePausedRemainingMs: true,
        requestState: true,
        disqualifiedOfferIds: true,
        offers: {
          select: {
            offerId: true,
            offerPrice: true,
            offerLawyer: true,
            provider: {
              select: {
                companyName: true,
                providerTotalRating: true,
              },
            },
            providerId: true,
            offerStatus: true,
          },
        },
      },
    });

    const shaped = reqs.map((r) => {
      const maxPrice = maxFromDetails(r.details);
      const disqSet = new Set(
        toStringArray(r.disqualifiedOfferIds).map(String) // use helper like in your select route
      );
      const offers = (r.offers || [])
        .filter((o) => (o.offerStatus || "").toUpperCase() !== "DISQUALIFIED")
        .filter((o) => !disqSet.has(String(o.offerId)))
        .map((o) => ({
          // ↓↓↓ Convert BigInts to strings ↓↓↓
          offerId:
            typeof o.offerId === "bigint"
              ? o.offerId.toString()
              : String(o.offerId),
          providerId:
            typeof o.providerId === "bigint"
              ? o.providerId.toString()
              : String(o.providerId),

          offeredPrice: toNum(o.offerPrice),
          offerLawyer: o.offerLawyer || "—",
          providerCompanyName: o.provider?.companyName || "—",
          providerTotalRating: toNum(o.provider?.providerTotalRating) ?? null,
        }))
        .filter((o) => typeof o.offeredPrice === "number")
        .sort((a, b) => a.offeredPrice - b.offeredPrice)
        .slice(0, 3);

      return {
        // ↓↓↓ Convert BigInt to string ↓↓↓
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
      };
    });

    return NextResponse.json(serialize({ requests: shaped }));
  } catch (e) {
    console.error("GET /api/me/requests/awaiting failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
