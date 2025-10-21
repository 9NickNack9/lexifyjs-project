import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") || "";
  const subcategory = searchParams.get("subcategory") || "";
  const assignment = searchParams.get("assignment") || "";
  const now = new Date();

  // ✅ Corrected fields on AppUser
  const me = await prisma.appUser.findUnique({
    where: { userId: Number(session.userId) },
    select: { companyProfessionals: true, providerTotalRating: true },
  });

  if (me?.companyProfessionals == null || me?.providerTotalRating == null) {
    return NextResponse.json({ requests: [] });
  }

  const where = {
    requestState: "PENDING",
    dateExpired: { gt: now },
    providerSize: { lt: me.companyProfessionals },
    providerMinimumRating: { lte: me.providerTotalRating },
    ...(category && { requestCategory: category }),
    ...(subcategory && { requestSubcategory: subcategory }),
    ...(assignment && {
      details: { path: ["assignmentType"], equals: assignment },
    }),
  };

  const rows = await prisma.request.findMany({
    where,
    orderBy: { dateCreated: "desc" },
    select: {
      requestId: true,
      requestCategory: true,
      requestSubcategory: true,
      dateExpired: true,
      details: true,
      client: { select: { companyName: true } },
    },
  });

  const shaped = rows.map((r) => ({
    requestId: Number(r.requestId),
    category: r.requestCategory || "—",
    subcategory: r.requestSubcategory || "—",
    assignmentType: r.details?.assignmentType || "—",
    clientCompanyName: r.client?.companyName || "—",
    offersDeadline: r.details?.offersDeadline || r.dateExpired || null,
  }));

  return NextResponse.json({ requests: shaped });
}
