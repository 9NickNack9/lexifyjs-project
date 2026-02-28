// src/app/api/me/requests/awaiting/select/route.js
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { contractToPdfBuffer } from "@/lib/contractToPdfBuffer";
import { filesToAttachments } from "@/lib/fetchFiles.js";
import { promises as fs } from "fs";
import path from "path";
import {
  sendContractEmail,
  notifyPurchaserContractFormed,
  notifyWinningLawyerContractFormed,
  notifyLosingLawyerNotSelected,
  notifyProviderConflictCheck,
} from "@/lib/mailer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomBytes } from "crypto";

const s3 = new S3Client({
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: !!process.env.S3_FORCE_PATH_STYLE,
  credentials: process.env.S3_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      }
    : undefined,
});

function hasS3() {
  return !!(
    process.env.S3_BUCKET &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY
  );
}

async function uploadPdfBufferToS3(buffer, prefix = "contractpdfs") {
  const key = `${prefix}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.pdf`;

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: "application/pdf",
      ACL: "public-read",
    }),
  );

  const base = process.env.S3_PUBLIC_BASE_URL;
  const url = base ? `${base}/${key}` : `s3://${process.env.S3_BUCKET}/${key}`;
  return { key, url };
}

async function savePdfBufferLocally(buffer, prefix = "contractpdfs") {
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}.pdf`;
  const dir = path.join(process.cwd(), "public", prefix);
  await fs.mkdir(dir, { recursive: true }); // ensure folder exists
  const abs = path.join(dir, name);
  await fs.writeFile(abs, buffer);

  const key = `${prefix}/${name}`;
  const url = `/${prefix}/${name}`;
  return { key, url };
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function toHtmlWithLineBreaks(s) {
  return escapeHtml(s).replace(/\r?\n/g, "<br/>");
}

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
            select: {
              providerId: true,
              offerLawyer: true,
              offerStatus: true,
              offerTitle: true,
              providerAdditionalInfo: true,
            },
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

  // Fallback: if request.client is null, load it by clientId (Company PK)
  let requestClient = contract.request?.client || null;
  if (!requestClient && contract.request?.clientId) {
    requestClient = await prisma.company.findUnique({
      where: { companyPkId: contract.request.clientId },
      select: {
        companyName: true,
        businessId: true,
        companyCountry: true,
        companyContactPersons: true,
        companyPkId: true,
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
    (o) => String(o.providerId) === String(contract.providerId),
  );
  const won =
    byProvider.find((o) => (o.offerStatus || "").toUpperCase() === "WON") ||
    byProvider[0] ||
    null;

  const coverNoteRaw =
    typeof won?.providerAdditionalInfo === "string"
      ? won.providerAdditionalInfo.trim()
      : "";

  const coverNoteHtml = coverNoteRaw
    ? toHtmlWithLineBreaks(coverNoteRaw)
    : "None";

  const offerLawyer = won?.offerLawyer?.toString?.().trim() || "";
  const contacts = contract.provider?.companyContactPersons || [];
  const match =
    contacts.find((c) => norm(full(c)) === norm(offerLawyer)) ||
    contacts.find(
      (c) =>
        norm(c?.firstName).startsWith(norm(offerLawyer)) ||
        norm(c?.lastName).startsWith(norm(offerLawyer)),
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

  // --- Purchaser contact: resolve from primaryContactPerson STRING + client contacts ---

  // 1) Raw primary contact from request (can be string or object)
  const primaryRaw =
    contract.request?.primaryContactPerson ??
    contract.request?.details?.primaryContactPerson ??
    "";

  // 2) Normalize to a name string (handles both string and object shapes)
  let primaryName = "";
  if (primaryRaw && typeof primaryRaw === "string") {
    primaryName = primaryRaw.toString().trim();
  } else if (primaryRaw && typeof primaryRaw === "object") {
    primaryName = full(primaryRaw); // uses firstName + lastName
  }

  // 3) Client contact persons (use requestClient fallback we already loaded)
  const clientContacts = Array.isArray(requestClient?.companyContactPersons)
    ? requestClient.companyContactPersons
    : [];

  const normalized = (s) => (s || "").toString().trim().toLowerCase();

  // 4) Try to match the primaryName to a contact person
  const purchaserContact =
    clientContacts.find(
      (c) =>
        normalized(`${c.firstName} ${c.lastName}`) === normalized(primaryName),
    ) ||
    clientContacts.find(
      (c) =>
        normalized(c.firstName) === normalized(primaryName) ||
        normalized(c.lastName) === normalized(primaryName),
    ) ||
    null;

  // 5) Shape purchaser object
  const purchaser = {
    companyName: requestClient?.companyName || "—",
    businessId: requestClient?.companyId || "—",
    // Prefer the name from the request; fall back to contact person name
    contactName:
      primaryName || (purchaserContact ? full(purchaserContact) : "—"),
    email: purchaserContact?.email || "—",
    phone: purchaserContact?.telephone || "—",
  };

  const shaped = {
    contractDate: contract.contractDate,
    contractPrice: Number(contract.contractPrice ?? 0),
    contractPriceCurrency: contract.request?.currency || null,
    contractPriceType: contract.request?.paymentRate || null,
    provider,
    purchaser,
    request: {
      ...contract.request,
      // For the PDF, keep primaryContactPerson as the name string (same as test-send-contract)
      primaryContactPerson: primaryName,
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
        "all-previews.json",
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
        norm2(d.assignmentType) === asg,
    ) ||
    defs?.requests?.find(
      (d) => norm2(d.category) === cat && norm2(d.subcategory) === sub,
    ) ||
    defs?.requests?.find((d) => norm2(d.category) === cat) ||
    null;

  // --- Generate PDF buffer with React-PDF (same logic as test-send-contract) ----
  console.log("Starting contractToPdfBuffer render for awaiting/select…");
  const pdfBuffer = await contractToPdfBuffer({
    contract: shaped,
    companyName: shaped.purchaser.companyName,
    previewDef,
  });
  console.log("React-PDF buffer length:", pdfBuffer?.length);

  if (!pdfBuffer || pdfBuffer.length === 0) {
    throw new Error("React-PDF returned empty buffer in awaiting/select");
  }

  // --- Save contract PDF to storage & persist reference on contract ---
  try {
    const stored = hasS3()
      ? await uploadPdfBufferToS3(pdfBuffer, "contractpdfs")
      : await savePdfBufferLocally(pdfBuffer, "contractpdfs");

    const uniqueName = `LEXIFY-Contract-${
      contract.contractId
    }-${Date.now()}.pdf`;

    const pdfMeta = {
      name: uniqueName,
      type: "application/pdf",
      size: pdfBuffer.length,
      url: stored.url,
      key: stored.key,
    };

    await prisma.contract.update({
      where: { contractId: contract.contractId },
      data: { contractPdfFile: pdfMeta },
    });
  } catch (e) {
    console.error(
      "Failed to persist contractPdfFile for contract",
      String(contract.contractId),
      e,
    );
    // do not throw – still proceed with sending emails
  }

  // --- Build attachments: contract PDF + request files ----
  const files = [
    ...(shaped.request.backgroundInfoFiles || []),
    ...(shaped.request.supplierCodeOfConductFiles || []),
  ];

  const fileAtts = await filesToAttachments(files, {
    origin: process.env.APP_ORIGIN,
    max: 12,
    maxBytes: 12 * 1024 * 1024,
  });

  const attachments = [
    {
      filename: `LEXIFY-Contract.pdf`,
      content: pdfBuffer.toString("base64"),
      type: "application/pdf",
      disposition: "attachment",
    },
    ...fileAtts,
  ];

  // ---- Build recipient groups ----
  // Purchaser side: request's primaryContactPerson + allNotifications=true contacts
  const purchaserContacts = Array.isArray(
    contract.request?.client?.companyContactPersons,
  )
    ? contract.request.client.companyContactPersons
    : [];

  const primaryPurchaser =
    purchaserContact && isEmail(purchaserContact.email)
      ? { email: purchaserContact.email }
      : isEmail(purchaser.email)
        ? { email: purchaser.email }
        : null;

  const toPurchaser = expandWithAllNotificationContacts(
    primaryPurchaser,
    purchaserContacts,
  );

  // Provider side: winning offer's offerLawyer + allNotifications=true contacts
  const providerContacts = Array.isArray(
    contract.provider?.companyContactPersons,
  )
    ? contract.provider.companyContactPersons
    : [];

  // `match` and `offerLawyer` are computed earlier in this helper
  const lawyerPrimary = match ||
    (offerLawyer
      ? { email: findLawyerEmail(offerLawyer, providerContacts) }
      : null) || { email: provider.email };

  const toProvider = expandWithAllNotificationContacts(
    lawyerPrimary,
    providerContacts,
  );

  // ---- Email HTML (unchanged) ----
  const purchaserEmailHtml = `
    <div style="font-family:Arial,Helvetica,sans-serif">
      <p>Please find attached your new LEXIFY contract, including all appendices. Your legal service provider will contact you shortly to begin the assignment.</p>
      <p><strong>Legal Service Provider Representative:</strong> ${
        provider.contactName
      } &lt;${provider.email || ""}&gt;</p>
      <p><strong>Legal Service Provider Cover Note from Offer:</strong> ${coverNoteHtml}</p>
      <p><strong>Legal Service Purchaser Representative:</strong> ${
        purchaser.contactName
      } &lt;${purchaser.email || ""}&gt;</p>
    </div>`;

  const providerEmailHtml = `
    <div style="font-family:Arial,Helvetica,sans-serif">
      <p>Please find attached your new LEXIFY contract, including all appendices. You can now contact the client using the details on the cover page to initiate the assignment without delay.</p>
      <p><strong>Legal Service Provider Representative:</strong> ${
        provider.contactName
      } &lt;${provider.email || ""}&gt;</p>
      <p><strong>Legal Service Provider Cover Note from Offer:</strong> ${coverNoteHtml}</p>
      <p><strong>Legal Service Purchaser Representative:</strong> ${
        purchaser.contactName
      } &lt;${purchaser.email || ""}&gt;</p>
    </div>`;

  // ---- Send two separate emails ----

  //  Purchaser email: "LEXIFY Contract - request.title"
  if (toPurchaser.length > 0) {
    await sendContractEmail({
      to: toPurchaser,
      bcc: ["support@lexify.online"],
      subject: `LEXIFY Contract - ${shaped.request.title || ""}`,
      html: purchaserEmailHtml,
      attachments,
    });
  } else {
    console.warn(
      "sendContractPackageEmail: no purchaser recipients resolved for requestId",
      String(requestId),
    );
  }

  // Provider email: "LEXIFY Contract - offer.offerTitle"
  if (toProvider.length > 0) {
    await sendContractEmail({
      to: toProvider,
      bcc: ["support@lexify.online"],
      subject: `LEXIFY Contract - ${won?.offerTitle || ""}`,
      html: providerEmailHtml,
      attachments,
    });
  } else {
    console.warn(
      "sendContractPackageEmail: no provider recipients resolved for requestId",
      String(requestId),
    );
  }
}

// --- email helpers ---
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isEmail = (s) => typeof s === "string" && EMAIL_RE.test(s.trim());

// Find the primary contact person object (not just email) by offerLawyer name
const norm = (s) => (s ?? "").toString().trim().toLowerCase();
const fullName = (p) =>
  [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim();

function findPrimaryContactByLawyer(offerLawyerName, contacts) {
  if (!Array.isArray(contacts) || !offerLawyerName) return null;
  const want = norm(offerLawyerName);

  // exact full-name match
  const exact =
    contacts.find((c) => norm(fullName(c)) === want) ||
    contacts.find(
      (c) => norm(c?.firstName) === want || norm(c?.lastName) === want,
    ) ||
    null;

  if (exact) return exact;

  // fallback: startsWith on either part
  return (
    contacts.find(
      (c) =>
        norm(c?.firstName).startsWith(want) ||
        norm(c?.lastName).startsWith(want),
    ) || null
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

// Map offerLawyer name to provider's companyContactPersons email
function findLawyerEmail(offerLawyerName, contacts) {
  const exact = findPrimaryContactByLawyer(offerLawyerName, contacts);
  return (exact?.email || "").trim();
}

// Provider prefs = union across all provider UserAccounts in that provider company
async function getProviderMeta(providerCompanyIdBig) {
  const [company, accounts] = await Promise.all([
    prisma.company.findUnique({
      where: { companyPkId: providerCompanyIdBig },
      select: { companyContactPersons: true },
    }),
    prisma.userAccount.findMany({
      where: {
        companyId: providerCompanyIdBig,
        role: "PROVIDER",
      },
      select: {
        practicalNotificationPreferences: true,
        notificationPreferences: true,
      },
    }),
  ]);

  const contacts = Array.isArray(company?.companyContactPersons)
    ? company.companyContactPersons
    : [];

  const prefSet = new Set();
  for (const a of accounts || []) {
    const prefs = toStringArray(
      a?.practicalNotificationPreferences ?? a?.notificationPreferences,
    );
    for (const p of prefs) prefSet.add(String(p));
  }

  return { contacts, prefs: Array.from(prefSet) };
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // session.userId = UserAccount.userPkId
    const ua = await prisma.userAccount.findUnique({
      where: { userPkId: BigInt(session.userId) },
      select: { companyId: true },
    });

    if (!ua?.companyId) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const purchaserCompanyIdBig = ua.companyId;

    const body = await req.json().catch(() => ({}));
    const { requestId, offerId, selectReason, teamRequest } = body || {};

    let reqIdBig, offerIdBig;
    try {
      reqIdBig = BigInt(String(requestId));
      offerIdBig = BigInt(String(offerId));
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

    // ownership check uses purchaser company PK now
    if (
      !requestRow ||
      String(requestRow.clientId) !== String(purchaserCompanyIdBig)
    ) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (requestRow.requestState !== "ON HOLD") {
      return NextResponse.json(
        { error: "Request is not on hold" },
        { status: 400 },
      );
    }

    const baseDetails =
      requestRow.details && typeof requestRow.details === "object"
        ? { ...requestRow.details }
        : {};

    if (typeof selectReason === "string") {
      const v = selectReason.trim();
      if (v) baseDetails.selectReason = v;
    }

    if (typeof teamRequest === "string") {
      const v = teamRequest.trim();
      if (v) baseDetails.teamRequest = v;
    }

    const offerRow = await prisma.offer.findUnique({
      where: { offerId: offerIdBig },
      select: {
        offerId: true,
        offerPrice: true,
        providerId: true, // provider company PK
        requestId: true,
        offerTitle: true,
      },
    });

    if (!offerRow || String(offerRow.requestId) !== String(reqIdBig)) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    // Check for confidentiality: if yes, pause and go to CONFLICT_CHECK (no contract yet)
    const confidentialYes =
      (requestRow?.details?.confidential || "")
        .toString()
        .trim()
        .toLowerCase() === "yes";

    if (confidentialYes) {
      const now = new Date();
      const remainingMs = Math.max(
        0,
        new Date(requestRow.acceptDeadline).getTime() - now.getTime(),
      );

      await prisma.request.update({
        where: { requestId: reqIdBig },
        data: {
          requestState: "CONFLICT_CHECK",
          selectedOfferId: offerRow.offerId,
          acceptDeadlinePausedRemainingMs: remainingMs,
          acceptDeadlinePausedAt: now,
          details: baseDetails,
        },
      });

      // === notify provider: conflict check ===
      try {
        const offerFull = await prisma.offer.findUnique({
          where: { offerId: offerRow.offerId },
          select: { offerTitle: true, offerLawyer: true },
        });

        const meta = await getProviderMeta(offerRow.providerId);
        const prefs = meta.prefs || [];
        const contacts = meta.contacts || [];

        if (prefs.includes("winner-conflict-check")) {
          const lawyerPrimary =
            findPrimaryContactByLawyer(offerFull?.offerLawyer, contacts) ||
            null;
          const lawyerEmail = findLawyerEmail(offerFull?.offerLawyer, contacts);
          const primaryForExpand =
            lawyerPrimary || (lawyerEmail ? { email: lawyerEmail } : null);

          const recipients = expandWithAllNotificationContacts(
            primaryForExpand,
            contacts,
          );

          if (recipients.length > 0) {
            await notifyProviderConflictCheck({
              to: recipients,
              offerTitle: offerFull?.offerTitle || "",
              bcc: ["support@lexify.online"],
            });
          }
        } else {
          // opted out → admins only
          await notifyProviderConflictCheck({
            to: ["support@lexify.online"],
            offerTitle: offerFull?.offerTitle || "",
          });
        }
      } catch (e) {
        console.error("confidentiality notification failed:", e);
      }

      return NextResponse.json(
        { ok: true, conflictCheck: true },
        { status: 200 },
      );
    }

    // 1) Create the contract exactly once (no throw on duplicates)
    const createRes = await prisma.contract.createMany({
      data: [
        {
          requestId: reqIdBig,
          clientId: purchaserCompanyIdBig, // purchaser company pk
          providerId: offerRow.providerId, // provider company pk
          contractPrice:
            offerRow.offerPrice?.toString?.() ?? String(offerRow.offerPrice),
        },
      ],
      skipDuplicates: true,
    });

    const createdNow = (createRes?.count || 0) > 0;

    // 2) Update statuses atomically
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
        data: {
          requestState: "EXPIRED",
          contractResult: "Yes",
          details: baseDetails,
        },
      }),
    ]);

    // 3) Send contract package only when newly created
    if (createdNow) {
      try {
        await sendContractPackageEmail(prisma, reqIdBig);
      } catch (e) {
        console.error("awaiting/select email failed:", e);
      }
    }

    // 4) Notifications (winner + losers) only when newly created
    if (createdNow) {
      // === Notify Purchaser: Contract Formed ===
      try {
        const purchaserContacts = Array.isArray(
          data?.client?.companyContactPersons,
        )
          ? data.client.companyContactPersons
          : [];

        const primaryPurchaser =
          purchaserContacts.find((c) =>
            String(c?.position || "")
              .toLowerCase()
              .includes("primary"),
          ) ||
          purchaserContacts[0] ||
          null;

        if (primaryPurchaser?.email && isEmail(primaryPurchaser.email)) {
          const toGroup = expandWithAllNotificationContacts(
            primaryPurchaser,
            purchaserContacts,
          );

          if (toGroup.length > 0) {
            await notifyPurchaserContractFormed({
              to: toGroup,
              requestTitle: data?.title || "",
            });
          }
        }
      } catch (e) {
        console.error("notifyPurchaserContractFormed failed:", e);
      }
      try {
        // Pull enough to email purchaser + providers
        const data = await prisma.request.findUnique({
          where: { requestId: reqIdBig },
          select: {
            title: true,
            primaryContactPerson: true,
            details: true,
            client: { select: { companyContactPersons: true } },
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

        const purchaserContacts = Array.isArray(
          data?.client?.companyContactPersons,
        )
          ? data.client.companyContactPersons
          : [];

        // Purchaser email (if your existing code notifies purchaser here, keep it)

        // Build provider meta cache: providerId -> { contacts, prefs }
        const providerIds = Array.from(
          new Set((data?.offers || []).map((o) => String(o.providerId))),
        ).filter(Boolean);

        const providerMeta = new Map();
        await Promise.all(
          providerIds.map(async (pid) => {
            try {
              const meta = await getProviderMeta(BigInt(pid));
              providerMeta.set(pid, meta);
            } catch {
              providerMeta.set(pid, { contacts: [], prefs: [] });
            }
          }),
        );

        // Winner
        const winner = (data?.offers || []).find(
          (o) => (o.offerStatus || "").toUpperCase() === "WON",
        );

        if (winner) {
          const meta = providerMeta.get(String(winner.providerId)) || {
            contacts: [],
            prefs: [],
          };

          // If your existing behavior is "always notify winner" regardless of prefs,
          // leave it as-is. If you gate it on prefs, keep the gate.
          const primary = findPrimaryContactByLawyer(
            winner.offerLawyer,
            meta.contacts,
          );

          if (primary?.email && isEmail(primary.email)) {
            const toGroup = expandWithAllNotificationContacts(
              primary,
              meta.contacts,
            );

            // Team request info: keep the exact semantics you had before
            let teamReq = "";
            const rawTeamReq = data?.details?.teamRequest;
            if (typeof rawTeamReq === "string") teamReq = rawTeamReq.trim();
            else if (rawTeamReq != null) teamReq = String(rawTeamReq).trim();

            const basePayload = {
              to: toGroup,
              offerTitle: winner.offerTitle || "",
            };

            if (teamReq) {
              await notifyWinningLawyerContractFormed({
                ...basePayload,
                teamCompTitle: "Team Composition Request",
                compText:
                  "The client has requested that the following legal professional(s) be included in the project team: ",
                teamDetails: teamReq,
                confirmText:
                  "Please confirm team availability when discussing engagement details with the client.",
              });
            } else {
              await notifyWinningLawyerContractFormed(basePayload);
            }
          }
        }

        // Losers
        for (const o of data?.offers || []) {
          if ((o.offerStatus || "").toUpperCase() === "WON") continue;

          const meta = providerMeta.get(String(o.providerId)) || {
            contacts: [],
            prefs: [],
          };

          // keep same preference key you already used
          if (!meta.prefs.includes("no-winning-offer")) continue;

          const primary = findPrimaryContactByLawyer(
            o.offerLawyer,
            meta.contacts,
          );
          if (primary?.email && isEmail(primary.email)) {
            const toGroup = expandWithAllNotificationContacts(
              primary,
              meta.contacts,
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
      { status: createdNow ? 201 : 200 },
    );
  } catch (e) {
    console.error("POST /api/me/requests/awaiting/select failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
