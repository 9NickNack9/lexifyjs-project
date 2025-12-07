import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";

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
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Provider making the offer → providerId must be this user
    let providerIdBigInt;
    try {
      providerIdBigInt = BigInt(String(session.userId));
    } catch {
      return NextResponse.json(
        { error: "Invalid providerId" },
        { status: 400 }
      );
    }

    let body;
    let referenceFilesBlobs = [];

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
      referenceFilesBlobs = form.getAll("referenceFiles") || [];
    } else {
      body = await req.json().catch(() => null);
      if (!body) {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
      }
    }

    const {
      requestId, // string or number
      offerLawyer, // required (string)
      offerPrice, // required (string/number)
      offerExpectedPrice, // optional; required only if paymentRate = "capped price"
      offerTitle, // required (string)
      offerStatus, // optional; defaults to "Pending"
    } = body || {};

    // Basic required fields
    if (!requestId || !offerLawyer || !offerPrice || !offerTitle) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: requestId, offerLawyer, offerPrice, offerTitle",
        },
        { status: 400 }
      );
    }

    // Parse requestId
    let requestIdBigInt;
    try {
      requestIdBigInt = BigInt(String(requestId));
    } catch {
      return NextResponse.json({ error: "Invalid requestId" }, { status: 400 });
    }

    // Fetch the related request to determine paymentRate rule
    const reqRow = await prisma.request.findUnique({
      where: { requestId: requestIdBigInt },
      select: { paymentRate: true, providerReferences: true },
    });

    if (!reqRow) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const paymentRate = String(reqRow.paymentRate || "").toLowerCase();
    const isCapped = paymentRate === "capped price";

    // Enforce expected price rule
    let expectedPriceToStore = null;
    if (isCapped) {
      if (
        offerExpectedPrice === undefined ||
        offerExpectedPrice === null ||
        String(offerExpectedPrice).trim() === ""
      ) {
        return NextResponse.json(
          {
            error:
              "offerExpectedPrice is required when paymentRate is 'capped price'.",
          },
          { status: 400 }
        );
      }
      expectedPriceToStore = String(offerExpectedPrice);
    } else {
      expectedPriceToStore = null; // force null unless capped price
    }

    // Enforce written references rule based on the original request
    const providerRefs = String(reqRow.providerReferences || "")
      .trim()
      .toLowerCase();
    const needs1 = providerRefs.startsWith("yes, 1");
    const needs2 = providerRefs.startsWith("yes, 2");
    const requiredRefsCount = needs2 ? 2 : needs1 ? 1 : 0;

    if (requiredRefsCount > 0) {
      const uploadedCount = referenceFilesBlobs.length;
      if (uploadedCount < requiredRefsCount) {
        return NextResponse.json(
          {
            error: `This LEXIFY Request requires at least ${requiredRefsCount} written reference${
              requiredRefsCount > 1 ? "s" : ""
            } to be uploaded in connection with the offer.`,
          },
          { status: 400 }
        );
      }
    }

    // Process uploaded reference files (if any)
    let providerReferenceFiles = Array.isArray(body.providerReferenceFiles)
      ? body.providerReferenceFiles
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

    if (referenceFilesBlobs.length > 0) {
      providerReferenceFiles = await processUploads(
        referenceFilesBlobs,
        "references"
      );
    }

    // Build data object conditionally
    const data = {
      request: { connect: { requestId: requestIdBigInt } },
      provider: { connect: { userId: providerIdBigInt } },
      offerLawyer: String(offerLawyer),
      offerPrice: String(offerPrice),
      offerTitle: String(offerTitle),
      offerStatus: offerStatus ?? "Pending",
      ...(isCapped ? { offerExpectedPrice: String(offerExpectedPrice) } : {}),
      providerReferenceFiles,
    };

    const created = await prisma.offer.create({
      data,
      select: { offerId: true },
    });

    return NextResponse.json(
      { ok: true, offerId: created.offerId.toString() },
      { status: 201 }
    );

    return NextResponse.json(
      { ok: true, offerId: created.offerId.toString() },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/offers failed:", err);

    if (err?.code === "P2002") {
      return NextResponse.json(
        { error: "You already submitted an offer for this request." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
