import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// Decimal helper (send Decimal as string)
function toDecimalString(v) {
  if (v === undefined || v === null || v === "") return null;
  const s = String(v).replace(/[^\d.]/g, "");
  return s === "" ? null : s;
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // REQUIRED in every request per your schema
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

  // Load user's company for clientCompanyName
  const me = await prisma.appUser.findUnique({
    where: { userId: BigInt(session.userId) },
    select: { companyName: true },
  });

  // Fields that must exist but may be empty
  const additionalBackgroundInfo = body.additionalBackgroundInfo ?? "";
  const backgroundInfoFiles = Array.isArray(body.backgroundInfoFiles)
    ? body.backgroundInfoFiles
    : [];
  const supplierCodeOfConductFiles = Array.isArray(
    body.supplierCodeOfConductFiles
  )
    ? body.supplierCodeOfConductFiles
    : [];

  // Optional fields (not relevant to all)
  const requestSubcategory = body.requestSubcategory ?? null;
  const assignmentType = body.assignmentType ?? null;

  // Set dateCreated and dateExpired
  const now = new Date();
  const offersDeadline = new Date(body.offersDeadline);
  const dateExpired = body.dateExpired
    ? new Date(body.dateExpired)
    : offersDeadline;

  // Create request
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
      paymentRate: body.paymentRate,
      advanceRetainerFee: body.advanceRetainerFee,
      invoiceType: body.invoiceType,
      language: body.language,
      offersDeadline,
      title: body.title,

      dateCreated: now,
      dateExpired,

      // Initial contract fields: empty at creation time
      contractResult: null,
      contractPrice: toDecimalString(body.contractPrice ?? null),

      // Everything request-type-specific goes here (safe default {})
      details: body.details ?? {},
    },
  });

  return NextResponse.json(
    { ok: true, requestId: created.requestId },
    { status: 201 }
  );
}
