import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

function formatTimeUntil(deadline) {
  if (!deadline) return null;
  const now = new Date();
  const diffMs = new Date(deadline) - now;
  if (diffMs <= 0) return "0 minutes";
  const mins = Math.floor(diffMs / 60000);
  const days = Math.floor(mins / (60 * 24));
  const hours = Math.floor((mins % (60 * 24)) / 60);
  const minutes = mins % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes} minutes`;
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (
    !sessionUser ||
    (sessionUser.role !== "PURCHASER" && sessionUser.role !== "ADMIN")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.request.findMany({
    where: sessionUser.role === "ADMIN" ? {} : { clientId: sessionUser.userId },
    include: { _count: { select: { offers: true } } },
    orderBy: { dateCreated: "desc" },
  });

  const data = rows.map((r) => ({
    requestId: r.requestId,
    title: r.title,
    dateCreated: r.dateCreated,
    timeUntilDeadline: formatTimeUntil(r.offersDeadline),
    offersReceived: r._count.offers,
    state: r.requestState,
  }));

  return NextResponse.json(data);
}
