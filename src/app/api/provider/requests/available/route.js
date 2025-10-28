import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// Parse "Any", "Any Age", "≥5", "5" → number (min years) or 0 for Any
function parseMinFromLabel(label) {
  if (label == null) return null;
  const s = String(label).trim();
  if (/^any(\s+age)?/i.test(s)) return 0; // "Any" or "Any Age"
  const m = s.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

function parseMinAge(val) {
  if (val == null) return null;
  if (typeof val === "number") return Number.isFinite(val) ? val : null;
  return parseMinFromLabel(String(val));
}

// Normalize provider type to a canonical token
function normalizeProviderType(value) {
  const s = (value || "").toString().toLowerCase().trim();
  if (!s) return "";
  if (s === "all") return "all";

  // remove duplicate whitespace/hyphens for pattern checks
  const simple = s.replace(/[_-]+/g, "-").replace(/\s+/g, " ").trim();

  if (simple.includes("attorney")) return "attorneys-at-law";
  if (simple.startsWith("law firm") || simple.startsWith("law-firm"))
    return "law firm";
  if (simple.startsWith("law firms") || simple.startsWith("law-firms"))
    return "law firm"; // plural → singular

  // fall back to raw simplified string
  return simple;
}

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") || "";
  const subcategory = searchParams.get("subcategory") || "";
  const assignment = searchParams.get("assignment") || "";
  const now = new Date();

  // Current user
  const me = await prisma.appUser.findUnique({
    where: { userId: Number(session.userId) },
    select: {
      role: true,
      companyProfessionals: true,
      providerTotalRating: true,
      companyAge: true,
      providerType: true,
      companyName: true, // needed for blocked/preferred/panel checks
    },
  });

  const myRole = (session.role || me?.role || "").toUpperCase();
  const myCompanyName = (me?.companyName || "").trim();

  // Providers: collect requestIds they've already offered on
  let alreadyOfferedIds = [];
  if (myRole === "PROVIDER") {
    let providerIdBigInt;
    try {
      providerIdBigInt = BigInt(String(session.userId));
    } catch {
      return NextResponse.json({ requests: [] });
    }
    const myOffers = await prisma.offer.findMany({
      where: { provider: { userId: providerIdBigInt } },
      select: { request: { select: { requestId: true } } },
    });
    alreadyOfferedIds = myOffers
      .map((o) => o.request?.requestId)
      .filter((id) => id != null);
  }

  // Base where
  const baseWhere = {
    requestState: "PENDING",
    dateExpired: { gt: now },
    ...(category && { requestCategory: category }),
    ...(subcategory && { requestSubcategory: subcategory }),
    ...(assignment && {
      OR: [
        { details: { path: ["assignmentType"], equals: assignment } },
        { assignmentType: assignment },
      ],
    }),
  };

  const where =
    myRole === "PROVIDER" && alreadyOfferedIds.length > 0
      ? { ...baseWhere, requestId: { notIn: alreadyOfferedIds } }
      : baseWhere;

  // Fetch
  const rows = await prisma.request.findMany({
    where,
    orderBy: { dateCreated: "desc" },
    select: {
      requestId: true,
      requestCategory: true,
      requestSubcategory: true,
      assignmentType: true,
      dateExpired: true,
      providerSize: true,
      providerMinimumRating: true,
      providerCompanyAge: true, // may be string label like "Any Age" or a number
      serviceProviderType: true, // "All" | "Law firm(s)" | "Attorneys-at-law" | ""
      details: true,
      client: {
        select: {
          companyName: true,
          blockedServiceProviders: true, // string[]
          preferredLegalServiceProviders: true, // may be legacy array, single string, or { [area]: string[] }
          legalPanelServiceProviders: true, // string[]
        },
      },
    },
  });

  // Admins: skip provider gating
  if (myRole !== "PROVIDER") {
    const shaped = rows.map((r) => ({
      requestId: r.requestId?.toString?.() ?? String(r.requestId),
      category: r.requestCategory || "—",
      subcategory: r.requestSubcategory || "—",
      assignmentType: r.assignmentType || r.details?.assignmentType || "—",
      clientCompanyName: r.client?.companyName || "—",
      offersDeadline: r.details?.offersDeadline || r.dateExpired || null,
    }));
    return NextResponse.json({ requests: shaped });
  }

  // Provider metrics (null-safe; preferred can override these)
  const myPros = Number.isFinite(Number(me?.companyProfessionals))
    ? Number(me.companyProfessionals)
    : 0;
  const myRating = Number.isFinite(Number(me?.providerTotalRating))
    ? Number(me.providerTotalRating)
    : 0;
  const myAge = Number.isFinite(Number(me?.companyAge))
    ? Number(me.companyAge)
    : 0;
  const myTypeNorm = normalizeProviderType(me.providerType);

  // --- Helpers for preferred providers normalization ---
  const toPreferredAreaMap = (value) => {
    const out = {};
    if (!value) return out;
    if (Array.isArray(value)) {
      // legacy: [{ companyName, areasOfLaw: [] }]
      for (const row of value) {
        const c = row?.companyName;
        for (const a of row?.areasOfLaw || []) {
          if (!a || !c) continue;
          if (!Array.isArray(out[a])) out[a] = [];
          if (!out[a].includes(c)) out[a].push(c);
        }
      }
      return out;
    }
    if (typeof value === "object") {
      for (const [area, v] of Object.entries(value)) {
        if (!area) continue;
        if (Array.isArray(v)) {
          const uniq = [];
          for (const s of v)
            if (typeof s === "string" && s && !uniq.includes(s)) uniq.push(s);
          if (uniq.length) out[area] = uniq;
        } else if (typeof v === "string" && v.trim()) {
          out[area] = [v.trim()];
        }
      }
    }
    return out;
  };

  const visible = rows.filter((r) => {
    // ---------- Client-based gating first (blocked/panel) ----------
    const maker = r.client || {};

    // 1) Blocked: if maker has blocked me → hide
    const blocked = Array.isArray(maker.blockedServiceProviders)
      ? maker.blockedServiceProviders
      : [];
    if (myCompanyName && blocked.includes(myCompanyName)) return false;

    // 2) Preferred-by-category: if maker has preferred list for this category AND I'm in that list → hide
    // Normalize preferred data
    const prefMap = toPreferredAreaMap(maker.preferredLegalServiceProviders);
    const cat = r.requestCategory || "";
    const preferredForCategory = Array.isArray(prefMap[cat])
      ? prefMap[cat]
      : [];
    const iAmPreferred =
      preferredForCategory.length > 0 &&
      myCompanyName &&
      preferredForCategory.includes(myCompanyName);

    // 3) Legal panel: if maker has a non-empty panel and I'm NOT on it → hide
    const panel = Array.isArray(maker.legalPanelServiceProviders)
      ? maker.legalPanelServiceProviders
      : [];
    if (panel.length > 0 && myCompanyName && !panel.includes(myCompanyName)) {
      return false;
    }

    // ---------- Capability gates (with preferred override) ----------
    // size/rating gates
    const minPros = parseMinFromLabel(r.providerSize);
    const minRating = parseMinFromLabel(r.providerMinimumRating);
    let passPros = (minPros ?? 0) <= myPros;
    let passRating = (minRating ?? 0) <= myRating;

    // age gate with "Any Age" pass
    const reqAgeRaw =
      r.providerCompanyAge ?? r.details?.providerCompanyAge ?? null;
    const isAnyAge =
      typeof reqAgeRaw === "string" &&
      /^any(\s+age)?/i.test(reqAgeRaw?.trim?.() || "");
    const minAge = isAnyAge ? 0 : parseMinAge(reqAgeRaw);
    let passAge = isAnyAge ? true : (minAge ?? 0) <= myAge;

    // type gate with plural/synonym normalization
    const reqTypeRaw =
      r.serviceProviderType ?? r.details?.serviceProviderType ?? "";
    const reqTypeNorm = normalizeProviderType(reqTypeRaw);
    let passType =
      reqTypeNorm === "" || reqTypeNorm === "all" || reqTypeNorm === myTypeNorm;

    // Preferred override: if I'm preferred for this category, auto-pass all capability gates
    if (iAmPreferred) {
      passPros = passRating = passAge = passType = true;
    }

    return passPros && passRating && passAge && passType;
  });

  const shaped = visible.map((r) => ({
    requestId: r.requestId?.toString?.() ?? String(r.requestId),
    category: r.requestCategory || "—",
    subcategory: r.requestSubcategory || "—",
    assignmentType: r.assignmentType || r.details?.assignmentType || "—",
    clientCompanyName: r.client?.companyName || "—",
    offersDeadline: r.details?.offersDeadline || r.dateExpired || null,
  }));

  return NextResponse.json({ requests: shaped });
}
