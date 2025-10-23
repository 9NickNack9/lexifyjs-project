import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 🔐 Require a shared-secret header for cron calls
function requireCronAuth(req) {
  const expected = process.env.CRON_SECRET;
  const got = req.headers.get("x-cron-secret");
  if (!expected || got !== expected) {
    const e = new Error("Unauthorized");
    e.status = 401;
    throw e;
  }
}

// Convert Decimal|string|number|null → number|null (only for comparisons)
function toNumberOrNull(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const s = v.replace(/[^\d.,-]/g, "").replace(",", ".");
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function getMaximumPrice(request) {
  // May live in details.*; not a top-level column
  const raw =
    request?.maximumPrice ?? // harmless if undefined
    request?.details?.maximumPrice ??
    request?.details?.maxPrice ??
    null;
  return toNumberOrNull(raw);
}

// Write "Yes"/"No" to contractResult (schema field)
async function setContractResult(requestId, yesOrNo) {
  await prisma.request.update({
    where: { requestId },
    data: { contractResult: yesOrNo },
  });
}

// Read current Yes/No from contractResult
function getContractResult(row) {
  return row?.contractResult ?? null;
}

export async function POST(req) {
  try {
    requireCronAuth(req);

    const now = new Date();

    // Find all PENDING requests whose dateExpired <= now
    const pendingExpired = await prisma.request.findMany({
      where: {
        requestState: "PENDING",
        dateExpired: { lte: now },
      },
      select: {
        requestId: true,
        dateExpired: true,
        requestState: true,
        acceptDeadline: true,
        contractResult: true,
        details: true, // to read details.maximumPrice
        client: {
          select: {
            userId: true,
            winningOfferSelection: true, // "manual" | "automatic"
          },
        },
        offers: {
          select: {
            offerId: true,
            offerPrice: true,
            providerId: true,
          },
        },
      },
    });

    let expiredNoOffers = 0;
    let onHoldManual = 0;
    let autoAwarded = 0;
    let onHoldAutoOverBudget = 0;

    for (const r of pendingExpired) {
      const requestId = r.requestId;
      const offers = Array.isArray(r.offers) ? r.offers : [];
      const hasOffers = offers.length > 0;
      const winningMode = (r.client?.winningOfferSelection || "").toLowerCase();

      // Resolve maximum price safely (may be absent)
      const maxPriceNum = getMaximumPrice(r);

      const offersWithNum = offers
        .map((o) => ({ ...o, priceNum: toNumberOrNull(o.offerPrice) }))
        .filter((o) => o.priceNum != null);

      const lowest = offersWithNum.reduce(
        (best, cur) =>
          best == null || cur.priceNum < best.priceNum ? cur : best,
        null
      );

      const anyUnderMax =
        maxPriceNum == null
          ? offersWithNum.length > 0
          : offersWithNum.some((o) => o.priceNum <= maxPriceNum);

      if (!hasOffers) {
        // RULE 1: No offers → EXPIRED + contractResult = "No"
        await prisma.request.update({
          where: { requestId },
          data: { requestState: "EXPIRED" },
        });
        await setContractResult(requestId, "No");
        expiredNoOffers++;
        continue;
      }

      if (winningMode === "manual") {
        // RULE 2: Manual → ON HOLD + acceptDeadline = dateExpired + 7 days
        const accept = new Date(r.dateExpired ?? now);
        accept.setDate(accept.getDate() + 7);
        await prisma.request.update({
          where: { requestId },
          data: { requestState: "ON HOLD", acceptDeadline: accept },
        });
        onHoldManual++;
        continue;
      }

      if (winningMode === "automatic") {
        if (anyUnderMax) {
          // RULE 3: Automatic + (no maxPrice but has offers) OR (offer <= maxPrice)
          const winning = lowest ?? null;
          if (!winning) {
            const accept = new Date(r.dateExpired ?? now);
            accept.setDate(accept.getDate() + 7);
            await prisma.request.update({
              where: { requestId },
              data: { requestState: "ON HOLD", acceptDeadline: accept },
            });
            onHoldAutoOverBudget++;
            continue;
          }

          await prisma.$transaction(async (tx) => {
            // ✅ 1) Ensure exactly one contract per requestId without throwing
            const existing = await tx.contract.findUnique({
              where: { requestId }, // Contract.requestId is @unique
              select: { contractId: true },
            });

            if (!existing) {
              await tx.contract.create({
                data: {
                  requestId,
                  clientId: r.client.userId, // purchaser
                  providerId: winning.providerId, // winning offer's provider
                  contractPrice:
                    winning.offerPrice?.toString?.() ??
                    String(winning.offerPrice),
                },
              });
            }

            // ✅ 2) Mark the winning offer as WON
            await tx.offer.update({
              where: { offerId: winning.offerId },
              data: { offerStatus: "WON" },
            });

            // ✅ 3) Mark all other offers on this request as LOST
            await tx.offer.updateMany({
              where: {
                requestId,
                offerId: { not: winning.offerId },
              },
              data: { offerStatus: "LOST" },
            });

            // ✅ 4) Update the request state and contract result (schema field)
            await tx.request.update({
              where: { requestId },
              data: { requestState: "EXPIRED", contractResult: "Yes" },
            });
          });

          // Idempotent double-set outside tx
          await prisma.request.update({
            where: { requestId },
            data: { requestState: "EXPIRED" },
          });
          await setContractResult(requestId, "Yes");

          autoAwarded++;
        } else {
          // RULE 4: Automatic + all offers over maxPrice → ON HOLD + 7 days
          const accept = new Date(r.dateExpired ?? now);
          accept.setDate(accept.getDate() + 7);
          await prisma.request.update({
            where: { requestId },
            data: { requestState: "ON HOLD", acceptDeadline: accept },
          });
          onHoldAutoOverBudget++;
        }
        continue;
      }

      // Unknown/missing winningOfferSelection → ON HOLD + 7 days
      const accept = new Date(r.dateExpired ?? now);
      accept.setDate(accept.getDate() + 7);
      await prisma.request.update({
        where: { requestId },
        data: { requestState: "ON HOLD", acceptDeadline: accept },
      });
      onHoldManual++;
    }

    // RULE 5: Any ON HOLD past acceptDeadline & not contracted → EXPIRED + contractResult="No"
    const onHoldPast = await prisma.request.findMany({
      where: { requestState: "ON HOLD", acceptDeadline: { lte: now } },
      select: { requestId: true, contractResult: true },
    });

    let onHoldExpired = 0;
    for (const r of onHoldPast) {
      const yesNo = getContractResult(r);
      if (String(yesNo || "").toLowerCase() !== "yes") {
        await prisma.request.update({
          where: { requestId: r.requestId },
          data: { requestState: "EXPIRED" },
        });
        await setContractResult(r.requestId, "No");
        onHoldExpired++;
      }
    }

    return NextResponse.json({
      ok: true,
      ranAt: now.toISOString(),
      stats: {
        pendingExpiredProcessed: pendingExpired.length,
        expiredNoOffers,
        onHoldManual,
        autoAwardedContracts: autoAwarded,
        onHoldAutoOverBudget,
        onHoldExpiredNoContract: onHoldExpired,
      },
    });
  } catch (err) {
    const status = err?.status || 500;
    const msg = err?.message || "Server error";
    console.error("Cron /api/cron/requests error:", err);
    return NextResponse.json({ error: msg }, { status });
  }
}
