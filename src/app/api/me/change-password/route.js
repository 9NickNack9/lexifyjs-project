import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const MIN_LEN = 8;

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const currentPassword = (body?.currentPassword || "").trim();
    const newPassword = (body?.newPassword || "").trim();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Both passwords are required" },
        { status: 400 },
      );
    }
    if (newPassword.length < MIN_LEN) {
      return NextResponse.json(
        { error: `New password must be at least ${MIN_LEN} characters` },
        { status: 400 },
      );
    }

    const userPkId = BigInt(session.userId);

    // read from UserAccount
    const me = await prisma.userAccount.findUnique({
      where: { userPkId },
      select: { passwordHash: true },
    });

    if (!me) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const ok = await bcrypt.compare(currentPassword, me.passwordHash || "");
    if (!ok) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 },
      );
    }

    // block reusing the same password
    const sameAsOld = await bcrypt.compare(newPassword, me.passwordHash || "");
    if (sameAsOld) {
      return NextResponse.json(
        { error: "New password must be different from the current password" },
        { status: 400 },
      );
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    // update UserAccount.passwordHash
    await prisma.userAccount.update({
      where: { userPkId },
      data: { passwordHash: hashed },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/me/change-password failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
