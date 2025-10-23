import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function PUT(req, { params }) {
  const session = await requireAdmin();
  if (!session)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const userId = parseInt(id, 10);
  const { providerType } = await req.json();

  // Accept only the three allowed options or empty string
  const allowed = ["", "N/A", "Attorneys-at-law", "Law Firm"];
  const next = (providerType ?? "").trim();
  const value = allowed.includes(next) ? (next === "N/A" ? "" : next) : "";

  await prisma.appUser.update({
    where: { userId },
    data: { providerType: value },
  });

  return NextResponse.json({ ok: true, providerType: value });
}
