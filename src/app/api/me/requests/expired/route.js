// src/app/api/me/requests/expired/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// BigInt-safe JSON
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

const safeStringId = (v) =>
  typeof v === "bigint" ? v.toString() : v != null ? String(v) : null;

function normalizeContractResult(value, hasWonOffer) {
  if (value == null || value === "") {
    return hasWonOffer ? "Yes" : "No";
  }

  const s = String(value).trim().toLowerCase();

  if (["yes", "true", "won", "contracted"].includes(s)) return "Yes";
  if (["no", "false", "lost", "not contracted"].includes(s)) return "No";

  return String(value);
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ua = await prisma.userAccount.findUnique({
      where: { userPkId: BigInt(session.userId) },
      select: {
        companyId: true,
        company: { select: { companyName: true } },
      },
    });

    if (!ua?.companyId) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const companyName = (ua.company?.companyName || "").trim();

    const requestIdRows =
      companyName.length > 0
        ? await prisma.$queryRaw`
            SELECT r."requestId"
            FROM "Request" r
            LEFT JOIN "AppUser" a ON a."userId" = r."clientId"
            WHERE
              r."requestState" = 'EXPIRED'
              AND (
                r."clientCompanyId" = ${ua.companyId}
                OR r."clientId" = ${ua.companyId}
                OR LOWER(COALESCE(a."companyName", '')) = LOWER(${companyName})
              )
            ORDER BY r."dateCreated" DESC
          `
        : await prisma.$queryRaw`
            SELECT r."requestId"
            FROM "Request" r
            WHERE
              r."requestState" = 'EXPIRED'
              AND (
                r."clientCompanyId" = ${ua.companyId}
                OR r."clientId" = ${ua.companyId}
              )
            ORDER BY r."dateCreated" DESC
          `;

    const requestIds = Array.isArray(requestIdRows)
      ? requestIdRows.map((r) => r?.requestId).filter(Boolean)
      : [];

    if (requestIds.length === 0) {
      return NextResponse.json(serialize({ requests: [] }));
    }

    const requests = await prisma.request.findMany({
      where: {
        requestId: { in: requestIds },
      },
      orderBy: { dateCreated: "desc" },
      select: {
        requestId: true,
        title: true,
        dateCreated: true,
        dateExpired: true,
        requestState: true,
        currency: true,
        paymentRate: true,
        contractResult: true,
        details: true,
        offers: {
          select: {
            offerId: true,
            offerPrice: true,
            offerStatus: true,
            providerCompany: {
              select: {
                companyName: true,
              },
            },
            provider: {
              select: {
                companyName: true,
              },
            },
          },
        },
      },
    });

    const shaped = requests.map((r) => {
      const maxPrice = maxFromDetails(r.details);
      const allOffers = Array.isArray(r.offers) ? r.offers : [];

      const validOffers = allOffers
        .map((o) => ({
          offerId: safeStringId(o.offerId),
          offeredPrice: toNum(o.offerPrice),
          offerStatus: o.offerStatus || null,
          providerCompanyName:
            o.providerCompany?.companyName || o.provider?.companyName || "—",
        }))
        .filter((o) => typeof o.offeredPrice === "number")
        .sort((a, b) => a.offeredPrice - b.offeredPrice);

      const bestOffer = validOffers[0] || null;

      const wonOffer =
        validOffers.find(
          (o) =>
            String(o.offerStatus || "")
              .trim()
              .toUpperCase() === "WON",
        ) || null;

      const runnerUps = wonOffer
        ? validOffers.filter((o) => o.offerId !== wonOffer.offerId).slice(0, 2)
        : validOffers.slice(1, 3);

      return {
        requestId: safeStringId(r.requestId),
        requestTitle: r.title || "—",
        dateCreated: r.dateCreated,
        dateExpired: r.dateExpired,
        currency: r.currency || null,
        paymentRate: r.paymentRate || null,
        contractResult: normalizeContractResult(r.contractResult, !!wonOffer),
        maxPrice,
        bestOffer,
        runnerUps,
      };
    });

    return NextResponse.json(serialize({ requests: shaped }));
  } catch (e) {
    console.error("GET /api/me/requests/expired failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
