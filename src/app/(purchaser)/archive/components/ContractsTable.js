"use client";
// Uses api/me/contracts/route.js
import { useEffect, useMemo, useState } from "react";
import { fmtMoney, isHourlyRate } from "../utils/format";
import {
  btnGhost,
  btnPrimary,
  emptyCard,
  table,
  tableCard,
  tableScroll,
  td,
  th,
  theadRow,
  tr,
} from "./tableUi";

function formatDateDDMMYYYY(isoish) {
  const d = new Date(isoish);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

const numify = (v) => {
  if (v == null) return null;
  const s = typeof v === "object" && v.toString ? v.toString() : String(v);
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
};

function coerceProviderRating(row) {
  // If API already provided a populated providerRating, use it
  if (
    row?.providerRating &&
    (row.providerRating.total != null ||
      row.providerRating.quality != null ||
      row.providerRating.communication != null ||
      row.providerRating.billing != null)
  ) {
    return row.providerRating;
  }

  // Otherwise, build from row.provider.* (present in your admin payload)
  const p = row?.provider || {};
  const q = numify(p.providerQualityRating);
  const co = numify(p.providerCommunicationRating);
  const b = numify(p.providerBillingRating);
  const t = numify(p.providerTotalRating);

  const parts = [q, co, b].filter((n) => typeof n === "number");
  const computed = parts.length
    ? Number((parts.reduce((s, v) => s + v, 0) / parts.length).toFixed(1))
    : null;

  return {
    total: t ?? computed,
    quality: q ?? null,
    communication: co ?? null,
    billing: b ?? null,
  };
}

function RatingDetails({
  label,
  rating,
  hasRatings = true,
  emptyText = "No Ratings Yet",
  align = "left",
}) {
  if (!hasRatings) {
    return <span>{emptyText}</span>;
  }

  const has =
    rating &&
    (rating.total != null ||
      rating.quality != null ||
      rating.communication != null ||
      rating.billing != null);

  if (!has) return <span>{emptyText}</span>;

  return (
    <details className={align === "center" ? "text-center" : "text-left"}>
      <summary className="cursor-pointer font-medium text-[#0f7c80] hover:text-[#11999e]">
        {label}: {rating.total != null ? `${rating.total}/5` : "N/A"}
      </summary>
      <div className="mt-2 space-y-0.5 pl-1 text-left text-xs text-gray-600">
        <div>Quality: {rating.quality ?? "—"}/5</div>
        <div>Communication: {rating.communication ?? "—"}/5</div>
        <div>Billing: {rating.billing ?? "—"}/5</div>
      </div>
    </details>
  );
}

export default function ContractsTable({
  rows,
  onShowContract,
  hideHeading = false,
}) {
  const enriched = useMemo(
    () =>
      (rows || []).map((c) => ({
        ...c,
        providerRating: coerceProviderRating(c),
      })),
    [rows],
  );

  // show 5 initially
  const PAGE_SIZE = 5;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // reset when data changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [enriched.length]);

  const visibleRows = enriched.slice(0, visibleCount);
  const canLoadMore = visibleCount < enriched.length;

  return (
    <div className="w-full">
      {!hideHeading && (
        <h2 className="mb-4 text-2xl font-semibold text-gray-900">
          My LEXIFY Contracts
        </h2>
      )}

      {enriched.length === 0 ? (
        <div className={emptyCard}>N/A</div>
      ) : (
        <>
          <div className={tableCard}>
            <div className={tableScroll}>
              <table className={table}>
                <thead>
                  <tr className={theadRow}>
                    <th className={th}>Title</th>
                    <th className={th}>Created by</th>
                    <th className={th}>Date of Contract</th>
                    <th className={th}>Legal Service Provider</th>
                    <th className={th}>Contract Price</th>
                    <th className={th}>View LEXIFY Contract</th>
                    <th className={th}>My Rating of the Law Firm on LEXIFY</th>
                    <th className={th}>
                      Aggregate Rating of the Law Firm on LEXIFY
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {visibleRows.map((c) => (
                    <tr key={c.contractId} className={tr}>
                      <td className={td}>{c.request?.title || "—"}</td>
                      <td className={td}>{c.createdBy || "—"}</td>
                      <td className={td}>
                        {formatDateDDMMYYYY(c.contractDate)}
                      </td>

                      <td className={td}>{c.provider?.companyName || "—"}</td>

                      <td className={td}>
                        {c.contractPrice != null
                          ? fmtMoney(c.contractPrice, c.contractPriceCurrency)
                          : "—"}
                        {isHourlyRate(
                          c.contractPriceType || c.request?.paymentRate,
                        )
                          ? "/h"
                          : ""}
                      </td>

                      <td className={td}>
                        <button
                          className={btnPrimary}
                          onClick={() => onShowContract?.(c)}
                        >
                          View
                        </button>
                      </td>

                      <td className={td}>
                        <RatingDetails
                          label="My rating"
                          rating={c.myRating}
                          hasRatings={c.myHasRating}
                          emptyText="No Rating Yet"
                          align="center"
                        />
                      </td>

                      <td className={td}>
                        <RatingDetails
                          label="Aggregate rating"
                          rating={c.providerRating}
                          hasRatings={c.providerHasRatings}
                          align="center"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {canLoadMore && (
            <div className="mt-4 flex justify-center">
              <button
                className={btnGhost}
                onClick={() =>
                  setVisibleCount((n) =>
                    Math.min(n + PAGE_SIZE, enriched.length),
                  )
                }
              >
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
