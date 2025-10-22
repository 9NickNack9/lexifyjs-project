import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";

function toDecimalString(v) {
  if (v === undefined || v === null || v === "") return null;
  const s = String(v).replace(/[^\d.]/g, "");
  return s === "" ? null : s;
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
    })
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
        { status: 400 }
      );
    }
    try {
      body = JSON.parse(await dataPart.text());
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in 'data' part" },
        { status: 400 }
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
    "primaryContactPerson",
    "scopeOfWork",
    "description",
    "serviceProviderType",
    "domesticOffers",
    "providerSize",
    "providerCompanyAge",
    "providerMinimumRating",
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
        { status: 400 }
      );
    }
  }

  const me = await prisma.appUser.findUnique({
    where: { userId: BigInt(session.userId) },
    select: { companyName: true },
  });

  const additionalBackgroundInfo = body.additionalBackgroundInfo ?? "";

  let backgroundInfoFiles = Array.isArray(body.backgroundInfoFiles)
    ? body.backgroundInfoFiles
    : [];
  let supplierCodeOfConductFiles = Array.isArray(
    body.supplierCodeOfConductFiles
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
      "background"
    );
  }
  if (supplierFilesBlobs.length > 0) {
    supplierCodeOfConductFiles = await processUploads(
      supplierFilesBlobs,
      "supplier"
    );
  }

  const requestSubcategory = body.requestSubcategory ?? null;
  const assignmentType = body.assignmentType ?? null;

  const now = new Date();
  // TEST MODE: set deadline to 1 minutes from now
  //const offersDeadline = new Date(now.getTime() + 1 * 60 * 1000);
  //const dateExpired = offersDeadline;
  const [year, month, day] = body.offersDeadline.split("-").map(Number);
  const offersDeadline = new Date(year, month - 1, day, 23, 59, 59);
  const dateExpired = offersDeadline;
  const paymentType =
    body.paymentRate +
    " The Legal Service Provider shall submit all invoices to the Client in the contract price currency, unless otherwise instructed in writing by the Client.";

  const created = await prisma.request.create({
    data: {
      clientId: BigInt(session.userId),
      requestState: body.requestState,
      requestCategory: body.requestCategory,
      requestSubcategory,
      assignmentType,
      clientCompanyName: me?.companyName ?? null,

      primaryContactPerson: body.primaryContactPerson,
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

  return NextResponse.json(
    { ok: true, requestId: String(created.requestId) },
    { status: 201 }
  );
}
