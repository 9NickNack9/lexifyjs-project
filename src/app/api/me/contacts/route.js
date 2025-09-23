import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.appUser.findUnique({
    where: { userId: BigInt(session.userId) },
    select: {
      companyContactPersons: true,
      contactFirstName: true,
      contactLastName: true,
    },
  });

  const list = Array.isArray(me?.companyContactPersons)
    ? me.companyContactPersons
        .map((p) =>
          [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim()
        )
        .filter(Boolean)
    : [];
  const mainName = [me?.contactFirstName, me?.contactLastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (mainName && !list.includes(mainName)) list.push(mainName);

  return NextResponse.json({ contacts: list });
}
