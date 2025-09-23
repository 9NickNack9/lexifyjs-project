// src/app/api/me/contracts/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const toNum = (d) => (d == null ? null : Number(d));
const safeNumber = (v) => (typeof v === "bigint" ? Number(v) : v);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Load the user's company name (for the modal header)
    const me = await prisma.appUser.findUnique({
      where: { userId: BigInt(session.userId) },
      select: { companyName: true },
    });

    // 1) Get this user's requests (no assumptions about relations from Contract -> Request)
    const myRequests = await prisma.request.findMany({
      where: { clientId: BigInt(session.userId) },
      select: {
        requestId: true,
        title: true,
        scopeOfWork: true,
        description: true,
        currency: true,
        paymentRate: true,
        invoiceType: true,
        language: true,
        advanceRetainerFee: true,
      },
    });

    const reqIds = myRequests.map((r) => r.requestId);
    if (reqIds.length === 0) {
      return NextResponse.json({
        companyName: me?.companyName || null,
        contracts: [],
      });
    }

    // Build a quick lookup by id
    const reqById = new Map(myRequests.map((r) => [r.requestId, r]));

    // 2) Load contracts referencing those requestIds
    // Select only fields we know exist in your schema (contractId, contractDate, contractPrice, requestId)
    const contracts = await prisma.contract.findMany({
      where: { requestId: { in: reqIds } },
      orderBy: { contractDate: "desc" },
      select: {
        contractId: true,
        contractDate: true,
        contractPrice: true, // Decimal
        requestId: true,
        // If you HAVE extra fields in Contract, you can add them here safely later
        // e.g. providerCompanyName, contractPriceCurrency, contractPriceType, etc.
      },
    });

    const shaped = contracts.map((c) => {
      const req = reqById.get(c.requestId) || {};
      return {
        contractId: safeNumber(c.contractId),
        contractDate: c.contractDate,
        contractPrice: toNum(c.contractPrice),
        // Prefer explicit fields on Contract if you later add them;
        // for now, use request's currency & payment type
        contractPriceCurrency: req.currency || null,
        contractPriceType: req.paymentRate || null,
        provider: {
          companyName: "—", // You can populate from Contract when/if you add these fields
          businessId: "—",
          contactName: "—",
          email: "—",
          phone: "—",
        },
        request: {
          id: safeNumber(req.requestId) || null,
          title: req.title || "—",
          scopeOfWork: req.scopeOfWork || "—",
          description: req.description || "—",
          invoiceType: req.invoiceType || "—",
          language: req.language || "—",
          advanceRetainerFee: req.advanceRetainerFee || "—",
        },
      };
    });

    return NextResponse.json({
      companyName: me?.companyName || null,
      contracts: shaped,
    });
  } catch (e) {
    console.error("GET /api/me/contracts failed:", e);
    return NextResponse.json(
      { error: "Server error loading contracts" },
      { status: 500 }
    );
  }
}
