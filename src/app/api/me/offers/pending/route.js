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

    // Provider user (for default contact name & filtering source)
    const me = await prisma.appUser.findUnique({
      where: { userId: BigInt(session.userId) },
      select: {
        companyContactPersons: true, // JSON [{firstName,lastName,...}]
        contactFirstName: true,
        contactLastName: true,
      },
    });

    const now = new Date();

    // Find offers by this provider where the Request is still open & before deadline
    const offers = await prisma.offer.findMany({
      where: {
        providerId: BigInt(session.userId),
        // Optional: add an Offer.state if you have it (e.g. "SUBMITTED"), otherwise rely on Request
        request: {
          requestState: "PENDING",
          dateExpired: { gt: now },
        },
      },
      orderBy: { createdAt: "desc" }, // or your timestamp field name
      select: {
        offerId: true,
        offerPrice: true, // Decimal
        createdAt: true, // submission date
        offerLawyer: true, // person who submitted
        requestId: true,
        request: {
          select: {
            title: true,
            dateExpired: true,
            clientId: true,
            // For preview:
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

    // Load client company names in one go
    const clientIds = Array.from(
      new Set(offers.map((o) => o.request?.clientId).filter(Boolean))
    );
    const clients = clientIds.length
      ? await prisma.appUser.findMany({
          where: { userId: { in: clientIds } },
          select: { userId: true, companyName: true },
        })
      : [];
    const clientById = new Map(
      clients.map((c) => [String(c.userId), c.companyName || "—"])
    );

    const shaped = offers.map((o) => {
      const req = o.request || {};
      const clientName = clientById.get(String(req.clientId)) || "—";

      // “Offer Submitted By” — prefer offer.offerLawyer, else fallback to provider main contact
      const defaultName = [me?.contactFirstName, me?.contactLastName]
        .filter(Boolean)
        .join(" ");
      const offerSubmittedBy = o.offerLawyer || defaultName || "—";

      return {
        offerId: safeNumber(o.offerId),
        requestId: safeNumber(o.requestId),
        title: req.title || "—",
        clientName,
        offerSubmittedBy,
        offerSubmissionDate: o.createdAt || null,
        offeredPrice: toNum(o.offerPrice),
        dateExpired: req.dateExpired, // let UI compute “time until deadline”
        // Minimal request preview payload (mirrors purchaser preview)
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
          clientName, // for the header line
        },
      };
    });

    // Contact person list for filtering dropdown (full names)
    const contactList = Array.isArray(me?.companyContactPersons)
      ? me.companyContactPersons
          .map((p) =>
            [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim()
          )
          .filter(Boolean)
      : [];
    // include main contact if not in list
    const mainName = [me?.contactFirstName, me?.contactLastName]
      .filter(Boolean)
      .join(" ")
      .trim();
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
