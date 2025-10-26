import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { htmlToPdfBuffer } from "@/lib/contractPdf.js";
import { sendContractEmail } from "@/lib/mailer.js";
import { filesToAttachments } from "@/lib/fetchFiles.js";
import ContractPrint from "@/emails/ContractPrint.jsx";
import { promises as fs } from "fs";
import path from "path";
import { notifyPurchaserPendingExpiredNoOffers } from "@/lib/mailer";
import { notifyPurchaserManualUnderMaxExpired } from "@/lib/mailer";
import { notifyPurchaserManualAllOverMaxExpired } from "@/lib/mailer";
import {
  notifyPurchaserContractFormed,
  notifyWinningLawyerContractFormed,
  notifyLosingLawyerNotSelected,
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

// Map offerLawyer name to provider's companyContactPersons email
function findLawyerEmail(offerLawyer, contacts) {
  const norm = (s) => (s ?? "").toString().trim().toLowerCase();
  const full = (p) =>
    [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim();
  const name = norm(offerLawyer);

  if (!Array.isArray(contacts)) return "";

  const exact =
    contacts.find((c) => norm(full(c)) === name) ||
    contacts.find(
      (c) => norm(c?.firstName) === name || norm(c?.lastName) === name
    ) ||
    null;

  return (exact?.email || "").trim();
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

async function sendContractPackageEmail(prisma, requestId) {
  // 1) Load contract + offer + reps like your /api/me/contracts does (same selects)
  const contract = await prisma.contract.findUnique({
    where: { requestId },
    select: {
      contractId: true,
      contractDate: true,
      contractPrice: true,
      providerId: true,
      request: {
        select: {
          requestId: true,
          requestCategory: true,
          requestSubcategory: true,
          assignmentType: true,
          title: true,
          currency: true,
          paymentRate: true,
          scopeOfWork: true,
          description: true,
          invoiceType: true,
          language: true,
          advanceRetainerFee: true,
          additionalBackgroundInfo: true,
          backgroundInfoFiles: true,
          supplierCodeOfConductFiles: true,
          primaryContactPerson: true,
          details: true,
          client: {
            select: {
              companyName: true,
              companyId: true,
              companyCountry: true,
              companyContactPersons: true,
              userId: true,
            },
          },
          offers: {
            select: { providerId: true, offerLawyer: true, offerStatus: true },
          },
        },
      },
      provider: {
        select: {
          userId: true,
          companyName: true,
          companyId: true,
          companyContactPersons: true,
        },
      },
    },
  });

  if (!contract) return;

  // 2) Shape to the same structure your ContractModal consumes
  const normalize = (s) => (s || "").toString().trim().toLowerCase();
  const fullName = (c) =>
    [c?.firstName, c?.lastName].filter(Boolean).join(" ").trim();

  // provider rep = offerLawyer matched to provider companyContactPersons
  const offers = Array.isArray(contract.request?.offers)
    ? contract.request.offers
    : [];
  const byProvider = offers.filter(
    (o) => String(o.providerId) === String(contract.providerId)
  );
  const won =
    byProvider.find((o) => (o.offerStatus || "").toUpperCase() === "WON") ||
    byProvider[0] ||
    null;
  const offerLawyerName = won?.offerLawyer?.toString?.().trim() || "";
  const contacts = contract.provider?.companyContactPersons || [];
  const match =
    contacts.find(
      (c) => normalize(fullName(c)) === normalize(offerLawyerName)
    ) ||
    contacts.find(
      (c) =>
        normalize(c?.firstName).startsWith(normalize(offerLawyerName)) ||
        normalize(c?.lastName).startsWith(normalize(offerLawyerName))
    ) ||
    null;

  const provider = {
    userId: contract.provider?.userId ?? null,
    companyName: contract.provider?.companyName || "—",
    businessId: contract.provider?.companyId || "—",
    contactName: match ? fullName(match) : offerLawyerName || "—",
    email: match?.email || "—",
    phone: match?.telephone || "—",
  };

  // purchaser rep (primary contact) with fallbacks
  const pcDirect =
    contract.request?.primaryContactPerson ||
    contract.request?.details?.primaryContactPerson ||
    null;
  const fallbackList = Array.isArray(
    contract.request?.client?.companyContactPersons
  )
    ? contract.request.client.companyContactPersons
    : [];
  const pc =
    pcDirect &&
    (pcDirect.firstName ||
      pcDirect.lastName ||
      pcDirect.email ||
      pcDirect.telephone)
      ? pcDirect
      : fallbackList[0] || null;

  const purchaser = {
    companyName: contract.request?.client?.companyName || "—",
    businessId: contract.request?.client?.companyId || "—",
    contactName: pc ? fullName(pc) : "—",
    email: pc?.email || "—",
    phone: pc?.telephone || "—",
  };

  const shaped = {
    contractDate: contract.contractDate,
    contractPrice:
      Number(
        contract.contractPrice?.toString?.() ?? contract.contractPrice ?? 0
      ) || null,
    contractPriceCurrency: contract.request?.currency || null,
    contractPriceType: contract.request?.paymentRate || null,
    provider,
    purchaser,
    request: {
      id: contract.request?.requestId || null,
      requestCategory: contract.request?.requestCategory || null,
      requestSubcategory: contract.request?.requestSubcategory || null,
      assignmentType: contract.request?.assignmentType || null,
      title: contract.request?.title || "—",
      scopeOfWork: contract.request?.scopeOfWork || "—",
      description: contract.request?.description || "—",
      invoiceType: contract.request?.invoiceType || "—",
      language: contract.request?.language || "—",
      advanceRetainerFee: contract.request?.advanceRetainerFee || "—",
      currency: contract.request?.currency || null,
      paymentRate: contract.request?.paymentRate || null,
      maximumPrice:
        typeof contract.request?.details?.maximumPrice === "number"
          ? contract.request.details.maximumPrice
          : null,
      additionalBackgroundInfo:
        contract.request?.additionalBackgroundInfo ??
        contract.request?.details?.additionalBackgroundInfo ??
        null,
      backgroundInfoFiles:
        contract.request?.backgroundInfoFiles ??
        contract.request?.details?.backgroundInfoFiles ??
        [],
      supplierCodeOfConductFiles:
        contract.request?.supplierCodeOfConductFiles ??
        contract.request?.details?.supplierCodeOfConductFiles ??
        [],
      details: contract.request?.details || {},
      primaryContactPerson: pc || null,
      client: {
        companyName: contract.request?.client?.companyName || null,
        companyId: contract.request?.client?.companyId || null,
        companyCountry: contract.request?.client?.companyCountry || null,
      },
    },
  };

  // 3) Load preview definitions (server-safe)
  let defs = null;
  const origin = process.env.APP_ORIGIN; // e.g. http://localhost:3000 or your prod origin
  if (origin) {
    try {
      const res = await fetch(`${origin}/previews/all-previews.json`, {
        cache: "no-store",
      });
      if (res.ok) defs = await res.json();
    } catch {}
  }
  if (!defs) {
    // Fallback: read from /public/previews/all-previews.json
    try {
      const p = path.join(
        process.cwd(),
        "public",
        "previews",
        "all-previews.json"
      );
      const raw = await fs.readFile(p, "utf8");
      defs = JSON.parse(raw);
    } catch {}
  }

  const matchDef = () => {
    if (!defs?.requests) return null;
    const list = defs.requests;
    const norm = (s) => (s ?? "").toString().trim().toLowerCase();
    const cat =
      norm(shaped.request.requestCategory) ||
      norm(shaped.request?.details?.requestCategory);
    const sub =
      norm(shaped.request.requestSubcategory) ||
      norm(shaped.request?.details?.requestSubcategory);
    const asg =
      norm(shaped.request.assignmentType) ||
      norm(shaped.request?.details?.assignmentType);
    return (
      list.find(
        (d) =>
          norm(d.category) === cat &&
          norm(d.subcategory) === sub &&
          norm(d.assignmentType) === asg
      ) ||
      list.find(
        (d) => norm(d.category) === cat && norm(d.subcategory) === sub
      ) ||
      list.find((d) => norm(d.category) === cat) ||
      null
    );
  };
  const previewDef = matchDef();

  // 4) Render HTML (same as modal visuals) & make PDF
  const html = ContractPrint({
    contract: shaped,
    companyName: shaped.purchaser.companyName,
    previewDef,
  });
  const pdf = await htmlToPdfBuffer(html);

  // 5) Collect attachments (contract PDF + request files)
  const fileAtts = [
    ...(await filesToAttachments(shaped.request.backgroundInfoFiles || [], {
      origin: process.env.APP_ORIGIN,
    })),
    ...(await filesToAttachments(
      shaped.request.supplierCodeOfConductFiles || [],
      { origin: process.env.APP_ORIGIN }
    )),
  ];
  const attachments = [
    {
      filename: `LEXIFY-Contract-${requestId}.pdf`,
      content: pdf.toString("base64"),
    },
    ...fileAtts,
  ];

  // 6) Email both reps
  const to = [provider.email, purchaser.email].filter(Boolean);
  const subject = `LEXIFY Contract - ${
    shaped.request.title || shaped.purchaser.companyName || ""
  }`;
  const intro =
    "Attached is your LEXIFY Contract cover page as a PDF along with the request's attachments.";
  const inlineNotice =
    "If attachments are large, some email clients may truncate the message.";
  const emailHtml = `
    <div style="font-family:Arial,Helvetica,sans-serif">
      <p>${intro}</p>
      <p><strong>Provider Representative:</strong> ${
        provider.contactName
      } &lt;${provider.email || ""}&gt;</p>
      <p><strong>Purchaser Representative:</strong> ${
        purchaser.contactName
      } &lt;${purchaser.email || ""}&gt;</p>
    </div>
  `;

  await sendContractEmail({
    to,
    bcc: ["support@lexify.online"],
    subject,
    html: emailHtml,
    attachments,
  });
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

      const lowest = offersWithNum.reduce(
        (best, cur) =>
          best == null || cur.priceNum < best.priceNum ? cur : best,
        null
      );

      const anyUnderMax =
        maxPriceNum == null
          ? offersWithNum.length > 0
          : offersWithNum.some((o) => o.priceNum <= maxPriceNum);
      // If there's no max price (hourly rate), we should also notify
      const isHourly =
        typeof r.details?.paymentRate === "string" &&
        r.details.paymentRate.trim().toLowerCase().startsWith("hourly rate");

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
            await notifyPurchaserPendingExpiredNoOffers({
              to: toEmail,
              requestTitle: r.title || "", // pass the request title to the template
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
              await notifyPurchaserManualUnderMaxExpired({
                to: toEmail,
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
              await notifyPurchaserManualAllOverMaxExpired({
                to: toEmail,
                requestTitle: r.title || "",
              });
            }
          } catch (e) {
            console.error("Manual-all-over-max expiration email failed:", e);
          }
        }

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
          let createdNow = false;
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
              createdNow = true;
            }
            // Email sending
            if (createdNow) {
              try {
                // 1) Purchaser primary contact email
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

                const purchaserContacts = Array.isArray(
                  r.client?.companyContactPersons
                )
                  ? r.client.companyContactPersons
                  : [];

                let purchaserEmail = "";
                if (pc) {
                  const target = norm(full(pc));
                  const match =
                    purchaserContacts.find((c) => norm(full(c)) === target) ||
                    purchaserContacts.find(
                      (c) =>
                        norm(c?.firstName) === norm(pc.firstName) ||
                        norm(c?.lastName) === norm(pc.lastName)
                    ) ||
                    null;
                  purchaserEmail = (match?.email || pc.email || "").trim();
                }
                if (!purchaserEmail && purchaserContacts.length > 0) {
                  purchaserEmail = (purchaserContacts[0]?.email || "").trim();
                }

                if (purchaserEmail) {
                  await notifyPurchaserContractFormed({
                    to: purchaserEmail,
                    requestTitle: r.title || "",
                  });
                }

                // 2) Winner / Losers emails
                // We need provider contacts for all providers who submitted offers on this request
                const providerIds = Array.from(
                  new Set((r.offers || []).map((o) => String(o.providerId)))
                ).map((id) => BigInt(id));

                const providers = await prisma.appUser.findMany({
                  where: { userId: { in: providerIds } },
                  select: {
                    userId: true,
                    companyContactPersons: true,
                    notificationPreferences: true,
                  },
                });
                const providerMeta = new Map(
                  providers.map((p) => [
                    String(p.userId),
                    {
                      contacts: p.companyContactPersons || [],
                      prefs: toStringArray(p.notificationPreferences),
                    },
                  ])
                );

                const winningProviderId = String(winning.providerId);

                // Winner first
                const winnerOffer = (r.offers || []).find(
                  (o) => String(o.providerId) === winningProviderId
                );
                if (winnerOffer) {
                  const winnerContacts =
                    contactsByProvider.get(String(winnerOffer.providerId)) ||
                    [];
                  const winnerEmail = findLawyerEmail(
                    winnerOffer.offerLawyer,
                    winnerContacts
                  );
                  if (winnerEmail) {
                    await notifyWinningLawyerContractFormed({
                      to: winnerEmail,
                      offerTitle: winnerOffer.offerTitle || "",
                    });
                  }
                }

                // Losers
                for (const o of r.offers || []) {
                  if (String(o.providerId) === winningProviderId) continue;
                  const meta = providerMeta.get(String(o.providerId)) || {
                    contacts: [],
                    prefs: [],
                  };
                  if (!meta.prefs.includes("no-winning-offer")) continue;
                  const email = findLawyerEmail(o.offerLawyer, meta.contacts);
                  if (email) {
                    await notifyLosingLawyerNotSelected({
                      to: email,
                      offerTitle: o.offerTitle || "",
                    });
                  }
                }
              } catch (e) {
                console.error("Cron: auto-award notifications failed:", e);
              }
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

          // NEW: send the email package only if we actually created the contract
          if (createdNow) {
            try {
              await sendContractPackageEmail(prisma, requestId);
            } catch (e) {
              console.error("Cron: emailing contract package failed", e);
            }
          }

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
