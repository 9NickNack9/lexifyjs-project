// src/app/api/providers/search/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const dec = (v) => (v == null ? null : Number(v));

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
      companyPkId: true,
      companyName: true,
      companyWebsite: true,

      providerTotalRating: true,
      providerQualityRating: true,
      providerCommunicationRating: true,
      providerBillingRating: true,
      providerIndividualRating: true,
      providerPracticalRatings: true,
    },
    orderBy: { companyName: "asc" },
  };

  const options = listAll && !q ? baseOptions : { ...baseOptions, take: 20 };

  const providers = await prisma.company.findMany(options);

  const out = providers.map((c) => ({
    companyId: String(c.companyPkId),
    companyName: c.companyName,
    companyWebsite: c.companyWebsite || null,

    providerTotalRating: dec(c.providerTotalRating),
    providerQualityRating: dec(c.providerQualityRating),
    providerCommunicationRating: dec(c.providerCommunicationRating),
    providerBillingRating: dec(c.providerBillingRating),

    providerIndividualRating: c.providerIndividualRating ?? [],
    providerPracticalRatings: c.providerPracticalRatings ?? null,
  }));

  return NextResponse.json(out);
}
