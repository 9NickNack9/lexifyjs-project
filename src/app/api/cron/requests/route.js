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
  // prefer top-level if your schema has it, else details
  const raw =
    request?.maximumPrice ??
    request?.details?.maximumPrice ??
    request?.details?.maxPrice ??
    null;
  return toNumberOrNull(raw);
}

// Write "Yes"/"No" to either contractResult or contractStatus (whichever exists)
async function updateRequestContractYesNo(requestId, yesOrNo) {
  try {
    return await prisma.request.update({
      where: { requestId },
      data: { contractResult: yesOrNo },
    });
  } catch {
    return await prisma.request.update({
      where: { requestId },
      data: { contractStatus: yesOrNo },
    });
  }
}

// Read the current Yes/No from either name
function readContractYesNo(reqRow) {
  return (reqRow && (reqRow.contractResult ?? reqRow.contractStatus)) ?? null;
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
        maximumPrice: true,
        requestState: true,
        acceptDeadline: true,
        contractResult: true,
        contractStatus: true,
        details: true,
        client: {
          select: {
            userId: true,
            winningOfferSelection: true, // "manual" | "Automatic"
          },
        },
        // Only need essential offer fields
        offers: {
          select: {
            offerId: true,
            offerPrice: true, // Decimal/string OK
            providerId: true, // BigInt
          },
        },
      },
    });

    let expiredNoOffers = 0;
    let onHoldManual = 0;
    let autoAwarded = 0;
    let onHoldAutoOverBudget = 0;

    for (const r of pendingExpired) {
      const requestId = r.requestId; // BigInt (keep as-is)
      const offers = Array.isArray(r.offers) ? r.offers : [];
      const hasOffers = offers.length > 0;
      const winningMode = (r.client?.winningOfferSelection || "").toLowerCase();
      const maxPriceNum = getMaximumPrice(r);
      // Build an array with numeric prices for comparisons
      const offersWithNum = offers
        .map((o) => ({
          ...o,
          priceNum: toNumberOrNull(o.offerPrice),
        }))
        .filter((o) => o.priceNum != null);

      // Lowest numeric price (for Automatic)
      const lowest = offersWithNum.reduce(
        (best, cur) =>
          best == null || cur.priceNum < best.priceNum ? cur : best,
        null
      );

      // Any offer under/equal to maxPrice? If no maxPrice, any offer qualifies
      const anyUnderMax =
        maxPriceNum == null
          ? offersWithNum.length > 0
          : offersWithNum.some((o) => o.priceNum <= maxPriceNum);

      if (!hasOffers) {
        // RULE 1: No offers → EXPIRED + contractResult="No"
        await prisma.request.update({
          where: { requestId },
          data: { requestState: "EXPIRED" },
        });
        await updateRequestContractYesNo(requestId, "No");
        expiredNoOffers++;
        continue;
      }

      if (winningMode === "manual") {
        // RULE 2: Offers exist & manual → ON HOLD + acceptDeadline = dateExpired + 7 days
        const accept = new Date(r.dateExpired ?? now);
        accept.setDate(accept.getDate() + 7);
        await prisma.request.update({
          where: { requestId },
          data: {
            requestState: "ON HOLD",
            acceptDeadline: accept,
          },
        });
        onHoldManual++;
        continue;
      }

      if (winningMode === "automatic") {
        if (anyUnderMax) {
          // RULE 3: Automatic + (no maxPrice but has offers) OR (has offer <= maxPrice)
          // Create a Contract for the *lowest* priced offer
          // Guard: in pathological case all prices failed to parse, fallback to ON HOLD
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

          // Create Contract using your relations:
          //  - requestId (BigInt)
          //  - clientId  (from request.client.userId)
          //  - providerId (from winning offer.providerId)
          //  - contractPrice (Decimal) — pass as string to be safe
          await prisma.$transaction(async (tx) => {
            // 1) Ensure exactly one contract per requestId
            await tx.contract.upsert({
              where: { requestId }, // BigInt of the current request
              update: {},
              create: {
                requestId,
                clientId: r.client.userId, // purchaser from the Request
                providerId: winning.providerId,
                contractPrice:
                  winning.offerPrice?.toString?.() ??
                  String(winning.offerPrice),
              },
            });

            // 2) Mark the winning offer as WON
            await tx.offer.update({
              where: { offerId: winning.offerId },
              data: { offerStatus: "WON" },
            });

            // 3) Mark all other offers on this request as LOST
            await tx.offer.updateMany({
              where: {
                requestId,
                offerId: { not: winning.offerId },
              },
              data: { offerStatus: "LOST" },
            });

            // 4) Update the request state and contract result
            await tx.request.update({
              where: { requestId },
              data: { requestState: "EXPIRED" },
            });

            try {
              await tx.request.update({
                where: { requestId },
                data: { contractResult: "Yes" },
              });
            } catch {
              await tx.request.update({
                where: { requestId },
                data: { contractStatus: "Yes" },
              });
            }
          });

          // Mark request EXPIRED + contractResult="Yes"
          await prisma.request.update({
            where: { requestId },
            data: { requestState: "EXPIRED" },
          });
          await updateRequestContractYesNo(requestId, "Yes");

          autoAwarded++;
        } else {
          // RULE 4: Automatic + all offers over maxPrice → ON HOLD + acceptDeadline = +7 days
          const accept = new Date(r.dateExpired ?? now);
          accept.setDate(accept.getDate() + 7);
          await prisma.request.update({
            where: { requestId },
            data: {
              requestState: "ON HOLD",
              acceptDeadline: accept,
            },
          });
          onHoldAutoOverBudget++;
        }
        continue;
      }

      // Unknown/missing winningOfferSelection → safe fallback: ON HOLD + 7 days
      {
        const accept = new Date(r.dateExpired ?? now);
        accept.setDate(accept.getDate() + 7);
        await prisma.request.update({
          where: { requestId },
          data: {
            requestState: "ON HOLD",
            acceptDeadline: accept,
          },
        });
        onHoldManual++;
      }
    }

    // RULE 5: Any ON HOLD past acceptDeadline and not contracted → EXPIRED + contract="No"
    const onHoldPast = await prisma.request.findMany({
      where: {
        requestState: "ON HOLD",
        acceptDeadline: { lte: now },
      },
      select: {
        requestId: true,
        contractResult: true,
        contractStatus: true,
      },
    });

    let onHoldExpired = 0;
    for (const r of onHoldPast) {
      const yesNo = readContractYesNo(r);
      if (String(yesNo || "").toLowerCase() !== "yes") {
        await prisma.request.update({
          where: { requestId: r.requestId },
          data: { requestState: "EXPIRED" },
        });
        await updateRequestContractYesNo(r.requestId, "No");
        onHoldExpired++;
      }
    }

    return NextResponse.json({
      ok: true,
      ranAt: now.toISOString(),
      stats: {
        pendingExpiredProcessed: pendingExpired.length,
        expiredNoOffers: expiredNoOffers,
        onHoldManual: onHoldManual,
        autoAwardedContracts: autoAwarded,
        onHoldAutoOverBudget: onHoldAutoOverBudget,
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
