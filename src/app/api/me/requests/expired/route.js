// /api/me/requests/expired/route.js
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

    const now = new Date();
    const reqs = await prisma.request.findMany({
      where: {
        clientId: BigInt(session.userId),
        dateExpired: { lt: now },
        requestState: "EXPIRED", // ← changed
      },
      orderBy: { dateCreated: "desc" },
      select: {
        requestId: true,
        title: true,
        primaryContactPerson: true,
        dateCreated: true,
        dateExpired: true,
        currency: true,
        paymentRate: true,
        contractResult: true, // ← added
        details: true,
        // offers with provider for names & ratings if needed later
        offers: {
          select: {
            offerPrice: true,
            provider: { select: { companyName: true } },
          },
        },
      },
    });

    const shaped = reqs.map((r) => {
      // Parse maxPrice from details.maximumPrice
      let maxPrice = null;
      const rawMax = r.details?.maximumPrice;
      if (rawMax !== undefined && rawMax !== null && rawMax !== "") {
        const mp = Number(String(rawMax).replace(/[^\d.]/g, ""));
        if (!Number.isNaN(mp)) maxPrice = mp;
      }

      // Collect numeric offers + provider name
      const offers = (r.offers || [])
        .map((o) => ({
          offeredPrice: toNum(o.offerPrice),
          providerCompanyName: o.provider?.companyName || "—",
        }))
        .filter(
          (o) =>
            typeof o.offeredPrice === "number" && !Number.isNaN(o.offeredPrice)
        )
        .sort((a, b) => a.offeredPrice - b.offeredPrice);

      const bestOffer = offers[0] || null;
      const runnerUps = offers.slice(1, 3); // top 2 runner-ups

      return {
        requestId: safeNumber(r.requestId),
        requestTitle: r.title, // table expects "requestTitle"
        dateCreated: r.dateCreated,
        dateExpired: r.dateExpired,
        contractResult: r.contractResult ?? null,
        currency: r.currency,
        paymentRate: r.paymentRate,
        maxPrice,
        bestOffer,
        runnerUps,
      };
    });

    return NextResponse.json({ requests: shaped });
  } catch (e) {
    console.error("expired list failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
