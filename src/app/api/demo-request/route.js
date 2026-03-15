import { NextResponse } from "next/server";
import { notifySupportDemoRequest } from "@/lib/mailer";

export async function POST(req) {
  try {
    const body = await req.json();

    const { name, email, company, role, phone, userType, turnover, website } =
      body || {};

    if (!name || !email || !company || !role || !userType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (userType === "buyer" && !turnover) {
      return NextResponse.json(
        { error: "Turnover is required for buyers" },
        { status: 400 },
      );
    }

    if (userType === "firm" && !website) {
      return NextResponse.json(
        { error: "Website is required for law firms" },
        { status: 400 },
      );
    }

    await notifySupportDemoRequest({
      name,
      email,
      company,
      role,
      phone: phone || "",
      companyType: userType,
      turnoverRange: turnover || "",
      website: website || "",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/demo-request failed:", error);
    return NextResponse.json(
      { error: "Failed to submit demo request" },
      { status: 500 },
    );
  }
}
