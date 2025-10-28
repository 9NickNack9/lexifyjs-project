// app/api/me/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// Helper: JSON.stringify with BigInt → string + no-store cache
const safeJson = (data, status = 200) =>
  new NextResponse(
    JSON.stringify(data, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
    {
      status,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    }
  );

// --- NEW HELPERS to support multi-provider-per-area storage ---
/** Normalize any DB value into: { [area]: string[] } with unique providers */
function normalizePreferredToAreaMap(value) {
  const out = {};
  if (!value) return out;

  // Legacy: [{ companyName, areasOfLaw: [] }]
  if (Array.isArray(value)) {
    for (const row of value) {
      const company = row?.companyName;
      for (const area of row?.areasOfLaw || []) {
        if (!company || !area) continue;
        if (!Array.isArray(out[area])) out[area] = [];
        if (!out[area].includes(company)) out[area].push(company);
      }
    }
    return out;
  }

  // Object: { [area]: string | string[] }
  if (typeof value === "object") {
    for (const [area, v] of Object.entries(value)) {
      if (!area) continue;
      if (Array.isArray(v)) {
        const unique = [];
        for (const name of v) {
          if (typeof name === "string" && name.trim() && !unique.includes(name))
            unique.push(name.trim());
        }
        if (unique.length) out[area] = unique;
      } else if (typeof v === "string" && v.trim()) {
        out[area] = [v.trim()];
      }
    }
  }
  return out;
}

/** Convert areaMap → array grouped by provider: [{ companyName, areasOfLaw[] }] */
function groupPreferredByProvider(areaMap) {
  const byCompany = new Map(); // company -> Set<area>
  for (const [area, companies] of Object.entries(areaMap || {})) {
    for (const company of companies || []) {
      if (!company) continue;
      if (!byCompany.has(company)) byCompany.set(company, new Set());
      byCompany.get(company).add(area);
    }
  }
  return Array.from(byCompany.entries()).map(([companyName, areasSet]) => ({
    companyName,
    areasOfLaw: Array.from(areasSet),
  }));
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.userId) {
    return safeJson({ error: "Unauthorized" }, 401);
  }

  // Pull everything the account pages need
  const me = await prisma.appUser.findUnique({
    where: { userId: BigInt(session.userId) },
    select: {
      username: true,
      role: true,
      companyName: true,
      companyId: true,
      companyAddress: true,
      companyPostalCode: true,
      companyCity: true,
      companyCountry: true,
      contactFirstName: true,
      contactLastName: true,
      contactEmail: true,
      contactTelephone: true,
      contactPosition: true,
      companyContactPersons: true,
      companyInvoiceContactPersons: true,
      winningOfferSelection: true,

      // These three are what your tables use
      blockedServiceProviders: true, // string[]
      preferredLegalServiceProviders: true, // map | array | string — we normalize below
      legalPanelServiceProviders: true, // string[]
    },
  });

  if (!me) return safeJson({ error: "Not found" }, 404);

  // Preferred providers: normalize to area→string[]
  const prefAreaMap = normalizePreferredToAreaMap(
    me?.preferredLegalServiceProviders
  );

  // Return grouped array (UI format) for the preferred table only
  const preferredArray = groupPreferredByProvider(prefAreaMap);

  const payload = {
    ...me,

    // Leave these two exactly as they are (tables expect raw arrays)
    blockedServiceProviders: Array.isArray(me?.blockedServiceProviders)
      ? me.blockedServiceProviders
      : [],
    legalPanelServiceProviders: Array.isArray(me?.legalPanelServiceProviders)
      ? me.legalPanelServiceProviders
      : [],

    // Preferred table gets the grouped array (compatible with existing UI)
    preferredLegalServiceProviders: preferredArray,
  };

  return safeJson(payload);
}

export async function PATCH(req) {
  const session = await getServerSession(authOptions);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Currently we support updating just winningOfferSelection
  const { winningOfferSelection } = body || {};
  if (!["automatic", "manual"].includes(winningOfferSelection)) {
    return NextResponse.json(
      { error: "winningOfferSelection must be 'automatic' or 'manual'." },
      { status: 400 }
    );
  }

  await prisma.appUser.update({
    where: { userId: BigInt(session.userId) },
    data: { winningOfferSelection },
  });

  return NextResponse.json({ ok: true, winningOfferSelection });
}
