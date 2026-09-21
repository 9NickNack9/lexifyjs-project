import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

function uniqueCompanyNames(values) {
  const out = [];
  const seen = new Set();
  for (const value of Array.isArray(values) ? values : []) {
    const name = typeof value === "string" ? value.trim() : "";
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const names = Array.isArray(body?.companyNames)
    ? uniqueCompanyNames(body.companyNames)
    : uniqueCompanyNames([body?.companyName]);
  if (names.length === 0)
    return NextResponse.json(
      { error: "Select at least one provider." },
      { status: 400 },
    );

  const me = await prisma.userAccount.findUnique({
    where: { userPkId: BigInt(session.userId) },
    select: { blockedServiceProviders: true },
  });

  const current = Array.isArray(me?.blockedServiceProviders)
    ? me.blockedServiceProviders.filter((name) => typeof name === "string")
    : [];
  const seen = new Set(current.map((name) => name.toLowerCase()));
  const next = [...current];
  for (const name of names) {
    if (seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    next.push(name);
  }

  if (next.length !== current.length) {
    await prisma.userAccount.update({
      where: { userPkId: BigInt(session.userId) },
      data: { blockedServiceProviders: next },
    });
  }

  return NextResponse.json({ ok: true, blockedServiceProviders: next });
}

export async function DELETE(req) {
  const session = await getServerSession(authOptions);
  if (!session?.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const name = (searchParams.get("companyName") || "").trim();
  if (!name)
    return NextResponse.json(
      { error: "companyName required" },
      { status: 400 },
    );

  const me = await prisma.userAccount.findUnique({
    where: { userPkId: BigInt(session.userId) },
    select: { blockedServiceProviders: true },
  });

  const current = Array.isArray(me?.blockedServiceProviders)
    ? me.blockedServiceProviders
    : [];
  const next = current.filter((n) => n !== name);

  await prisma.userAccount.update({
    where: { userPkId: BigInt(session.userId) },
    data: { blockedServiceProviders: next },
  });

  return NextResponse.json({ ok: true, blockedServiceProviders: next });
}
