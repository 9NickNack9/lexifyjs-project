// Individual ratings are 0–5 in 0.5 steps. Aggregates are rounded to that same scale.

export function sanitizeRating(n) {
  const v = Math.max(0, Math.min(5, Number(n ?? 0)));
  if (!Number.isFinite(v)) return 0;
  return Math.round(v * 2) / 2;
}

export function roundToHalf(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.round(Math.max(0, Math.min(5, v)) * 2) / 2;
}

function unwrapEntry(r) {
  if (!r || typeof r !== "object") return null;
  if (r.value && typeof r.value === "object") return r.value;
  return r;
}

export function scoresFromEntry(r) {
  const e = unwrapEntry(r);
  if (!e) return { quality: 0, communication: 0, billing: 0 };

  const subs = Array.isArray(e.subratings) ? e.subratings : [];

  return {
    quality: sanitizeRating(
      e.quality ?? e.providerQualityRating ?? subs[0] ?? 0,
    ),
    communication: sanitizeRating(
      e.responsiveness ??
        e.communication ??
        e.providerCommunicationRating ??
        subs[1] ??
        0,
    ),
    billing: sanitizeRating(
      e.billing ?? e.providerBillingRating ?? subs[2] ?? 0,
    ),
  };
}

function averagesFromScores(scoreList) {
  if (!scoreList.length) {
    return { avgQuality: 5.0, avgComm: 5.0, avgBilling: 5.0, totalAvg: 5.0 };
  }

  const count = scoreList.length;
  let sumQuality = 0;
  let sumComm = 0;
  let sumBilling = 0;

  for (const s of scoreList) {
    sumQuality += s.quality;
    sumComm += s.communication;
    sumBilling += s.billing;
  }

  return {
    avgQuality: roundToHalf(sumQuality / count),
    avgComm: roundToHalf(sumComm / count),
    avgBilling: roundToHalf(sumBilling / count),
    totalAvg: roundToHalf((sumQuality + sumComm + sumBilling) / (count * 3)),
  };
}

export function normalizeRatingEntries(entries) {
  return Array.isArray(entries) ? entries : [];
}

export function recomputeOverallAggregates(entries) {
  const list = normalizeRatingEntries(entries).map(scoresFromEntry);
  return averagesFromScores(list);
}

export function recomputePracticalRatings(entries) {
  const grouped = new Map();

  for (const r of normalizeRatingEntries(entries)) {
    const e = unwrapEntry(r) || {};
    const category = String(e.category || "Other").trim() || "Other";
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category).push(scoresFromEntry(e));
  }

  const out = {};
  for (const [category, scoreList] of grouped.entries()) {
    const { avgQuality, avgComm, avgBilling, totalAvg } =
      averagesFromScores(scoreList);

    out[category] = {
      quality: avgQuality,
      responsiveness: avgComm,
      communication: avgComm,
      billing: avgBilling,
      total: totalAvg,
      count: scoreList.length,
    };
  }

  return out;
}

export function ratingAggregatesForDisplay(entries) {
  const list = normalizeRatingEntries(entries);
  const { avgQuality, avgComm, avgBilling, totalAvg } =
    recomputeOverallAggregates(list);

  return {
    quality: avgQuality,
    communication: avgComm,
    billing: avgBilling,
    total: totalAvg,
    ratingCount: list.length,
    hasRealRatings: list.length > 0,
    practical: recomputePracticalRatings(list),
  };
}
