import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  notifyPurchaserPendingExpiredNoOffers,
  notifyPurchaserManualUnderMaxExpired,
  notifyPurchaserManualAllOverMaxExpired,
} from "@/lib/mailer";

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

// --- email helpers (place near other helpers) ---
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isEmail = (s) => typeof s === "string" && EMAIL_RE.test(s.trim());

// Given a primary contact (or email) + the same user's contacts,
// return [primaryEmail, ...all allNotifications=true emails (excluding primary)]
function expandWithAllNotificationContacts(primary, contacts) {
  const primaryEmail =
    typeof primary === "string" ? primary : primary?.email || "";
  const base = new Set();
  if (isEmail(primaryEmail)) base.add(primaryEmail.trim());

  (Array.isArray(contacts) ? contacts : [])
    .filter((c) => c && c.allNotifications === true && isEmail(c.email))
    .forEach((c) => base.add(c.email.trim()));

  return Array.from(base);
}

// normalize Json / legacy {set:[]} / string → string[]
function toStringArray(val) {
  if (Array.isArray(val)) return val.filter((v) => typeof v === "string");
  if (val && typeof val === "object") {
    if (Array.isArray(val.set))
      return val.set.filter((v) => typeof v === "string");
    if (Array.isArray(val.value))
      return val.value.filter((v) => typeof v === "string");
  }
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed))
        return parsed.filter((v) => typeof v === "string");
      return val ? [val] : [];
    } catch {
      return val ? [val] : [];
    }
  }
  return [];
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
        title: true,
        primaryContactPerson: true,
        client: {
          select: {
            userId: true,
            winningOfferSelection: true, // "manual" | "automatic"
            companyContactPersons: true,
            notificationPreferences: true,
          },
        },
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

      const anyUnderMax =
        maxPriceNum == null
          ? offersWithNum.length > 0
          : offersWithNum.some((o) => o.priceNum <= maxPriceNum);
      // If there's no max price (hourly rate), we should also notify
      const isHourly =
        typeof r.paymentRate === "string" &&
        r.paymentRate.trim().toLowerCase().startsWith("hourly rate");

      if (!hasOffers) {
        // RULE 1: No offers → EXPIRED + contractResult = "No"
        await prisma.request.update({
          where: { requestId },
          data: { requestState: "EXPIRED" },
        });
        await setContractResult(requestId, "No");
        expiredNoOffers++;

        // --- NEW: email the purchaser's primary contact
        try {
          const norm = (s) => (s ?? "").toString().trim().toLowerCase();
          const full = (p) =>
            [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim();

          // prefer r.primaryContactPerson (or details.primaryContactPerson if that’s your pattern)
          const pc =
            (r.primaryContactPerson &&
              (r.primaryContactPerson.firstName ||
                r.primaryContactPerson.lastName ||
                r.primaryContactPerson.email ||
                r.primaryContactPerson.telephone) &&
              r.primaryContactPerson) ||
            null;

          const contacts = Array.isArray(r.client?.companyContactPersons)
            ? r.client.companyContactPersons
            : [];

          let toEmail = "";

          if (pc) {
            const target = norm(full(pc));
            // exact full-name match, else relaxed match on first/last
            const match =
              contacts.find((c) => norm(full(c)) === target) ||
              contacts.find(
                (c) =>
                  norm(c?.firstName) === norm(pc.firstName) ||
                  norm(c?.lastName) === norm(pc.lastName)
              ) ||
              null;
            toEmail = (match?.email || pc.email || "").trim();
          }

          // final fallback: first contact (only if we still don’t have an email)
          if (!toEmail && contacts.length > 0) {
            toEmail = (contacts[0]?.email || "").trim();
          }

          const purchaserPrefs = toStringArray(
            r.client?.notificationPreferences
          );
          if (toEmail && purchaserPrefs.includes("no_offers")) {
            const toGroup = expandWithAllNotificationContacts(
              { email: toEmail },
              contacts // purchaser's companyContactPersons you already loaded
            );
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

      if (winningMode === "manual") {
        // RULE 2: Manual → ON HOLD + acceptDeadline = dateExpired + 7 days
        const accept = new Date(r.dateExpired ?? now);
        accept.setDate(accept.getDate() + 7);
        await prisma.request.update({
          where: { requestId },
          data: { requestState: "ON HOLD", acceptDeadline: accept },
        });
        onHoldManual++;

        // if there are offers and any are under (or equal to) max price, email purchaser primary contact
        if (anyUnderMax || isHourly) {
          try {
            const norm = (s) => (s ?? "").toString().trim().toLowerCase();
            const full = (p) =>
              [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim();

            // prefer stored primaryContactPerson; fall back to first company contact if needed
            const pc =
              (r.primaryContactPerson &&
                (r.primaryContactPerson.firstName ||
                  r.primaryContactPerson.lastName ||
                  r.primaryContactPerson.email ||
                  r.primaryContactPerson.telephone) &&
                r.primaryContactPerson) ||
              null;

            const contacts = Array.isArray(r.client?.companyContactPersons)
              ? r.client.companyContactPersons
              : [];

            let toEmail = "";

            if (pc) {
              const target = norm(full(pc));
              const match =
                contacts.find((c) => norm(full(c)) === target) ||
                contacts.find(
                  (c) =>
                    norm(c?.firstName) === norm(pc.firstName) ||
                    norm(c?.lastName) === norm(pc.lastName)
                ) ||
                null;
              toEmail = (match?.email || pc.email || "").trim();
            }

            if (!toEmail && contacts.length > 0) {
              toEmail = (contacts[0]?.email || "").trim();
            }

            const purchaserPrefs = toStringArray(
              r.client?.notificationPreferences
            );
            if (toEmail && purchaserPrefs.includes("pending_offer_selection")) {
              const toGroup = expandWithAllNotificationContacts(
                { email: toEmail },
                contacts // purchaser's companyContactPersons you already loaded
              );
              await notifyPurchaserManualUnderMaxExpired({
                to: toGroup,
                requestTitle: r.title || "",
              });
            }
          } catch (e) {
            console.error(
              "Manual-under-max/hourly expiration email failed:",
              e
            );
          }
        } else {
          // manual selection + ALL offers over max price → notify purchaser
          try {
            const norm = (s) => (s ?? "").toString().trim().toLowerCase();
            const full = (p) =>
              [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim();

            const pc =
              (r.primaryContactPerson &&
                (r.primaryContactPerson.firstName ||
                  r.primaryContactPerson.lastName ||
                  r.primaryContactPerson.email ||
                  r.primaryContactPerson.telephone) &&
                r.primaryContactPerson) ||
              null;

            const contacts = Array.isArray(r.client?.companyContactPersons)
              ? r.client.companyContactPersons
              : [];

            let toEmail = "";

            if (pc) {
              const target = norm(full(pc));
              const match =
                contacts.find((c) => norm(full(c)) === target) ||
                contacts.find(
                  (c) =>
                    norm(c?.firstName) === norm(pc.firstName) ||
                    norm(c?.lastName) === norm(pc.lastName)
                ) ||
                null;
              toEmail = (match?.email || pc.email || "").trim();
            }

            if (!toEmail && contacts.length > 0) {
              toEmail = (contacts[0]?.email || "").trim();
            }

            const purchaserPrefs = toStringArray(
              r.client?.notificationPreferences
            );
            if (toEmail && purchaserPrefs.includes("over_max_price")) {
              const toGroup = expandWithAllNotificationContacts(
                { email: toEmail },
                contacts // purchaser's companyContactPersons you already loaded
              );
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
