import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { notifyProviderInvites } from "@/lib/mailer";
import { buildReferralRegisterUrl } from "@/lib/referral";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeContacts(contacts) {
  if (!Array.isArray(contacts)) return [];

  return contacts
    .map((contact) => ({
      firstName: (contact?.firstName ?? "").toString().trim(),
      lastName: (contact?.lastName ?? "").toString().trim(),
      email: (contact?.email ?? "").toString().trim(),
    }))
    .filter(
      (contact) => contact.firstName || contact.lastName || contact.email,
    );
}

function formatInviteDate(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatContactPersons(contactPersons) {
  if (!Array.isArray(contactPersons)) return "";

  return contactPersons
    .map((contact) =>
      [contact?.firstName, contact?.lastName]
        .map((part) => (part ?? "").toString().trim())
        .filter(Boolean)
        .join(" "),
    )
    .filter(Boolean)
    .join(", ");
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["PURCHASER", "ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const invites = await prisma.providerInvite.findMany({
      where: { invitedByUserId: BigInt(session.userId) },
      orderBy: { createdAt: "desc" },
      select: {
        inviteId: true,
        firmName: true,
        contactPersons: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      invites: invites.map((invite) => ({
        id: String(invite.inviteId),
        companyName: invite.firmName,
        contactPersons: formatContactPersons(invite.contactPersons),
        inviteDate: formatInviteDate(invite.createdAt),
        status: invite.status === "JOINED" ? "Joined" : "Pending",
      })),
    });
  } catch (error) {
    console.error("GET /api/invite failed:", error);
    return NextResponse.json(
      { error: "Failed to load invites" },
      { status: 500 },
    );
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["PURCHASER", "ADMIN"].includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const firmName = (body?.firmName ?? "").toString().trim();
    const personalMessage = (body?.personalMessage ?? "").toString().trim();
    const contacts = normalizeContacts(body?.contacts);

    if (!firmName) {
      return NextResponse.json(
        { error: "Firm name is required" },
        { status: 400 },
      );
    }

    if (contacts.length === 0) {
      return NextResponse.json(
        { error: "At least one contact person is required" },
        { status: 400 },
      );
    }

    for (const contact of contacts) {
      if (!contact.firstName || !contact.lastName || !contact.email) {
        return NextResponse.json(
          { error: "All contact person fields are required" },
          { status: 400 },
        );
      }

      if (!EMAIL_RE.test(contact.email)) {
        return NextResponse.json(
          {
            error: "Please enter a valid email address for each contact person",
          },
          { status: 400 },
        );
      }
    }

    const referralToken = randomUUID();
    const referralLink = buildReferralRegisterUrl(referralToken);

    const invite = await prisma.providerInvite.create({
      data: {
        referralToken,
        invitedByUserId: BigInt(session.userId),
        firmName,
        contactPersons: contacts,
        personalMessage,
        status: "PENDING",
      },
      select: { inviteId: true },
    });

    try {
      await notifyProviderInvites({
        firmName,
        personalMessage,
        contacts,
        referralLink,
        inviterCompanyName: session.companyName || "",
        inviterEmail: session.user?.email || "",
        inviterFirstName: session.firstName || "",
        inviterLastName: session.lastName || "",
        inviterCompanyRole: session.position || "",
      });
    } catch (emailError) {
      await prisma.providerInvite.delete({
        where: { inviteId: invite.inviteId },
      });
      throw emailError;
    }

    return NextResponse.json({
      ok: true,
      recipientCount: contacts.length,
      inviteId: String(invite.inviteId),
      referralLink,
    });
  } catch (error) {
    console.error("POST /api/invite failed:", error);
    return NextResponse.json(
      { error: "Failed to send invite" },
      { status: 500 },
    );
  }
}
