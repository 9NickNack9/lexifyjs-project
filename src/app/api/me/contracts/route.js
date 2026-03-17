// src/app/api/me/contracts/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// BigInt-safe JSON
const serialize = (obj) =>
  JSON.parse(
    JSON.stringify(obj, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
  );

// Safe number parser for Decimal | number | "5"
const numify = (v) => {
  if (v == null) return null;
  const s = typeof v === "object" && v.toString ? v.toString() : String(v);
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
};
const safeNumber = (v) => (typeof v === "bigint" ? Number(v) : v);

// helpers to match contacts by name
const normalize = (s) => (s || "").toString().trim().toLowerCase();
const fullName = (c) =>
  [c?.firstName, c?.lastName].filter(Boolean).join(" ").trim();

function matchContactByName(contacts, name) {
  if (!Array.isArray(contacts) || !name) return null;
  const want = normalize(name);
  return (
    contacts.find((c) => normalize(fullName(c)) === want) ||
    contacts.find(
      (c) =>
        normalize(c?.firstName).startsWith(want) ||
        normalize(c?.lastName).startsWith(want),
    ) ||
    null
  );
}

const joinName = (p) =>
  [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim();

function resolvePurchaserContact(req, fallbackUser = null) {
  if (
    req?.primaryContactPerson &&
    typeof req.primaryContactPerson === "object" &&
    (req.primaryContactPerson.email || req.primaryContactPerson.telephone)
  ) {
    const pc = req.primaryContactPerson;
    return {
      contactName: joinName(pc) || "—",
      email: pc.email || "—",
      phone: pc.telephone || "—",
      raw: pc,
    };
  }

  const dpc = req?.details?.primaryContactPerson;
  if (dpc && typeof dpc === "object" && (dpc.email || dpc.telephone)) {
    return {
      contactName: joinName(dpc) || "—",
      email: dpc.email || "—",
      phone: dpc.telephone || "—",
      raw: dpc,
    };
  }

  if (
    typeof req?.primaryContactPerson === "string" &&
    req.primaryContactPerson.trim()
  ) {
    const matched =
      matchContactByName(
        req?.clientCompany?.members || [],
        req.primaryContactPerson.trim(),
      ) || null;

    if (matched) {
      return {
        contactName: fullName(matched) || req.primaryContactPerson.trim(),
        email: matched.email || "—",
        phone: matched.telephone || "—",
        raw: matched,
      };
    }
  }

  if (fallbackUser) {
    return {
      contactName: fullName(fallbackUser) || "—",
      email: fallbackUser.email || "—",
      phone: fallbackUser.telephone || "—",
      raw: fallbackUser,
    };
  }

  const companyMembers = req?.clientCompany?.members || [];
  if (companyMembers.length) {
    const primaryLike =
      companyMembers.find((m) => m.isCompanyAdmin) || companyMembers[0] || null;

    if (primaryLike) {
      return {
        contactName: fullName(primaryLike) || "—",
        email: primaryLike.email || "—",
        phone: primaryLike.telephone || "—",
        raw: primaryLike,
      };
    }
  }

  const legacyList = req?.client?.companyContactPersons || [];
  if (Array.isArray(legacyList) && legacyList.length) {
    const primaryLike =
      legacyList.find((c) =>
        String(c?.position || "")
          .toLowerCase()
          .includes("primary"),
      ) || legacyList[0];

    return {
      contactName: joinName(primaryLike) || "—",
      email: primaryLike?.email || "—",
      phone: primaryLike?.telephone || "—",
      raw: primaryLike,
    };
  }

  return { contactName: "—", email: "—", phone: "—", raw: null };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // session.userId is UserAccount.userPkId
    const ua = await prisma.userAccount.findUnique({
      where: { userPkId: BigInt(session.userId) },
      select: {
        companyId: true,
        company: { select: { companyName: true } },
      },
    });

    if (!ua?.companyId) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const companyName = (ua.company?.companyName || "").trim();

    const contractIdRows =
      companyName.length > 0
        ? await prisma.$queryRaw`
        SELECT c."contractId"
        FROM "Contract" c
        LEFT JOIN "Request" r ON r."requestId" = c."requestId"
        LEFT JOIN "AppUser" a ON a."userId" = r."clientId"
        WHERE
          (
            r."clientCompanyId" = ${ua.companyId}
            OR r."clientId" = ${ua.companyId}
            OR LOWER(COALESCE(a."companyName", '')) = LOWER(${companyName})
          )
        ORDER BY c."contractDate" DESC
      `
        : await prisma.$queryRaw`
        SELECT c."contractId"
        FROM "Contract" c
        LEFT JOIN "Request" r ON r."requestId" = c."requestId"
        WHERE
          (
            r."clientCompanyId" = ${ua.companyId}
            OR r."clientId" = ${ua.companyId}
          )
        ORDER BY c."contractDate" DESC
      `;

    const contractIds = Array.isArray(contractIdRows)
      ? contractIdRows.map((r) => r?.contractId).filter(Boolean)
      : [];

    const contracts = await prisma.contract.findMany({
      where: { contractId: { in: contractIds } },
      orderBy: { contractDate: "desc" },
      select: {
        contractId: true,
        contractDate: true,
        contractPrice: true,
        providerId: true,
        providerCompanyId: true,
        providerUserId: true,
        clientCompanyId: true,
        clientUserId: true,
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
            primaryContactPerson: true,
            details: true,

            clientCompanyId: true,
            clientUserId: true,
            clientCompany: {
              select: {
                companyName: true,
                businessId: true,
                companyCountry: true,
                members: {
                  select: {
                    userPkId: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    telephone: true,
                    isCompanyAdmin: true,
                  },
                },
              },
            },
            clientUser: {
              select: {
                userPkId: true,
                firstName: true,
                lastName: true,
                email: true,
                telephone: true,
              },
            },

            clientId: true,
            client: {
              select: {
                userId: true,
                companyName: true,
                companyId: true,
                companyCountry: true,
                companyContactPersons: true,
              },
            },

            offers: {
              select: {
                providerId: true,
                providerCompanyId: true,
                providerUserId: true,
                offerLawyer: true,
                offerStatus: true,
                offerTitle: true,
                offerExpectedPrice: true,
              },
            },
          },
        },

        providerCompany: {
          select: {
            companyName: true,
            businessId: true,
            providerTotalRating: true,
            providerQualityRating: true,
            providerCommunicationRating: true,
            providerBillingRating: true,
            providerIndividualRating: true,
            members: {
              select: {
                userPkId: true,
                firstName: true,
                lastName: true,
                email: true,
                telephone: true,
              },
            },
          },
        },
        providerUser: {
          select: {
            userPkId: true,
            firstName: true,
            lastName: true,
            email: true,
            telephone: true,
          },
        },

        // legacy
        provider: {
          select: {
            userId: true,
            companyName: true,
            companyId: true,
            providerTotalRating: true,
            providerQualityRating: true,
            providerCommunicationRating: true,
            providerBillingRating: true,
            providerIndividualRating: true,
            companyContactPersons: true,
          },
        },

        clientCompany: {
          select: {
            companyName: true,
            businessId: true,
            companyCountry: true,
          },
        },
        clientUser: {
          select: {
            userPkId: true,
            firstName: true,
            lastName: true,
            email: true,
            telephone: true,
          },
        },
      },
    });

    const shaped = contracts.map((c) => {
      const p = c.providerCompany || c.provider || {};

      const q = numify(p.providerQualityRating);
      const co = numify(p.providerCommunicationRating);
      const b = numify(p.providerBillingRating);
      const t = numify(p.providerTotalRating);
      const parts = [q, co, b].filter((n) => typeof n === "number");
      const computedTotal = parts.length
        ? Number((parts.reduce((s, v) => s + v, 0) / parts.length).toFixed(1))
        : null;

      const providerRating = {
        total: t ?? computedTotal,
        quality: q ?? null,
        communication: co ?? null,
        billing: b ?? null,
      };

      const rawInd = p.providerIndividualRating;
      let providerHasRatings = false;

      if (Array.isArray(rawInd)) providerHasRatings = rawInd.length > 0;
      else if (typeof rawInd === "string") {
        const trimmed = rawInd.trim();
        providerHasRatings =
          trimmed !== "" && trimmed !== "[]" && trimmed !== "{}";
      }

      let myRating = null;
      let myHasRating = false;

      let indArr = [];
      if (Array.isArray(rawInd)) indArr = rawInd;
      else if (typeof rawInd === "string") {
        const trimmed = rawInd.trim();
        if (trimmed.startsWith("[")) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) indArr = parsed;
          } catch {}
        }
      }

      const norm = (s) => (s ?? "").toString().trim().toLowerCase();
      const currentContractId =
        c.contractId != null ? String(c.contractId) : null;

      if (indArr.length > 0 && companyName && currentContractId) {
        const mine = indArr.filter((r) => {
          const rc = r.raterCompanyName ?? r.ratingCompanyName ?? "";
          const ratingContractId =
            r.contractId != null ? String(r.contractId) : null;

          return (
            norm(rc) === norm(companyName) &&
            ratingContractId === currentContractId
          );
        });

        if (mine.length > 0) {
          let latest = mine[0];

          for (const r of mine) {
            const rTime = r?.updatedAt
              ? new Date(r.updatedAt).getTime()
              : -Infinity;
            const latestTime = latest?.updatedAt
              ? new Date(latest.updatedAt).getTime()
              : -Infinity;

            if (rTime > latestTime) latest = r;
          }

          const mq = numify(latest.quality);
          const mr = numify(latest.responsiveness);
          const mb = numify(latest.billing);

          const mParts = [mq, mr, mb].filter((n) => typeof n === "number");
          const myTotal = mParts.length
            ? Number(
                (mParts.reduce((s, v) => s + v, 0) / mParts.length).toFixed(1),
              )
            : null;

          myRating = {
            total: myTotal,
            quality: mq ?? null,
            communication: mr ?? null,
            billing: mb ?? null,
          };

          myHasRating = mParts.length > 0;
        }
      }

      const offers = Array.isArray(c.request?.offers) ? c.request.offers : [];

      const providerKey =
        c.providerCompanyId != null
          ? String(c.providerCompanyId)
          : c.providerId != null
            ? String(c.providerId)
            : null;

      const byProvider = offers.filter((o) => {
        const offerKey =
          o.providerCompanyId != null
            ? String(o.providerCompanyId)
            : o.providerId != null
              ? String(o.providerId)
              : null;
        return offerKey && providerKey && offerKey === providerKey;
      });

      const won =
        byProvider.find((o) => (o.offerStatus || "").toUpperCase() === "WON") ||
        byProvider[0] ||
        null;

      const offerLawyerName = won?.offerLawyer?.toString?.().trim() || null;

      const matched =
        matchContactByName(c.providerCompany?.members || [], offerLawyerName) ||
        (won?.providerUserId
          ? (c.providerCompany?.members || []).find(
              (m) => String(m.userPkId) === String(won.providerUserId),
            ) || null
          : null) ||
        c.providerUser ||
        matchContactByName(
          c.provider?.companyContactPersons || [],
          offerLawyerName,
        ) ||
        null;

      const provider = {
        userId:
          matched?.userPkId != null
            ? safeNumber(matched.userPkId)
            : c.provider?.userId != null
              ? safeNumber(c.provider.userId)
              : null,
        companyName:
          c.providerCompany?.companyName || c.provider?.companyName || "—",
        businessId:
          c.providerCompany?.businessId || c.provider?.companyId || "—",
        contactName: matched ? fullName(matched) : offerLawyerName || "—",
        email: matched?.email || "—",
        phone: matched?.telephone || "—",
      };

      const purchaserContact = resolvePurchaserContact(
        c.request,
        c.request?.clientUser || c.clientUser || null,
      );

      const purchaser = {
        companyName:
          c.request?.clientCompany?.companyName ||
          c.clientCompany?.companyName ||
          c.request?.client?.companyName ||
          ua.company?.companyName ||
          "—",
        businessId:
          c.request?.clientCompany?.businessId ||
          c.clientCompany?.businessId ||
          c.request?.client?.companyId ||
          "—",
        contactName: purchaserContact.contactName,
        email: purchaserContact.email,
        phone: purchaserContact.phone,
      };

      return {
        contractId: safeNumber(c.contractId),
        contractDate: c.contractDate,
        contractPrice: numify(c.contractPrice),
        contractPriceCurrency: c.request?.currency || null,
        contractPriceType: c.request?.paymentRate || null,
        contractPdfFile: c.contractPdfFile ?? null,

        provider,
        purchaser,

        offer: won
          ? {
              offerLawyer: won.offerLawyer || null,
              offerStatus: won.offerStatus || null,
              offerTitle: won.offerTitle || null,
              offerExpectedPrice:
                won.offerExpectedPrice != null
                  ? numify(won.offerExpectedPrice)
                  : null,
            }
          : null,

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

          primaryContactPerson: purchaserContact.raw || null,
          details: c.request?.details || {},

          client: {
            companyName:
              c.request?.clientCompany?.companyName ||
              c.clientCompany?.companyName ||
              c.request?.client?.companyName ||
              null,
            companyId:
              c.request?.clientCompany?.businessId ||
              c.clientCompany?.businessId ||
              c.request?.client?.companyId ||
              null,
            companyCountry:
              c.request?.clientCompany?.companyCountry ||
              c.clientCompany?.companyCountry ||
              c.request?.client?.companyCountry ||
              null,
          },
        },

        providerRating,
        providerHasRatings,
        myRating,
        myHasRating,
      };
    });

    return NextResponse.json(
      serialize({
        companyName: ua.company?.companyName || null,
        contracts: shaped,
      }),
    );
  } catch (e) {
    console.error("GET /api/me/contracts failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
