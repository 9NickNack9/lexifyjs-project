import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// ---------- helpers ----------
const toNum = (d) => (d == null ? null : Number(d));
const safeNumber = (v) => (typeof v === "bigint" ? Number(v) : v);
const isSafeDate = (x) => x instanceof Date && !isNaN(x.getTime());

function toDecimalString(v) {
  if (v === undefined || v === null || v === "") return null;
  const s = String(v).replace(/[^\d.]/g, "");
  return s === "" ? null : s;
}

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.userId) {
    throw NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session;
}

// ---------- GET /api/me/contracts ----------
export async function GET() {
  try {
    const session = await requireSession();

    // Company name for Purchaser (for the modal header)
    const me = await prisma.appUser.findUnique({
      where: { userId: BigInt(session.userId) },
      select: { companyName: true },
    });

    // Fetch contracts that belong to this user (via Contract.clientId)
    const rows = await prisma.contract.findMany({
      where: { clientId: BigInt(session.userId) },
      orderBy: { contractDate: "desc" },
      select: {
        contractId: true,
        contractDate: true,
        contractPrice: true, // Decimal
        requestId: true,
        // join request to render “B2B-style” preview info
        request: {
          select: {
            title: true,
            scopeOfWork: true,
            description: true,
            currency: true,
            paymentRate: true,
            invoiceType: true,
            language: true,
            advanceRetainerFee: true,
          },
        },
        // join provider to show provider company/contact
        provider: {
          select: {
            companyName: true,
            companyId: true, // business ID
            contactFirstName: true,
            contactLastName: true,
            contactEmail: true,
            contactTelephone: true,
          },
        },
      },
    });

    const shaped = rows.map((c) => ({
      contractId: safeNumber(c.contractId),
      contractDate: c.contractDate,
      contractPrice: toNum(c.contractPrice),
      // currency/type come from the originating Request in your schema
      contractPriceCurrency: c.request?.currency ?? null,
      contractPriceType: c.request?.paymentRate ?? null,
      provider: {
        companyName: c.provider?.companyName ?? "—",
        businessId: c.provider?.companyId ?? "—",
        contactName:
          [c.provider?.contactFirstName, c.provider?.contactLastName]
            .filter(Boolean)
            .join(" ") || "—",
        email: c.provider?.contactEmail ?? "—",
        phone: c.provider?.contactTelephone ?? "—",
      },
      request: {
        id: safeNumber(c.requestId),
        title: c.request?.title || "—",
        scopeOfWork: c.request?.scopeOfWork || "—",
        description: c.request?.description || "—",
        invoiceType: c.request?.invoiceType || "—",
        language: c.request?.language || "—",
        advanceRetainerFee: c.request?.advanceRetainerFee || "—",
      },
    }));

    return NextResponse.json({
      companyName: me?.companyName || null,
      contracts: shaped,
    });
  } catch (err) {
    if (err instanceof Response) return err; // from requireSession
    console.error("GET /api/me/contracts failed:", err);
    return NextResponse.json(
      { error: "Server error loading contracts" },
      { status: 500 }
    );
  }
}

// ---------- PUT /api/me/contracts ----------
// Body:
// {
//   contractId: number,
//   updates: {
//     contractPrice?: string|number,   // Decimal
//     contractDate?: string|Date       // ISO or Date
//   }
// }
// Only the purchaser (clientId === session.userId) can update.
export async function PUT(req) {
  try {
    const session = await requireSession();

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const contractId = Number(body?.contractId);
    const updates = body?.updates || {};
    if (!Number.isInteger(contractId) || contractId <= 0) {
      return NextResponse.json(
        { error: "Missing or invalid contractId" },
        { status: 400 }
      );
    }
    if (typeof updates !== "object" || updates === null) {
      return NextResponse.json(
        { error: "Missing or invalid updates" },
        { status: 400 }
      );
    }

    // Ownership check (contract must belong to this user via clientId)
    const existing = await prisma.contract.findUnique({
      where: { contractId: BigInt(contractId) },
      select: { clientId: true, requestId: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }
    if (String(existing.clientId) !== String(session.userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build safe update payload
    const data = {};

    if (updates.contractPrice !== undefined) {
      data.contractPrice = toDecimalString(updates.contractPrice);
    }

    if (updates.contractDate !== undefined) {
      const cd =
        updates.contractDate instanceof Date
          ? updates.contractDate
          : new Date(updates.contractDate);
      if (!isSafeDate(cd)) {
        return NextResponse.json(
          { error: "Invalid contractDate" },
          { status: 400 }
        );
      }
      data.contractDate = cd;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No supported fields to update" },
        { status: 400 }
      );
    }

    const updated = await prisma.contract.update({
      where: { contractId: BigInt(contractId) },
      data,
      select: {
        contractId: true,
        contractDate: true,
        contractPrice: true,
        requestId: true,
        request: {
          select: {
            title: true,
            scopeOfWork: true,
            description: true,
            currency: true,
            paymentRate: true,
            invoiceType: true,
            language: true,
            advanceRetainerFee: true,
          },
        },
        provider: {
          select: {
            companyName: true,
            companyId: true,
            contactFirstName: true,
            contactLastName: true,
            contactEmail: true,
            contactTelephone: true,
          },
        },
      },
    });

    const shaped = {
      contractId: safeNumber(updated.contractId),
      contractDate: updated.contractDate,
      contractPrice: toNum(updated.contractPrice),
      contractPriceCurrency: updated.request?.currency ?? null,
      contractPriceType: updated.request?.paymentRate ?? null,
      provider: {
        companyName: updated.provider?.companyName ?? "—",
        businessId: updated.provider?.companyId ?? "—",
        contactName:
          [
            updated.provider?.contactFirstName,
            updated.provider?.contactLastName,
          ]
            .filter(Boolean)
            .join(" ") || "—",
        email: updated.provider?.contactEmail ?? "—",
        phone: updated.provider?.contactTelephone ?? "—",
      },
      request: {
        id: safeNumber(updated.requestId),
        title: updated.request?.title || "—",
        scopeOfWork: updated.request?.scopeOfWork || "—",
        description: updated.request?.description || "—",
        invoiceType: updated.request?.invoiceType || "—",
        language: updated.request?.language || "—",
        advanceRetainerFee: updated.request?.advanceRetainerFee || "—",
      },
    };

    return NextResponse.json({ ok: true, contract: shaped });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("PUT /api/me/contracts failed:", err);
    return NextResponse.json(
      { error: "Server error updating contract" },
      { status: 500 }
    );
  }
}

// Optional (if you ever see caching issues)
// export const dynamic = "force-dynamic";
