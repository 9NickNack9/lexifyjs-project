import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

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

function buildSearchWhere(search) {
  if (!search) return {};

  return {
    OR: [
      { firmName: { contains: search, mode: "insensitive" } },
      { status: { contains: search, mode: "insensitive" } },
      {
        invitedByUser: {
          firstName: { contains: search, mode: "insensitive" },
        },
      },
      {
        invitedByUser: {
          lastName: { contains: search, mode: "insensitive" },
        },
      },
      {
        invitedByUser: {
          company: {
            companyName: { contains: search, mode: "insensitive" },
          },
        },
      },
    ],
  };
}

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = (searchParams.get("search") || "").trim();
  const skip = Math.max(0, parseInt(searchParams.get("skip") || "0", 10));
  const take = Math.min(
    50,
    Math.max(1, parseInt(searchParams.get("take") || "5", 10)),
  );

  const where = buildSearchWhere(search);

  const [total, rows] = await Promise.all([
    prisma.providerInvite.count({ where }),
    prisma.providerInvite.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        inviteId: true,
        firmName: true,
        contactPersons: true,
        status: true,
        createdAt: true,
        invitedByUser: {
          select: {
            firstName: true,
            lastName: true,
            company: {
              select: { companyName: true },
            },
          },
        },
      },
    }),
  ]);

  return NextResponse.json({
    total,
    invites: rows.map((invite) => ({
      id: String(invite.inviteId),
      inviterCompanyName: invite.invitedByUser?.company?.companyName || "",
      inviterName: [invite.invitedByUser?.firstName, invite.invitedByUser?.lastName]
        .map((part) => (part ?? "").toString().trim())
        .filter(Boolean)
        .join(" "),
      invitedCompanyName: invite.firmName,
      recipients: formatContactPersons(invite.contactPersons),
      dateSent: formatInviteDate(invite.createdAt),
      status: invite.status === "JOINED" ? "Joined" : "Pending",
    })),
  });
}
