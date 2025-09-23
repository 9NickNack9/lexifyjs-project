import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

function normalizeContact(raw) {
  return {
    firstName: String(raw.firstName || "").trim(),
    lastName: String(raw.lastName || "").trim(),
    title: String(raw.title || raw.position || "").trim(),
    telephone: String(raw.telephone || "").trim(),
    email: String(raw.email || "").trim(),
  };
}

export async function PUT(req) {
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

  const input = Array.isArray(body?.contacts) ? body.contacts : null;
  if (!input) {
    return NextResponse.json(
      { error: "`contacts` must be an array" },
      { status: 400 }
    );
  }

  const cleaned = input
    .map(normalizeContact)
    .filter(
      (c) => c.firstName || c.lastName || c.email || c.telephone || c.title
    );

  if (cleaned.length < 1) {
    return NextResponse.json(
      { error: "At least one invoicing contact is required." },
      { status: 400 }
    );
  }

  for (const c of cleaned) {
    if (!c.firstName || !c.lastName || !c.email) {
      return NextResponse.json(
        {
          error:
            "Each invoicing contact must include first name, last name, and email.",
        },
        { status: 400 }
      );
    }
  }

  await prisma.appUser.update({
    where: { userId: BigInt(session.userId) },
    data: { companyInvoiceContactPersons: cleaned },
  });

  return NextResponse.json({ ok: true, contacts: cleaned });
}
