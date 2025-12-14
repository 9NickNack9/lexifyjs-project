// src/app/api/admin/requests/[id]/conflict/route.js
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
  notifyPurchaserConflictDeniedWithRemainingOffers,
  notifyPurchaserConflictDeniedNoOffers,
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
    })
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

// ---------- helpers copied from awaiting/select (trimmed to what we need) ----------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isEmail = (s) => typeof s === "string" && EMAIL_RE.test(s.trim());
const norm = (s) => (s ?? "").toString().trim().toLowerCase();
const fullName = (p) =>
  [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim();

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

function findPrimaryContactByLawyer(offerLawyer, contacts) {
  const name = norm(offerLawyer);
  if (!Array.isArray(contacts)) return null;
  return (
    contacts.find((c) => norm(fullName(c)) === name) ||
    contacts.find(
      (c) => norm(c?.firstName) === name || norm(c?.lastName) === name
    ) ||
    null
  );
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

async function sendContractPackageEmail(prisma, requestId) {
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
            select: {
              providerId: true,
              offerLawyer: true,
              offerStatus: true,
              offerTitle: true,
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
    contacts.find((c) => norm(fullName(c)) === norm(offerLawyer)) ||
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
    contactName: match ? fullName(match) : offerLawyer || "—",
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
      ...contract.request,
      primaryContactPerson: pc || null,
      client: {
        companyName: contract.request?.client?.companyName || null,
        companyId: contract.request?.client?.companyId || null,
        companyCountry: contract.request?.client?.companyCountry || null,
      },
    },
  };

  // Load preview defs
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

  // ---- Generate PDF buffer with React-PDF (same logic as awaiting/select) ----
  const pdfBuffer = await contractToPdfBuffer({
    contract: shaped,
    companyName: shaped.purchaser.companyName,
    previewDef,
  });

  if (!pdfBuffer || pdfBuffer.length === 0) {
    throw new Error("React-PDF returned empty buffer in conflict/accept");
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
      "conflict/sendContractPackageEmail: failed to persist contractPdfFile for contract",
      String(contract.contractId),
      e
    );
    // don't block email sending
  }

  // ---- Build attachments: contract PDF + request files ----
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

  // ---- Build recipient groups (same as awaiting/select) ----

  // Purchaser side: request's primaryContactPerson + allNotifications=true contacts
  const purchaserContacts = Array.isArray(
    contract.request?.client?.companyContactPersons
  )
    ? contract.request.client.companyContactPersons
    : [];

  const primaryPurchaser =
    shaped.request.primaryContactPerson &&
    shaped.request.primaryContactPerson.email
      ? shaped.request.primaryContactPerson
      : { email: purchaser.email };

  const toPurchaser = expandWithAllNotificationContacts(
    primaryPurchaser,
    purchaserContacts
  );

  // Provider side: winning offer's offerLawyer + allNotifications=true contacts
  const providerContacts = Array.isArray(
    contract.provider?.companyContactPersons
  )
    ? contract.provider.companyContactPersons
    : [];

  const lawyerPrimary = match ||
    (offerLawyer
      ? { email: findLawyerEmail(offerLawyer, providerContacts) }
      : null) || { email: provider.email };

  const toProvider = expandWithAllNotificationContacts(
    lawyerPrimary,
    providerContacts
  );

  // ---- Email HTML (unchanged) ----
  const purchaserEmailHtml = `
    <div style="font-family:Arial,Helvetica,sans-serif">
      <p>Please find attached your new LEXIFY contract, including all appendices. Your legal service provider will contact you shortly to begin the assignment.</p>
      <p><strong>Provider Representative:</strong> ${
        provider.contactName
      } &lt;${provider.email || ""}&gt;</p>
      <p><strong>Purchaser Representative:</strong> ${
        purchaser.contactName
      } &lt;${purchaser.email || ""}&gt;</p>
    </div>`;

  const providerEmailHtml = `
    <div style="font-family:Arial,Helvetica,sans-serif">
      <p>Please find attached your new LEXIFY contract, including all appendices. You can now contact the client using the details on the cover page to initiate the assignment without delay.</p>
      <p><strong>Provider Representative:</strong> ${
        provider.contactName
      } &lt;${provider.email || ""}&gt;</p>
      <p><strong>Purchaser Representative:</strong> ${
        purchaser.contactName
      } &lt;${purchaser.email || ""}&gt;</p>
    </div>`;

  // ---- Send two separate emails ----

  // 1) Purchaser email: "LEXIFY Contract - request.title"
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
      "conflict/sendContractPackageEmail: no purchaser recipients resolved for requestId",
      String(requestId)
    );
  }

  // 2) Provider email: "LEXIFY Contract - offer.offerTitle"
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
      "conflict/sendContractPackageEmail: no provider recipients resolved for requestId",
      String(requestId)
    );
  }
}

// ---------- end helpers ----------

export async function PUT(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = BigInt(params.id);
  const { decision } = await req.json().catch(() => ({}));
  if (!["accept", "deny"].includes(decision)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const request = await prisma.request.findUnique({
    where: { requestId: id },
    select: {
      requestId: true,
      clientId: true,
      requestState: true,
      selectedOfferId: true,
      acceptDeadlinePausedRemainingMs: true,
      details: true,
      acceptDeadline: true,
    },
  });

  if (
    !request ||
    request.requestState !== "CONFLICT_CHECK" ||
    !request.selectedOfferId
  ) {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }

  if (decision === "accept") {
    // Fetch the selected offer (the one that passed conflict check)
    const selOffer = await prisma.offer.findUnique({
      where: { offerId: request.selectedOfferId },
      select: {
        offerId: true,
        offerPrice: true,
        providerId: true,
        requestId: true,
      },
    });
    if (!selOffer || selOffer.requestId !== request.requestId) {
      return NextResponse.json(
        { error: "Selected offer not found" },
        { status: 404 }
      );
    }

    // 1) Create the contract exactly once (skipDuplicates)
    const createRes = await prisma.contract.createMany({
      data: [
        {
          requestId: request.requestId,
          clientId: request.clientId,
          providerId: selOffer.providerId,
          contractPrice:
            selOffer.offerPrice?.toString?.() ?? String(selOffer.offerPrice),
        },
      ],
      skipDuplicates: true,
    });
    const createdNow = (createRes?.count || 0) > 0;

    // 2) Update statuses + request in a transaction
    await prisma.$transaction([
      prisma.offer.update({
        where: { offerId: selOffer.offerId },
        data: { offerStatus: "WON" },
      }),
      prisma.offer.updateMany({
        where: {
          requestId: request.requestId,
          offerId: { not: selOffer.offerId },
        },
        data: { offerStatus: "LOST" },
      }),
      prisma.request.update({
        where: { requestId: request.requestId },
        data: {
          requestState: "EXPIRED",
          contractResult: "Yes",
          selectedOfferId: null,
          acceptDeadlinePausedRemainingMs: null,
          acceptDeadlinePausedAt: null,
        },
      }),
    ]);

    // 3) Send contract package (PDF + attachments) only when newly created
    if (createdNow) {
      try {
        await sendContractPackageEmail(prisma, request.requestId);
      } catch (e) {
        console.error("conflict/accept contract package email failed:", e);
      }
    }

    // 4) Notifications (purchaser, winner, losers per prefs); only on first creation
    if (createdNow) {
      try {
        const data = await prisma.request.findUnique({
          where: { requestId: request.requestId },
          select: {
            title: true,
            primaryContactPerson: true,
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

        // Purchaser notification
        const pc = data?.primaryContactPerson || null;
        const purchaserContacts = Array.isArray(
          data?.client?.companyContactPersons
        )
          ? data.client.companyContactPersons
          : [];
        let purchaserEmail = "";
        if (pc) {
          const target = norm(fullName(pc));
          const match =
            purchaserContacts.find((c) => norm(fullName(c)) === target) ||
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

        // Providers metadata
        const providerIds = Array.from(
          new Set((data?.offers || []).map((o) => String(o.providerId)))
        ).map((x) => BigInt(x));
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

        // Winner notification
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

        // Loser notifications (respect provider prefs)
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
        console.error("conflict/accept notifications failed:", e);
      }
    }

    return NextResponse.json(
      { ok: true, resolved: "accepted", createdNow },
      { status: 200 }
    );
  }

  // ----- deny branch: keep as-is, resume deadline, disqualify selected offer -----
  if (decision === "deny") {
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.offer.update({
        where: { offerId: request.selectedOfferId },
        data: { offerStatus: "DISQUALIFIED" },
      });

      const r = await tx.request.findUnique({
        where: { requestId: id },
        select: {
          disqualifiedOfferIds: true,
          acceptDeadlinePausedRemainingMs: true,
        },
      });

      const list = Array.isArray(r?.disqualifiedOfferIds)
        ? r.disqualifiedOfferIds
        : [];
      const updatedList = [...list, request.selectedOfferId.toString()];

      const remaining = Math.max(
        0,
        Number(r?.acceptDeadlinePausedRemainingMs ?? 0)
      );
      const newDeadline = remaining ? new Date(now.getTime() + remaining) : now;

      await tx.request.update({
        where: { requestId: id },
        data: {
          requestState: "ON HOLD",
          selectedOfferId: null,
          acceptDeadline: newDeadline,
          acceptDeadlinePausedRemainingMs: null,
          acceptDeadlinePausedAt: null,
          disqualifiedOfferIds: updatedList,
        },
      });
    });

    // ---- Email notifications for DENY case ----
    try {
      // 1) Reload request with title + primary contact + client contacts
      const full = await prisma.request.findUnique({
        where: { requestId: id },
        select: {
          title: true,
          primaryContactPerson: true,
          details: true,
          client: {
            select: {
              companyContactPersons: true,
            },
          },
        },
      });

      const requestTitle = full?.title || "LEXIFY Request";

      const contacts = Array.isArray(full?.client?.companyContactPersons)
        ? full.client.companyContactPersons
        : [];

      // Prefer primaryContactPerson from main field, then from details
      const primary =
        full?.primaryContactPerson ||
        full?.details?.primaryContactPerson ||
        null;

      // Use same helper you already use in other places
      const recipients = expandWithAllNotificationContacts(primary, contacts);

      if (recipients.length > 0) {
        // 2) Count remaining (non-disqualified) offers
        const remainingOffersCount = await prisma.offer.count({
          where: {
            requestId: id,
            offerStatus: { not: "DISQUALIFIED" },
          },
        });

        if (remainingOffersCount > 0) {
          // There ARE more offers → "deny & replace" email
          await notifyPurchaserConflictDeniedWithRemainingOffers({
            to: recipients,
            requestTitle,
          });
        } else {
          // No offers left → "deny and no offers left" email
          await notifyPurchaserConflictDeniedNoOffers({
            to: recipients,
            requestTitle,
          });
        }
      }
    } catch (e) {
      console.error("conflict/deny notification failed:", e);
      // Do not fail the API because email failed
    }

    return NextResponse.json({ ok: true, resolved: "denied" });
  }
}
