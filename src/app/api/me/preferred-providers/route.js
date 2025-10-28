// app/api/me/preferred-providers/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

/** Normalize DB value to: { [area]: string[] } with unique providers */
function toAreaMap(value) {
  const out = {};
  if (!value) return out;

  // Legacy: [{ companyName, areasOfLaw: [] }]
  if (Array.isArray(value)) {
    for (const row of value) {
      const company = row?.companyName;
      for (const area of row?.areasOfLaw || []) {
        if (!area || !company) continue;
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
        for (const item of v) {
          if (typeof item === "string" && !unique.includes(item))
            unique.push(item);
        }
        if (unique.length) out[area] = unique;
      } else if (typeof v === "string" && v.trim()) {
        out[area] = [v.trim()];
      }
    }
    return out;
  }

  return out;
}

/** Convert { [area]: [companyName, ...] } → [{ companyName, areasOfLaw: [...] }, ...] */
function groupByProvider(areaMap) {
  const byCompany = new Map(); // company -> Set<area>
  for (const [area, companies] of Object.entries(areaMap || {})) {
    for (const c of companies || []) {
      if (!c) continue;
      if (!byCompany.has(c)) byCompany.set(c, new Set());
      byCompany.get(c).add(area);
    }
  }
  return Array.from(byCompany.entries()).map(([companyName, areasSet]) => ({
    companyName,
    areasOfLaw: Array.from(areasSet),
  }));
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { companyName, areasOfLaw } = body || {};
  if (!companyName || !Array.isArray(areasOfLaw) || areasOfLaw.length === 0) {
    return NextResponse.json(
      { error: "companyName and at least one areaOfLaw required" },
      { status: 400 }
    );
  }

  // Load and normalize current map
  const me = await prisma.appUser.findUnique({
    where: { userId: BigInt(session.userId) },
    select: { preferredLegalServiceProviders: true },
  });
  const areaMap = toAreaMap(me?.preferredLegalServiceProviders);

  // 1) Remove this provider from any areas NOT included in the submission
  for (const [area, companies] of Object.entries(areaMap)) {
    if (companies?.includes(companyName) && !areasOfLaw.includes(area)) {
      const next = companies.filter((c) => c !== companyName);
      if (next.length) areaMap[area] = next;
      else delete areaMap[area];
    }
  }

  // 2) Add this provider to every submitted area (ensure uniqueness)
  for (const area of areasOfLaw) {
    if (!Array.isArray(areaMap[area])) areaMap[area] = [];
    if (!areaMap[area].includes(companyName)) areaMap[area].push(companyName);
  }

  await prisma.appUser.update({
    where: { userId: BigInt(session.userId) },
    data: { preferredLegalServiceProviders: areaMap },
  });

  // Return grouped array for the UI
  return NextResponse.json({
    ok: true,
    preferredLegalServiceProviders: groupByProvider(areaMap),
  });
}

export async function DELETE(req) {
  const session = await getServerSession(authOptions);
  if (!session?.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyName = (searchParams.get("companyName") || "").trim();
  const area = (searchParams.get("area") || "").trim(); // optional

  if (!companyName)
    return NextResponse.json(
      { error: "companyName required" },
      { status: 400 }
    );

  const me = await prisma.appUser.findUnique({
    where: { userId: BigInt(session.userId) },
    select: { preferredLegalServiceProviders: true },
  });
  const areaMap = toAreaMap(me?.preferredLegalServiceProviders);

  if (area) {
    // Remove just from one area
    if (Array.isArray(areaMap[area])) {
      const next = areaMap[area].filter((c) => c !== companyName);
      if (next.length) areaMap[area] = next;
      else delete areaMap[area];
    }
  } else {
    // Remove from all areas
    for (const key of Object.keys(areaMap)) {
      const next = (areaMap[key] || []).filter((c) => c !== companyName);
      if (next.length) areaMap[key] = next;
      else delete areaMap[key];
    }
  }

  await prisma.appUser.update({
    where: { userId: BigInt(session.userId) },
    data: { preferredLegalServiceProviders: areaMap },
  });

  return NextResponse.json({
    ok: true,
    preferredLegalServiceProviders: groupByProvider(areaMap),
  });
}
