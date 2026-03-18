import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

function jsonSafe(value) {
  return JSON.parse(
    JSON.stringify(value, (_, v) => (typeof v === "bigint" ? Number(v) : v)),
  );
}

function toNumericPrice(value) {
  if (value == null || value === "") return Number.POSITIVE_INFINITY;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

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
      clientUserId: true,
      clientCompanyId: true,
      createdByUserId: true,
      clientCompanyName: true,
      requestState: true,
      title: true,
      primaryContactPerson: true,
      offersDeadline: true,
      acceptDeadline: true,
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
      providerReferences: true,
      scopeOfWork: true,
      description: true,
      additionalBackgroundInfo: true,
      backgroundInfoFiles: true,
      supplierCodeOfConductFiles: true,
      requestCategory: true,
      requestSubcategory: true,
      assignmentType: true,
      details: true,
      selectedOfferId: true,
      _count: { select: { offers: true } },

      offers: {
        select: {
          offerId: true,
          offerLawyer: true,
          offerPrice: true,
          createdAt: true,
          providerCompany: {
            select: {
              companyName: true,
            },
          },
        },
      },
    },
  });

  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const top5OffersReceived = (r.offers || [])
    .slice()
    .sort((a, b) => {
      const priceDiff =
        toNumericPrice(a.offerPrice) - toNumericPrice(b.offerPrice);
      if (priceDiff !== 0) return priceDiff;

      const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aCreated - bCreated;
    })
    .slice(0, 5)
    .map((o) => ({
      offerId: o.offerId != null ? Number(o.offerId) : null,
      providerCompany: {
        companyName: o.providerCompany?.companyName ?? null,
      },
      offerLawyer: o.offerLawyer ?? null,
      offerPrice: o.offerPrice ?? null,
      createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : null,
    }));

  const out = {
    ...r,
    requestId: Number(r.requestId),
    clientUserId: r.clientUserId != null ? Number(r.clientUserId) : null,
    clientCompanyId:
      r.clientCompanyId != null ? Number(r.clientCompanyId) : null,
    createdByUserId:
      r.createdByUserId != null ? Number(r.createdByUserId) : null,
    selectedOfferId:
      r.selectedOfferId != null ? Number(r.selectedOfferId) : null,
    offersCount: r._count?.offers ?? 0,
    offersDeadline: r.offersDeadline
      ? new Date(r.offersDeadline).toISOString()
      : null,
    acceptDeadline: r.acceptDeadline
      ? new Date(r.acceptDeadline).toISOString()
      : null,
    dateCreated: r.dateCreated ? new Date(r.dateCreated).toISOString() : null,
    dateExpired: r.dateExpired ? new Date(r.dateExpired).toISOString() : null,
    top5OffersReceived,
  };

  delete out.offers;

  return NextResponse.json(jsonSafe(out));
}

export async function DELETE(_req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = Number((await params).id);
  if (!id) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  await prisma.offer.deleteMany({ where: { requestId: id } }).catch(() => {});
  await prisma.request.delete({ where: { requestId: id } });

  return NextResponse.json({ ok: true });
}
