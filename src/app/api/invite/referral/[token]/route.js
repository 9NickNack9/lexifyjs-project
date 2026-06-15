import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req, { params }) {
  try {
    const token = (params?.token ?? "").toString().trim();
    if (!token) {
      return NextResponse.json(
        { valid: false, reason: "not_found" },
        { status: 404 },
      );
    }

    const invite = await prisma.providerInvite.findUnique({
      where: { referralToken: token },
      select: {
        status: true,
        firmName: true,
      },
    });

    if (!invite) {
      return NextResponse.json(
        { valid: false, reason: "not_found" },
        { status: 404 },
      );
    }

    if (invite.status !== "PENDING") {
      return NextResponse.json(
        { valid: false, reason: "used", firmName: invite.firmName },
        { status: 410 },
      );
    }

    return NextResponse.json({
      valid: true,
      firmName: invite.firmName,
    });
  } catch (error) {
    console.error("GET /api/invite/referral/[token] failed:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
