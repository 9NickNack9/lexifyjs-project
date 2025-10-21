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

    // 1) Fetch ONLY this user's contracts (via the request relation)
    const contracts = await prisma.contract.findMany({
      where: { request: { clientId: String(session.userId) } },
      orderBy: { contractDate: "desc" },
      select: {
        contractId: true,
        contractDate: true,
        contractPrice: true,
        contractPriceCurrency: true,
        contractPriceType: true,
        providerId: true, // 👈 need this to resolve provider
        request: {
          select: {
            requestId: true,
            title: true,
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

    // 2) Batch-load provider profiles for company name + TOTAL ratings
    const providerIds = [
      ...new Set(
        contracts
          .map((c) => c.providerId)
          .filter((x) => typeof x !== "undefined" && x !== null)
      ),
    ];

    const providers = providerIds.length
      ? await prisma.appUser.findMany({
          where: { userId: { in: providerIds.map((id) => BigInt(id)) } },
          select: {
            userId: true,
            companyName: true,
            businessId: true,
            email: true,
            phone: true,
            // TOTAL (aggregate) ratings on the provider profile
            providerTotalRating: true,
            providerQualityRating: true,
            providerCommunicationRating: true,
            providerBillingRating: true,
          },
        })
      : [];

    const providerMap = new Map(providers.map((p) => [Number(p.userId), p]));

    // 3) (Optional) Load MY individual ratings for these providers, if you have a table for it
    // If your schema differs, adjust this block or remove it safely.
    let myRatingsMap = new Map();
    if (providerIds.length) {
      const myRatings = await prisma.providerUserRating?.findMany?.({
        where: {
          raterUserId: BigInt(session.userId),
          providerUserId: { in: providerIds.map((id) => BigInt(id)) },
        },
        select: {
          providerUserId: true,
          total: true,
          quality: true,
          communication: true,
          billing: true,
        },
      });
      if (myRatings) {
        myRatingsMap = new Map(
          myRatings.map((r) => [Number(r.providerUserId), r])
        );
      }
    }

    // 4) Shape rows for the table + modal
    const shaped = contracts.map((c) => {
      const p = providerMap.get(Number(c.providerId));
      const mine = myRatingsMap.get(Number(c.providerId)) || null;

      return {
        contractId: safeNumber(c.contractId),
        contractDate: c.contractDate,
        contractPrice: toNum(c.contractPrice),
        contractPriceCurrency:
          c.contractPriceCurrency || c.request?.currency || null,
        contractPriceType:
          c.contractPriceType || c.request?.paymentRate || null,

        // shown in the table
        request: {
          id: c.request?.requestId || null,
          title: c.request?.title || "—",
        },

        // provider for both table + modal
        provider: {
          userId: c.providerId ? Number(c.providerId) : null,
          companyName: p?.companyName || "—",
          businessId: p?.businessId || "—",
          contactName: p?.contactPersonName || "—",
          email: p?.email || "—",
          phone: p?.phone || "—",
        },

        // ratings
        myRating: mine
          ? {
              total: toNum(mine.total),
              quality: toNum(mine.quality),
              communication: toNum(mine.communication),
              billing: toNum(mine.billing),
            }
          : null,
        providerRating: {
          total: toNum(p?.providerTotalRating),
          quality: toNum(p?.providerQualityRating),
          communication: toNum(p?.providerCommunicationRating),
          billing: toNum(p?.providerBillingRating),
        },

        // keep extra request fields for ContractModal
        requestDetails: {
          scopeOfWork: c.request?.scopeOfWork || "—",
          description: c.request?.description || "—",
          invoiceType: c.request?.invoiceType || "—",
          language: c.request?.language || "—",
          advanceRetainerFee: c.request?.advanceRetainerFee || "—",
        },
      };
    });

    return NextResponse.json({
      companyName: me?.companyName || null,
      contracts: shaped,
    });
  } catch (e) {
    console.error("contracts list failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
