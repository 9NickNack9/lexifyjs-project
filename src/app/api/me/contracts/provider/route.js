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

    const myCompany = await prisma.company.findUnique({
      where: { companyPkId: me.companyId },
      select: {
        companyName: true,
        businessId: true,
        members: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            telephone: true,
          },
        },
      },
    });

    const companyName = (myCompany?.companyName || "").trim();

    // ------------------------------------------------------------------
    // Legacy-safe contract selection:
    //   - normal: providerCompanyId == me.companyId
    //   - legacy: CAST(providerCompanyId AS TEXT) == companyName
    // ------------------------------------------------------------------
    const contractIdRows =
      companyName.length > 0
        ? await prisma.$queryRaw`
            SELECT "contractId"
            FROM "Contract"
            WHERE
              ("providerCompanyId" = ${me.companyId}
               OR CAST("providerCompanyId" AS TEXT) = ${companyName})
            ORDER BY "contractDate" DESC
          `
        : await prisma.$queryRaw`
            SELECT "contractId"
            FROM "Contract"
            WHERE "providerCompanyId" = ${me.companyId}
            ORDER BY "contractDate" DESC
          `;

    const contractIds = Array.isArray(contractIdRows)
      ? contractIdRows.map((r) => r?.contractId).filter((x) => x != null)
      : [];

    if (contractIds.length === 0) {
      const contactsFromMembers = Array.isArray(myCompany?.members)
        ? myCompany.members.map(fullName).filter(Boolean)
        : [];
      const meName = fullName(me);

      return NextResponse.json({
        contacts: Array.from(
          new Set([...contactsFromMembers, meName].filter(Boolean)),
        ),
        contracts: [],
      });
    }

    // Fetch full contract rows via Prisma
    const rows = await prisma.contract.findMany({
      where: { contractId: { in: contractIds } },
      orderBy: { contractDate: "desc" },
      select: {
        contractId: true,
        contractDate: true,
        contractPrice: true,
        requestId: true,
        contractPdfFile: true,

        request: {
          select: {
            requestId: true,
            requestCategory: true,
            requestSubcategory: true,
            assignmentType: true,
            title: true,
            currency: true,
            paymentRate: true,
            scopeOfWork: true,
            description: true,
            invoiceType: true,
            language: true,
            advanceRetainerFee: true,
            additionalBackgroundInfo: true,
            backgroundInfoFiles: true,
            supplierCodeOfConductFiles: true,
            details: true,
            primaryContactPerson: true,
          },
        },

        clientCompany: {
          select: {
            companyName: true,
            businessId: true,
            companyCountry: true,
            members: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                telephone: true,
              },
            },
          },
        },

        providerCompany: {
          select: {
            companyName: true,
            businessId: true,
          },
        },
      },
    });

    const requestIds = Array.from(
      new Set(rows.map((c) => c.requestId).filter(Boolean)),
    );

    // ------------------------------------------------------------------
    // Legacy-safe WON offer selection for contractOwner + offerTitle:
    //   - normal: providerCompanyId == me.companyId
    //   - legacy: CAST(providerCompanyId AS TEXT) == companyName
    // ------------------------------------------------------------------
    const wonOfferIdRows =
      requestIds.length && companyName.length > 0
        ? await prisma.$queryRaw`
            SELECT "offerId"
            FROM "Offer"
            WHERE
              "offerStatus" = 'WON'
              AND "requestId" = ANY(${requestIds})
              AND (
                "providerCompanyId" = ${me.companyId}
                OR CAST("providerCompanyId" AS TEXT) = ${companyName}
              )
          `
        : requestIds.length
          ? await prisma.$queryRaw`
              SELECT "offerId"
              FROM "Offer"
              WHERE
                "offerStatus" = 'WON'
                AND "requestId" = ANY(${requestIds})
                AND "providerCompanyId" = ${me.companyId}
            `
          : [];

    const wonOfferIds = Array.isArray(wonOfferIdRows)
      ? wonOfferIdRows.map((r) => r?.offerId).filter((x) => x != null)
      : [];

    const wonOffers = wonOfferIds.length
      ? await prisma.offer.findMany({
          where: { offerId: { in: wonOfferIds } },
          select: {
            requestId: true,
            offerLawyer: true,
            offerTitle: true,
            createdByUser: { select: { firstName: true, lastName: true } },
          },
        })
      : [];

    const wonByRequestId = new Map(
      wonOffers.map((o) => [
        String(o.requestId),
        {
          owner: fullName(o.createdByUser) || o.offerLawyer || "",
          offerTitle: o.offerTitle || "",
        },
      ]),
    );

    const shaped = rows.map((c) => {
      const won = wonByRequestId.get(String(c.requestId));
      const owner = won?.owner || fullName(me) || "—";
      const offerTitle = won?.offerTitle || c.request?.title || "—";

      // Purchaser primary contact fallback: first member of client company
      const clientMembers = c.clientCompany?.members || [];
      const clientPrimary = clientMembers[0] || null;

      const purchaser = {
        companyName: c.clientCompany?.companyName || "—",
        businessId: c.clientCompany?.businessId || "—",
        contactName: clientPrimary ? fullName(clientPrimary) : "—",
        email: clientPrimary?.email || "—",
        phone: clientPrimary?.telephone || "—",
      };

      // Provider rep: match contractOwner name against provider members, else just show contractOwner
      const providerMembers = myCompany?.members || [];
      const norm = (s) => (s || "").toString().trim().toLowerCase();
      const match =
        providerMembers.find((p) => norm(fullName(p)) === norm(owner)) || null;

      const provider = {
        userId: me?.userPkId ? safeNumber(me.userPkId) : null,
        companyName: myCompany?.companyName || "—",
        businessId: myCompany?.businessId || "—",
        contactName: match ? fullName(match) : owner || "—",
        email: match?.email || "—",
        phone: match?.telephone || "—",
      };

      return {
        contractId: safeNumber(c.contractId),
        contractDate: c.contractDate,
        contractPrice: toNum(c.contractPrice),
        title: offerTitle,
        clientName: c.clientCompany?.companyName || "—",
        contractOwner: owner || "—",
        contractPdfFile: c.contractPdfFile ?? null,

        // what your ContractModal consumes
        contract: {
          contractDate: c.contractDate,
          contractPrice: toNum(c.contractPrice),
          contractPriceCurrency: c.request?.currency || null,
          contractPriceType: c.request?.paymentRate || null,
          contractPdfFile: c.contractPdfFile ?? null,

          provider,
          purchaser,

          client: {
            companyName: c.clientCompany?.companyName || "—",
            businessId: c.clientCompany?.businessId || "—",
            companyCountry: c.clientCompany?.companyCountry || null,
          },

          request: {
            id: c.request?.requestId ? safeNumber(c.request.requestId) : null,
            requestCategory: c.request?.requestCategory || null,
            requestSubcategory: c.request?.requestSubcategory || null,
            assignmentType: c.request?.assignmentType || null,

            title: c.request?.title || "—",
            scopeOfWork: c.request?.scopeOfWork || "—",
            description: c.request?.description || "—",
            invoiceType: c.request?.invoiceType || "—",
            language: c.request?.language || "—",
            advanceRetainerFee: c.request?.advanceRetainerFee || "—",

            currency: c.request?.currency || null,
            paymentRate: c.request?.paymentRate || null,
            maximumPrice:
              typeof c.request?.details?.maximumPrice === "number"
                ? c.request.details.maximumPrice
                : null,

            additionalBackgroundInfo:
              c.request?.additionalBackgroundInfo ??
              c.request?.details?.additionalBackgroundInfo ??
              null,

            backgroundInfoFiles:
              c.request?.backgroundInfoFiles ??
              c.request?.details?.backgroundInfoFiles ??
              [],

            supplierCodeOfConductFiles:
              c.request?.supplierCodeOfConductFiles ??
              c.request?.details?.supplierCodeOfConductFiles ??
              [],

            details: c.request?.details || {},
            primaryContactPerson: c.request?.primaryContactPerson || null,

            client: {
              companyName: c.clientCompany?.companyName || null,
              companyId: c.clientCompany?.businessId || null,
              companyCountry: c.clientCompany?.companyCountry || null,
            },
          },
        },
      };
    });

    const contactsFromMembers = Array.isArray(myCompany?.members)
      ? myCompany.members.map(fullName).filter(Boolean)
      : [];
    const meName = fullName(me);
    const ownersFromContracts = Array.from(
      new Set(shaped.map((x) => x.contractOwner).filter((n) => n && n !== "—")),
    );

    return NextResponse.json({
      contacts: Array.from(
        new Set(
          [...contactsFromMembers, meName, ...ownersFromContracts].filter(
            Boolean,
          ),
        ),
      ),
      contracts: shaped,
    });
  } catch (e) {
    console.error("GET /api/me/contracts/provider failed:", e);
    return NextResponse.json(
      { error: "Server error loading provider contracts" },
      { status: 500 },
    );
  }
}
