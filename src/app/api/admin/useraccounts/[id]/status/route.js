import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { notifyPurchaserWelcome, notifyProviderWelcome } from "@/lib/mailer";

export async function PUT(req, context) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await req.json();

  let userPkId;
  try {
    userPkId = BigInt(id);
  } catch {
    return NextResponse.json(
      { error: "Invalid user account id" },
      { status: 400 },
    );
  }

  const newStatus = body?.registerStatus;

  if (!["pending", "confirmed"].includes(newStatus)) {
    return NextResponse.json(
      { error: "Invalid registerStatus" },
      { status: 400 },
    );
  }

  try {
    const existing = await prisma.userAccount.findUnique({
      where: { userPkId },
      select: {
        userPkId: true,
        email: true,
        role: true,
        firstName: true,
        registerStatus: true,
        companyId: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "User account not found" },
        { status: 404 },
      );
    }

    const updated = await prisma.userAccount.update({
      where: { userPkId },
      data: { registerStatus: newStatus },
    });

    const shouldSendWelcome =
      existing.registerStatus !== "confirmed" && newStatus === "confirmed";

    if (shouldSendWelcome) {
      const emailPayload = {
        to: existing.email,
        firstName: existing.firstName,
      };

      try {
        if (existing.role === "PURCHASER") {
          await notifyPurchaserWelcome(emailPayload);
        } else if (existing.role === "PROVIDER") {
          await notifyProviderWelcome(emailPayload);
        }
      } catch (mailError) {
        console.error("Welcome email send failed:", mailError);
      }
    }

    return NextResponse.json({
      ...updated,
      userPkId: String(updated.userPkId),
      companyId: String(updated.companyId),
    });
  } catch (error) {
    console.error("Failed to update user account registerStatus:", error);

    return NextResponse.json(
      { error: "Failed to update user account registerStatus" },
      { status: 500 },
    );
  }
}
