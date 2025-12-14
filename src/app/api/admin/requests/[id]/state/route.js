import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

const ALLOWED = new Set(["PENDING", "EXPIRED", "ON HOLD"]);

export async function PUT(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = Number((await params).id);
  if (!id) {
    return NextResponse.json({ error: "Bad id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));

  // The admin UI sends "ON HOLD" with a space — use exactly that.
  const state = String(body.requestState || "").toUpperCase();

  if (!ALLOWED.has(state)) {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }

  const now = new Date();

  const data = {
    requestState: state, // stored exactly as "ON HOLD"
    ...(state === "ON HOLD" && {
      dateExpired: now,
      offersDeadline: now,
      acceptDeadline: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    }),
  };

  const updated = await prisma.request.update({
    where: { requestId: id },
    data,
    select: {
      requestId: true,
      requestState: true,
      dateExpired: true,
      offersDeadline: true,
      acceptDeadline: true,
    },
  });

  return NextResponse.json({
    ok: true,
    requestId: updated.requestId.toString(),
    requestState: updated.requestState,
    dateExpired: updated.dateExpired,
    offersDeadline: updated.offersDeadline,
    acceptDeadline: updated.acceptDeadline,
  });
}
