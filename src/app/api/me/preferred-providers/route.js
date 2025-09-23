import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

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

  const me = await prisma.appUser.findUnique({
    where: { userId: BigInt(session.userId) },
    select: { preferredLegalServiceProviders: true },
  });

  const current = Array.isArray(me?.preferredLegalServiceProviders)
    ? me.preferredLegalServiceProviders
    : [];

  // Replace existing entry if provider already exists
  const filtered = current.filter((p) => p.companyName !== companyName);
  const next = [...filtered, { companyName, areasOfLaw }];

  await prisma.appUser.update({
    where: { userId: BigInt(session.userId) },
    data: { preferredLegalServiceProviders: next },
  });

  return NextResponse.json({ ok: true, preferredLegalServiceProviders: next });
}

export async function DELETE(req) {
  const session = await getServerSession(authOptions);
  if (!session?.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyName = (searchParams.get("companyName") || "").trim();
  if (!companyName)
    return NextResponse.json(
      { error: "companyName required" },
      { status: 400 }
    );

  const me = await prisma.appUser.findUnique({
    where: { userId: BigInt(session.userId) },
    select: { preferredLegalServiceProviders: true },
  });

  const current = Array.isArray(me?.preferredLegalServiceProviders)
    ? me.preferredLegalServiceProviders
    : [];
  const next = current.filter((p) => p.companyName !== companyName);

  await prisma.appUser.update({
    where: { userId: BigInt(session.userId) },
    data: { preferredLegalServiceProviders: next },
  });

  return NextResponse.json({ ok: true, preferredLegalServiceProviders: next });
}
