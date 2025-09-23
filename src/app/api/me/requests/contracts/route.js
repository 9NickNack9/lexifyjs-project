import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const toNum = (d) => (d == null ? null : Number(d));
const safeNumber = (v) => (typeof v === "bigint" ? Number(v) : v);

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const me = await prisma.appUser.findUnique({
      where: { userId: BigInt(session.userId) },
      select: { companyName: true },
    });

    // Fetch contracts that belong to this user via the request
    const rows = await prisma.contract.findMany({
      where: { request: { clientId: BigInt(session.userId) } },
      orderBy: { contractDate: "desc" },
      select: {
        contractId: true,
        contractDate: true,
        contractPrice: true, // Decimal
        contractPriceCurrency: true, // if you have it
        contractPriceType: true, // e.g., "Lump Sum Fixed Fee"
        providerCompanyName: true, // store these in your Contract
        providerBusinessId: true,
        providerContactName: true,
        providerEmail: true,
        providerPhone: true,
        request: {
          select: {
            title: true,
            requestId: true,
            scopeOfWork: true,
            currency: true,
            paymentRate: true,
            description: true,
            invoiceType: true,
            language: true,
            advanceRetainerFee: true,
          },
        },
      },
    });

    const shaped = rows.map((c) => ({
      contractId: safeNumber(c.contractId),
      contractDate: c.contractDate,
      contractPrice: toNum(c.contractPrice),
      contractPriceCurrency:
        c.contractPriceCurrency || c.request?.currency || null,
      contractPriceType: c.contractPriceType || c.request?.paymentRate || null,
      provider: {
        companyName: c.providerCompanyName || "—",
        businessId: c.providerBusinessId || "—",
        contactName: c.providerContactName || "—",
        email: c.providerEmail || "—",
        phone: c.providerPhone || "—",
      },
      request: {
        id: c.request?.requestId || null,
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
  } catch (e) {
    console.error("contracts list failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
