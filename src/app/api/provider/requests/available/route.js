// app/api/provider/requests/available/route.js
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

/** BigInt-safe JSON + no-store */
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

// -------------------------
// Helpers
// -------------------------

function toStringArray(val) {
  if (Array.isArray(val)) return val.map(String).filter(Boolean);
  if (!val) return [];
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [val];
    } catch {
      return [val];
    }
  }
  if (typeof val === "object") {
    if (Array.isArray(val.set)) return val.set.map(String).filter(Boolean);
    if (Array.isArray(val.value)) return val.value.map(String).filter(Boolean);
  }
  return [];
}

function normalizePracticalRatings(pr) {
  if (!pr) return {};
  if (Array.isArray(pr)) {
    const out = {};
    for (const row of pr) {
      const k = row?.categoryKey || row?.key || row?.category;
      if (k) out[k] = row;
    }
    return out;
  }
  if (typeof pr === "string") {
    try {
      const parsed = JSON.parse(pr);
      return normalizePracticalRatings(parsed);
    } catch {
      return {};
    }
  }
  if (typeof pr === "object") return pr;
  return {};
}

function getPracticalCategoryTotal(providerPracticalRatings, categoryKey) {
  const practicalMap = normalizePracticalRatings(providerPracticalRatings);
  const entry = practicalMap?.[categoryKey];
  const total =
    entry?.total ?? entry?.providerTotalRating ?? entry?.totalRating ?? null;

  const n = Number(total);
  return Number.isFinite(n) ? n : 0;
}

// Map request category/subcategory into the practical rating key used in providerPracticalRatings
function mapRequestToCategory(requestCategory, requestSubcategory) {
  const sub = (requestSubcategory || "").trim();
  const cat = (requestCategory || "").trim();

  if (sub === "Real Estate and Construction" || sub === "ICT and IT")
    return sub;

  if (cat === "Help with Contracts") return "Contracts";
  if (cat === "Day-to-day Legal Advice") return "Day-to-day Legal Advice";
  if (cat === "Help with Employment related Documents") return "Employment";
  if (cat === "Help with Dispute Resolution or Debt Collection")
    return "Dispute Resolution";
  if (cat === "Help with Mergers & Acquisitions") return "M&A";
  if (cat === "Help with Corporate Governance") return "Corporate Advisory";
  if (cat === "Help with Personal Data Protection") return "Data Protection";
  if (
    cat ===
    "Help with KYC (Know Your Customer) or Compliance related Questionnaire"
  )
    return "Compliance";
  if (cat === "Legal Training for Management and/or Personnel")
    return "Legal Training";
  if (cat === "Help with Banking & Finance Matters") return "Banking & Finance";

  return sub || cat || "Other";
}

// Parse "Any", "Any Age", "≥5", "5" → number (min years) or 0 for Any
function parseMinFromLabel(label) {
  if (label == null) return null;
  const s = String(label).trim();
  if (/^any(\s+age)?/i.test(s)) return 0;
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

  const simple = s.replace(/[_-]+/g, "-").replace(/\s+/g, " ").trim();

  if (simple.includes("attorney")) return "attorneys-at-law";
  if (simple.startsWith("law firm") || simple.startsWith("law-firm"))
    return "law firm";
  if (simple.startsWith("law firms") || simple.startsWith("law-firms"))
    return "law firm";

  return simple;
}

/** Normalize purchaser preferred providers into { [area]: string[] } */
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
        const uniq = [];
        for (const name of v) {
          if (typeof name === "string" && name.trim() && !uniq.includes(name))
            uniq.push(name.trim());
        }
        if (uniq.length) out[area] = uniq;
      } else if (typeof v === "string" && v.trim()) {
        out[area] = [v.trim()];
      }
    }
  }

  // String JSON?
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return normalizePreferredToAreaMap(parsed);
    } catch {
      return out;
    }
  }

  return out;
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) return safeJson({ error: "Unauthorized" }, 401);

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || "";
    const subcategory = searchParams.get("subcategory") || "";
    const assignment = searchParams.get("assignment") || "";
    const now = new Date();

    // session.userId is UserAccount.userPkId (string)
    const userPkId = BigInt(session.userId);

    // Load provider UA + Company (gating fields live on Company)
    const ua = await prisma.userAccount.findUnique({
      where: { userPkId },
      select: {
        role: true,
        companyId: true,
        company: {
          select: {
            companyPkId: true,
            companyName: true,
            companyProfessionals: true,
            providerPracticalRatings: true,
            companyAge: true,
            providerType: true,
          },
        },
      },
    });

    const myRole = String(session.role || ua?.role || "").toUpperCase();
    const myCompanyId = ua?.companyId ?? null;
    const myCompanyName = (ua?.company?.companyName || "").trim();

    const isProvider = myRole === "PROVIDER" && myCompanyId && myCompanyName;

    // -------------------------------------------------------------------
    // Providers: exclude requests that already have an offer from:
    //   (a) this provider company (providerCompanyId), OR
    //   (b) ANY userAccount that belongs to this provider company
    // -------------------------------------------------------------------
    let alreadyOfferedRequestIds = [];
    if (isProvider) {
      const companyIdBigInt = BigInt(myCompanyId);

      // 1) Find all user accounts in the provider's company
      const companyMembers = await prisma.userAccount.findMany({
        where: { companyId: companyIdBigInt },
        select: { userPkId: true },
      });

      const memberUserIds = companyMembers
        .map((m) => m.userPkId)
        .filter((id) => id != null);

      // 2) Find offers either by providerCompanyId OR by any member's user id
      //    (handles legacy data where providerCompanyId may be null)
      const offerWhereOr = [
        { providerCompanyId: companyIdBigInt },
        ...(memberUserIds.length > 0
          ? [{ providerUserId: { in: memberUserIds } }]
          : []),
      ];

      const myOffers = await prisma.offer.findMany({
        where: { OR: offerWhereOr },
        select: { requestId: true },
      });

      // 3) Unique requestIds
      const uniq = new Set();
      for (const o of myOffers) {
        if (o?.requestId != null) uniq.add(o.requestId);
      }
      alreadyOfferedRequestIds = Array.from(uniq);
    }

    const baseWhere = {
      requestState: "PENDING",
      dateExpired: { gt: now },
      ...(category ? { requestCategory: category } : {}),
      ...(subcategory ? { requestSubcategory: subcategory } : {}),
      ...(assignment
        ? {
            OR: [
              { details: { path: ["assignmentType"], equals: assignment } },
              { assignmentType: assignment },
            ],
          }
        : {}),
    };

    const where =
      isProvider && alreadyOfferedRequestIds.length > 0
        ? { ...baseWhere, requestId: { notIn: alreadyOfferedRequestIds } }
        : baseWhere;

    // Fetch requests + purchaser gating fields from createdByUser (UserAccount)
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
        providerCompanyAge: true,
        serviceProviderType: true,
        details: true,

        clientCompany: {
          select: {
            companyName: true,
          },
        },

        createdByUser: {
          select: {
            blockedServiceProviders: true,
            preferredLegalServiceProviders: true,
            legalPanelServiceProviders: true,
          },
        },
      },
    });

    // Admins/non-providers: skip provider gating
    if (!isProvider) {
      const shaped = rows.map((r) => ({
        requestId: r.requestId?.toString?.() ?? String(r.requestId),
        category: r.requestCategory || "—",
        subcategory: r.requestSubcategory || "—",
        assignmentType: r.assignmentType || r.details?.assignmentType || "—",
        clientCompanyName: r.clientCompany?.companyName || "—",
        offersDeadline: r.details?.offersDeadline || r.dateExpired || null,
        confidential: r.details?.confidential || "—",
      }));
      return safeJson({ requests: shaped });
    }

    // Provider metrics from Company
    const myPros = Number.isFinite(Number(ua?.company?.companyProfessionals))
      ? Number(ua.company.companyProfessionals)
      : 0;

    const myAge = Number.isFinite(Number(ua?.company?.companyAge))
      ? Number(ua.company.companyAge)
      : 0;

    const myTypeNorm = normalizeProviderType(ua?.company?.providerType);

    const getMyRatingForRequest = (r) => {
      const categoryKey = mapRequestToCategory(
        r.requestCategory,
        r.requestSubcategory,
      );
      return getPracticalCategoryTotal(
        ua?.company?.providerPracticalRatings,
        categoryKey,
      );
    };

    const visible = rows.filter((r) => {
      const maker = r.createdByUser || {};

      // 1) Blocked: if purchaser blocked my company -> hide
      const blocked = toStringArray(maker.blockedServiceProviders);
      if (blocked.includes(myCompanyName)) return false;

      // 2) Legal panel: if purchaser uses panel and I'm not in it -> hide
      const panel = toStringArray(maker.legalPanelServiceProviders);
      if (panel.length > 0 && !panel.includes(myCompanyName)) return false;

      // 3) Preferred: preferred providers can bypass some gating constraints
      const prefMap = normalizePreferredToAreaMap(
        maker.preferredLegalServiceProviders,
      );
      const categoryKey = mapRequestToCategory(
        r.requestCategory,
        r.requestSubcategory,
      );
      const preferredForArea = Array.isArray(prefMap?.[categoryKey])
        ? prefMap[categoryKey].includes(myCompanyName)
        : false;

      // 4) Provider size gating (unless preferred)
      if (!preferredForArea) {
        const reqSize = (r.providerSize || "").toString().trim().toLowerCase();
        if (reqSize) {
          if (!reqSize.includes("any")) {
            const n = parseMinFromLabel(reqSize);
            if (typeof n === "number" && myPros < n) return false;
          }
        }
      }

      // 5) Minimum rating gating (unless preferred)
      if (!preferredForArea) {
        const minRating = parseMinFromLabel(r.providerMinimumRating);
        if (typeof minRating === "number" && minRating > 0) {
          const myRating = getMyRatingForRequest(r);
          if (Number(myRating) < Number(minRating)) return false;
        }
      }

      // 6) Company age gating (unless preferred)
      if (!preferredForArea) {
        const minAge = parseMinAge(r.providerCompanyAge);
        if (typeof minAge === "number" && minAge > 0) {
          if (Number(myAge) < Number(minAge)) return false;
        }
      }

      // 7) Provider type gating (unless preferred)
      if (!preferredForArea) {
        const reqTypeNorm = normalizeProviderType(r.serviceProviderType);
        if (reqTypeNorm && reqTypeNorm !== "all") {
          if (
            myTypeNorm &&
            myTypeNorm !== "all" &&
            myTypeNorm !== reqTypeNorm
          ) {
            return false;
          }
        }
      }

      return true;
    });

    const shaped = visible.map((r) => ({
      requestId: r.requestId?.toString?.() ?? String(r.requestId),
      category: r.requestCategory || "—",
      subcategory: r.requestSubcategory || "—",
      assignmentType: r.assignmentType || r.details?.assignmentType || "—",
      clientCompanyName: r.clientCompany?.companyName || "—",
      offersDeadline: r.details?.offersDeadline || r.dateExpired || null,
      confidential: r.details?.confidential || "—",
    }));

    return safeJson({ requests: shaped });
  } catch (e) {
    console.error("provider available requests failed:", e);
    return safeJson({ error: "Server error" }, 500);
  }
}
