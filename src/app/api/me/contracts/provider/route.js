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
    const meId = BigInt(session.userId);

    // Your org contact info (for fallbacks and contacts dropdown)
    const me = await prisma.appUser.findUnique({
      where: { userId: meId },
      select: {
        companyContactPersons: true,
        contactFirstName: true,
        contactLastName: true,
      },
    });
    const defaultOwnerName = [me?.contactFirstName, me?.contactLastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    // Load contracts for this provider — include requestId & providerId (join keys)
    const rows = await prisma.contract.findMany({
      where: { providerId: meId },
      orderBy: { contractDate: "desc" },
      select: {
        contractId: true,
        contractDate: true,
        contractPrice: true, // Decimal
        requestId: true,
        providerId: true,
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
            offers: {
              select: {
                providerId: true,
                offerLawyer: true,
                offerStatus: true,
                offerTitle: true,
              },
            },
          },
        },
        client: {
          select: {
            companyName: true,
            companyId: true,
            companyCountry: true,
            companyContactPersons: true, // <-- needed for purchaser rep & preview fallback
          },
        },
        provider: {
          select: {
            userId: true,
            companyName: true,
            companyId: true,
            companyContactPersons: true, // to match offerLawyer
          },
        },
      },
    });

    // Build key pairs for offer lookup
    const keyPairs = rows
      .map((c) => {
        if (!c.requestId || !c.providerId) return null;
        return { requestId: c.requestId, providerId: c.providerId };
      })
      .filter(Boolean);

    // Nothing to resolve? Return early.
    if (keyPairs.length === 0) {
      const contactsFromOrg = Array.isArray(me?.companyContactPersons)
        ? me.companyContactPersons
            .map((p) =>
              [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim()
            )
            .filter(Boolean)
        : [];
      const contacts = Array.from(
        new Set([...contactsFromOrg, defaultOwnerName].filter(Boolean))
      );
      return NextResponse.json({
        contacts,
        contracts: rows.map((c) => ({
          contractId: safeNumber(c.contractId),
          contractDate: c.contractDate,
          contractPrice: toNum(c.contractPrice),
          contractPdfFile: c.contractPdfFile ?? null,
          title: c.offer?.offerTitle || "—",
          clientName: c.client?.companyName || "—",
          contractOwner: "—",
          contract: {
            contractDate: c.contractDate,
            contractPrice: toNum(c.contractPrice),
            contractPriceCurrency: c.request?.currency || null,
            contractPriceType: c.request?.paymentRate || null,
            contractPdfFile: c.contractPdfFile ?? null,
            provider: null,
            client: {
              companyName: c.client?.companyName || "—",
              businessId: c.client?.companyId || "—",
            },
            request: {
              scopeOfWork: c.request?.scopeOfWork || "—",
              description: c.request?.description || "—",
              invoiceType: c.request?.invoiceType || "—",
              language: c.request?.language || "—",
              advanceRetainerFee: c.request?.advanceRetainerFee || "—",
            },
          },
        })),
      });
    }

    // Batch query the winning offers for those (requestId, providerId) pairs
    // 1) Query all offers for those requestIds/providers with status WON
    const requestIds = Array.from(new Set(keyPairs.map((k) => k.requestId)));
    const providerIds = Array.from(new Set(keyPairs.map((k) => k.providerId)));

    const wonOffers = await prisma.offer.findMany({
      where: {
        requestId: { in: requestIds },
        providerId: { in: providerIds },
        offerStatus: "WON",
      },
      select: {
        requestId: true,
        providerId: true,
        offerLawyer: true,
        createdAt: true,
        offerTitle: true,
      },
    });

    // Build a quick lookup for winners
    const wonMap = new Map(
      wonOffers.map((o) => [
        `${o.requestId}:${o.providerId}`,
        o.offerLawyer || "",
      ])
    );

    // 2) For pairs without a “WON”, fall back to the provider’s latest offer for that request
    const missingPairs = keyPairs.filter(
      (k) => !wonMap.has(`${k.requestId}:${k.providerId}`)
    );
    let latestMap = new Map();
    if (missingPairs.length) {
      const latestOffers = await prisma.offer.findMany({
        where: {
          requestId: {
            in: Array.from(new Set(missingPairs.map((k) => k.requestId))),
          },
          providerId: {
            in: Array.from(new Set(missingPairs.map((k) => k.providerId))),
          },
        },
        orderBy: { createdAt: "desc" },
        select: {
          requestId: true,
          providerId: true,
          offerLawyer: true,
          createdAt: true,
        },
      });
      // First hit is latest due to orderBy desc
      for (const o of latestOffers) {
        const key = `${o.requestId}:${o.providerId}`;
        if (!latestMap.has(key)) latestMap.set(key, o.offerLawyer || "");
      }
    }

    // Shape response with contractOwner resolved
    const shaped = rows.map((c) => {
      const key = `${c.requestId}:${c.providerId}`;
      const ownerFromOffer =
        wonMap.get(key) || latestMap.get(key) || defaultOwnerName || "";

      // Get this provider’s offer title (prefer the WON one, otherwise first)
      const offerTitle =
        (c.request?.offers || [])
          .filter((o) => String(o.providerId) === String(c.providerId))
          .find((o) => (o.offerStatus || "").toUpperCase() === "WON")
          ?.offerTitle ||
        (c.request?.offers || []).filter(
          (o) => String(o.providerId) === String(c.providerId)
        )[0]?.offerTitle ||
        null;

      // Resolve provider representative from offerLawyer
      const offerLawyer =
        (c.request?.offers || [])
          .filter((o) => String(o.providerId) === String(c.providerId))
          .find((o) => (o.offerStatus || "").toUpperCase() === "WON")
          ?.offerLawyer ||
        (c.request?.offers || []).filter(
          (o) => String(o.providerId) === String(c.providerId)
        )[0]?.offerLawyer ||
        "";
      const contacts = c.provider?.companyContactPersons || [];
      const norm = (s) => (s || "").toString().trim().toLowerCase();
      const full = (p) =>
        [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim();
      const match =
        contacts.find((p) => norm(full(p)) === norm(offerLawyer)) ||
        contacts.find(
          (p) =>
            norm(p?.firstName).startsWith(norm(offerLawyer)) ||
            norm(p?.lastName).startsWith(norm(offerLawyer))
        ) ||
        null;

      const provider = {
        userId: c.provider?.userId ? safeNumber(c.provider.userId) : null,
        companyName: c.provider?.companyName || "—",
        businessId: c.provider?.companyId || "—",
        contactName: match ? full(match) : offerLawyer || "—",
        email: match?.email || "—",
        phone: match?.telephone || "—",
      };

      // Purchaser primary contact (with fallbacks, show name even if email/phone absent)
      const joinName = (p) =>
        [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim();
      const pcDirect =
        c.request?.primaryContactPerson ||
        c.request?.details?.primaryContactPerson ||
        null;
      const pcFallbackList = Array.isArray(c.client?.companyContactPersons)
        ? c.client.companyContactPersons
        : [];
      const pc =
        pcDirect &&
        (pcDirect.firstName ||
          pcDirect.lastName ||
          pcDirect.email ||
          pcDirect.telephone)
          ? pcDirect
          : pcFallbackList[0] || null;

      const purchaser = {
        companyName: c.client?.companyName || "—",
        businessId: c.client?.companyId || "—",
        contactName: pc ? joinName(pc) : "—",
        email: pc?.email || "—",
        phone: pc?.telephone || "—",
      };

      return {
        contractId: safeNumber(c.contractId),
        contractDate: c.contractDate,
        contractPrice: toNum(c.contractPrice),
        title: offerTitle || c.request?.title || "—",
        clientName: c.client?.companyName || "—",
        contractOwner: ownerFromOffer || "—",
        contractPdfFile: c.contractPdfFile ?? null,

        contract: {
          contractDate: c.contractDate,
          contractPrice: toNum(c.contractPrice),
          contractPriceCurrency: c.request?.currency || null,
          contractPriceType: c.request?.paymentRate || null,
          contractPdfFile: c.contractPdfFile ?? null,
          provider,
          purchaser,
          client: {
            companyName: c.client?.companyName || "—",
            businessId: c.client?.companyId || "—",
            companyCountry: c.client?.companyCountry || null,
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

            // surface details (for nested preview fields)
            details: c.request?.details || {},
            // surface primary contact for the preview section (name-only in UI)
            primaryContactPerson: pc || null,
            // surface client for "Client, BIC, Country" line
            client: {
              companyName: c.client?.companyName || null,
              companyId: c.client?.companyId || null,
              companyCountry: c.client?.companyCountry || null,
            },
          },
        },
      };
    });

    // Contacts dropdown: org contacts + discovered owners
    const contactsFromOrg = Array.isArray(me?.companyContactPersons)
      ? me.companyContactPersons
          .map((p) =>
            [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim()
          )
          .filter(Boolean)
      : [];
    if (defaultOwnerName && !contactsFromOrg.includes(defaultOwnerName)) {
      contactsFromOrg.push(defaultOwnerName);
    }
    const ownersFromContracts = Array.from(
      new Set(
        shaped.map((c) => c.contractOwner).filter((n) => !!n && n !== "—")
      )
    );

    return NextResponse.json({
      contacts: Array.from(
        new Set([...contactsFromOrg, ...ownersFromContracts])
      ),
      contracts: shaped,
    });
  } catch (e) {
    console.error("GET /api/me/contracts/provider failed:", e);
    return NextResponse.json(
      { error: "Server error loading provider contracts" },
      { status: 500 }
    );
  }
}
