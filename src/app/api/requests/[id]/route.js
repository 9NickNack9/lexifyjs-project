// src/app/api/requests/[id]/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { notifyProvidersRequestCancelled } from "@/lib/mailer";

// --- email helpers ---
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isEmail = (s) => typeof s === "string" && EMAIL_RE.test(s.trim());

const norm = (s) => (s ?? "").toString().trim().toLowerCase();
const fullName = (p) =>
  [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim();

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

// Find primary contact person object by offerLawyer name (UserAccount member)
function findPrimaryMemberByLawyer(offerLawyer, members) {
  const name = norm(offerLawyer);
  if (!Array.isArray(members)) return null;

  return (
    members.find((m) => norm(fullName(m)) === name) ||
    members.find(
      (m) => norm(m?.firstName) === name || norm(m?.lastName) === name,
    ) ||
    null
  );
}

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
  // Expect: session.userId = UserAccount.userPkId, session.companyId = Company.companyPkId
  if (!session?.userId || !session?.companyId) {
    throw NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session;
}

function safeBigInt(v) {
  try {
    return v == null ? null : BigInt(v);
  } catch {
    return null;
  }
}

// ---------- GET /api/requests/:id ----------
export async function GET(_req, ctx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let id;
    try {
      const { id: idParam } = await ctx.params; // Next.js: params is async
      id = BigInt(idParam);
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
        providerReferences: true,

        // taxonomy
        requestCategory: true,
        requestSubcategory: true,
        assignmentType: true,

        // dates
        dateExpired: true,
        offersDeadline: true,

        // JSON blob
        details: true,

        // schema preferred:
        clientCompany: {
          select: {
            companyName: true,
            businessId: true,
            companyCountry: true,
          },
        },

        // legacy fallback (still exists in schema):
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
      toCSV(d.language) ?? toCSV(d.languageCSV) ?? toCSV(d.languages);

    // Prefer Company fields; fall back to legacy AppUser fields
    const clientOut = r.clientCompany
      ? {
          companyName: r.clientCompany.companyName,
          companyId: r.clientCompany.businessId,
          companyCountry: r.clientCompany.companyCountry,
        }
      : r.client
        ? {
            companyName: r.client.companyName,
            companyId: r.client.companyId,
            companyCountry: r.client.companyCountry,
          }
        : { companyName: null, companyId: null, companyCountry: null };

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

      // from details only
      confidential: d.confidential ?? null,
      winnerBidderOnlyStatus: d.winnerBidderOnlyStatus ?? null,
      maximumPrice: d.maximumPrice ?? null,

      // deadline preference: details.offersDeadline > offersDeadline > dateExpired
      offersDeadline:
        d.offersDeadline ?? r.offersDeadline ?? r.dateExpired ?? null,

      language: langTop ?? langDetails ?? null,

      // maintain the "client" shape your UI expects
      client: clientOut,

      // keep full details for preview parity
      details: d,
    };

    // remove raw relations from payload to avoid ambiguity in UI
    delete out.clientCompany;

    return NextResponse.json(out);
  } catch (e) {
    console.error("GET /api/requests/[id] failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ---------- PATCH /api/requests/:id ----------
export async function PATCH(req, ctx) {
  try {
    const session = await requireSession();
    const sessionUserPkId = safeBigInt(session.userId); // UserAccount.userPkId
    const sessionCompanyId = safeBigInt(session.companyId); // Company.companyPkId
    const legacyAppUserId = safeBigInt(session.legacyAppUserId); // optional

    let id;
    try {
      const { id: idParam } = await ctx.params;
      id = BigInt(idParam);
    } catch {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }

    // Only allow patching your own request (new system)
    const existing = await prisma.request.findFirst({
      where: {
        requestId: id,
        OR: [
          sessionCompanyId ? { clientCompanyId: sessionCompanyId } : undefined,
          sessionUserPkId ? { createdByUserId: sessionUserPkId } : undefined,
          legacyAppUserId ? { clientId: legacyAppUserId } : undefined, // legacy fallback
        ].filter(Boolean),
      },
      select: { requestId: true },
    });

    if (!existing)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

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
      { status: 400 },
    );
  }
}

// ---------- DELETE /api/requests/:id ----------
export async function DELETE(_req, ctx) {
  const session = await requireSession();
  const sessionUserPkId = safeBigInt(session.userId);
  const sessionCompanyId = safeBigInt(session.companyId);
  const legacyAppUserId = safeBigInt(session.legacyAppUserId); // optional

  let id;
  try {
    const { id: idParam } = await ctx.params;
    id = BigInt(idParam);
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  // verify ownership & not expired
  const row = await prisma.request.findFirst({
    where: {
      requestId: id,
      OR: [
        sessionCompanyId ? { clientCompanyId: sessionCompanyId } : undefined,
        sessionUserPkId ? { createdByUserId: sessionUserPkId } : undefined,
        legacyAppUserId ? { clientId: legacyAppUserId } : undefined, // legacy fallback
      ].filter(Boolean),
    },
    select: { dateExpired: true },
  });

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date();
  if (now >= row.dateExpired) {
    return NextResponse.json(
      { error: "Cannot cancel after deadline" },
      { status: 400 },
    );
  }

  // --- collect recipient emails for all offers on this request ---
  // NEW: get providerCompany members + notificationPreferences
  const offers = await prisma.offer.findMany({
    where: { requestId: id },
    select: {
      offerLawyer: true,
      offerTitle: true,
      providerCompany: {
        select: {
          companyName: true,
          members: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              notificationPreferences: true,
            },
          },
        },
      },
    },
  });

  for (const o of offers) {
    const members = Array.isArray(o?.providerCompany?.members)
      ? o.providerCompany.members
      : [];

    // Members who opted into "request-cancelled"
    const optedIn = members.filter((m) =>
      toStringArray(m?.notificationPreferences).includes("request-cancelled"),
    );

    const primary = findPrimaryMemberByLawyer(o?.offerLawyer, members);
    const primaryEmail = primary?.email ? primary.email.trim() : "";

    // recipients: primary (if valid) + all opted-in (valid emails)
    const toSet = new Set();
    if (isEmail(primaryEmail)) toSet.add(primaryEmail);
    for (const m of optedIn) {
      const em = (m?.email || "").trim();
      if (isEmail(em)) toSet.add(em);
    }
    const toGroup = Array.from(toSet);

    if (toGroup.length) {
      try {
        await notifyProvidersRequestCancelled({
          to: toGroup,
          offerTitle: o?.offerTitle || "",
        });
      } catch (e) {
        console.error("Request-cancelled email failed for provider:", e);
      }
    }

    // always notify support
    try {
      await notifyProvidersRequestCancelled({
        to: ["support@lexify.online"],
        offerTitle: id.toString(),
      });
    } catch (e) {
      console.error("Request-cancelled email failed for support:", e);
    }
  }

  // Finally delete the request
  await prisma.request.delete({ where: { requestId: id } });
  return NextResponse.json({ ok: true });
}
