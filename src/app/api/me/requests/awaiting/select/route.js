// src/app/api/me/requests/awaiting/select/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { requestId, offerId } = body || {};

    let reqIdBig, offerIdBig, clientIdBig;
    try {
      reqIdBig = BigInt(String(requestId));
      offerIdBig = BigInt(String(offerId));
      clientIdBig = BigInt(String(session.userId));
    } catch {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }

    const requestRow = await prisma.request.findUnique({
      where: { requestId: reqIdBig },
      select: {
        clientId: true,
        requestState: true,
        acceptDeadline: true,
      },
    });
    if (!requestRow || requestRow.clientId !== clientIdBig) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (requestRow.requestState !== "ON HOLD") {
      return NextResponse.json(
        { error: "Request is not on hold" },
        { status: 400 }
      );
    }

    const offerRow = await prisma.offer.findUnique({
      where: { offerId: offerIdBig },
      select: {
        offerId: true,
        offerPrice: true,
        providerId: true,
        requestId: true,
      },
    });
    if (!offerRow || offerRow.requestId !== reqIdBig) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    const created = await prisma.$transaction(async (tx) => {
      await tx.contract.upsert({
        where: { requestId: reqIdBig }, // requires @unique on Contract.requestId
        update: {},
        create: {
          requestId: reqIdBig,
          clientId: clientIdBig,
          providerId: offerRow.providerId,
          contractPrice:
            offerRow.offerPrice?.toString?.() ?? String(offerRow.offerPrice),
        },
      });

      await tx.offer.update({
        where: { offerId: offerRow.offerId },
        data: { offerStatus: "WON" },
      });

      await tx.offer.updateMany({
        where: {
          requestId: reqIdBig,
          offerId: { not: offerRow.offerId },
        },
        data: { offerStatus: "LOST" },
      });

      await tx.request.update({
        where: { requestId: reqIdBig },
        data: { requestState: "EXPIRED" },
      });

      try {
        await tx.request.update({
          where: { requestId: reqIdBig },
          data: { contractResult: "Yes" },
        });
      } catch {
        await tx.request.update({
          where: { requestId: reqIdBig },
          data: { contractStatus: "Yes" },
        });
      }

      return { ok: true };
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    if (e?.code === "P2002") {
      // Unique violation -> contract already exists for this request
      return NextResponse.json({ ok: true }, { status: 200 });
    }
    console.error("POST /api/me/requests/awaiting/select failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
