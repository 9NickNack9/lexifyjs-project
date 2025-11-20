// src/app/api/me/requests/awaiting/select/route.js
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { htmlToPdfBuffer } from "@/lib/contractPdf.js";
import { sendContractEmail } from "@/lib/mailer.js";
import { filesToAttachments } from "@/lib/fetchFiles.js";
import ContractPrint from "@/emails/ContractPrint.jsx";
import { promises as fs } from "fs";
import path from "path";
import {
  notifyPurchaserContractFormed,
  notifyWinningLawyerContractFormed,
  notifyLosingLawyerNotSelected,
  notifyProviderConflictCheck,
} from "@/lib/mailer";

// ---- local helper (mirrors pending route) ----
async function sendContractPackageEmail(prisma, requestId) {
  // Load contract + participants
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
          clientId: true,
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

  // Fallback: if request.client is null, load it by clientId
  let requestClient = contract.request?.client || null;
  if (!requestClient && contract.request?.clientId) {
    requestClient = await prisma.appUser.findUnique({
      where: { userId: contract.request.clientId },
      select: {
        companyName: true,
        companyId: true,
        companyCountry: true,
        companyContactPersons: true,
        userId: true,
      },
    });
  }

  const norm = (s) => (s || "").toString().trim().toLowerCase();
  const full = (p) =>
    [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim();

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
  const offerLawyer = won?.offerLawyer?.toString?.().trim() || "";
  const contacts = contract.provider?.companyContactPersons || [];
  const match =
    contacts.find((c) => norm(full(c)) === norm(offerLawyer)) ||
    contacts.find(
      (c) =>
        norm(c?.firstName).startsWith(norm(offerLawyer)) ||
        norm(c?.lastName).startsWith(norm(offerLawyer))
    ) ||
    null;

  const provider = {
    userId: contract.provider?.userId ?? null,
    companyName: contract.provider?.companyName || "—",
    businessId: contract.provider?.companyId || "—",
    contactName: match ? full(match) : offerLawyer || "—",
    email: match?.email || "—",
    phone: match?.telephone || "—",
  };

  const pcDirect =
    contract.request?.primaryContactPerson ||
    contract.request?.details?.primaryContactPerson ||
    null;
  const list = Array.isArray(contract.request?.client?.companyContactPersons)
    ? contract.request.client.companyContactPersons
    : [];
  const pc =
    pcDirect &&
    (pcDirect.firstName ||
      pcDirect.lastName ||
      pcDirect.email ||
      pcDirect.telephone)
      ? pcDirect
      : list[0] || null;
  const purchaser = {
    companyName: requestClient?.companyName || "—",
    businessId: requestClient?.companyId || "—",
    contactName: pc ? full(pc) : "—",
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
        companyName: requestClient?.companyName || null,
        companyId: requestClient?.companyId || null,
        companyCountry: requestClient?.companyCountry || null,
      },
    },
  };

  // load preview defs
  let defs = null;
  const origin = process.env.APP_ORIGIN;
  if (origin) {
    try {
      const res = await fetch(`${origin}/previews/all-previews.json`, {
        cache: "no-store",
      });
      if (res.ok) defs = await res.json();
    } catch {}
  }
  if (!defs) {
    try {
      const p = path.join(
        process.cwd(),
        "public",
        "previews",
        "all-previews.json"
      );
      defs = JSON.parse(await fs.readFile(p, "utf8"));
    } catch {}
  }
  const norm2 = (s) => (s ?? "").toString().trim().toLowerCase();
  const cat =
    norm2(shaped.request.requestCategory) ||
    norm2(shaped.request?.details?.requestCategory);
  const sub =
    norm2(shaped.request.requestSubcategory) ||
    norm2(shaped.request?.details?.requestSubcategory);
  const asg =
    norm2(shaped.request.assignmentType) ||
    norm2(shaped.request?.details?.assignmentType);
  const previewDef =
    defs?.requests?.find(
      (d) =>
        norm2(d.category) === cat &&
        norm2(d.subcategory) === sub &&
        norm2(d.assignmentType) === asg
    ) ||
    defs?.requests?.find(
      (d) => norm2(d.category) === cat && norm2(d.subcategory) === sub
    ) ||
    defs?.requests?.find((d) => norm2(d.category) === cat) ||
    null;

  const html = ContractPrint({
    contract: shaped,
    companyName: shaped.purchaser.companyName,
    previewDef,
  });
  const pdf = await htmlToPdfBuffer(html);
  const files = [
    ...(shaped.request.backgroundInfoFiles || []),
    ...(shaped.request.supplierCodeOfConductFiles || []),
  ];
  const fileAtts = await filesToAttachments(files, {
    origin: process.env.APP_ORIGIN,
  });
  const attachments = [
    {
      filename: `LEXIFY-Contract-${shaped.request.id}.pdf`,
      content: pdf.toString("base64"),
    },
    ...fileAtts,
  ];

  const to = [
    ...expandWithAllNotificationContacts(
      { email: provider.email },
      contract.provider?.companyContactPersons || []
    ),
    ...expandWithAllNotificationContacts(
      { email: purchaser.email },
      contract.request?.client?.companyContactPersons || []
    ),
  ];

  const subject = `LEXIFY Contract - ${
    shaped.request.title || shaped.purchaser.companyName || ""
  }`;
  const emailHtml = `
    <div style="font-family:Arial,Helvetica,sans-serif">
      <p>Please find attached your new LEXIFY Contract with all appendices.</p>
      <p><strong>Provider Representative:</strong> ${
        provider.contactName
      } &lt;${provider.email || ""}&gt;</p>
      <p><strong>Purchaser Representative:</strong> ${
        purchaser.contactName
      } &lt;${purchaser.email || ""}&gt;</p>
    </div>`;
  await sendContractEmail({
    to,
    bcc: ["support@lexify.online"],
    subject,
    html: emailHtml,
    attachments,
  });
}

// --- email helpers (place near other helpers) ---
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isEmail = (s) => typeof s === "string" && EMAIL_RE.test(s.trim());

// Find the primary contact person object (not just email) by offerLawyer name
function findPrimaryContactByLawyer(offerLawyer, contacts) {
  const norm = (s) => (s ?? "").toString().trim().toLowerCase();
  const full = (p) =>
    [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim();
  const name = norm(offerLawyer);
  if (!Array.isArray(contacts)) return null;

  return (
    contacts.find((c) => norm(full(c)) === name) ||
    contacts.find(
      (c) => norm(c?.firstName) === name || norm(c?.lastName) === name
    ) ||
    null
  );
}

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

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { requestId, offerId } = body || {};

    let reqIdBig, offerIdBig, clientIdBig;
    try {
      reqIdBig = BigInt(String(requestId));
      offerIdBig = BigInt(String(offerId));
      clientIdBig = BigInt(String(session.userId));
    } catch {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }

    const requestRow = await prisma.request.findUnique({
      where: { requestId: reqIdBig },
      select: {
        clientId: true,
        requestState: true,
        acceptDeadline: true,
        details: true,
      },
    });
    if (!requestRow || requestRow.clientId !== clientIdBig) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (requestRow.requestState !== "ON HOLD") {
      return NextResponse.json(
        { error: "Request is not on hold" },
        { status: 400 }
      );
    }

    const offerRow = await prisma.offer.findUnique({
      where: { offerId: offerIdBig },
      select: {
        offerId: true,
        offerPrice: true,
        providerId: true,
        requestId: true,
        offerTitle: true,
      },
    });
    if (!offerRow || offerRow.requestId !== reqIdBig) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    // Check for confidentiality for conflict check before creating contract
    const confidentialYes =
      (requestRow?.details?.confidential || "")
        .toString()
        .trim()
        .toLowerCase() === "yes";

    if (confidentialYes) {
      const now = new Date();
      const remainingMs = Math.max(
        0,
        new Date(requestRow.acceptDeadline).getTime() - now.getTime()
      );

      await prisma.request.update({
        where: { requestId: reqIdBig },
        data: {
          requestState: "CONFLICT_CHECK",
          selectedOfferId: offerRow.offerId,
          acceptDeadlinePausedRemainingMs: remainingMs,
          acceptDeadlinePausedAt: now,
          // leave acceptDeadline as-is for audit; we’ll ignore it while paused
        },
      });

      // === email offer's lawyer + provider allNotifications contacts ===
      try {
        // Load provider's contacts + prefs and the chosen offer's title & lawyer
        const [provider, offerFull] = await Promise.all([
          prisma.appUser.findUnique({
            where: { userId: offerRow.providerId },
            select: {
              companyContactPersons: true,
              notificationPreferences: true,
            },
          }),
          prisma.offer.findUnique({
            where: { offerId: offerRow.offerId },
            select: { offerTitle: true, offerLawyer: true },
          }),
        ]);

        const prefs = toStringArray(provider?.notificationPreferences);
        const contacts = provider?.companyContactPersons || [];

        if (prefs.includes("winner-conflict-check")) {
          // Provider opted in → email offerLawyer + allNotifications contacts, BCC Support
          const lawyerPrimary =
            findPrimaryContactByLawyer(offerFull?.offerLawyer, contacts) ||
            null;

          // Fallback: if we didn't find a full contact, at least get the email by name
          const lawyerEmail = findLawyerEmail(offerFull?.offerLawyer, contacts);

          // Primary passed to expandWithAllNotificationContacts:
          //  - full contact (with email) if we have it
          //  - otherwise a bare { email } object if we only have the email
          const primaryForExpand =
            lawyerPrimary || (lawyerEmail ? { email: lawyerEmail } : null);

          const recipients = expandWithAllNotificationContacts(
            primaryForExpand,
            contacts
          );

          if (recipients.length > 0) {
            await notifyProviderConflictCheck({
              to: recipients,
              offerTitle: offerFull?.offerTitle || "",
              bcc: ["support@lexify.online"],
            });
          }
        } else {
          // Provider opted out → still notify admins only
          await notifyProviderConflictCheck({
            to: ["support@lexify.online"],
            offerTitle: offerFull?.offerTitle || "",
            // No extra BCC needed here; Support is already in "to"
          });
        }
      } catch (e) {
        console.error("confidentiality notification failed:", e);
      }

      // Do NOT create contract, update statuses, or send emails yet
      return NextResponse.json(
        { ok: true, conflictCheck: true },
        { status: 200 }
      );
    }

    // 1) Create the contract exactly once (no throw on duplicates)
    const createRes = await prisma.contract.createMany({
      data: [
        {
          requestId: reqIdBig,
          clientId: clientIdBig,
          providerId: offerRow.providerId,
          contractPrice:
            offerRow.offerPrice?.toString?.() ?? String(offerRow.offerPrice),
        },
      ],
      skipDuplicates: true,
    });
    const createdNow = (createRes?.count || 0) > 0;

    // 2) Update statuses in a clean transaction
    await prisma.$transaction([
      prisma.offer.update({
        where: { offerId: offerRow.offerId },
        data: { offerStatus: "WON" },
      }),
      prisma.offer.updateMany({
        where: { requestId: reqIdBig, offerId: { not: offerRow.offerId } },
        data: { offerStatus: "LOST" },
      }),
      prisma.request.update({
        where: { requestId: reqIdBig },
        data: { requestState: "EXPIRED", contractResult: "Yes" },
      }),
    ]);

    // 3) Email contract package only when newly created
    if (createdNow) {
      try {
        await sendContractPackageEmail(prisma, reqIdBig);
      } catch (e) {
        console.error("awaiting/select email failed:", e);
      }
    }

    if (createdNow) {
      try {
        // Fetch request + offers + purchaser + provider contacts to build all emails
        const data = await prisma.request.findUnique({
          where: { requestId: reqIdBig },
          select: {
            title: true,
            primaryContactPerson: true,
            client: {
              select: { companyContactPersons: true },
            },
            offers: {
              select: {
                offerId: true,
                offerTitle: true,
                offerLawyer: true,
                providerId: true,
                offerStatus: true,
              },
            },
          },
        });

        // Purchaser email
        const norm = (s) => (s ?? "").toString().trim().toLowerCase();
        const full = (p) =>
          [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim();

        const pc = data?.primaryContactPerson || null;
        const purchaserContacts = Array.isArray(
          data?.client?.companyContactPersons
        )
          ? data.client.companyContactPersons
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
          const toGroup = expandWithAllNotificationContacts(
            { email: purchaserEmail },
            purchaserContacts
          );
          await notifyPurchaserContractFormed({
            to: toGroup,
            requestTitle: data?.title || "",
          });
        }

        // Provider contacts for all offers
        const providerIds = Array.from(
          new Set((data?.offers || []).map((o) => String(o.providerId)))
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

        // Winner
        const winner = (data?.offers || []).find(
          (o) => (o.offerStatus || "").toUpperCase() === "WON"
        );
        if (winner) {
          const wMeta = providerMeta.get(String(winner.providerId)) || {
            contacts: [],
            prefs: [],
          };
          const wPrimary = findPrimaryContactByLawyer(
            winner.offerLawyer,
            wMeta.contacts
          );
          if (wPrimary?.email && isEmail(wPrimary.email)) {
            const toGroup = expandWithAllNotificationContacts(
              wPrimary,
              wMeta.contacts
            );
            await notifyWinningLawyerContractFormed({
              to: toGroup,
              offerTitle: winner.offerTitle || "",
            });
          }
        }

        // Losers
        for (const o of data?.offers || []) {
          if ((o.offerStatus || "").toUpperCase() === "WON") continue;
          const meta = providerMeta.get(String(o.providerId)) || {
            contacts: [],
            prefs: [],
          };
          if (!meta.prefs.includes("no-winning-offer")) continue;

          const primary = findPrimaryContactByLawyer(
            o.offerLawyer,
            meta.contacts
          );
          if (primary?.email && isEmail(primary.email)) {
            const toGroup = expandWithAllNotificationContacts(
              primary,
              meta.contacts
            );
            await notifyLosingLawyerNotSelected({
              to: toGroup,
              offerTitle: o.offerTitle || "",
            });
          }
        }
      } catch (e) {
        console.error("awaiting/select notifications failed:", e);
      }
    }

    return NextResponse.json(
      { ok: true, createdNow },
      { status: createdNow ? 201 : 200 }
    );
  } catch (e) {
    console.error("POST /api/me/requests/awaiting/select failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
