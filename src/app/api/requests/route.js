import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { notifyProvidersNewAvailableRequest } from "@/lib/mailer";

function mapRequestToCategory(requestCategory, requestSubcategory) {
  const sub = (requestSubcategory || "").trim();
  const cat = (requestCategory || "").trim();

  // These two subcategories are “direct categories” in your UI naming
  if (sub === "Real Estate and Construction" || sub === "ICT and IT")
    return sub;

  if (cat === "Help with Contracts") return "Contracts";
  if (cat === "Day-to-day Legal Advice") return "Day-to-day Legal Advice";
  if (cat === "Help with Employment related Documents") return "Employment";
  if (cat === "Help with Dispute Resolution or Debt Collection")
    return "Dispute Resolution";
  if (cat === "Help with Mergers & Acquisitions") return "M&A";
  if (cat === "Help with Corporate Governance") return "Corporate Advisory";
  if (cat === "Help with Personal Data Protection") return "Data Protection";
  if (
    cat ===
    "Help with KYC (Know Your Customer) or Compliance related Questionnaire"
  )
    return "Compliance";
  if (cat === "Legal Training for Management and/or Personnel")
    return "Legal Training";
  if (cat === "Help with Banking & Finance Matters") return "Banking & Finance";

  return sub || cat || "Other";
}

function requestCategoryToPracticalPrefKey(requestCategory) {
  const cat = (requestCategory || "").trim();

  if (cat === "Help with Contracts") return "contracts";
  if (cat === "Day-to-day Legal Advice") return "day_to_day";
  if (cat === "Help with Employment related Documents") return "employment";
  if (cat === "Help with Dispute Resolution or Debt Collection")
    return "dispute_resolution";
  if (cat === "Help with Mergers & Acquisitions") return "m_and_a";
  if (cat === "Help with Corporate Governance") return "corporate_advisory";
  if (cat === "Help with Personal Data Protection") return "data_protection";
  if (
    cat ===
    "Help with KYC (Know Your Customer) or Compliance related Questionnaire"
  )
    return "compliance";
  if (cat === "Legal Training for Management and/or Personnel")
    return "legal_training";
  if (cat === "Help with Banking & Finance Matters")
    return "banking_and_finance";

  return null;
}

// providerPracticalRatings can be either array or object — handle both
function normalizePracticalRatings(pr) {
  const map = {};

  if (Array.isArray(pr)) {
    for (const item of pr) {
      const key = (
        item?.category ||
        item?.categoryLabel ||
        item?.name ||
        ""
      ).trim();
      if (key) map[key] = item;
    }
    return map;
  }

  if (pr && typeof pr === "object") {
    for (const [key, val] of Object.entries(pr)) {
      if (key) map[key] = val;
    }
  }

  return map;
}

function getPracticalCategoryTotal(providerPracticalRatings, categoryKey) {
  const practicalMap = normalizePracticalRatings(providerPracticalRatings);
  const entry = practicalMap?.[categoryKey];

  const total =
    entry?.total ?? entry?.providerTotalRating ?? entry?.totalRating ?? null;

  const n = Number(total);
  return Number.isFinite(n) ? n : 0;
}

function toDecimalString(v) {
  if (v === undefined || v === null || v === "") return null;
  const s = String(v).replace(/[^\d.]/g, "");
  return s === "" ? null : s;
}

// ---- helpers for capability gates ----
function normalizeProviderType(s) {
  const t = (s || "").toString().trim().toLowerCase();
  if (!t || t === "all") return "all";
  if (t.startsWith("law")) return "lawfirm"; // e.g., "Law firm(s)"
  if (t.includes("attorney")) return "attorneys"; // "Attorneys-at-law"
  return t;
}

function parseMinFromLabel(label) {
  if (label == null) return 0;
  const raw = String(label).trim();
  if (!raw) return 0;
  if (/^any\b/i.test(raw)) return 0;
  const m = raw.match(/(\d+(\.\d+)?)/);
  return m ? Number(m[1]) : Number(raw) || 0;
}

function parseMinAge(val) {
  // Accept "Any Age", "≥5", "5", number-like
  if (val == null) return 0;
  const raw = String(val).trim();
  if (!raw) return 0;
  if (/^any(\s+age)?$/i.test(raw)) return 0;
  const m = raw.match(/(\d+(\.\d+)?)/);
  return m ? Number(m[1]) : Number(raw) || 0;
}

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

async function uploadBlobToS3(file, prefix = "uploads") {
  const arrayBuf = await file.arrayBuffer();
  const ext = (file.name?.split(".").pop() || "").toLowerCase();
  const key = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2)}${
    ext ? "." + ext : ""
  }`;

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: Buffer.from(arrayBuf),
      ContentType: file.type || "application/octet-stream",
      ACL: "public-read",
    }),
  );

  const base = process.env.S3_PUBLIC_BASE_URL;
  const url = base ? `${base}/${key}` : `s3://${process.env.S3_BUCKET}/${key}`;
  return { key, url };
}

async function saveBlobLocally(file, prefix = "uploads") {
  const arrayBuf = await file.arrayBuffer();
  const buf = Buffer.from(arrayBuf);
  const ext = (file.name?.split(".").pop() || "").toLowerCase();
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}${
    ext ? "." + ext : ""
  }`;

  const uploadsDir = path.join(process.cwd(), "public", prefix);
  await fs.mkdir(uploadsDir, { recursive: true });
  const abs = path.join(uploadsDir, name);
  await fs.writeFile(abs, buf);

  const url = `/${prefix}/${name}`;
  const key = `${prefix}/${name}`;
  return { key, url };
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  let backgroundFilesBlobs = [];
  let supplierFilesBlobs = [];

  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const dataPart = form.get("data");
    if (!dataPart) {
      return NextResponse.json(
        { error: "Missing 'data' part" },
        { status: 400 },
      );
    }
    try {
      body = JSON.parse(await dataPart.text());
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in 'data' part" },
        { status: 400 },
      );
    }
    backgroundFilesBlobs = form.getAll("backgroundFiles") || [];
    supplierFilesBlobs = form.getAll("supplierFiles") || [];
  } else {
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
  }

  const required = [
    "requestState",
    "requestCategory",
    "scopeOfWork",
    "description",
    "serviceProviderType",
    "domesticOffers",
    "providerSize",
    "providerCompanyAge",
    "providerMinimumRating",
    "providerReferences",
    "currency",
    "paymentRate",
    "advanceRetainerFee",
    "invoiceType",
    "language",
    "offersDeadline",
    "title",
  ];

  for (const k of required) {
    if (
      body[k] === undefined ||
      body[k] === null ||
      (typeof body[k] === "string" && body[k].trim() === "")
    ) {
      return NextResponse.json(
        { error: `Missing field: ${k}` },
        { status: 400 },
      );
    }
  }

  const userPkId = BigInt(session.userId);
  const me = await prisma.userAccount.findUnique({
    where: { userPkId },
    select: {
      userPkId: true,
      firstName: true,
      lastName: true,
      companyId: true,
      company: {
        select: {
          companyPkId: true,
          companyName: true,
          businessId: true,
          companyCountry: true,
        },
      },
    },
  });
  if (!me?.company) {
    return NextResponse.json(
      { error: "User company not found" },
      { status: 400 },
    );
  }

  const primaryContactPerson =
    `${(me.firstName || "").trim()} ${(me.lastName || "").trim()}`.trim();
  if (!primaryContactPerson) {
    return NextResponse.json(
      { error: "User first/last name missing" },
      { status: 400 },
    );
  }

  const additionalBackgroundInfo = body.additionalBackgroundInfo ?? "";

  let backgroundInfoFiles = Array.isArray(body.backgroundInfoFiles)
    ? body.backgroundInfoFiles
    : [];
  let supplierCodeOfConductFiles = Array.isArray(
    body.supplierCodeOfConductFiles,
  )
    ? body.supplierCodeOfConductFiles
    : [];

  async function processUploads(fileBlobs, prefix) {
    const out = [];
    for (const f of fileBlobs) {
      const stored = hasS3()
        ? await uploadBlobToS3(f, prefix)
        : await saveBlobLocally(f, prefix);
      out.push({
        name: f.name || "",
        type: f.type || "",
        size: f.size || 0,
        url: stored.url,
        key: stored.key,
      });
    }
    return out;
  }

  if (backgroundFilesBlobs.length > 0) {
    backgroundInfoFiles = await processUploads(
      backgroundFilesBlobs,
      "background",
    );
  }
  if (supplierFilesBlobs.length > 0) {
    supplierCodeOfConductFiles = await processUploads(
      supplierFilesBlobs,
      "supplier",
    );
  }

  const requestSubcategory = body.requestSubcategory ?? null;
  const assignmentType = body.assignmentType ?? null;

  const now = new Date();
  const [year, month, day] = body.offersDeadline.split("-").map(Number);
  const offersDeadline = new Date(year, month - 1, day, 21, 59, 59);
  const dateExpired = offersDeadline;
  const paymentType =
    body.paymentRate +
    " The Legal Service Provider shall submit all invoices to the Client in the contract price currency, unless otherwise instructed in writing by the Client.";

  const created = await prisma.request.create({
    data: {
      // LEGACY column must be null for new-system users
      clientId: null,

      // NEW column points to UserAccount
      clientUserId: me.userPkId,

      requestState: body.requestState,
      requestCategory: body.requestCategory,
      requestSubcategory,
      assignmentType,
      clientCompanyName: me.company.companyName ?? null,

      primaryContactPerson,
      clientCompanyId: me.company.companyPkId,
      createdByUserId: me.userPkId,

      scopeOfWork: body.scopeOfWork,
      description: body.description,

      additionalBackgroundInfo,
      backgroundInfoFiles,
      supplierCodeOfConductFiles,

      serviceProviderType: body.serviceProviderType,
      domesticOffers: body.domesticOffers,
      providerSize: body.providerSize,
      providerCompanyAge: body.providerCompanyAge,
      providerMinimumRating: body.providerMinimumRating,
      providerReferences: body.providerReferences,
      currency: body.currency,
      paymentRate: paymentType,
      advanceRetainerFee: body.advanceRetainerFee,
      invoiceType:
        "The Legal Service Provider shall invoice the Client in the following manner: " +
        body.invoiceType +
        ". Further details, such as contact person for invoices and method of invoicing (for example, email, e-invoicing or other), related to invoicing shall be agreed separately between the client and the legal service provider.",
      language:
        body.language +
        ". The legal service provider confirms that its representatives involved in the performance of the work have appropriate advanced proficiency in all the languages listed above.",
      offersDeadline,
      title: body.title,

      dateCreated: now,
      dateExpired,

      contractResult: null,
      contractPrice: toDecimalString(body.contractPrice ?? null),

      details: body.details ?? {},
    },
  });

  // Build the "requestCategory" string for the template
  const categoryParts = [
    body.requestCategory?.toString()?.trim(),
    (requestSubcategory ?? body.requestSubcategory)?.toString()?.trim(),
    (assignmentType ?? body.assignmentType)?.toString()?.trim(),
  ].filter(Boolean);
  const requestCategoryJoined = categoryParts.join(" / ");

  // ---- Build request-side minimums and type for capability gates ----
  const reqMinPros = parseMinFromLabel(body.providerSize);
  const reqMinRating = parseMinFromLabel(body.providerMinimumRating);
  const reqMinAge = parseMinAge(body.providerCompanyAge);
  const reqTypeNorm = normalizeProviderType(body.serviceProviderType);

  const reqPracticalCategoryKey = mapRequestToCategory(
    body.requestCategory,
    requestSubcategory,
  );

  // Fetch Providers with fields needed for gating and notifications
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

  // ---- provider emailing uses UserAccount + Company ----

  // Which practical notification key does this request category correspond to?
  const practicalPrefKey = requestCategoryToPracticalPrefKey(
    body.requestCategory,
  );

  // If category is unknown, we should not email anyone (safer default).
  if (!practicalPrefKey) {
    console.warn(
      "Unknown requestCategory for practical notifications:",
      body.requestCategory,
    );
  } else {
    // Fetch provider user accounts with their company fields needed for gating
    const providerUsers = await prisma.userAccount.findMany({
      where: {
        role: "PROVIDER",

        // Must have "new-available-request" in notificationPreferences (JSON array)
        notificationPreferences: {
          array_contains: ["new-available-request"],
        },

        // Must have category key in practicalNotificationPreferences (JSON array)
        practicalNotificationPreferences: {
          array_contains: [practicalPrefKey],
        },
      },
      select: {
        email: true,
        company: {
          select: {
            companyAge: true,
            companyProfessionals: true,
            providerType: true,
            providerPracticalRatings: true,
          },
        },
      },
    });

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmail = (s) => typeof s === "string" && EMAIL_RE.test(s.trim());

    // Build the request-side minimums and type for capability gates (you already computed these above)
    // reqMinPros, reqMinRating, reqMinAge, reqTypeNorm, reqPracticalCategoryKey

    for (const u of providerUsers) {
      const co = u.company;
      if (!co) continue;

      // capability gates are now company-level
      const pAge = Number.isFinite(Number(co.companyAge))
        ? Number(co.companyAge)
        : 0;
      const pPros = Number.isFinite(Number(co.companyProfessionals))
        ? Number(co.companyProfessionals)
        : 0;

      // rating gate: keep the same logic as before, but ratings now live under company
      const pRating = getPracticalCategoryTotal(
        co.providerPracticalRatings,
        reqPracticalCategoryKey,
      );

      const pTypeNorm = normalizeProviderType(co.providerType);

      const typePass =
        reqTypeNorm === "all" ||
        reqTypeNorm === "" ||
        reqTypeNorm === pTypeNorm;

      if (
        !(
          pAge >= reqMinAge &&
          pPros >= reqMinPros &&
          pRating >= reqMinRating &&
          typePass
        )
      ) {
        continue;
      }

      if (!isEmail(u.email)) continue;

      // Separate email per recipient (like before)
      try {
        await notifyProvidersNewAvailableRequest({
          to: [u.email],
          requestCategory: requestCategoryJoined,
        });
      } catch (e) {
        console.error("New-available-request email failed for", u.email, e);
      }
    }
  }

  // Support email (keep as-is)
  try {
    await notifyProvidersNewAvailableRequest({
      to: ["support@lexify.online"],
      requestCategory: requestCategoryJoined,
    });
  } catch (e) {
    console.error("Support notification failed:", e);
  }

  return NextResponse.json(
    { ok: true, requestId: String(created.requestId) },
    { status: 201 },
  );
}
