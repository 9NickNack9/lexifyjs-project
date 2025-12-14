// src/app/api/me/contracts/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// BigInt-safe JSON
const serialize = (obj) =>
  JSON.parse(
    JSON.stringify(obj, (_, v) => (typeof v === "bigint" ? v.toString() : v))
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
  // exact full name first, then startsWith by either part
  return (
    contacts.find((c) => normalize(fullName(c)) === want) ||
    contacts.find(
      (c) =>
        normalize(c?.firstName).startsWith(want) ||
        normalize(c?.lastName).startsWith(want)
    ) ||
    null
  );
}

// helper near top
const joinName = (p) =>
  [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim();

function resolvePurchaserContact(req) {
  // 1) request.primaryContactPerson
  if (
    req?.primaryContactPerson &&
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
  // 2) details.primaryContactPerson
  const dpc = req?.details?.primaryContactPerson;
  if (dpc && (dpc.email || dpc.telephone)) {
    return {
      contactName: joinName(dpc) || "—",
      email: dpc.email || "—",
      phone: dpc.telephone || "—",
      raw: dpc,
    };
  }
  // 3) fallback to client contact persons
  const list = req?.client?.companyContactPersons || [];
  if (Array.isArray(list) && list.length) {
    const primaryLike =
      list.find((c) =>
        String(c?.position || "")
          .toLowerCase()
          .includes("primary")
      ) || list[0];
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

    const me = await prisma.appUser.findUnique({
      where: { userId: BigInt(session.userId) },
      select: { companyName: true },
    });

    // NOTE: no 'offer' relation on Contract — read offers via the linked request
    const contracts = await prisma.contract.findMany({
      where: { request: { clientId: BigInt(session.userId) } },
      orderBy: { contractDate: "desc" },
      select: {
        contractId: true,
        contractDate: true,
        contractPrice: true,
        providerId: true,
        contractPdfFile: true,

        request: {
          select: {
            requestId: true,
            requestCategory: true,
            requestSubcategory: true,
            assignmentType: true,
            title: true,
            currency: true, // -> contractPriceCurrency
            paymentRate: true, // -> contractPriceType
            scopeOfWork: true,
            description: true,
            invoiceType: true,
            language: true,
            advanceRetainerFee: true,
            additionalBackgroundInfo: true,
            backgroundInfoFiles: true,
            supplierCodeOfConductFiles: true,

            // purchaser representative + company info
            primaryContactPerson: true, // { firstName,lastName,email,telephone }
            details: true, // may contain .primaryContactPerson
            client: {
              select: {
                companyName: true,
                companyId: true,
                companyCountry: true,
                companyContactPersons: true, // [{firstName,lastName,email,telephone,position}]
              },
            },

            // gather all offers; we will pick the one from this provider
            offers: {
              select: {
                providerId: true,
                offerLawyer: true,
                offerStatus: true, // "WON" | "LOST" | ...
              },
            },
          },
        },

        provider: {
          select: {
            userId: true,
            companyName: true,
            companyId: true, // provider business id
            providerTotalRating: true,
            providerQualityRating: true,
            providerCommunicationRating: true,
            providerBillingRating: true,
            providerIndividualRating: true,
            companyContactPersons: true, // [{ firstName,lastName,email,telephone,position }]
          },
        },
      },
    });

    const shaped = contracts.map((c) => {
      const p = c.provider || {};

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

      // Determine if provider actually has any individual ratings.
      // Field is Json @default("[]"), which may come as [] or "[]".
      const rawInd = p.providerIndividualRating;
      let providerHasRatings = false;

      if (Array.isArray(rawInd)) {
        providerHasRatings = rawInd.length > 0;
      } else if (typeof rawInd === "string") {
        const trimmed = rawInd.trim();
        // Treat empty string / "[]" / "{}" as "no ratings"
        providerHasRatings =
          trimmed !== "" && trimmed !== "[]" && trimmed !== "{}";
      }

      // ---- compute "My Rating" from providerIndividualRating by raterCompanyName ----
      let myRating = null;
      let myHasRating = false;

      // Normalize providerIndividualRating into an array of rating objects
      let indArr = [];
      if (Array.isArray(rawInd)) {
        indArr = rawInd;
      } else if (typeof rawInd === "string") {
        const trimmed = rawInd.trim();
        if (trimmed.startsWith("[")) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) indArr = parsed;
          } catch {
            // ignore parse errors, treat as no ratings
          }
        }
      }

      const myCompanyName = me?.companyName || "";
      const norm = (s) => (s ?? "").toString().trim().toLowerCase();

      if (indArr.length > 0 && myCompanyName) {
        // Find ratings where raterCompanyName (or ratingCompanyName proxy) matches my company
        const mine = indArr.filter((r) => {
          const rc =
            r.raterCompanyName ??
            r.ratingCompanyName ?? // in case of naming mismatch
            "";
          return norm(rc) === norm(myCompanyName);
        });

        if (mine.length > 0) {
          // If multiple, pick the latest by updatedAt if available
          let latest = mine[0];
          for (const r of mine) {
            if (
              r.updatedAt &&
              (!latest.updatedAt ||
                new Date(r.updatedAt) > new Date(latest.updatedAt))
            ) {
              latest = r;
            }
          }

          const mq = numify(latest.quality);
          const mr = numify(latest.responsiveness);
          const mb = numify(latest.billing);

          const mParts = [mq, mr, mb].filter((n) => typeof n === "number");
          const myTotal = mParts.length
            ? Number(
                (mParts.reduce((s, v) => s + v, 0) / mParts.length).toFixed(1)
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

      // ---- find the offerLawyer from offers on the same request by this provider ----
      const offers = Array.isArray(c.request?.offers) ? c.request.offers : [];
      const byProvider = offers.filter(
        (o) => String(o.providerId) === String(c.providerId)
      );
      const won =
        byProvider.find((o) => (o.offerStatus || "").toUpperCase() === "WON") ||
        byProvider[0] ||
        null;
      const offerLawyerName = won?.offerLawyer?.toString?.().trim() || null;

      // ---- match provider company contact by offerLawyer name ----
      const matched =
        matchContactByName(p.companyContactPersons, offerLawyerName) || null;

      const provider = {
        userId: p.userId ? safeNumber(p.userId) : null,
        companyName: p.companyName || "—",
        businessId: p.companyId || "—",
        // representative from matched contact (fallback to the offerLawyer name)
        contactName: matched ? fullName(matched) : offerLawyerName || "—",
        email: matched?.email || "—",
        phone: matched?.telephone || "—",
      };

      // ---- purchaser representative with fallbacks (request field → details → client contacts) ----
      const purchaserContact = resolvePurchaserContact(c.request);
      const purchaser = {
        companyName: c.request?.client?.companyName || me?.companyName || "—",
        businessId: c.request?.client?.companyId || "—",
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
          // derive from details.maximumPrice since it's not a top-level column
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
          // ✅ expose the actual primary contact for the preview section
          primaryContactPerson: purchaserContact.raw || null,

          // include details so the modal preview can resolve nested paths (e.g., details.*)
          details: c.request?.details || {},

          // expose client so the preview can build "Client, BIC, Country"
          client: {
            companyName: c.request?.client?.companyName || null,
            companyId: c.request?.client?.companyId || null,
            companyCountry: c.request?.client?.companyCountry || null,
          },
        },

        providerRating,
        providerHasRatings,
        myRating,
        myHasRating,
      };
    });

    return NextResponse.json(
      serialize({ companyName: me?.companyName || null, contracts: shaped })
    );
  } catch (e) {
    console.error("GET /api/me/contracts failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
