// src/app/(purchaser)/archive/components/ExpiredRequestsTable.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { fmtMoney, isHourlyRate } from "../utils/format";
import {
  btnGhost,
  emptyCard,
  table,
  tableCard,
  tableScroll,
  td,
  th,
  theadRow,
  tr,
} from "./tableUi";

function formatOfferLine(offer, currency, paymentRate) {
  if (!offer) return "N/A";
  const price = fmtMoney(offer.offeredPrice, currency);
  const suffix = isHourlyRate(paymentRate) ? "/h" : "";
  const name = offer.providerCompanyName || "—";
  return `${price}${suffix} (${name})`;
}

function formatDateDDMMYYYY(isoish) {
  const d = new Date(isoish);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export default function ExpiredRequestsTable({ rows, hideHeading = false }) {
  const safeRows = useMemo(() => rows || [], [rows]);

  const PAGE_SIZE = 5;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [safeRows.length]);

  const visibleRows = safeRows.slice(0, visibleCount);
  const canLoadMore = visibleCount < safeRows.length;

  return (
    <div className="w-full">
      {!hideHeading && (
        <h2 className="mb-4 text-2xl font-semibold text-gray-900">
          My Expired LEXIFY Requests
        </h2>
      )}

      {safeRows.length === 0 ? (
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
                <th className={th}>Date Created</th>
                <th className={th}>Date Expired</th>
                <th className={th}>
                  Did Request Result in Contract?
                </th>
                <th className={th}>Best Offer (VAT 0%)</th>
                <th className={th}>
                  Top 2 Runner-up Offers (VAT 0%)
                </th>
              </tr>
            </thead>

            <tbody>
              {visibleRows.map((r) => {
                const best = formatOfferLine(
                  r.bestOffer,
                  r.currency,
                  r.paymentRate,
                );

                let runnerUpContent = "N/A";
                if (Array.isArray(r.runnerUps) && r.runnerUps.length > 0) {
                  if (r.runnerUps.length === 1) {
                    runnerUpContent = formatOfferLine(
                      r.runnerUps[0],
                      r.currency,
                      r.paymentRate,
                    );
                  } else {
                    runnerUpContent = (
                      <div className="flex flex-col items-start gap-1">
                        <span>
                          {formatOfferLine(
                            r.runnerUps[0],
                            r.currency,
                            r.paymentRate,
                          )}
                        </span>
                        <span>
                          {formatOfferLine(
                            r.runnerUps[1],
                            r.currency,
                            r.paymentRate,
                          )}
                        </span>
                      </div>
                    );
                  }
                }

                return (
                  <tr key={r.requestId} className={tr}>
                    <td className={td}>
                      {r.requestTitle || "—"}
                    </td>
                    <td className={td}>
                      {r.createdBy || "—"}
                    </td>
                    <td className={td}>
                      {formatDateDDMMYYYY(r.dateCreated)}
                    </td>
                    <td className={td}>
                      {formatDateDDMMYYYY(r.dateExpired)}
                    </td>
                    <td className={td}>
                      {r.contractResult ?? "—"}
                    </td>
                    <td className={td}>{best}</td>
                    <td className={td}>
                      {runnerUpContent}
                    </td>
                  </tr>
                );
              })}
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
                    Math.min(n + PAGE_SIZE, safeRows.length),
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
