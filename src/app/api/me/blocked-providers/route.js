// app/api/me/blocked-providers/route.js
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

  const name = (body?.companyName || "").trim();
  if (!name)
    return NextResponse.json(
      { error: "companyName required" },
      { status: 400 }
    );

  const me = await prisma.appUser.findUnique({
    where: { userId: BigInt(session.userId) },
    select: { blockedServiceProviders: true },
  });

  const current = Array.isArray(me?.blockedServiceProviders)
    ? me.blockedServiceProviders
    : [];
  if (current.includes(name)) {
    return NextResponse.json({ ok: true, blockedServiceProviders: current });
  }

  const next = [...current, name];

  await prisma.appUser.update({
    where: { userId: BigInt(session.userId) },
    data: { blockedServiceProviders: next },
  });

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
      { status: 400 }
    );

  const me = await prisma.appUser.findUnique({
    where: { userId: BigInt(session.userId) },
    select: { blockedServiceProviders: true },
  });

  const current = Array.isArray(me?.blockedServiceProviders)
    ? me.blockedServiceProviders
    : [];
  const next = current.filter((n) => n !== name);

  await prisma.appUser.update({
    where: { userId: BigInt(session.userId) },
    data: { blockedServiceProviders: next },
  });

  return NextResponse.json({ ok: true, blockedServiceProviders: next });
}
