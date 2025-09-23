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

    // Provider’s own contact list for the filter dropdown
    const me = await prisma.appUser.findUnique({
      where: { userId: BigInt(session.userId) },
      select: {
        companyContactPersons: true,
        contactFirstName: true,
        contactLastName: true,
      },
    });

    // Contracts where current user is the provider
    const rows = await prisma.contract.findMany({
      where: { providerId: BigInt(session.userId) },
      orderBy: { contractDate: "desc" },
      select: {
        contractId: true,
        contractDate: true,
        contractPrice: true, // Decimal
        requestId: true,
        // If you store “owner” as a string on Contract, add select here (contractOwner)
        // contractOwner: true,
        request: {
          select: {
            title: true,
            clientId: true,
            currency: true,
            paymentRate: true,
            scopeOfWork: true,
            description: true,
            invoiceType: true,
            language: true,
            advanceRetainerFee: true,
          },
        },
        client: {
          // purchaser user
          select: { companyName: true, companyId: true },
        },
      },
    });

    const shaped = rows.map((c) => ({
      contractId: safeNumber(c.contractId),
      contractDate: c.contractDate,
      contractPrice: toNum(c.contractPrice),
      title: c.request?.title || "—",
      clientName: c.client?.companyName || "—",
      // If you track “contract owner” per contract, use that; otherwise leave blank
      contractOwner: "", // will be filtered client-side against the dropdown; leave empty if not stored
      // For contract modal preview:
      contract: {
        contractDate: c.contractDate,
        contractPrice: toNum(c.contractPrice),
        contractPriceCurrency: c.request?.currency || null,
        contractPriceType: c.request?.paymentRate || null,
        provider: null, // provider = current user; you can fill if you want from `me`
        client: {
          companyName: c.client?.companyName || "—",
          businessId: c.client?.companyId || "—",
        },
        request: {
          scopeOfWork: c.request?.scopeOfWork || "—",
          description: c.request?.description || "—",
          invoiceType: c.request?.invoiceType || "—",
          language: c.request?.language || "—",
          advanceRetainerFee: c.request?.advanceRetainerFee || "—",
        },
      },
    }));

    // Contact person list for filter
    const contactList = Array.isArray(me?.companyContactPersons)
      ? me.companyContactPersons
          .map((p) =>
            [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim()
          )
          .filter(Boolean)
      : [];
    const mainName = [me?.contactFirstName, me?.contactLastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (mainName && !contactList.includes(mainName)) contactList.push(mainName);

    return NextResponse.json({ contacts: contactList, contracts: shaped });
  } catch (e) {
    console.error("GET /api/me/contracts/provider failed:", e);
    return NextResponse.json(
      { error: "Server error loading provider contracts" },
      { status: 500 }
    );
  }
}
