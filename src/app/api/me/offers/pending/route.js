import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const toNum = (d) => (d == null ? null : Number(d));
const safeNumber = (v) => (typeof v === "bigint" ? Number(v) : v);

const fullName = (u) =>
  [u?.firstName, u?.lastName].filter(Boolean).join(" ").trim();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // NEW: session.userId is UserAccount.userPkId
    const me = await prisma.userAccount.findUnique({
      where: { userPkId: BigInt(session.userId) },
      select: {
        userPkId: true,
        firstName: true,
        lastName: true,
        companyId: true,
      },
    });

    if (!me?.companyId) {
      return NextResponse.json(
        { error: "User has no company" },
        { status: 400 },
      );
    }

    const company = await prisma.company.findUnique({
      where: { companyPkId: me.companyId },
      select: {
        members: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    const offers = await prisma.offer.findMany({
      where: {
        providerCompanyId: me.companyId,
        request: {
          requestState: { in: ["PENDING", "ON HOLD"] },
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        offerId: true,
        offerPrice: true,
        offerTitle: true,
        createdAt: true,
        offerLawyer: true,
        requestId: true,
        createdByUser: {
          select: { firstName: true, lastName: true },
        },
        request: {
          select: {
            title: true,
            dateExpired: true,
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
            details: true,
            clientCompany: {
              select: {
                companyName: true,
                businessId: true,
                companyCountry: true,
              },
            },
          },
        },
      },
    });

    const shaped = offers.map((o) => {
      const req = o.request || {};
      const clientCo = req.clientCompany || null;

      const submittedBy =
        fullName(o.createdByUser) || o.offerLawyer || fullName(me) || "—";

      return {
        offerId: safeNumber(o.offerId),
        requestId: safeNumber(o.requestId),
        title: o.offerTitle || req.title || "—",
        clientName: clientCo?.companyName || "—",
        confidential: req.details?.confidential ?? null,
        offerSubmittedBy: submittedBy,
        offerSubmissionDate: o.createdAt || null,
        offeredPrice: toNum(o.offerPrice),
        dateExpired: req.dateExpired,

        // keep parity with your preview modal expectations
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

          clientName: clientCo?.companyName || "—",
          clientBusinessId: clientCo?.businessId || "—",
          clientCountry: clientCo?.companyCountry || "—",
        },
      };
    });

    const contactsFromMembers = Array.isArray(company?.members)
      ? company.members.map(fullName).filter(Boolean)
      : [];
    const meName = fullName(me);
    const contacts = Array.from(
      new Set(["All", ...contactsFromMembers, meName].filter(Boolean)),
    );

    return NextResponse.json({
      contacts: contacts.filter((c) => c !== "All"), // page adds "All" itself
      offers: shaped,
    });
  } catch (e) {
    console.error("GET /api/me/offers/pending failed:", e);
    return NextResponse.json(
      { error: "Server error loading offers" },
      { status: 500 },
    );
  }
}
