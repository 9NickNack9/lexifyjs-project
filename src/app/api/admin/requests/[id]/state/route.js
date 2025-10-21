import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const ALLOWED = new Set(["PENDING", "EXPIRED", "ON_HOLD"]);

export async function PUT(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = Number((await params).id);
  if (!id) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const state = String(body.requestState || "").toUpperCase();
  if (!ALLOWED.has(state)) {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }

  const updated = await prisma.request.update({
    where: { requestId: id },
    data: { requestState: state },
    select: { requestId: true, requestState: true },
  });

  return NextResponse.json({
    ok: true,
    requestId: Number(updated.requestId),
    requestState: updated.requestState,
  });
}
