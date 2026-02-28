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
    },
  );

// --- HELPERS to support multi-provider-per-area storage ---
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
  if (!session?.userId) return safeJson({ error: "Unauthorized" }, 401);

  // session.userId is userPkId (string) from NextAuth session callback
  const userPkId = BigInt(session.userId);

  // New system: userAccount + related company
  const row = await prisma.userAccount.findUnique({
    where: { userPkId },
    select: {
      // UserAccount fields
      userPkId: true,
      username: true,
      role: true,
      firstName: true,
      lastName: true,
      email: true,
      telephone: true,
      twoFactorEnabled: true,

      // purchaser prefs (these used to be on appUser)
      winningOfferSelection: true,
      blockedServiceProviders: true,
      preferredLegalServiceProviders: true,
      legalPanelServiceProviders: true,

      // Relationship
      companyId: true,
      company: {
        select: {
          companyPkId: true,
          companyName: true,
          businessId: true, // business id
          companyAddress: true,
          companyPostalCode: true,
          companyCity: true,
          companyCountry: true,
          companyInvoiceContactPersons: true,
          registerStatus: true,
        },
      },
    },
  });

  if (!row) return safeJson({ error: "Not found" }, 404);

  // Preferred providers: normalize to area→string[]
  const prefAreaMap = normalizePreferredToAreaMap(
    row?.preferredLegalServiceProviders,
  );

  // Return grouped array (UI format) for the preferred table only
  const preferredArray = groupPreferredByProvider(prefAreaMap);

  // Build a payload that:
  // 1) Adds explicit company + userAccount objects
  // 2) Keeps existing flat keys for backwards compatibility (your page currently expects them)
  const payload = {
    userAccount: {
      userPkId: row.userPkId,
      username: row.username,
      role: row.role,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      telephone: row.telephone,
      twoFactorEnabled: row.twoFactorEnabled,
      winningOfferSelection: row.winningOfferSelection,
      blockedServiceProviders: Array.isArray(row.blockedServiceProviders)
        ? row.blockedServiceProviders
        : [],
      preferredLegalServiceProviders: preferredArray,
      legalPanelServiceProviders: Array.isArray(row.legalPanelServiceProviders)
        ? row.legalPanelServiceProviders
        : [],
      companyId: row.companyId,
    },

    company: row.company ?? null,

    // --- Backwards-compatible aliases (existing UI uses these today) ---
    username: row.username,
    role: row.role,
    winningOfferSelection: row.winningOfferSelection,

    companyName: row.company?.companyName ?? null,
    companyId: row.company?.companyPkId ?? null,
    companyAddress: row.company?.companyAddress ?? null,
    companyPostalCode: row.company?.companyPostalCode ?? null,
    companyCity: row.company?.companyCity ?? null,
    companyCountry: row.company?.companyCountry ?? null,
    companyInvoiceContactPersons:
      row.company?.companyInvoiceContactPersons ?? [],

    blockedServiceProviders: Array.isArray(row.blockedServiceProviders)
      ? row.blockedServiceProviders
      : [],
    legalPanelServiceProviders: Array.isArray(row.legalPanelServiceProviders)
      ? row.legalPanelServiceProviders
      : [],
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

  const { winningOfferSelection } = body || {};
  if (!["automatic", "manual"].includes(winningOfferSelection)) {
    return NextResponse.json(
      { error: "winningOfferSelection must be 'automatic' or 'manual'." },
      { status: 400 },
    );
  }

  await prisma.userAccount.update({
    where: { userPkId: BigInt(session.userId) },
    data: { winningOfferSelection },
  });

  return NextResponse.json({ ok: true, winningOfferSelection });
}
