// app/api/me/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    },
  });

  if (!me) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(me);
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
