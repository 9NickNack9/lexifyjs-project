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
    }),
  );

  const base = process.env.S3_PUBLIC_BASE_URL;
  const url = base ? `${base}/${key}` : `s3://${process.env.S3_BUCKET}/${key}`;
  return { key, url };
}

async function savePdfBufferLocally(buffer, prefix = "contractpdfs") {
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}.pdf`;
  const dir = path.join(process.cwd(), "public", prefix);
  await fs.mkdir(dir, { recursive: true });
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isEmail = (s) => typeof s === "string" && EMAIL_RE.test(s.trim());
const norm = (s) => (s ?? "").toString().trim().toLowerCase();
const fullName = (p) =>
  [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim();

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

function memberHasPref(member, prefKey) {
  const prefs = toStringArray(member?.notificationPreferences);
  return prefs.includes(prefKey);
}

function findMemberByName(name, members) {
  if (!name || !Array.isArray(members) || members.length === 0) return null;
  const want = norm(name);

  const exact =
    members.find((m) => norm(fullName(m)) === want) ||
    members.find(
      (m) => norm(m?.firstName) === want || norm(m?.lastName) === want,
    ) ||
    null;

  if (exact) return exact;

  return (
    members.find(
      (m) =>
        norm(m?.firstName).startsWith(want) ||
        norm(m?.lastName).startsWith(want),
    ) || null
  );
}

function expandWithAllNotificationMembers(primaryMember, members) {
  const out = new Set();

  if (primaryMember?.email && isEmail(primaryMember.email)) {
    out.add(primaryMember.email.trim());
  }

  for (const m of Array.isArray(members) ? members : []) {
    if (!isEmail(m?.email)) continue;
    if (memberHasPref(m, "all-notifications")) {
      out.add(m.email.trim());
    }
  }

  return Array.from(out);
}

async function getCompanyMembers(companyIdBig, role) {
  if (!companyIdBig) return [];

  return prisma.userAccount.findMany({
    where: {
      companyId: companyIdBig,
      ...(role ? { role } : {}),
    },
    select: {
      userPkId: true,
      firstName: true,
      lastName: true,
      email: true,
      telephone: true,
      position: true,
      role: true,
      isCompanyAdmin: true,
      notificationPreferences: true,
      practicalNotificationPreferences: true,
    },
  });
}

async function getCompanyMeta(companyIdBig, role) {
  const members = await getCompanyMembers(companyIdBig, role);

  const notificationPrefs = new Set();
  const practicalPrefs = new Set();

  for (const m of members) {
    for (const p of toStringArray(m?.notificationPreferences)) {
      notificationPrefs.add(String(p));
    }
    for (const p of toStringArray(m?.practicalNotificationPreferences)) {
      practicalPrefs.add(String(p));
    }
  }

  return {
    members,
    notificationPrefs: Array.from(notificationPrefs),
    practicalPrefs: Array.from(practicalPrefs),
  };
}

async function loadPreviewDef(requestData) {
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

  const n = (s) => (s ?? "").toString().trim().toLowerCase();
  const cat =
    n(requestData.requestCategory) || n(requestData?.details?.requestCategory);
  const sub =
    n(requestData.requestSubcategory) ||
    n(requestData?.details?.requestSubcategory);
  const asg =
    n(requestData.assignmentType) || n(requestData?.details?.assignmentType);

  return (
    defs?.requests?.find(
      (d) =>
        n(d.category) === cat &&
        n(d.subcategory) === sub &&
        n(d.assignmentType) === asg,
    ) ||
    defs?.requests?.find(
      (d) => n(d.category) === cat && n(d.subcategory) === sub,
    ) ||
    defs?.requests?.find((d) => n(d.category) === cat) ||
    null
  );
}

async function sendContractPackageEmail(prismaClient, requestId) {
  const contract = await prismaClient.contract.findUnique({
    where: { requestId },
    select: {
      contractId: true,
      contractDate: true,
      contractPrice: true,
      clientCompanyId: true,
      providerCompanyId: true,
      clientUserId: true,
      providerUserId: true,
      request: {
        select: {
          requestId: true,
          clientCompanyId: true,
          clientUserId: true,
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
          clientCompany: {
            select: {
              companyPkId: true,
              companyName: true,
              businessId: true,
              companyCountry: true,
            },
          },
          clientUser: {
            select: {
              userPkId: true,
              firstName: true,
              lastName: true,
              email: true,
              telephone: true,
            },
          },
          offers: {
            select: {
              providerCompanyId: true,
              providerUserId: true,
              offerLawyer: true,
              offerStatus: true,
              offerTitle: true,
              providerAdditionalInfo: true,
              offerExpectedPrice: true,
            },
          },
        },
      },
      clientCompany: {
        select: {
          companyPkId: true,
          companyName: true,
          businessId: true,
          companyCountry: true,
        },
      },
      providerCompany: {
        select: {
          companyPkId: true,
          companyName: true,
          businessId: true,
          companyCountry: true,
        },
      },
      clientUser: {
        select: {
          userPkId: true,
          firstName: true,
          lastName: true,
          email: true,
          telephone: true,
        },
      },
      providerUser: {
        select: {
          userPkId: true,
          firstName: true,
          lastName: true,
          email: true,
          telephone: true,
        },
      },
    },
  });

  if (!contract) return;

  const purchaserCompanyId =
    contract.request?.clientCompanyId ?? contract.clientCompanyId ?? null;
  const providerCompanyId = contract.providerCompanyId ?? null;

  const [purchaserMembers, providerMembers] = await Promise.all([
    purchaserCompanyId
      ? getCompanyMembers(purchaserCompanyId, "PURCHASER")
      : [],
    providerCompanyId ? getCompanyMembers(providerCompanyId, "PROVIDER") : [],
  ]);

  const offers = Array.isArray(contract.request?.offers)
    ? contract.request.offers
    : [];
  const byProvider = offers.filter(
    (o) =>
      String(o.providerCompanyId ?? "") === String(providerCompanyId ?? ""),
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

  const winningProviderMember =
    findMemberByName(offerLawyer, providerMembers) ||
    (won?.providerUserId
      ? providerMembers.find(
          (m) => String(m.userPkId) === String(won.providerUserId),
        ) || null
      : null) ||
    (contract.providerUserId
      ? providerMembers.find(
          (m) => String(m.userPkId) === String(contract.providerUserId),
        ) || null
      : null) ||
    contract.providerUser ||
    null;

  const provider = {
    companyName: contract.providerCompany?.companyName || "—",
    businessId: contract.providerCompany?.businessId || "—",
    contactName:
      fullName(winningProviderMember) ||
      offerLawyer ||
      contract.providerCompany?.companyName ||
      "—",
    email: winningProviderMember?.email || "—",
    phone: winningProviderMember?.telephone || "—",
  };

  const primaryRaw =
    contract.request?.primaryContactPerson ??
    contract.request?.details?.primaryContactPerson ??
    "";

  let primaryName = "";
  if (typeof primaryRaw === "string") {
    primaryName = primaryRaw.trim();
  } else if (primaryRaw && typeof primaryRaw === "object") {
    primaryName = fullName(primaryRaw);
  }

  const purchaserMember =
    findMemberByName(primaryName, purchaserMembers) ||
    (contract.request?.clientUserId
      ? purchaserMembers.find(
          (m) => String(m.userPkId) === String(contract.request.clientUserId),
        ) || null
      : null) ||
    contract.request?.clientUser ||
    contract.clientUser ||
    null;

  const purchaser = {
    companyName:
      contract.request?.clientCompany?.companyName ||
      contract.clientCompany?.companyName ||
      "—",
    businessId:
      contract.request?.clientCompany?.businessId ||
      contract.clientCompany?.businessId ||
      "—",
    contactName: primaryName || fullName(purchaserMember) || "—",
    email: purchaserMember?.email || "—",
    phone: purchaserMember?.telephone || "—",
  };

  const shaped = {
    contractDate: contract.contractDate,
    contractPrice: Number(contract.contractPrice ?? 0),
    contractPriceCurrency: contract.request?.currency || null,
    contractPriceType: contract.request?.paymentRate || null,
    provider,
    purchaser,
    offer: won
      ? {
          ...won,
          offerExpectedPrice:
            won.offerExpectedPrice != null
              ? Number(won.offerExpectedPrice)
              : null,
        }
      : null,
    request: {
      ...contract.request,
      primaryContactPerson: primaryName,
      clientCompany: {
        companyName:
          contract.request?.clientCompany?.companyName ||
          contract.clientCompany?.companyName ||
          null,
        businessId:
          contract.request?.clientCompany?.businessId ||
          contract.clientCompany?.businessId ||
          null,
        companyId:
          contract.request?.clientCompany?.businessId ||
          contract.clientCompany?.businessId ||
          null,
        companyCountry:
          contract.request?.clientCompany?.companyCountry ||
          contract.clientCompany?.companyCountry ||
          null,
      },
    },
  };

  const previewDef = await loadPreviewDef(shaped.request);

  const pdfBuffer = await contractToPdfBuffer({
    contract: shaped,
    companyName: shaped.purchaser.companyName,
    previewDef,
  });

  if (!pdfBuffer || pdfBuffer.length === 0) {
    throw new Error("React-PDF returned empty buffer in conflict/accept");
  }

  try {
    const stored = hasS3()
      ? await uploadPdfBufferToS3(pdfBuffer, "contractpdfs")
      : await savePdfBufferLocally(pdfBuffer, "contractpdfs");

    const uniqueName = `LEXIFY-Contract-${contract.contractId}-${Date.now()}.pdf`;

    const pdfMeta = {
      name: uniqueName,
      type: "application/pdf",
      size: pdfBuffer.length,
      url: stored.url,
      key: stored.key,
    };

    await prismaClient.contract.update({
      where: { contractId: contract.contractId },
      data: { contractPdfFile: pdfMeta },
    });
  } catch (e) {
    console.error(
      "conflict/sendContractPackageEmail: failed to persist contractPdfFile for contract",
      String(contract.contractId),
      e,
    );
  }

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
      filename: "LEXIFY-Contract.pdf",
      content: pdfBuffer.toString("base64"),
      type: "application/pdf",
      disposition: "attachment",
    },
    ...fileAtts,
  ];

  const toPurchaser = expandWithAllNotificationMembers(
    purchaserMember && isEmail(purchaserMember.email) ? purchaserMember : null,
    purchaserMembers,
  );

  const toProvider = expandWithAllNotificationMembers(
    winningProviderMember && isEmail(winningProviderMember.email)
      ? winningProviderMember
      : null,
    providerMembers,
  );

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
      String(requestId),
    );
  }

  if (toProvider.length > 0) {
    await sendContractEmail({
      to: toProvider,
      bcc: ["support@lexify.online"],
      subject: `LEXIFY Contract - ${won?.offerTitle || shaped.request.title || ""}`,
      html: providerEmailHtml,
      attachments,
    });
  } else {
    console.warn(
      "conflict/sendContractPackageEmail: no provider recipients resolved for requestId",
      String(requestId),
    );
  }
}

export async function PUT(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const requestId = BigInt(id);
  const { decision } = await req.json().catch(() => ({}));

  if (!["accept", "deny"].includes(decision)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const request = await prisma.request.findUnique({
    where: { requestId: requestId },
    select: {
      requestId: true,
      clientCompanyId: true,
      clientUserId: true,
      requestState: true,
      selectedOfferId: true,
      acceptDeadlinePausedRemainingMs: true,
      details: true,
      acceptDeadline: true,
      title: true,
      primaryContactPerson: true,
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
    const selOffer = await prisma.offer.findUnique({
      where: { offerId: request.selectedOfferId },
      select: {
        offerId: true,
        offerPrice: true,
        providerCompanyId: true,
        providerUserId: true,
        requestId: true,
        offerTitle: true,
        offerLawyer: true,
      },
    });

    if (!selOffer || String(selOffer.requestId) !== String(request.requestId)) {
      return NextResponse.json(
        { error: "Selected offer not found" },
        { status: 404 },
      );
    }

    if (!selOffer.providerCompanyId) {
      return NextResponse.json(
        { error: "Selected offer provider company missing" },
        { status: 400 },
      );
    }

    const createRes = await prisma.contract.createMany({
      data: [
        {
          requestId: request.requestId,
          clientCompanyId: request.clientCompanyId,
          providerCompanyId: selOffer.providerCompanyId,
          clientUserId: request.clientUserId ?? null,
          providerUserId: selOffer.providerUserId ?? null,
          contractPrice:
            selOffer.offerPrice?.toString?.() ?? String(selOffer.offerPrice),
        },
      ],
      skipDuplicates: true,
    });

    const createdNow = (createRes?.count || 0) > 0;

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

    if (createdNow) {
      try {
        await sendContractPackageEmail(prisma, request.requestId);
      } catch (e) {
        console.error("conflict/accept contract package email failed:", e);
      }
    }

    if (createdNow) {
      try {
        const requestData = await prisma.request.findUnique({
          where: { requestId: request.requestId },
          select: {
            title: true,
            primaryContactPerson: true,
            details: true,
            clientCompanyId: true,
            clientUserId: true,
            offers: {
              select: {
                offerId: true,
                offerTitle: true,
                offerLawyer: true,
                providerCompanyId: true,
                providerUserId: true,
                offerStatus: true,
              },
            },
          },
        });

        const purchaserMembers = requestData?.clientCompanyId
          ? await getCompanyMembers(requestData.clientCompanyId, "PURCHASER")
          : [];

        const purchaserPrimary =
          findMemberByName(
            requestData?.primaryContactPerson,
            purchaserMembers,
          ) ||
          (requestData?.clientUserId
            ? purchaserMembers.find(
                (m) => String(m.userPkId) === String(requestData.clientUserId),
              ) || null
            : null) ||
          purchaserMembers.find((m) => m.isCompanyAdmin) ||
          purchaserMembers[0] ||
          null;

        if (purchaserPrimary?.email && isEmail(purchaserPrimary.email)) {
          const toGroup = expandWithAllNotificationMembers(
            purchaserPrimary,
            purchaserMembers,
          );

          if (toGroup.length > 0) {
            await notifyPurchaserContractFormed({
              to: toGroup,
              requestTitle: requestData?.title || "",
            });
          }
        }

        const providerCompanyIds = Array.from(
          new Set(
            (requestData?.offers || [])
              .map((o) => String(o.providerCompanyId ?? ""))
              .filter(Boolean),
          ),
        );

        const providerMeta = new Map();
        await Promise.all(
          providerCompanyIds.map(async (pid) => {
            try {
              const meta = await getCompanyMeta(BigInt(pid), "PROVIDER");
              providerMeta.set(pid, meta);
            } catch {
              providerMeta.set(pid, {
                members: [],
                notificationPrefs: [],
                practicalPrefs: [],
              });
            }
          }),
        );

        const winner = (requestData?.offers || []).find(
          (o) => (o.offerStatus || "").toUpperCase() === "WON",
        );

        if (winner) {
          const winnerCompanyId = String(winner.providerCompanyId ?? "");
          const meta = providerMeta.get(winnerCompanyId) || {
            members: [],
            notificationPrefs: [],
          };

          const primary =
            findMemberByName(winner.offerLawyer, meta.members) ||
            (winner.providerUserId
              ? meta.members.find(
                  (m) => String(m.userPkId) === String(winner.providerUserId),
                ) || null
              : null);

          if (primary?.email && isEmail(primary.email)) {
            const toGroup = expandWithAllNotificationMembers(
              primary,
              meta.members,
            );

            let teamReq = "";
            const rawTeamReq = requestData?.details?.teamRequest;
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

        for (const o of requestData?.offers || []) {
          if ((o.offerStatus || "").toUpperCase() === "WON") continue;

          const providerCompanyId = String(o.providerCompanyId ?? "");
          const meta = providerMeta.get(providerCompanyId) || {
            members: [],
            notificationPrefs: [],
          };

          if (!meta.notificationPrefs.includes("no-winning-offer")) continue;

          const primary =
            findMemberByName(o.offerLawyer, meta.members) ||
            (o.providerUserId
              ? meta.members.find(
                  (m) => String(m.userPkId) === String(o.providerUserId),
                ) || null
              : null);

          if (primary?.email && isEmail(primary.email)) {
            const toGroup = expandWithAllNotificationMembers(
              primary,
              meta.members,
            );

            if (toGroup.length > 0) {
              await notifyLosingLawyerNotSelected({
                to: toGroup,
                offerTitle: o.offerTitle || "",
              });
            }
          }
        }
      } catch (e) {
        console.error("conflict/accept notifications failed:", e);
      }
    }

    return NextResponse.json(
      { ok: true, resolved: "accepted", createdNow },
      { status: 200 },
    );
  }

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
        Number(r?.acceptDeadlinePausedRemainingMs ?? 0),
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

    try {
      const full = await prisma.request.findUnique({
        where: { requestId: id },
        select: {
          title: true,
          primaryContactPerson: true,
          details: true,
          clientCompanyId: true,
          clientUserId: true,
        },
      });

      const requestTitle = full?.title || "LEXIFY Request";

      const purchaserMembers = full?.clientCompanyId
        ? await getCompanyMembers(full.clientCompanyId, "PURCHASER")
        : [];

      const primaryRaw =
        full?.primaryContactPerson ?? full?.details?.primaryContactPerson ?? "";

      let primaryName = "";
      if (typeof primaryRaw === "string") primaryName = primaryRaw.trim();
      else if (primaryRaw && typeof primaryRaw === "object") {
        primaryName = fullName(primaryRaw);
      }

      const primaryPurchaser =
        findMemberByName(primaryName, purchaserMembers) ||
        (full?.clientUserId
          ? purchaserMembers.find(
              (m) => String(m.userPkId) === String(full.clientUserId),
            ) || null
          : null) ||
        purchaserMembers.find((m) => m.isCompanyAdmin) ||
        purchaserMembers[0] ||
        null;

      const recipients = expandWithAllNotificationMembers(
        primaryPurchaser,
        purchaserMembers,
      );

      if (recipients.length > 0) {
        const remainingOffersCount = await prisma.offer.count({
          where: {
            requestId: id,
            offerStatus: { not: "DISQUALIFIED" },
          },
        });

        if (remainingOffersCount > 0) {
          await notifyPurchaserConflictDeniedWithRemainingOffers({
            to: recipients,
            requestTitle,
          });
        } else {
          await notifyPurchaserConflictDeniedNoOffers({
            to: recipients,
            requestTitle,
          });
        }
      }
    } catch (e) {
      console.error("conflict/deny notification failed:", e);
    }

    return NextResponse.json({ ok: true, resolved: "denied" });
  }
}
