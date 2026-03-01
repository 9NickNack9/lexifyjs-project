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

    const me = await prisma.userAccount.findUnique({
      where: { userPkId: BigInt(session.userId) },
      select: { firstName: true, lastName: true, companyId: true },
    });

    if (!me?.companyId) {
      return NextResponse.json(
        { error: "User has no company" },
        { status: 400 },
      );
    }

    // NOTE: also select companyName so we can match legacy providerCompanyId saved as companyName
    const company = await prisma.company.findUnique({
      where: { companyPkId: me.companyId },
      select: {
        companyName: true,
        members: { select: { firstName: true, lastName: true } },
      },
    });

    const companyName = (company?.companyName || "").trim();

    // 1) Get offer IDs for:
    //    - correct rows: providerCompanyId == me.companyId
    //    - legacy rows: CAST(providerCompanyId AS TEXT) == companyName
    //
    // This avoids Prisma type mismatch (BigInt column vs string companyName).
    const offerIdRows =
      companyName.length > 0
        ? await prisma.$queryRaw`
            SELECT "offerId"
            FROM "Offer"
            WHERE
              (
                "providerCompanyId" = ${me.companyId}
                OR CAST("providerCompanyId" AS TEXT) = ${companyName}
              )
              AND "offerStatus" IN ('WON', 'LOST')
            ORDER BY "createdAt" DESC
          `
        : await prisma.$queryRaw`
            SELECT "offerId"
            FROM "Offer"
            WHERE
              "providerCompanyId" = ${me.companyId}
              AND "offerStatus" IN ('WON', 'LOST')
            ORDER BY "createdAt" DESC
          `;

    const offerIds = Array.isArray(offerIdRows)
      ? offerIdRows.map((r) => r?.offerId).filter((x) => x != null)
      : [];

    // Short-circuit if none
    if (offerIds.length === 0) {
      const contactsFromMembers = Array.isArray(company?.members)
        ? company.members.map(fullName).filter(Boolean)
        : [];
      const meName = fullName(me);
      const contacts = Array.from(
        new Set([...contactsFromMembers, meName].filter(Boolean)),
      );

      return NextResponse.json({ contacts, offers: [] });
    }

    // 2) Fetch full offer objects as before
    const offers = await prisma.offer.findMany({
      where: {
        offerId: { in: offerIds },
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
        createdByUser: { select: { firstName: true, lastName: true } },
        request: {
          select: {
            title: true,
            details: true,
            clientCompany: { select: { companyName: true } },
          },
        },
      },
    });

    const shaped = offers.map((o) => {
      const req = o.request || {};
      const clientName = req.clientCompany?.companyName || "—";
      const selectReason = req.details?.selectReason ?? null;

      return {
        offerId: safeNumber(o.offerId),
        requestId: safeNumber(o.requestId),
        title: o.offerTitle || req.title || "—",
        clientName,
        offerSubmittedBy:
          fullName(o.createdByUser) || o.offerLawyer || fullName(me) || "—",
        offerSubmissionDate: o.createdAt || null,
        offeredPrice: toNum(o.offerPrice),
        offerStatus: o.offerStatus || "—",
        selectReason,
      };
    });

    const contactsFromMembers = Array.isArray(company?.members)
      ? company.members.map(fullName).filter(Boolean)
      : [];
    const meName = fullName(me);
    const contacts = Array.from(
      new Set([...contactsFromMembers, meName].filter(Boolean)),
    );

    return NextResponse.json({
      contacts,
      offers: shaped,
    });
  } catch (e) {
    console.error("GET /api/me/offers/expired failed:", e);
    return NextResponse.json(
      { error: "Server error loading expired offers" },
      { status: 500 },
    );
  }
}
