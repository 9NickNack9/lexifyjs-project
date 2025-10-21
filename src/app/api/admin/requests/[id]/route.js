import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(_req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = Number((await params).id);
  if (!id) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const r = await prisma.request.findUnique({
    where: { requestId: id },
    select: {
      requestId: true,
      clientCompanyName: true,
      requestState: true,
      title: true,
      primaryContactPerson: true,
      offersDeadline: true,
      dateCreated: true,
      dateExpired: true,
      currency: true,
      paymentRate: true,
      language: true,
      invoiceType: true,
      advanceRetainerFee: true,
      serviceProviderType: true,
      providerSize: true,
      providerCompanyAge: true,
      providerMinimumRating: true,
      scopeOfWork: true,
      description: true,
      additionalBackgroundInfo: true,
      _count: { select: { offers: true } },
    },
  });
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const out = {
    ...r,
    requestId: Number(r.requestId),
    offersCount: r._count?.offers ?? 0,
    offersDeadline: r.offersDeadline
      ? new Date(r.offersDeadline).toISOString()
      : null,
    dateCreated: r.dateCreated ? new Date(r.dateCreated).toISOString() : null,
    dateExpired: r.dateExpired ? new Date(r.dateExpired).toISOString() : null,
  };

  return NextResponse.json(out);
}

export async function DELETE(_req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = Number((await params).id);
  if (!id) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  // delete offers first if your FK requires it (onDelete: Cascade would auto-handle)
  await prisma.offer.deleteMany({ where: { requestId: id } }).catch(() => {});
  await prisma.request.delete({ where: { requestId: id } });

  return NextResponse.json({ ok: true });
}
