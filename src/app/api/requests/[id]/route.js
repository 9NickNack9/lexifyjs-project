// src/app/api/requests/[id]/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { notifyProvidersRequestCancelled } from "@/lib/mailer";

// Only used by PATCH below
const RequestPatch = z.object({
  requestState: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  offersDeadline: z.coerce.date().optional(),
  // These two sometimes arrive as arrays; we join to strings
  scopeOfWork: z.array(z.any()).optional(),
  language: z.array(z.string()).optional(),
});

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.userId) {
    throw NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session;
}

// ---------- GET /api/requests/:id ----------
export async function GET(_req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let id;
    try {
      id = BigInt(params.id);
    } catch {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }

    const r = await prisma.request.findUnique({
      where: { requestId: id },
      select: {
        // identifiers / meta
        requestId: true,
        requestState: true,
        title: true,

        // display fields
        primaryContactPerson: true,
        scopeOfWork: true,
        description: true,
        additionalBackgroundInfo: true,
        backgroundInfoFiles: true,
        supplierCodeOfConductFiles: true,

        // pricing & invoicing
        paymentRate: true,
        currency: true,
        invoiceType: true,
        advanceRetainerFee: true,

        language: true,

        // taxonomy
        requestCategory: true,
        requestSubcategory: true,
        assignmentType: true,

        // dates
        dateExpired: true,
        offersDeadline: true, // if null in schema, harmlessly returns null

        // JSON blob (contains confidential, winnerBidderOnlyStatus, maximumPrice, etc.)
        details: true,

        // client line
        client: {
          select: {
            companyName: true,
            companyId: true,
            companyCountry: true,
          },
        },
      },
    });

    if (!r) return NextResponse.json(null);

    const d = r.details || {};

    function toCSV(val) {
      if (Array.isArray(val)) return val.filter(Boolean).join(", ");
      if (typeof val === "string") return val.trim() || null;
      return null;
    }
    const langTop = toCSV(r.language);
    const langDetails =
      toCSV(d.language) ??
      toCSV(d.languageCSV) ?? // some forms might name it languageCSV
      toCSV(d.languages); // or languages[]
    // --- end normalization ---

    const out = {
      ...r,
      requestId: r.requestId?.toString(),
      backgroundInfoFiles: r.backgroundInfoFiles || [],
      supplierCodeOfConductFiles: r.supplierCodeOfConductFiles || [],

      // normalize common fields to prefer top-level, fallback to details.*
      primaryContactPerson:
        r.primaryContactPerson ?? d.primaryContactPerson ?? null,
      currency: r.currency ?? d.currency ?? null,
      invoiceType: r.invoiceType ?? d.invoiceType ?? null,
      advanceRetainerFee: r.advanceRetainerFee ?? d.advanceRetainerFee ?? null,
      assignmentType: r.assignmentType ?? d.assignmentType ?? null,
      additionalBackgroundInfo:
        r.additionalBackgroundInfo ??
        d.additionalBackgroundInfo ??
        d.background ??
        null,

      // from details only (not top-level columns)
      confidential: d.confidential ?? null,
      winnerBidderOnlyStatus: d.winnerBidderOnlyStatus ?? null,
      maximumPrice: d.maximumPrice ?? null,

      // deadline preference: details.offersDeadline > offersDeadline > dateExpired
      offersDeadline:
        d.offersDeadline ?? r.offersDeadline ?? r.dateExpired ?? null,

      language: langTop ?? langDetails ?? null,

      // keep full details for preview parity
      details: d,
    };

    return NextResponse.json(out);
  } catch (e) {
    console.error("GET /api/requests/[id] failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// normalize Json / legacy {set:[]} / string → string[]
function toStringArray(val) {
  if (Array.isArray(val)) return val.filter((v) => typeof v === "string");
  if (val && typeof val === "object") {
    if (Array.isArray(val.set))
      return val.set.filter((v) => typeof v === "string");
    if (Array.isArray(val.value))
      return val.value.filter((v) => typeof v === "string");
  }
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed))
        return parsed.filter((v) => typeof v === "string");
      return val ? [val] : [];
    } catch {
      return val ? [val] : [];
    }
  }
  return [];
}

// ---------- PATCH /api/requests/:id ----------
export async function PATCH(req, { params }) {
  try {
    const session = await requireSession();

    let id;
    try {
      id = BigInt(params.id);
    } catch {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }

    // Only allow patching your own request
    const existing = await prisma.request.findFirst({
      where: { requestId: id, clientId: BigInt(session.userId) },
      select: { requestId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = RequestPatch.parse(body);

    const data = {
      ...parsed,
      // Arrays → comma-separated strings (fits your schema)
      language:
        parsed.language === undefined
          ? undefined
          : (parsed.language || []).join(", "),
      scopeOfWork:
        parsed.scopeOfWork === undefined
          ? undefined
          : Array.isArray(parsed.scopeOfWork)
          ? parsed.scopeOfWork.join(", ")
          : String(parsed.scopeOfWork ?? ""),
    };

    const updated = await prisma.request.update({
      where: { requestId: id },
      data,
    });

    return NextResponse.json({
      ok: true,
      requestId: updated.requestId.toString(),
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json(
      { error: "Invalid payload or not found" },
      { status: 400 }
    );
  }
}

// ---------- DELETE /api/requests/:id ----------
export async function DELETE(_, { params }) {
  const session = await requireSession();
  let id;
  try {
    id = BigInt(params.id);
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  // verify ownership & not expired
  const row = await prisma.request.findFirst({
    where: { requestId: id, clientId: BigInt(session.userId) },
    select: { dateExpired: true },
  });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date();
  if (now >= row.dateExpired) {
    return NextResponse.json(
      { error: "Cannot cancel after deadline" },
      { status: 400 }
    );
  }

  // --- collect recipient emails for all offers on this request ---
  // Load offers with provider relation and contact persons
  const offers = await prisma.offer.findMany({
    where: { requestId: id },
    select: {
      offerLawyer: true,
      provider: {
        select: {
          companyContactPersons: true, // [{firstName,lastName,email,telephone,position}]
          notificationPreferences: true,
        },
      },
    },
  });

  // Name normalization helpers
  const norm = (s) => (s ?? "").toString().trim().toLowerCase();
  const full = (p) =>
    [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim();

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailSet = new Set();

  for (const o of offers) {
    const prefs = toStringArray(o?.provider?.notificationPreferences);
    if (!prefs.includes("request-cancelled")) continue;
    const lawyerName = norm(o?.offerLawyer);
    if (!lawyerName) continue;

    const contacts = Array.isArray(o?.provider?.companyContactPersons)
      ? o.provider.companyContactPersons
      : [];

    // exact full-name match first
    let match =
      contacts.find((c) => norm(full(c)) === lawyerName) ||
      // then a relaxed startsWith on either first or last name
      contacts.find(
        (c) =>
          norm(c?.firstName).startsWith(lawyerName) ||
          norm(c?.lastName).startsWith(lawyerName)
      ) ||
      null;

    const email = (match?.email || "").trim();
    if (email && EMAIL_RE.test(email)) emailSet.add(email);
  }

  const recipients = Array.from(emailSet);

  // Send dynamic template (fire-and-forget, batched)
  if (recipients.length > 0) {
    try {
      const BATCH = 900; // safe chunk size
      for (let i = 0; i < recipients.length; i += BATCH) {
        await notifyProvidersRequestCancelled({
          to: recipients.slice(i, i + BATCH),
        });
      }
    } catch (e) {
      console.error("Request-cancelled email failed:", e);
    }
  }

  // Finally delete the request
  await prisma.request.delete({ where: { requestId: id } });
  return NextResponse.json({ ok: true });
}
