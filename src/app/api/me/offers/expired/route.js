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

    const company = await prisma.company.findUnique({
      where: { companyPkId: me.companyId },
      select: {
        members: { select: { firstName: true, lastName: true } },
      },
    });

    const offers = await prisma.offer.findMany({
      where: {
        providerCompanyId: me.companyId,
        offerStatus: { in: ["WON", "LOST"] },
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
            clientCompany: {
              select: {
                companyName: true,
              },
            },
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
