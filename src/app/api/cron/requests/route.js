import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  notifyPurchaserPendingExpiredNoOffers,
  notifyPurchaserManualUnderMaxExpired,
  notifyPurchaserManualAllOverMaxExpired,
  notifyPurchaserOnHoldExpirySoon,
} from "@/lib/mailer";

function requireCronAuth(req) {
  const expected = process.env.CRON_SECRET;
  const got = req.headers.get("x-cron-secret");
  if (!expected || got !== expected) {
    const e = new Error("Unauthorized");
    e.status = 401;
    throw e;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isEmail = (s) => typeof s === "string" && EMAIL_RE.test(s.trim());
const normalize = (s) => (s ?? "").toString().trim().toLowerCase();
const fullName = (u) =>
  [u?.firstName, u?.lastName].filter(Boolean).join(" ").trim();

function toStringArray(val) {
  if (Array.isArray(val)) return val.filter((v) => typeof v === "string");
  if (val && typeof val === "object") {
    if (Array.isArray(val.set)) {
      return val.set.filter((v) => typeof v === "string");
    }
    if (Array.isArray(val.value)) {
      return val.value.filter((v) => typeof v === "string");
    }
  }
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        return parsed.filter((v) => typeof v === "string");
      }
      return val ? [val] : [];
    } catch {
      return val ? [val] : [];
    }
  }
  return [];
}

function hasNotificationPreference(user, pref) {
  return toStringArray(user?.notificationPreferences).includes(pref);
}

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
  const raw =
    request?.details?.maximumPrice ??
    request?.maximumPrice ??
    request?.details?.maxPrice ??
    null;
  return toNumberOrNull(raw);
}

async function setContractResult(requestId, yesOrNo) {
  await prisma.request.update({
    where: { requestId },
    data: { contractResult: yesOrNo },
  });
}

function getContractResult(row) {
  return row?.contractResult ?? null;
}

function pickPrimaryPurchaserUser(request) {
  const companyMembers = Array.isArray(request?.clientCompany?.members)
    ? request.clientCompany.members
    : [];

  const primaryName = normalize(request?.primaryContactPerson);
  if (primaryName) {
    const exact = companyMembers.find(
      (m) => normalize(fullName(m)) === primaryName,
    );
    if (exact) return exact;

    const loose = companyMembers.find((m) => {
      const first = normalize(m?.firstName);
      const last = normalize(m?.lastName);
      return (
        Boolean(first || last) &&
        primaryName.includes(`${first} ${last}`.trim())
      );
    });
    if (loose) return loose;
  }

  return (
    request?.createdByUser || request?.clientUser || companyMembers[0] || null
  );
}

function buildPurchaserRecipientGroup(request, requiredPref) {
  const recipients = new Set();
  const companyMembers = Array.isArray(request?.clientCompany?.members)
    ? request.clientCompany.members
    : [];

  const primaryUser = pickPrimaryPurchaserUser(request);
  if (
    primaryUser &&
    isEmail(primaryUser.email) &&
    hasNotificationPreference(primaryUser, requiredPref)
  ) {
    recipients.add(primaryUser.email.trim());
  }

  for (const member of companyMembers) {
    if (!isEmail(member?.email)) continue;
    if (!hasNotificationPreference(member, "all-notifications")) continue;
    recipients.add(member.email.trim());
  }

  if (recipients.size === 0) {
    const fallback =
      [
        primaryUser,
        request?.createdByUser,
        request?.clientUser,
        ...companyMembers,
      ].find(
        (u) => isEmail(u?.email) && hasNotificationPreference(u, requiredPref),
      ) || null;

    if (fallback?.email) {
      recipients.add(fallback.email.trim());
    }
  }

  return Array.from(recipients);
}

const purchaserEmailSelect = {
  primaryContactPerson: true,
  clientUser: {
    select: {
      userPkId: true,
      email: true,
      firstName: true,
      lastName: true,
      notificationPreferences: true,
      winningOfferSelection: true,
    },
  },
  createdByUser: {
    select: {
      userPkId: true,
      email: true,
      firstName: true,
      lastName: true,
      notificationPreferences: true,
      winningOfferSelection: true,
    },
  },
  clientCompany: {
    select: {
      companyPkId: true,
      members: {
        select: {
          userPkId: true,
          email: true,
          firstName: true,
          lastName: true,
          notificationPreferences: true,
        },
      },
    },
  },
};

export async function POST(req) {
  try {
    requireCronAuth(req);

    const now = new Date();

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
        details: true,
        title: true,
        paymentRate: true,
        ...purchaserEmailSelect,
        offers: {
          select: {
            offerId: true,
            offerPrice: true,
            providerId: true,
            offerTitle: true,
            offerLawyer: true,
          },
        },
      },
    });

    let expiredNoOffers = 0;
    let onHoldManual = 0;

    for (const r of pendingExpired) {
      const requestId = r.requestId;
      const offers = Array.isArray(r.offers) ? r.offers : [];
      const hasOffers = offers.length > 0;
      const winningMode = (
        r.createdByUser?.winningOfferSelection ||
        r.clientUser?.winningOfferSelection ||
        ""
      ).toLowerCase();

      const maxPriceNum = getMaximumPrice(r);

      const offersWithNum = offers
        .map((o) => ({ ...o, priceNum: toNumberOrNull(o.offerPrice) }))
        .filter((o) => o.priceNum != null);

      const anyUnderMax =
        maxPriceNum == null
          ? offersWithNum.length > 0
          : offersWithNum.some((o) => o.priceNum <= maxPriceNum);

      const isHourly =
        typeof r.paymentRate === "string" &&
        r.paymentRate.trim().toLowerCase().startsWith("blended hourly rate");

      if (!hasOffers) {
        await prisma.request.update({
          where: { requestId },
          data: { requestState: "EXPIRED" },
        });
        await setContractResult(requestId, "No");
        expiredNoOffers++;

        try {
          const toGroup = buildPurchaserRecipientGroup(r, "no_offers");
          if (toGroup.length > 0) {
            await notifyPurchaserPendingExpiredNoOffers({
              to: toGroup,
              requestTitle: r.title || "",
            });
          }
        } catch (e) {
          console.error("No-offers expiration email failed:", e);
        }

        continue;
      }

      if (winningMode === "manual" || !winningMode) {
        const accept = new Date(r.dateExpired ?? now);
        accept.setDate(accept.getDate() + 7);
        await prisma.request.update({
          where: { requestId },
          data: { requestState: "ON HOLD", acceptDeadline: accept },
        });
        onHoldManual++;

        if (anyUnderMax || isHourly) {
          try {
            const toGroup = buildPurchaserRecipientGroup(
              r,
              "pending_offer_selection",
            );
            if (toGroup.length > 0) {
              await notifyPurchaserManualUnderMaxExpired({
                to: toGroup,
                requestTitle: r.title || "",
              });
            }
          } catch (e) {
            console.error(
              "Manual-under-max/hourly expiration email failed:",
              e,
            );
          }
        } else {
          try {
            const toGroup = buildPurchaserRecipientGroup(r, "over_max_price");
            if (toGroup.length > 0) {
              await notifyPurchaserManualAllOverMaxExpired({
                to: toGroup,
                requestTitle: r.title || "",
              });
            }
          } catch (e) {
            console.error("Manual-all-over-max expiration email failed:", e);
          }
        }

        continue;
      }

      const accept = new Date(r.dateExpired ?? now);
      accept.setDate(accept.getDate() + 7);
      await prisma.request.update({
        where: { requestId },
        data: { requestState: "ON HOLD", acceptDeadline: accept },
      });
      onHoldManual++;
    }

    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const onHoldSoon = await prisma.request.findMany({
      where: {
        requestState: "ON HOLD",
        acceptDeadline: {
          gt: now,
          lte: in48h,
        },
      },
      select: {
        requestId: true,
        title: true,
        acceptDeadline: true,
        details: true,
        ...purchaserEmailSelect,
      },
    });

    for (const r of onHoldSoon) {
      const details =
        r.details && typeof r.details === "object" ? r.details : {};

      if (details.expirationNotified === true) {
        continue;
      }

      try {
        const toGroup = buildPurchaserRecipientGroup(
          r,
          "pending_offer_selection",
        );

        if (toGroup.length > 0) {
          await notifyPurchaserOnHoldExpirySoon({
            to: toGroup,
            requestTitle: r.title || "",
          });

          await prisma.request.update({
            where: { requestId: r.requestId },
            data: {
              details: {
                ...details,
                expirationNotified: true,
              },
            },
          });
        }
      } catch (err) {
        console.error(
          "Failed to send ON HOLD 48h expiration reminder for request",
          String(r.requestId),
          err,
        );
      }
    }

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
