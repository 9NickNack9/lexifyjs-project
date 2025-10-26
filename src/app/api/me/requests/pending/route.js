// src/app/api/me/requests/pending/route.js
export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { htmlToPdfBuffer } from "@/lib/contractPdf.js";
import { sendContractEmail } from "@/lib/mailer.js";
import { filesToAttachments } from "@/lib/fetchFiles.js";
import ContractPrint from "@/emails/ContractPrint.jsx";
import { promises as fs } from "fs";
import path from "path";

// ---- helpers ----
const toNum = (d) => (d == null ? null : Number(d));
const safeNumber = (v) => (typeof v === "bigint" ? Number(v) : v);

const toNumberOrNull = (v) => {
  if (v == null) return null;
  const s = typeof v === "object" && v.toString ? v.toString() : String(v);
  const n = Number(s.replace?.(/[^\d.]/g, "") ?? s);
  return Number.isFinite(n) ? n : null;
};

// read details.offersDeadline if present, else dateExpired
const resolveOffersDeadline = (r) => {
  const d = r?.details?.offersDeadline;
  return d != null && d !== "" ? d : r.dateExpired || null;
};

// parse maximum price from details.maximumPrice (only place we read it)
const maxFromDetails = (details) => {
  const raw = details?.maximumPrice;
  if (raw === undefined || raw === null || raw === "") return null;
  const n = toNumberOrNull(raw);
  return n;
};

async function updateRequestContractYesNo(requestId, yesOrNo) {
  await prisma.request.update({
    where: { requestId },
    data: { contractResult: yesOrNo },
  });
}

async function sendContractPackageEmail(prisma, requestId) {
  // 1) Load contract + offer + reps like your /api/me/contracts does (same selects)
  const contract = await prisma.contract.findUnique({
    where: { requestId },
    select: {
      contractId: true,
      contractDate: true,
      contractPrice: true,
      providerId: true,
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
          client: {
            select: {
              companyName: true,
              companyId: true,
              companyCountry: true,
              companyContactPersons: true,
              userId: true,
            },
          },
          offers: {
            select: { providerId: true, offerLawyer: true, offerStatus: true },
          },
        },
      },
      provider: {
        select: {
          userId: true,
          companyName: true,
          companyId: true,
          companyContactPersons: true,
        },
      },
    },
  });

  if (!contract) return;

  // 2) Shape to the same structure your ContractModal consumes
  const normalize = (s) => (s || "").toString().trim().toLowerCase();
  const fullName = (c) =>
    [c?.firstName, c?.lastName].filter(Boolean).join(" ").trim();

  // provider rep = offerLawyer matched to provider companyContactPersons
  const offers = Array.isArray(contract.request?.offers)
    ? contract.request.offers
    : [];
  const byProvider = offers.filter(
    (o) => String(o.providerId) === String(contract.providerId)
  );
  const won =
    byProvider.find((o) => (o.offerStatus || "").toUpperCase() === "WON") ||
    byProvider[0] ||
    null;
  const offerLawyerName = won?.offerLawyer?.toString?.().trim() || "";
  const contacts = contract.provider?.companyContactPersons || [];
  const match =
    contacts.find(
      (c) => normalize(fullName(c)) === normalize(offerLawyerName)
    ) ||
    contacts.find(
      (c) =>
        normalize(c?.firstName).startsWith(normalize(offerLawyerName)) ||
        normalize(c?.lastName).startsWith(normalize(offerLawyerName))
    ) ||
    null;

  const provider = {
    userId: contract.provider?.userId ?? null,
    companyName: contract.provider?.companyName || "—",
    businessId: contract.provider?.companyId || "—",
    contactName: match ? fullName(match) : offerLawyerName || "—",
    email: match?.email || "—",
    phone: match?.telephone || "—",
  };

  // purchaser rep (primary contact) with fallbacks
  const pcDirect =
    contract.request?.primaryContactPerson ||
    contract.request?.details?.primaryContactPerson ||
    null;
  const fallbackList = Array.isArray(
    contract.request?.client?.companyContactPersons
  )
    ? contract.request.client.companyContactPersons
    : [];
  const pc =
    pcDirect &&
    (pcDirect.firstName ||
      pcDirect.lastName ||
      pcDirect.email ||
      pcDirect.telephone)
      ? pcDirect
      : fallbackList[0] || null;

  const purchaser = {
    companyName: contract.request?.client?.companyName || "—",
    businessId: contract.request?.client?.companyId || "—",
    contactName: pc ? fullName(pc) : "—",
    email: pc?.email || "—",
    phone: pc?.telephone || "—",
  };

  const shaped = {
    contractDate: contract.contractDate,
    contractPrice:
      Number(
        contract.contractPrice?.toString?.() ?? contract.contractPrice ?? 0
      ) || null,
    contractPriceCurrency: contract.request?.currency || null,
    contractPriceType: contract.request?.paymentRate || null,
    provider,
    purchaser,
    request: {
      id: contract.request?.requestId || null,
      requestCategory: contract.request?.requestCategory || null,
      requestSubcategory: contract.request?.requestSubcategory || null,
      assignmentType: contract.request?.assignmentType || null,
      title: contract.request?.title || "—",
      scopeOfWork: contract.request?.scopeOfWork || "—",
      description: contract.request?.description || "—",
      invoiceType: contract.request?.invoiceType || "—",
      language: contract.request?.language || "—",
      advanceRetainerFee: contract.request?.advanceRetainerFee || "—",
      currency: contract.request?.currency || null,
      paymentRate: contract.request?.paymentRate || null,
      maximumPrice:
        typeof contract.request?.details?.maximumPrice === "number"
          ? contract.request.details.maximumPrice
          : null,
      additionalBackgroundInfo:
        contract.request?.additionalBackgroundInfo ??
        contract.request?.details?.additionalBackgroundInfo ??
        null,
      backgroundInfoFiles:
        contract.request?.backgroundInfoFiles ??
        contract.request?.details?.backgroundInfoFiles ??
        [],
      supplierCodeOfConductFiles:
        contract.request?.supplierCodeOfConductFiles ??
        contract.request?.details?.supplierCodeOfConductFiles ??
        [],
      details: contract.request?.details || {},
      primaryContactPerson: pc || null,
      client: {
        companyName: contract.request?.client?.companyName || null,
        companyId: contract.request?.client?.companyId || null,
        companyCountry: contract.request?.client?.companyCountry || null,
      },
    },
  };

  // 3) Load preview definitions (server-safe)
  let defs = null;
  const origin = process.env.APP_ORIGIN; // e.g. http://localhost:3000 or your prod origin
  if (origin) {
    try {
      const res = await fetch(`${origin}/previews/all-previews.json`, {
        cache: "no-store",
      });
      if (res.ok) defs = await res.json();
    } catch {}
  }
  if (!defs) {
    // Fallback: read from /public/previews/all-previews.json
    try {
      const p = path.join(
        process.cwd(),
        "public",
        "previews",
        "all-previews.json"
      );
      const raw = await fs.readFile(p, "utf8");
      defs = JSON.parse(raw);
    } catch {}
  }

  const matchDef = () => {
    if (!defs?.requests) return null;
    const list = defs.requests;
    const norm = (s) => (s ?? "").toString().trim().toLowerCase();
    const cat =
      norm(shaped.request.requestCategory) ||
      norm(shaped.request?.details?.requestCategory);
    const sub =
      norm(shaped.request.requestSubcategory) ||
      norm(shaped.request?.details?.requestSubcategory);
    const asg =
      norm(shaped.request.assignmentType) ||
      norm(shaped.request?.details?.assignmentType);
    return (
      list.find(
        (d) =>
          norm(d.category) === cat &&
          norm(d.subcategory) === sub &&
          norm(d.assignmentType) === asg
      ) ||
      list.find(
        (d) => norm(d.category) === cat && norm(d.subcategory) === sub
      ) ||
      list.find((d) => norm(d.category) === cat) ||
      null
    );
  };
  const previewDef = matchDef();

  // 4) Render HTML (same as modal visuals) & make PDF
  const html = ContractPrint({
    contract: shaped,
    companyName: shaped.purchaser.companyName,
    previewDef,
  });
  const pdf = await htmlToPdfBuffer(html);

  // 5) Collect attachments (contract PDF + request files)
  const fileAtts = [
    ...(await filesToAttachments(shaped.request.backgroundInfoFiles || [], {
      origin: process.env.APP_ORIGIN,
    })),
    ...(await filesToAttachments(
      shaped.request.supplierCodeOfConductFiles || [],
      { origin: process.env.APP_ORIGIN }
    )),
  ];
  const attachments = [
    {
      filename: `LEXIFY-Contract-${requestId}.pdf`,
      content: pdf.toString("base64"),
    },
    ...fileAtts,
  ];

  // 6) Email both reps
  const to = [provider.email, purchaser.email].filter(Boolean);
  const subject = `LEXIFY Contract - ${
    shaped.request.title || shaped.purchaser.companyName || ""
  }`;
  const intro =
    "Attached is your LEXIFY Contract cover page as a PDF along with the request's attachments.";
  const inlineNotice =
    "If attachments are large, some email clients may truncate the message.";
  const emailHtml = `
    <div style="font-family:Arial,Helvetica,sans-serif">
      <p>${intro}</p>
      <p><strong>Provider Representative:</strong> ${
        provider.contactName
      } &lt;${provider.email || ""}&gt;</p>
      <p><strong>Purchaser Representative:</strong> ${
        purchaser.contactName
      } &lt;${purchaser.email || ""}&gt;</p>
    </div>
  `;

  await sendContractEmail({
    to,
    bcc: ["support@lexify.online"],
    subject,
    html: emailHtml,
    attachments,
  });
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const meIdBig = BigInt(session.userId);

    const me = await prisma.appUser.findUnique({
      where: { userId: meIdBig },
      select: {
        winningOfferSelection: true, // "manual" | "Automatic"
        companyName: true,
        companyId: true,
        companyCountry: true,
      },
    });
    const winningMode = (
      me?.winningOfferSelection || "Automatic"
    ).toLowerCase();
    const now = new Date();

    //
    // 1) EXPIRY PASS for *your* PENDING requests that are past offersDeadline/dateExpired
    //
    const myPending = await prisma.request.findMany({
      where: {
        clientId: meIdBig,
        requestState: "PENDING",
      },
      select: {
        requestId: true,
        dateExpired: true,
        details: true,
        paymentRate: true,
        clientId: true,
        offers: {
          select: {
            offerId: true,
            offerPrice: true, // Decimal/string
            providerId: true, // BigInt
          },
        },
      },
    });

    for (const r of myPending) {
      const deadline = resolveOffersDeadline(r);
      const isPast = deadline
        ? new Date(deadline) <= now
        : r.dateExpired
        ? new Date(r.dateExpired) <= now
        : false;

      if (!isPast) continue;

      const offers = Array.isArray(r.offers) ? r.offers : [];
      const hasOffers = offers.length > 0;

      if (!hasOffers) {
        // EXPIRED + contractResult = "No"
        await prisma.request.update({
          where: { requestId: r.requestId },
          data: { requestState: "EXPIRED" },
        });
        await updateRequestContractYesNo(r.requestId, "No");
        continue;
      }

      if (winningMode === "manual") {
        // ON HOLD + acceptDeadline = dateExpired + 7 days
        const base = r.dateExpired ? new Date(r.dateExpired) : now;
        base.setDate(base.getDate() + 7);
        await prisma.request.update({
          where: { requestId: r.requestId },
          data: { requestState: "ON HOLD", acceptDeadline: base },
        });
        continue;
      }

      // Automatic selection
      const maxPriceNum = maxFromDetails(r.details); // null means "no max"
      const offersWithNum = offers
        .map((o) => ({ ...o, priceNum: toNumberOrNull(o.offerPrice) }))
        .filter((o) => o.priceNum != null);

      const lowest = offersWithNum.reduce(
        (best, cur) =>
          best == null || cur.priceNum < best.priceNum ? cur : best,
        null
      );

      const anyUnderMax =
        maxPriceNum == null
          ? offersWithNum.length > 0 // no max price ⇒ any offer qualifies
          : offersWithNum.some((o) => o.priceNum <= maxPriceNum);

      if (anyUnderMax && lowest) {
        // 1) Create the contract once, OUTSIDE any transaction (no throw on dup)
        const createResult = await prisma.contract.createMany({
          data: [
            {
              requestId: r.requestId,
              clientId: meIdBig, // purchaser
              providerId: lowest.providerId, // winner provider
              contractPrice:
                lowest.offerPrice?.toString?.() ?? String(lowest.offerPrice),
            },
          ],
          skipDuplicates: true, // ✅ no error if it already exists
        });
        const createdNow = (createResult?.count || 0) > 0;

        // 2) Now safely update statuses in a clean transaction
        await prisma.$transaction([
          prisma.offer.update({
            where: { offerId: lowest.offerId },
            data: { offerStatus: "WON" },
          }),
          prisma.offer.updateMany({
            where: { requestId: r.requestId, offerId: { not: lowest.offerId } },
            data: { offerStatus: "LOST" },
          }),
          prisma.request.update({
            where: { requestId: r.requestId },
            data: { requestState: "EXPIRED", contractResult: "Yes" },
          }),
        ]);

        // 3) Email only when a new contract was actually created
        if (createdNow) {
          try {
            await sendContractPackageEmail(prisma, r.requestId);
          } catch (e) {
            console.error("Emailing contract package failed", e);
          }
        }
      } else {
        // ON HOLD + acceptDeadline = dateExpired + 7 days
        const base = r.dateExpired ? new Date(r.dateExpired) : now;
        base.setDate(base.getDate() + 7);
        await prisma.request.update({
          where: { requestId: r.requestId },
          data: { requestState: "ON HOLD", acceptDeadline: base },
        });
      }
    }

    //
    // 2) RETURN PENDING + ON HOLD requests for the table
    //
    const requests = await prisma.request.findMany({
      where: {
        clientId: meIdBig,
        requestState: { in: ["PENDING", "ON HOLD"] },
      },
      orderBy: { dateCreated: "desc" },
      select: {
        requestId: true,
        title: true,
        primaryContactPerson: true,
        dateCreated: true,
        dateExpired: true,
        requestState: true,
        paymentRate: true,
        currency: true,
        language: true,
        details: true,
        scopeOfWork: true,
        description: true,
        additionalBackgroundInfo: true,
        backgroundInfoFiles: true,
        supplierCodeOfConductFiles: true,
        invoiceType: true,
        advanceRetainerFee: true,
        serviceProviderType: true,
        domesticOffers: true,
        providerSize: true,
        providerCompanyAge: true,
        providerMinimumRating: true,
        requestCategory: true,
        requestSubcategory: true,
        assignmentType: true, //
        offers: {
          select: { offerPrice: true },
        },
      },
    });

    const shaped = requests.map((r) => {
      const offers = r.offers || [];
      const offerValues = offers
        .map((o) => toNum(o.offerPrice))
        .filter((n) => typeof n === "number" && !Number.isNaN(n));
      const offersReceived = offers.length;
      const bestOffer = offerValues.length ? Math.min(...offerValues) : null;

      // Maximum price only from details.maximumPrice
      const maximumPrice = maxFromDetails(r.details);

      const offersDeadline = resolveOffersDeadline(r);

      return {
        requestId: safeNumber(r.requestId),
        title: r.title,
        primaryContactPerson: r.primaryContactPerson,
        dateCreated: r.dateCreated,
        dateExpired: r.dateExpired,
        scopeOfWork: r.scopeOfWork,
        description: r.description,
        additionalBackgroundInfo: r.additionalBackgroundInfo || "",
        backgroundInfoFiles: r.backgroundInfoFiles || [],
        supplierCodeOfConductFiles: r.supplierCodeOfConductFiles || [],
        paymentRate: r.paymentRate,
        currency: r.currency,
        language: r.language,
        invoiceType: r.invoiceType,
        advanceRetainerFee: r.advanceRetainerFee,
        serviceProviderType: r.serviceProviderType,
        domesticOffers: r.domesticOffers,
        providerSize: r.providerSize,
        providerCompanyAge: r.providerCompanyAge,
        providerMinimumRating: r.providerMinimumRating,
        requestCategory: r.requestCategory,
        requestSubcategory: r.requestSubcategory || null,
        assignmentType: r.assignmentType || null, //
        companyName: me?.companyName || null,
        companyId: me?.companyId || null,
        companyCountry: me?.companyCountry || null,
        details: r.details || {},
        offersDeadline,
        offersReceived,
        bestOffer,
        maximumPrice, // number | null
        requestState: r.requestState,
      };
    });

    return NextResponse.json({
      winningOfferSelection: me?.winningOfferSelection || "Automatic",
      companyName: me?.companyName || null,
      companyId: me?.companyId || null,
      companyCountry: me?.companyCountry || null,
      requests: shaped,
    });
  } catch (err) {
    console.error("GET /api/me/requests/pending failed:", err);
    return NextResponse.json(
      { error: "Server error loading pending requests" },
      { status: 500 }
    );
  }
}
