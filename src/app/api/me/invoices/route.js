import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import {
  INVOICE_DOCUMENT_TYPES,
  MAX_INVOICE_FILE_BYTES,
  NEAR_CEILING_RATIO,
  canSelectContractForInvoiceUpload,
  isAdminRole,
  contractRef,
  fullName,
  isCreditNote,
  isHourlyRate,
  numify,
  percentChange,
  progressRatio,
  remainingHeadroom,
  signedAmount,
  startOfMonth,
  startOfPreviousMonth,
  startOfQuarter,
} from "@/lib/invoices";
import { notifyPurchaserInvoiceUploaded } from "@/lib/mailer";

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

function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isEmail(s) {
  return typeof s === "string" && EMAIL_RE.test(s.trim());
}

function primaryContactName(request) {
  const raw =
    request?.primaryContactPerson ?? request?.details?.primaryContactPerson;
  if (raw && typeof raw === "object") {
    return [raw.firstName, raw.lastName].filter(Boolean).join(" ").trim();
  }
  return String(raw || "").trim();
}

function pickPrimaryPurchaser(request) {
  const members = Array.isArray(request?.clientCompany?.members)
    ? request.clientCompany.members
    : [];
  const want = primaryContactName(request).toLowerCase();
  if (want) {
    const exact = members.find(
      (m) => fullName(m).toLowerCase() === want,
    );
    if (exact) return exact;
  }
  const raw = request?.primaryContactPerson ?? request?.details?.primaryContactPerson;
  if (raw && typeof raw === "object" && isEmail(raw.email)) {
    return raw;
  }
  return request?.clientUser || request?.createdByUser || members[0] || null;
}

async function purchaserInvoiceRecipients(request) {
  const emails = new Set();
  const primary = pickPrimaryPurchaser(request);
  if (isEmail(primary?.email)) emails.add(primary.email.trim());

  const shared = Array.isArray(request?.details?.sharedAccounts)
    ? request.details.sharedAccounts
    : [];
  const ids = shared
    .map((u) => u?.userPkId)
    .filter((id) => id != null && id !== "")
    .map((id) => BigInt(id));
  if (ids.length > 0) {
    const users = await prisma.userAccount.findMany({
      where: { userPkId: { in: ids } },
      select: { email: true },
    });
    for (const u of users) {
      if (isEmail(u.email)) emails.add(u.email.trim());
    }
  }

  return { emails: Array.from(emails), primary };
}

function safeNumber(v) {
  return typeof v === "bigint" ? Number(v) : v;
}

function fileMeta(file) {
  if (!file || typeof file !== "object") return null;
  if (Array.isArray(file)) return file.find((x) => x?.url) || file[0] || null;
  return file;
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseMoney(value) {
  if (value == null || value === "") return null;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

async function uploadInvoiceFile(file) {
  const arrayBuf = await file.arrayBuffer();
  const buf = Buffer.from(arrayBuf);
  const ext = (file.name?.split(".").pop() || "pdf").toLowerCase();
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
  const prefix = "invoices";

  if (hasS3()) {
    const key = `${prefix}/${name}`;
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: buf,
        ContentType: file.type || "application/pdf",
        ACL: "public-read",
      }),
    );
    const base = process.env.S3_PUBLIC_BASE_URL;
    const url = base
      ? `${base}/${key}`
      : `s3://${process.env.S3_BUCKET}/${key}`;
    return {
      key,
      url,
      name: file.name || name,
      size: buf.length,
      contentType: file.type || "application/pdf",
    };
  }

  const uploadsDir = path.join(process.cwd(), "public", prefix);
  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.writeFile(path.join(uploadsDir, name), buf);
  return {
    key: `${prefix}/${name}`,
    url: `/${prefix}/${name}`,
    name: file.name || name,
    size: buf.length,
    contentType: file.type || "application/pdf",
  };
}

async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.userId) return { error: json({ error: "Unauthorized" }, 401) };

  const user = await prisma.userAccount.findUnique({
    where: { userPkId: BigInt(session.userId) },
    select: {
      userPkId: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      companyId: true,
      company: {
        select: {
          companyName: true,
          businessId: true,
          companyInvoiceContactPersons: true,
        },
      },
    },
  });

  if (!user?.companyId) {
    return { error: json({ error: "User has no company" }, 400) };
  }

  return {
    session,
    user,
    role: String(session.role || user.role || "").toUpperCase(),
  };
}

function isCompanyInvoiceContact(user) {
  const contacts = Array.isArray(user?.company?.companyInvoiceContactPersons)
    ? user.company.companyInvoiceContactPersons
    : [];
  const first = String(user?.firstName || "").trim().toLowerCase();
  const last = String(user?.lastName || "").trim().toLowerCase();
  const email = String(user?.email || "").trim().toLowerCase();

  return contacts.some((c) => {
    if (!c || typeof c !== "object") return false;
    const cEmail = String(c.email || "").trim().toLowerCase();
    if (email && cEmail && email === cEmail) return true;
    const cFirst = String(c.firstName || "").trim().toLowerCase();
    const cLast = String(c.lastName || "").trim().toLowerCase();
    return Boolean(first && last && cFirst === first && cLast === last);
  });
}

async function getAccessibleContractIds(user, role) {
  const companyName = (user.company?.companyName || "").trim();
  const isProvider = role === "PROVIDER";

  if (isProvider) {
    const companyWide = isCompanyInvoiceContact(user);
    const userId = user.userPkId;
    const lawyerName = [user.firstName, user.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    const rows = companyWide
      ? companyName.length > 0
        ? await prisma.$queryRaw`
            SELECT "contractId"
            FROM "Contract"
            WHERE
              ("providerCompanyId" = ${user.companyId}
               OR CAST("providerCompanyId" AS TEXT) = ${companyName})
            ORDER BY "contractDate" DESC
          `
        : await prisma.$queryRaw`
            SELECT "contractId"
            FROM "Contract"
            WHERE "providerCompanyId" = ${user.companyId}
            ORDER BY "contractDate" DESC
          `
      : companyName.length > 0
        ? await prisma.$queryRaw`
            SELECT c."contractId"
            FROM "Contract" c
            WHERE
              (
                c."providerCompanyId" = ${user.companyId}
                OR CAST(c."providerCompanyId" AS TEXT) = ${companyName}
              )
              AND (
                c."providerUserId" = ${userId}
                OR EXISTS (
                  SELECT 1
                  FROM "Offer" o
                  WHERE o."requestId" = c."requestId"
                    AND o."offerStatus" = 'WON'
                    AND (
                      o."providerUserId" = ${userId}
                      OR o."createdByUserId" = ${userId}
                      OR (
                        ${lawyerName} <> ''
                        AND LOWER(TRIM(o."offerLawyer")) = LOWER(${lawyerName})
                      )
                    )
                )
              )
            ORDER BY c."contractDate" DESC
          `
        : await prisma.$queryRaw`
            SELECT c."contractId"
            FROM "Contract" c
            WHERE
              c."providerCompanyId" = ${user.companyId}
              AND (
                c."providerUserId" = ${userId}
                OR EXISTS (
                  SELECT 1
                  FROM "Offer" o
                  WHERE o."requestId" = c."requestId"
                    AND o."offerStatus" = 'WON'
                    AND (
                      o."providerUserId" = ${userId}
                      OR o."createdByUserId" = ${userId}
                      OR (
                        ${lawyerName} <> ''
                        AND LOWER(TRIM(o."offerLawyer")) = LOWER(${lawyerName})
                      )
                    )
                )
              )
            ORDER BY c."contractDate" DESC
          `;
    return (rows || []).map((r) => r.contractId).filter(Boolean);
  }

  const userId = user.userPkId;
  const rows =
    companyName.length > 0
      ? await prisma.$queryRaw`
          SELECT c."contractId"
          FROM "Contract" c
          LEFT JOIN "Request" r ON r."requestId" = c."requestId"
          LEFT JOIN "AppUser" a ON a."userId" = r."clientId"
          WHERE
            (
              r."clientCompanyId" = ${user.companyId}
              OR c."clientCompanyId" = ${user.companyId}
              OR r."clientId" = ${user.companyId}
              OR LOWER(COALESCE(a."companyName", '')) = LOWER(${companyName})
              OR EXISTS (
                SELECT 1
                FROM jsonb_array_elements(COALESCE(r."details"->'sharedAccounts', '[]'::jsonb)) sa
                WHERE (sa->>'userPkId')::bigint = ${userId}
              )
            )
          ORDER BY c."contractDate" DESC
        `
      : await prisma.$queryRaw`
          SELECT c."contractId"
          FROM "Contract" c
          LEFT JOIN "Request" r ON r."requestId" = c."requestId"
          WHERE
            (
              r."clientCompanyId" = ${user.companyId}
              OR c."clientCompanyId" = ${user.companyId}
              OR EXISTS (
                SELECT 1
                FROM jsonb_array_elements(COALESCE(r."details"->'sharedAccounts', '[]'::jsonb)) sa
                WHERE (sa->>'userPkId')::bigint = ${userId}
              )
            )
          ORDER BY c."contractDate" DESC
        `;
  return (rows || []).map((r) => r.contractId).filter(Boolean);
}

function wonOfferTitle(contract, user) {
  const offers = contract.request?.offers || [];
  if (!offers.length) return contract.request?.title || "—";
  const companyId = user?.companyId != null ? String(user.companyId) : null;
  const mine =
    companyId &&
    offers.find(
      (o) =>
        o.providerCompanyId != null && String(o.providerCompanyId) === companyId,
    );
  return mine?.offerTitle || offers[0]?.offerTitle || contract.request?.title || "—";
}

function shapePayload(rows, role, user) {
  const contracts = rows.map((c) => {
    const invoices = [...(c.invoices || [])].sort((a, b) => {
      const da = new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime();
      if (da !== 0) return da;
      return Number(a.invoiceId) - Number(b.invoiceId);
    });

    let runningFees = 0;
    let runningDisbursements = 0;
    const shapedInvoices = invoices.map((inv) => {
      const fees = signedAmount(inv.documentType, inv.feesExclVat);
      const disbursements = signedAmount(
        inv.documentType,
        inv.disbursementsExclVat,
      );
      runningFees += fees;
      runningDisbursements += disbursements;
      return {
        invoiceId: safeNumber(inv.invoiceId),
        invoiceNumber: inv.invoiceNumber,
        documentType: inv.documentType,
        invoiceDate: inv.invoiceDate,
        periodStart: inv.periodStart,
        periodEnd: inv.periodEnd,
        feesExclVat: fees,
        disbursementsExclVat: disbursements,
        vatAmount: numify(inv.vatAmount),
        totalExclVat: fees + disbursements,
        file: fileMeta(inv.file),
        createdAt: inv.createdAt,
        uploadedByName: fullName(inv.uploadedBy) || "—",
        runningFees,
        runningDisbursements,
        contractId: safeNumber(c.contractId),
      };
    });

    const agreedFee = numify(c.contractPrice);
    const isHourly = isHourlyRate(c.request?.paymentRate);
    const invoicedFees = runningFees;
    const disbursements = runningDisbursements;
    const status =
      c.assignmentStatus === "Completed" ? "Completed" : "Ongoing";
    const remaining = isHourly ? null : remainingHeadroom(invoicedFees, agreedFee);
    const progress = isHourly ? null : progressRatio(invoicedFees, agreedFee);
    const offerTitle = wonOfferTitle(c, user);

    return {
      contractId: safeNumber(c.contractId),
      contractRef: contractRef({
        contractId: safeNumber(c.contractId),
        contractDate: c.contractDate,
      }),
      title: role === "PROVIDER" ? offerTitle : c.request?.title || "—",
      offerTitle,
      contractDate: c.contractDate,
      agreedFee,
      isHourly,
      currency: c.request?.currency || "EUR",
      paymentRate: c.request?.paymentRate || null,
      invoiceType: c.request?.invoiceType || null,
      clientName: c.clientCompany?.companyName || "—",
      providerName: c.providerCompany?.companyName || user.company?.companyName || "—",
      invoicedFees,
      disbursements,
      remaining,
      progressPct: progress == null ? null : Math.round(progress * 10000) / 100,
      invoiceCount: shapedInvoices.length,
      status,
      contractPdf: fileMeta(c.contractPdfFile),
      invoices: shapedInvoices,
    };
  });

  const invoices = contracts
    .flatMap((contract) =>
      contract.invoices.map((invoice) => ({
        ...invoice,
        contractRef: contract.contractRef,
        contractTitle: contract.title,
        contractDate: contract.contractDate,
        clientName: contract.clientName,
        providerName: contract.providerName,
        agreedFee: contract.agreedFee,
        isHourly: contract.isHourly,
        currency: contract.currency,
        status: contract.status,
      })),
    )
    .sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate));

  const now = new Date();
  const thisMonth = startOfMonth(now);
  const prevMonth = startOfPreviousMonth(now);
  const thisQuarter = startOfQuarter(now);

  const invoicesThisMonth = invoices.filter(
    (i) => new Date(i.invoiceDate) >= thisMonth,
  ).length;
  const invoicesLastMonth = invoices.filter((i) => {
    const d = new Date(i.invoiceDate);
    return d >= prevMonth && d < thisMonth;
  }).length;
  const invoicesThisQuarter = invoices.filter(
    (i) => new Date(i.invoiceDate) >= thisQuarter,
  ).length;

  const contractsThisMonth = contracts.filter(
    (c) => new Date(c.contractDate) >= thisMonth,
  ).length;
  const contractsLastMonth = contracts.filter((c) => {
    const d = new Date(c.contractDate);
    return d >= prevMonth && d < thisMonth;
  }).length;

  const totalFees = invoices.reduce((sum, i) => sum + (i.feesExclVat || 0), 0);
  const activeMatters = contracts.filter(
    (c) => c.invoiceCount > 0 && c.status === "Ongoing",
  ).length;
  const nearFeeCeiling = contracts.filter(
    (c) =>
      !c.isHourly &&
      c.status === "Ongoing" &&
      (c.progressPct || 0) >= NEAR_CEILING_RATIO * 100,
  ).length;

  const stats =
    role === "PROVIDER"
      ? {
          invoicesThisMonth,
          invoicesThisMonthChange: percentChange(
            invoicesThisMonth,
            invoicesLastMonth,
          ),
          activeContracts: contracts.filter((c) => c.status === "Ongoing")
            .length,
          activeContractsDelta: contractsThisMonth - contractsLastMonth,
          nearFeeCeiling,
          noInvoice: contracts.filter((c) => c.invoiceCount === 0).length,
        }
      : {
          totalInvoices: invoices.length,
          invoicesThisQuarter,
          totalFees,
          activeMatters,
          nearFeeCeiling,
        };

  const members = Array.from(
    new Set(invoices.map((i) => i.uploadedByName).filter((n) => n && n !== "—")),
  );

  const recentActivity = invoices.slice(0, 5).map((i) => ({
    invoiceId: i.invoiceId,
    invoiceNumber: i.invoiceNumber,
    documentType: i.documentType,
    createdAt: i.createdAt,
    uploadedByName: i.uploadedByName,
    contractId: i.contractId,
  }));

  return {
    role,
    stats,
    members,
    recentActivity,
    contracts: contracts.map(({ invoices: _invoices, ...rest }) => rest),
    invoices,
  };
}

export async function GET() {
  try {
    const auth = await getSessionUser();
    if (auth.error) return auth.error;

    const { user, role } = auth;
    if (!["PURCHASER", "PROVIDER", "ADMIN"].includes(role)) {
      return json({ error: "Forbidden" }, 403);
    }

    const contractIds = await getAccessibleContractIds(user, role);
    if (contractIds.length === 0) {
      const payload = shapePayload(
        [],
        role === "ADMIN" ? "PURCHASER" : role,
        user,
      );
      return json({ ...payload, isAdmin: isAdminRole(role) });
    }

    const rows = await prisma.contract.findMany({
      where: { contractId: { in: contractIds } },
      orderBy: { contractDate: "desc" },
      select: {
        contractId: true,
        contractDate: true,
        contractPrice: true,
        contractPdfFile: true,
        assignmentStatus: true,
        request: {
          select: {
            title: true,
            currency: true,
            paymentRate: true,
            invoiceType: true,
            offers: {
              where: { offerStatus: "WON" },
              select: {
                offerTitle: true,
                providerCompanyId: true,
              },
            },
          },
        },
        clientCompany: { select: { companyName: true } },
        providerCompany: { select: { companyName: true } },
        invoices: {
          orderBy: [{ invoiceDate: "asc" }, { invoiceId: "asc" }],
          select: {
            invoiceId: true,
            invoiceNumber: true,
            documentType: true,
            invoiceDate: true,
            periodStart: true,
            periodEnd: true,
            feesExclVat: true,
            disbursementsExclVat: true,
            vatAmount: true,
            file: true,
            createdAt: true,
            uploadedBy: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    const payload = shapePayload(
      rows,
      role === "ADMIN" ? "PURCHASER" : role,
      user,
    );
    return json({ ...payload, isAdmin: isAdminRole(role) });
  } catch (error) {
    console.error("GET /api/me/invoices failed:", error);
    return json({ error: "Server error loading invoices" }, 500);
  }
}

export async function POST(req) {
  try {
    const auth = await getSessionUser();
    if (auth.error) return auth.error;

    const { user, role } = auth;
    if (!["PROVIDER", "ADMIN"].includes(role)) {
      return json({ error: "Only legal service providers can upload invoices" }, 403);
    }

    const form = await req.formData();
    const contractIdRaw = form.get("contractId");
    const invoiceNumber = String(form.get("invoiceNumber") || "").trim();
    const documentType = String(form.get("documentType") || "Invoice").trim();
    const invoiceDate = parseDate(form.get("invoiceDate"));
    const periodStart = parseDate(form.get("periodStart"));
    const periodEnd = parseDate(form.get("periodEnd"));
    const feesExclVat = parseMoney(form.get("feesExclVat"));
    const disbursementsExclVat = parseMoney(form.get("disbursementsExclVat"));
    const vatAmount = parseMoney(form.get("vatAmount"));
    const confirmDuplicate = String(form.get("confirmDuplicate") || "") === "true";
    const file = form.get("file");

    if (!contractIdRaw) return json({ error: "Select a LEXIFY Contract" }, 400);
    if (!invoiceNumber) return json({ error: "Invoice number is required" }, 400);
    if (!INVOICE_DOCUMENT_TYPES.includes(documentType)) {
      return json({ error: "Invalid document type" }, 400);
    }
    if (!invoiceDate) return json({ error: "Invoice date is required" }, 400);
    if (!periodStart || !periodEnd) {
      return json({ error: "Time period covered by the invoice is required" }, 400);
    }
    if (periodEnd < periodStart) {
      return json({ error: "Period end cannot be before period start" }, 400);
    }
    if (!Number.isFinite(feesExclVat) || feesExclVat < 0) {
      return json({ error: "Fees excl. VAT must be a valid amount" }, 400);
    }
    if (!Number.isFinite(disbursementsExclVat) || disbursementsExclVat < 0) {
      return json({ error: "Disbursements excl. VAT must be a valid amount" }, 400);
    }
    if (vatAmount != null && (!Number.isFinite(vatAmount) || vatAmount < 0)) {
      return json({ error: "VAT amount must be a valid amount" }, 400);
    }
    if (!file || typeof file !== "object" || typeof file.arrayBuffer !== "function") {
      return json({ error: "Please attach a PDF invoice" }, 400);
    }

    const fileName = String(file.name || "").toLowerCase();
    const isPdf =
      file.type === "application/pdf" || fileName.endsWith(".pdf");
    if (!isPdf) return json({ error: "PDF files only" }, 400);
    if (file.size > MAX_INVOICE_FILE_BYTES) {
      return json({ error: "File is larger than 10MB" }, 400);
    }

    const contractId = BigInt(String(contractIdRaw));
    const accessibleIds = await getAccessibleContractIds(user, "PROVIDER");
    if (!accessibleIds.some((id) => String(id) === String(contractId))) {
      return json({ error: "Contract not found" }, 404);
    }

    const contract = await prisma.contract.findUnique({
      where: { contractId },
      select: {
        contractId: true,
        contractPrice: true,
        contractDate: true,
        providerCompany: { select: { companyName: true } },
        clientCompany: { select: { companyName: true } },
        request: {
          select: {
            title: true,
            paymentRate: true,
            currency: true,
            primaryContactPerson: true,
            details: true,
            clientUser: {
              select: { email: true, firstName: true, lastName: true },
            },
            createdByUser: {
              select: { email: true, firstName: true, lastName: true },
            },
            clientCompany: {
              select: {
                companyName: true,
                members: {
                  select: {
                    userPkId: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            offers: {
              where: { offerStatus: "WON" },
              select: { offerTitle: true, providerCompanyId: true },
            },
          },
        },
        invoices: {
          select: {
            invoiceId: true,
            invoiceNumber: true,
            documentType: true,
            feesExclVat: true,
          },
        },
      },
    });

    if (!contract) return json({ error: "Contract not found" }, 404);

    if (!canSelectContractForInvoiceUpload(contract.contractDate, role)) {
      return json(
        {
          error:
            "This LEXIFY Contract is older than 1 September 2026 and can only be invoiced by an admin.",
        },
        403,
      );
    }

    const duplicate = (contract.invoices || []).find(
      (inv) =>
        String(inv.invoiceNumber).trim().toLowerCase() ===
        invoiceNumber.toLowerCase(),
    );
    if (duplicate && !confirmDuplicate) {
      return json(
        {
          error: `Possible duplicate invoice number ${invoiceNumber} on this contract.`,
          duplicate: true,
          existingInvoiceId: safeNumber(duplicate.invoiceId),
        },
        409,
      );
    }

    const isHourly = isHourlyRate(contract.request?.paymentRate);
    const agreed = numify(contract.contractPrice);
    const currentFees = (contract.invoices || []).reduce(
      (sum, inv) => sum + signedAmount(inv.documentType, inv.feesExclVat),
      0,
    );
    const nextFees = currentFees + signedAmount(documentType, feesExclVat);
    if (
      !isHourly &&
      !isCreditNote(documentType) &&
      agreed != null &&
      (feesExclVat > agreed || nextFees > agreed)
    ) {
      return json(
        { error: "The total invoice amount can't exceed the agreed amount." },
        400,
      );
    }

    const uploaded = await uploadInvoiceFile(file);

    const created = await prisma.invoice.create({
      data: {
        contractId,
        uploadedByUserId: user.userPkId,
        invoiceNumber,
        documentType,
        invoiceDate,
        periodStart,
        periodEnd,
        feesExclVat,
        disbursementsExclVat,
        vatAmount: vatAmount == null ? null : vatAmount,
        file: uploaded,
      },
    });

    const progress = isHourly ? null : progressRatio(nextFees, agreed);

    try {
      const { emails, primary } = await purchaserInvoiceRecipients(
        contract.request,
      );
      if (emails.length > 0) {
        const wonOffer =
          (contract.request?.offers || []).find(
            (o) =>
              user?.companyId != null &&
              String(o.providerCompanyId) === String(user.companyId),
          ) || (contract.request?.offers || [])[0];
        await notifyPurchaserInvoiceUploaded({
          to: emails,
          invoiceNumber,
          documentType,
          requestTitle: contract.request?.title || "",
          offerTitle: wonOffer?.offerTitle || "",
          providerCompany:
            contract.providerCompany?.companyName ||
            user.company?.companyName ||
            "",
          purchaserCompany:
            contract.request?.clientCompany?.companyName ||
            contract.clientCompany?.companyName ||
            "",
          firstName: primary?.firstName || "",
        });
      }
    } catch (mailError) {
      console.error("Invoice upload notification failed:", mailError);
    }

    return json({
      ok: true,
      invoiceId: safeNumber(created.invoiceId),
      warning:
        !isHourly && progress != null && progress >= NEAR_CEILING_RATIO
          ? `This upload brings cumulative fees to ${Math.round(progress * 100)}% of the agreed fee.`
          : null,
    });
  } catch (error) {
    console.error("POST /api/me/invoices failed:", error);
    return json({ error: "Server error uploading invoice" }, 500);
  }
}

export async function PATCH(req) {
  try {
    const auth = await getSessionUser();
    if (auth.error) return auth.error;

    const { user, role } = auth;
    if (role !== "PROVIDER") {
      return json({ error: "Forbidden" }, 403);
    }

    const body = await req.json();
    const assignmentStatus = String(body?.assignmentStatus || "").trim();
    if (assignmentStatus !== "Completed") {
      return json({ error: "Assignment status can only be marked as completed" }, 400);
    }
    if (body?.contractId == null || body.contractId === "") {
      return json({ error: "Contract is required" }, 400);
    }

    const contractId = BigInt(String(body.contractId));
    const accessibleIds = await getAccessibleContractIds(user, role);
    if (!accessibleIds.some((id) => String(id) === String(contractId))) {
      return json({ error: "Contract not found" }, 404);
    }

    const existing = await prisma.contract.findFirst({
      where: { contractId },
      select: { assignmentStatus: true },
    });
    if (!existing) return json({ error: "Contract not found" }, 404);
    if (existing.assignmentStatus === "Completed") {
      return json({ error: "Assignment is already completed" }, 400);
    }

    const updated = await prisma.contract.update({
      where: { contractId },
      data: { assignmentStatus },
      select: { contractId: true, assignmentStatus: true },
    });

    return json({
      ok: true,
      contractId: safeNumber(updated.contractId),
      assignmentStatus: updated.assignmentStatus,
    });
  } catch (error) {
    console.error("PATCH /api/me/invoices failed:", error);
    return json({ error: "Server error updating assignment status" }, 500);
  }
}
