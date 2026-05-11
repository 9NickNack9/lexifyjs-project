import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const ALLOWED_REQUEST_TYPES = new Set([
  "salesB2b",
  "salesB2c",
  "sourcingAgreement",
  "sourcingComments",
  "sourcingNegotiation",
  "reSale",
  "reLeaseback",
  "reLease",
  "reEasement",
  "reLanduse",
  "reConstruction",
  "ictTemplate",
  "ictReview",
  "ictNegotiation",
  "dayToDay",
  "employmentContract",
  "employmentDocuments",
  "employmentNegotiation",
  "courtProceedings",
  "arbitrationProceedings",
  "settlementNegotiations",
  "debtCollection",
  "mAndA",
  "corporateGovernance",
  "dataProtectionAnalysis",
  "dataProtectionDocumentation",
  "personalDataBreach",
  "dataPrivacyQuestion",
  "bankingRefinancing",
  "bankingAmendment",
  "bankingWaiver",
  "complianceQuestionnaire",
  "legalTraining",
]);

function jsonBigIntSafe(data, status = 200) {
  return new NextResponse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value,
    ),
    {
      status,
      headers: { "Content-Type": "application/json" },
    },
  );
}

function normalizeDraftsRoot(requestDrafts) {
  if (
    !requestDrafts ||
    typeof requestDrafts !== "object" ||
    Array.isArray(requestDrafts)
  ) {
    return {};
  }

  return requestDrafts;
}

async function getCurrentUserAccount() {
  const session = await getServerSession(authOptions);
  const userPkId = session?.userId;

  if (!userPkId) {
    return null;
  }

  return prisma.userAccount.findUnique({
    where: {
      userPkId: BigInt(userPkId),
    },
    select: {
      userPkId: true,
      requestDrafts: true,
    },
  });
}

async function getRequestTypeFromContext(context) {
  const params = await context.params;
  return params.requestType;
}

function sanitizeDraftData(data) {
  const clean = { ...(data || {}) };

  // Do not persist browser File objects or existing uploaded file arrays.
  delete clean.backgroundFiles;
  delete clean.supplierFiles;
  delete clean.files;
  delete clean.attachments;
  delete clean.providerReferenceFiles;

  return {
    ...clean,
    backgroundFiles: [],
    supplierFiles: [],
  };
}

export async function GET(req, context) {
  try {
    const requestType = await getRequestTypeFromContext(context);

    if (!ALLOWED_REQUEST_TYPES.has(requestType)) {
      return NextResponse.json(
        { error: "Invalid request draft type." },
        { status: 400 },
      );
    }

    const user = await getCurrentUserAccount();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const root = normalizeDraftsRoot(user.requestDrafts);
    const drafts = Array.isArray(root[requestType]) ? root[requestType] : [];

    return jsonBigIntSafe({ drafts });
  } catch (error) {
    console.error("GET /api/request-drafts/[requestType] error:", error);
    return NextResponse.json(
      { error: "Failed to load request drafts." },
      { status: 500 },
    );
  }
}

export async function POST(req, context) {
  try {
    const requestType = await getRequestTypeFromContext(context);

    if (!ALLOWED_REQUEST_TYPES.has(requestType)) {
      return NextResponse.json(
        { error: "Invalid request draft type." },
        { status: 400 },
      );
    }

    const user = await getCurrentUserAccount();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json().catch(() => null);

    const title = String(body?.title || "").trim();
    const data = sanitizeDraftData(body?.data);
    const overwrite = Boolean(body?.overwrite);

    if (!title) {
      return NextResponse.json(
        { error: "Draft title is required." },
        { status: 400 },
      );
    }

    const root = normalizeDraftsRoot(user.requestDrafts);
    const existingDrafts = Array.isArray(root[requestType])
      ? root[requestType]
      : [];

    const normalizedTitle = title.toLowerCase();

    const existingDraftIndex = existingDrafts.findIndex(
      (draft) =>
        String(draft?.title || "")
          .trim()
          .toLowerCase() === normalizedTitle,
    );

    const duplicateDraft =
      existingDraftIndex >= 0 ? existingDrafts[existingDraftIndex] : null;

    if (duplicateDraft && !overwrite) {
      return jsonBigIntSafe(
        {
          duplicate: true,
          draft: duplicateDraft,
          error: "A draft with this title already exists.",
        },
        409,
      );
    }

    const now = new Date().toISOString();

    let draft;
    let nextDrafts;

    if (duplicateDraft && overwrite) {
      draft = {
        ...duplicateDraft,
        title,
        data: {
          ...data,
          requestTitle: title,
        },
        savedAt: now,
        updatedAt: now,
        createdAt: duplicateDraft.createdAt || now,
      };

      nextDrafts = [
        draft,
        ...existingDrafts.filter((_, index) => index !== existingDraftIndex),
      ];
    } else {
      draft = {
        id:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title,
        data: {
          ...data,
          requestTitle: title,
        },
        savedAt: now,
        createdAt: now,
        updatedAt: now,
      };

      nextDrafts = [draft, ...existingDrafts];
    }

    const nextRequestDrafts = {
      ...root,
      [requestType]: nextDrafts,
    };

    await prisma.userAccount.update({
      where: {
        userPkId: user.userPkId,
      },
      data: {
        requestDrafts: nextRequestDrafts,
      },
    });

    return jsonBigIntSafe({
      draft,
      overwritten: Boolean(duplicateDraft && overwrite),
    });
  } catch (error) {
    console.error("POST /api/request-drafts/[requestType] error:", error);
    return NextResponse.json(
      { error: "Failed to save request draft." },
      { status: 500 },
    );
  }
}

export async function DELETE(req, context) {
  try {
    const requestType = await getRequestTypeFromContext(context);

    if (!ALLOWED_REQUEST_TYPES.has(requestType)) {
      return NextResponse.json(
        { error: "Invalid request draft type." },
        { status: 400 },
      );
    }

    const user = await getCurrentUserAccount();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const draftId = String(body?.draftId || "").trim();

    if (!draftId) {
      return NextResponse.json(
        { error: "Draft id is required." },
        { status: 400 },
      );
    }

    const root = normalizeDraftsRoot(user.requestDrafts);
    const existingDrafts = Array.isArray(root[requestType])
      ? root[requestType]
      : [];

    const nextDrafts = existingDrafts.filter(
      (draft) => String(draft.id) !== draftId,
    );

    const nextRequestDrafts = {
      ...root,
      [requestType]: nextDrafts,
    };

    await prisma.userAccount.update({
      where: {
        userPkId: user.userPkId,
      },
      data: {
        requestDrafts: nextRequestDrafts,
      },
    });

    return jsonBigIntSafe({ success: true, drafts: nextDrafts });
  } catch (error) {
    console.error("DELETE /api/request-drafts/[requestType] error:", error);
    return NextResponse.json(
      { error: "Failed to delete request draft." },
      { status: 500 },
    );
  }
}
