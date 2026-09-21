// src/app/api/providers/search/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ratingAggregatesForDisplay } from "@/lib/providerRatings";

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
      providerIndividualRating: true,
    },
    orderBy: { companyName: "asc" },
  };

  const options = listAll && !q ? baseOptions : { ...baseOptions, take: 20 };

  const providers = await prisma.company.findMany(options);

  const out = providers.map((c) => {
    const entries = Array.isArray(c.providerIndividualRating)
      ? c.providerIndividualRating
      : [];
    const computed = ratingAggregatesForDisplay(entries);

    return {
      companyId: String(c.companyPkId),
      companyName: c.companyName,
      companyWebsite: c.companyWebsite || null,

      providerTotalRating: computed.hasRealRatings ? computed.total : null,
      providerQualityRating: computed.hasRealRatings ? computed.quality : null,
      providerCommunicationRating: computed.hasRealRatings
        ? computed.communication
        : null,
      providerBillingRating: computed.hasRealRatings ? computed.billing : null,

      providerIndividualRating: entries,
      providerPracticalRatings: computed.hasRealRatings
        ? computed.practical
        : {},
    };
  });

  return NextResponse.json(out);
}
