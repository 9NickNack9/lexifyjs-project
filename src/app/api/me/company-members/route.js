import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// Helper: JSON.stringify with BigInt → string + no-store cache
const safeJson = (data, status = 200) =>
  new NextResponse(
    JSON.stringify(data, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
    {
      status,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    },
  );

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.userId) return safeJson({ error: "Unauthorized" }, 401);

  const userPkId = BigInt(session.userId);

  // Find the caller's companyId
  const me = await prisma.userAccount.findUnique({
    where: { userPkId },
    select: { companyId: true },
  });

  if (!me?.companyId) {
    return safeJson({ members: [] }, 200);
  }

  // Fetch all members of the same company
  const members = await prisma.userAccount.findMany({
    where: { companyId: me.companyId },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      userPkId: true,
      firstName: true,
      lastName: true,
      position: true,
      telephone: true,
      email: true,
    },
  });

  return safeJson({ members }, 200);
}
