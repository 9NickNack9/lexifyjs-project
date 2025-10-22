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
      select: {
        companyContactPersons: true,
        contactFirstName: true,
        contactLastName: true,
      },
    });

    const now = new Date();

    const offers = await prisma.offer.findMany({
      where: {
        providerId: BigInt(session.userId),
        request: {
          requestState: "PENDING",
          dateExpired: { gt: now },
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        offerId: true,
        offerPrice: true,
        createdAt: true,
        offerLawyer: true,
        requestId: true,
        request: {
          select: {
            title: true,
            dateExpired: true,
            clientId: true,
            scopeOfWork: true,
            description: true,
            currency: true,
            paymentRate: true,
            invoiceType: true,
            language: true,
            advanceRetainerFee: true,
            additionalBackgroundInfo: true,
            supplierCodeOfConductFiles: true,
            primaryContactPerson: true,
          },
        },
      },
    });

    // Load client company details (✅ include Business ID & Country)
    const clientIds = Array.from(
      new Set(offers.map((o) => o.request?.clientId).filter(Boolean))
    );
    const clients = clientIds.length
      ? await prisma.appUser.findMany({
          where: { userId: { in: clientIds } },
          select: {
            userId: true,
            companyName: true,
            companyId: true, // ✅ added
            companyCountry: true, // ✅ added
          },
        })
      : [];

    // Map userId -> object with name/id/country
    const clientById = new Map(
      clients.map((c) => [
        String(c.userId),
        {
          companyName: c.companyName || "—",
          companyId: c.companyId || "—",
          companyCountry: c.companyCountry || "—",
        },
      ])
    );

    const defaultName = [me?.contactFirstName, me?.contactLastName]
      .filter(Boolean)
      .join(" ");

    const shaped = offers.map((o) => {
      const req = o.request || {};
      const client = clientById.get(String(req.clientId)) || {
        companyName: "—",
        companyId: "—",
        companyCountry: "—",
      };

      return {
        offerId: safeNumber(o.offerId),
        requestId: safeNumber(o.requestId),
        title: req.title || "—",
        clientName: client.companyName,
        offerSubmittedBy: o.offerLawyer || defaultName || "—",
        offerSubmissionDate: o.createdAt || null,
        offeredPrice: toNum(o.offerPrice),
        dateExpired: req.dateExpired,
        preview: {
          scopeOfWork: req.scopeOfWork || "—",
          currency: req.currency || "—",
          paymentRate: req.paymentRate || "—",
          description: req.description || "—",
          invoiceType: req.invoiceType || "—",
          language: req.language || "—",
          advanceRetainerFee: req.advanceRetainerFee || "—",
          additionalBackgroundInfo: req.additionalBackgroundInfo || "",
          supplierCodeOfConductFiles: req.supplierCodeOfConductFiles || [],
          primaryContactPerson: req.primaryContactPerson || "—",

          // ✅ provide these to the modal preview
          clientName: client.companyName,
          clientBusinessId: client.companyId,
          clientCountry: client.companyCountry,
        },
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
    console.error("GET /api/me/offers/pending failed:", e);
    return NextResponse.json(
      { error: "Server error loading offers" },
      { status: 500 }
    );
  }
}
