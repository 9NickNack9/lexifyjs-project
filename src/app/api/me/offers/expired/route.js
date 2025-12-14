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

    const me = await prisma.appUser.findUnique({
      where: { userId: BigInt(session.userId) },
      select: {
        companyContactPersons: true,
        contactFirstName: true,
        contactLastName: true,
      },
    });

    const offers = await prisma.offer.findMany({
      where: {
        providerId: BigInt(session.userId),
        offerStatus: {
          in: ["WON", "LOST"],
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        offerId: true,
        offerPrice: true,
        offerTitle: true,
        createdAt: true,
        offerLawyer: true,
        offerStatus: true,
        requestId: true,
        request: {
          select: {
            title: true,
            clientId: true,
            details: true,
          },
        },
      },
    });

    // Load client company details
    const clientIds = Array.from(
      new Set(offers.map((o) => o.request?.clientId).filter(Boolean))
    );

    const clients = clientIds.length
      ? await prisma.appUser.findMany({
          where: { userId: { in: clientIds } },
          select: {
            userId: true,
            companyName: true,
          },
        })
      : [];

    const clientById = new Map(
      clients.map((c) => [String(c.userId), c.companyName || "—"])
    );

    const defaultName = [me?.contactFirstName, me?.contactLastName]
      .filter(Boolean)
      .join(" ");

    const shaped = offers.map((o) => {
      const req = o.request || {};
      const clientName = clientById.get(String(req.clientId)) || "—";
      const selectReason = req.details?.selectReason ?? null;

      return {
        offerId: safeNumber(o.offerId),
        requestId: safeNumber(o.requestId),
        title: o.offerTitle || req.title || "—",
        clientName,
        offerSubmittedBy: o.offerLawyer || defaultName || "—",
        offerSubmissionDate: o.createdAt || null,
        offeredPrice: toNum(o.offerPrice),
        offerStatus: o.offerStatus || "—",
        selectReason,
      };
    });

    const contactList = Array.isArray(me?.companyContactPersons)
      ? me.companyContactPersons
          .map((p) =>
            [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim()
          )
          .filter(Boolean)
      : [];
    const mainName = defaultName?.trim();
    if (mainName && !contactList.includes(mainName)) contactList.push(mainName);

    return NextResponse.json({
      contacts: contactList,
      offers: shaped,
    });
  } catch (e) {
    console.error("GET /api/me/offers/expired failed:", e);
    return NextResponse.json(
      { error: "Server error loading expired offers" },
      { status: 500 }
    );
  }
}
