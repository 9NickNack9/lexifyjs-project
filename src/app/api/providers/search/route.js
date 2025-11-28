import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/providers/search?q=Acme
// GET /api/providers/search?all=1   -> list all PROVIDERs with ratings
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const allParam = (searchParams.get("all") || "").toLowerCase();
  const listAll = allParam === "1" || allParam === "true";

  const where = {
    role: "PROVIDER",
    ...(q ? { companyName: { contains: q, mode: "insensitive" } } : {}),
  };

  const baseOptions = {
    where,
    select: {
      userId: true,
      username: true,
      companyName: true,
      companyWebsite: true,
      providerTotalRating: true,
      providerQualityRating: true,
      providerCommunicationRating: true,
      providerBillingRating: true,
      providerIndividualRating: true,
    },
    orderBy: { companyName: "asc" },
  };

  // If we explicitly ask for "all" and no search query, do not limit.
  // Otherwise, keep the 20-result cap.
  const options = listAll && !q ? baseOptions : { ...baseOptions, take: 20 };

  const providers = await prisma.appUser.findMany(options);

  const out = providers.map((p) => ({
    userId: Number(p.userId),
    username: p.username,
    companyName: p.companyName,
    companyWebsite: p.companyWebsite || null,
    providerTotalRating: p.providerTotalRating ?? null,
    providerQualityRating: p.providerQualityRating ?? null,
    providerCommunicationRating: p.providerCommunicationRating ?? null,
    providerBillingRating: p.providerBillingRating ?? null,
    providerIndividualRating: p.providerIndividualRating ?? [],
  }));

  return NextResponse.json(out);
}
