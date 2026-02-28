import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = (body?.companyName || "").trim();
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
  const next = current.includes(name) ? current : [...current, name]; // ✅ companyName string

  if (next !== current) {
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
