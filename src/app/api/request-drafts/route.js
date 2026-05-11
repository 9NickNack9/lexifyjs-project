import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

function jsonBigIntSafe(data, status = 200) {
  return new NextResponse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value,
    ),
    {
      status,
      headers: { "Content-Type": "application/json" },
    },
  );
}

function normalizeDraftsRoot(requestDrafts) {
  if (
    !requestDrafts ||
    typeof requestDrafts !== "object" ||
    Array.isArray(requestDrafts)
  ) {
    return {};
  }

  return requestDrafts;
}

async function getCurrentUserAccount() {
  const session = await getServerSession(authOptions);
  const userPkId = session?.userId;

  if (!userPkId) return null;

  return prisma.userAccount.findUnique({
    where: {
      userPkId: BigInt(userPkId),
    },
    select: {
      userPkId: true,
      requestDrafts: true,
    },
  });
}

export async function GET() {
  try {
    const user = await getCurrentUserAccount();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const requestDrafts = normalizeDraftsRoot(user.requestDrafts);

    return jsonBigIntSafe({ requestDrafts });
  } catch (error) {
    console.error("GET /api/request-drafts error:", error);
    return NextResponse.json(
      { error: "Failed to load request drafts." },
      { status: 500 },
    );
  }
}
