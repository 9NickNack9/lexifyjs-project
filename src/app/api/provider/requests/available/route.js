import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

function parseMinFromLabel(label) {
  // Accepts values like "Any", "Any / …", "≥5", ">=15", "5", 5, null
  if (label == null) return null;
  const s = String(label).trim();
  if (/^any/i.test(s)) return 0; // "Any" always passes
  const m = s.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

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

  // Pull role + provider capability numbers
  const me = await prisma.appUser.findUnique({
    where: { userId: Number(session.userId) },
    select: {
      role: true,
      companyProfessionals: true,
      providerTotalRating: true,
    },
  });

  const myRole = (session.role || me?.role || "").toUpperCase();

  // If PROVIDER, compute providerId (BigInt) and collect requestIds already offered by this provider
  let alreadyOfferedIds = [];
  if (myRole === "PROVIDER") {
    let providerIdBigInt;
    try {
      providerIdBigInt = BigInt(String(session.userId));
    } catch {
      // Can't validate without a valid provider id
      return NextResponse.json({ requests: [] });
    }

    const myOffers = await prisma.offer.findMany({
      where: { provider: { userId: providerIdBigInt } },
      select: { request: { select: { requestId: true } } },
    });

    alreadyOfferedIds = myOffers
      .map((o) => o.request?.requestId)
      .filter((id) => id != null);
  }

  // Base WHERE: only requests that are PENDING and expire in the future
  // Add category/subcategory/assignment filters; if PROVIDER, exclude ones already offered
  const baseWhere = {
    requestState: "PENDING",
    dateExpired: { gt: now },
    ...(category && { requestCategory: category }),
    ...(subcategory && { requestSubcategory: subcategory }),
    ...(assignment && {
      OR: [
        { details: { path: ["assignmentType"], equals: assignment } },
        { assignmentType: assignment },
      ],
    }),
  };

  const where =
    myRole === "PROVIDER" && alreadyOfferedIds.length > 0
      ? { ...baseWhere, requestId: { notIn: alreadyOfferedIds } }
      : baseWhere;

  // Fetch rows
  const rows = await prisma.request.findMany({
    where,
    orderBy: { dateCreated: "desc" },
    select: {
      requestId: true,
      requestCategory: true,
      requestSubcategory: true,
      assignmentType: true,
      dateExpired: true,
      providerSize: true,
      providerMinimumRating: true,
      details: true,
      client: { select: { companyName: true } },
    },
  });

  // If PROVIDER, enforce capability filters (size/rating)
  let visible = rows;
  if (myRole === "PROVIDER") {
    if (me?.companyProfessionals == null || me?.providerTotalRating == null) {
      return NextResponse.json({ requests: [] });
    }
    const myPros = Number(me.companyProfessionals);
    const myRating = Number(me.providerTotalRating);

    visible = rows.filter((r) => {
      const minPros = parseMinFromLabel(r.providerSize);
      const minRating = parseMinFromLabel(r.providerMinimumRating);
      const passPros = (minPros ?? 0) <= myPros;
      const passRating = (minRating ?? 0) <= myRating;
      return passPros && passRating;
    });
  }

  // Shape response (return requestId as string to avoid BigInt JSON issues)
  const shaped = visible.map((r) => ({
    requestId: r.requestId?.toString?.() ?? String(r.requestId),
    category: r.requestCategory || "—",
    subcategory: r.requestSubcategory || "—",
    assignmentType: r.assignmentType || r.details?.assignmentType || "—",
    clientCompanyName: r.client?.companyName || "—",
    offersDeadline: r.details?.offersDeadline || r.dateExpired || null,
  }));

  return NextResponse.json({ requests: shaped });
}
