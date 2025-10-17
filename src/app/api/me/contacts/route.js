import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.appUser.findUnique({
    where: { userId: BigInt(session.userId) },
    select: {
      companyContactPersons: true,
      contactFirstName: true,
      contactLastName: true,
    },
  });

  const list = Array.isArray(me?.companyContactPersons)
    ? me.companyContactPersons
        .map((p) =>
          [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim()
        )
        .filter(Boolean)
    : [];
  const mainName = [me?.contactFirstName, me?.contactLastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (mainName && !list.includes(mainName)) list.push(mainName);

  return NextResponse.json({ contacts: list });
}

// ✅ NEW: persist contacts (including allNotifications) to companyContactPersons
export async function PUT(req) {
  const session = await getServerSession(authOptions);
  if (!session?.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const incoming = Array.isArray(body?.contacts) ? body.contacts : null;
  if (!incoming) {
    return NextResponse.json(
      { error: "`contacts` must be an array" },
      { status: 400 }
    );
  }

  // Normalize & lightly validate; keep unknown fields out
  const cleaned = incoming.map((c) => ({
    firstName: (c.firstName ?? "").toString().trim(),
    lastName: (c.lastName ?? "").toString().trim(),
    title: (c.title ?? c.position ?? "").toString().trim(),
    telephone: (c.telephone ?? "").toString().trim(),
    email: (c.email ?? "").toString().trim(),
    allNotifications: !!c.allNotifications, // 👈 persist the checkbox
  }));

  // Optional: ensure at least one contact exists
  if (cleaned.length === 0) {
    return NextResponse.json(
      { error: "At least one contact is required." },
      { status: 400 }
    );
  }

  await prisma.appUser.update({
    where: { userId: BigInt(session.userId) },
    data: { companyContactPersons: cleaned },
    select: { userId: true },
  });

  return NextResponse.json({ ok: true, contacts: cleaned });
}
