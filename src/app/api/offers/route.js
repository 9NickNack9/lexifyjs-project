import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Provider making the offer → providerId must be this user
    let providerIdBigInt;
    try {
      providerIdBigInt = BigInt(String(session.userId));
    } catch {
      return NextResponse.json(
        { error: "Invalid providerId" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const {
      requestId, // string or number
      offerLawyer, // required (string)
      offerPrice, // required (string/number)
      offerExpectedPrice, // optional; required only if paymentRate = "capped price"
      offerTitle, // required (string)
      offerStatus, // optional; defaults to "Pending"
    } = body || {};

    // Basic required fields
    if (!requestId || !offerLawyer || !offerPrice || !offerTitle) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: requestId, offerLawyer, offerPrice, offerTitle",
        },
        { status: 400 }
      );
    }

    // Parse requestId
    let requestIdBigInt;
    try {
      requestIdBigInt = BigInt(String(requestId));
    } catch {
      return NextResponse.json({ error: "Invalid requestId" }, { status: 400 });
    }

    // Fetch the related request to determine paymentRate rule
    const reqRow = await prisma.request.findUnique({
      where: { requestId: requestIdBigInt },
      select: { paymentRate: true },
    });
    if (!reqRow) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const paymentRate = String(reqRow.paymentRate || "").toLowerCase();
    const isCapped = paymentRate === "capped price";

    // Enforce expected price rule
    let expectedPriceToStore = null;
    if (isCapped) {
      if (
        offerExpectedPrice === undefined ||
        offerExpectedPrice === null ||
        String(offerExpectedPrice).trim() === ""
      ) {
        return NextResponse.json(
          {
            error:
              "offerExpectedPrice is required when paymentRate is 'capped price'.",
          },
          { status: 400 }
        );
      }
      expectedPriceToStore = String(offerExpectedPrice);
    } else {
      expectedPriceToStore = null; // force null unless capped price
    }

    // Build data object conditionally
    const data = {
      request: { connect: { requestId: requestIdBigInt } },
      provider: { connect: { userId: providerIdBigInt } },
      offerLawyer: String(offerLawyer),
      offerPrice: String(offerPrice),
      offerTitle: String(offerTitle),
      offerStatus: offerStatus ?? "Pending",
      ...(isCapped ? { offerExpectedPrice: String(offerExpectedPrice) } : {}),
    };

    const created = await prisma.offer.create({
      data,
      select: { offerId: true },
    });

    return NextResponse.json(
      { ok: true, offerId: created.offerId.toString() },
      { status: 201 }
    );

    return NextResponse.json(
      { ok: true, offerId: created.offerId.toString() },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/offers failed:", err);

    if (err?.code === "P2002") {
      return NextResponse.json(
        { error: "You already submitted an offer for this request." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
