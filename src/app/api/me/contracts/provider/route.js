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
        request: {
          select: {
            title: true,
            currency: true,
            paymentRate: true,
            scopeOfWork: true,
            description: true,
            invoiceType: true,
            language: true,
            advanceRetainerFee: true,
          },
        },
        client: { select: { companyName: true, companyId: true } },
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
          title: c.request?.title || "—",
          clientName: c.client?.companyName || "—",
          contractOwner: "—",
          contract: {
            contractDate: c.contractDate,
            contractPrice: toNum(c.contractPrice),
            contractPriceCurrency: c.request?.currency || null,
            contractPriceType: c.request?.paymentRate || null,
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
      return {
        contractId: safeNumber(c.contractId),
        contractDate: c.contractDate,
        contractPrice: toNum(c.contractPrice),
        title: c.request?.title || "—",
        clientName: c.client?.companyName || "—",
        contractOwner: ownerFromOffer || "—",

        contract: {
          contractDate: c.contractDate,
          contractPrice: toNum(c.contractPrice),
          contractPriceCurrency: c.request?.currency || null,
          contractPriceType: c.request?.paymentRate || null,
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
