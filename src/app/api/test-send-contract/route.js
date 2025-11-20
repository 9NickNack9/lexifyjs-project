// src/app/api/test-send-contract/route.js
export const runtime = "nodejs"; // ensure Puppeteer works (not edge)

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { htmlToPdfBuffer } from "@/lib/contractPdf.js";
import { sendContractEmail } from "@/lib/mailer.js";
import { filesToAttachments } from "@/lib/fetchFiles.js";
import ContractPrint from "@/emails/ContractPrint"; // returns HTML string

export async function GET(req) {
  try {
    const origin = process.env.APP_ORIGIN;
    const cookie = req.headers.get("cookie") || "";
    // 🔧 Manually set your test Request ID and recipient emails
    const testRequestId = 2; // <-- set an existing Request ID from your DB
    const testEmails = ["support@lexify.online"]; // <-- your test addresses

    // 1) Load a real contract + related data
    const contract = await prisma.contract.findFirst({
      where: { requestId: testRequestId },
      select: {
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
            scopeOfWork: true,
            description: true,
            invoiceType: true,
            language: true,
            advanceRetainerFee: true,
            currency: true,
            paymentRate: true,
            details: true,
            backgroundInfoFiles: true,
            supplierCodeOfConductFiles: true,
            primaryContactPerson: true,
            additionalBackgroundInfo: true,
            client: {
              select: {
                companyName: true,
                companyId: true,
                companyCountry: true,
                companyContactPersons: true,
              },
            },
            offers: {
              select: {
                providerId: true,
                offerLawyer: true,
                offerStatus: true,
              },
            },
          },
        },
        provider: {
          select: {
            companyName: true,
            companyId: true,
            companyContactPersons: true,
          },
        },
      },
    });

    if (!contract) {
      return NextResponse.json(
        { error: "No contract found for that Request ID" },
        { status: 404 }
      );
    }

    // 2) Shape to the same structure your ContractModal uses
    const normalize = (s) => (s || "").toString().trim().toLowerCase();
    const fullName = (c) =>
      [c?.firstName, c?.lastName].filter(Boolean).join(" ").trim();

    // Provider rep from offerLawyer
    const offers = Array.isArray(contract.request.offers)
      ? contract.request.offers
      : [];
    const byProvider = offers.filter(
      (o) => String(o.providerId) === String(contract.providerId)
    );
    const won =
      byProvider.find((o) => (o.offerStatus || "").toUpperCase() === "WON") ||
      byProvider[0] ||
      null;
    const offerLawyerName = won?.offerLawyer?.toString()?.trim() || "";
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
      companyName: contract.provider?.companyName || "—",
      businessId: contract.provider?.companyId || "—",
      contactName: match ? fullName(match) : offerLawyerName || "—",
      email: match?.email || "—",
      phone: match?.telephone || "—",
    };

    // Purchaser rep (primary contact) with fallbacks
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
      contractPrice: Number(contract.contractPrice ?? 0),
      contractPriceCurrency: contract.request.currency,
      contractPriceType: contract.request.paymentRate,
      provider,
      purchaser,
      request: {
        ...contract.request,
        primaryContactPerson: pc || null,
        client: {
          companyName: contract.request.client.companyName,
          companyId: contract.request.client.companyId,
          companyCountry: contract.request.client.companyCountry,
        },
      },
    };

    // 3) Load preview definitions using an absolute URL
    const defsRes = await fetch(`${origin}/previews/all-previews.json`, {
      cache: "no-store",
    });
    const defs = defsRes.ok ? await defsRes.json() : null;

    const norm = (s) => (s ?? "").toString().trim().toLowerCase();
    const cat = norm(shaped.request.requestCategory);
    const sub = norm(shaped.request.requestSubcategory);
    const asg = norm(shaped.request.assignmentType);
    const previewDef =
      defs?.requests?.find(
        (d) =>
          norm(d.category) === cat &&
          norm(d.subcategory) === sub &&
          norm(d.assignmentType) === asg
      ) ||
      defs?.requests?.find(
        (d) => norm(d.category) === cat && norm(d.subcategory) === sub
      ) ||
      defs?.requests?.find((d) => norm(d.category) === cat) ||
      null;

    // 4) Render HTML (no react-dom/server needed) → PDF
    const html = ContractPrint({
      contract: shaped,
      companyName: shaped.purchaser.companyName,
      previewDef,
    });
    const pdf = await htmlToPdfBuffer(html);

    // 5) Attach contract PDF + request files
    const files = [
      ...(shaped.request.backgroundInfoFiles || []),
      ...(shaped.request.supplierCodeOfConductFiles || []),
    ];
    const fileAttachments = await filesToAttachments(files, {
      origin,
      headers: cookie ? { cookie } : {},
      max: 12, // optional: allow more files
      maxBytes: 12 * 1024 * 1024, // optional: per-file size guard (12 MB)
    });
    const attachments = [
      {
        filename: `LEXIFY-Contract-${testRequestId}.pdf`,
        content: pdf.toString("base64"),
      },
      ...fileAttachments,
    ];

    // 6) Send email to your test recipients
    await sendContractEmail({
      to: testEmails, // manually set receivers here
      subject: `LEXIFY Contract Technopolis Holding Oyj - Wiidare Oy`,
      html: `<p>Please find attached your new LEXIFY Contract with all appendices.</p>`,
      attachments,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
