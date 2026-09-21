"use client";

import { useEffect, useMemo, useState } from "react";
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
} from "@/app/(purchaser)/archive/components/tableUi";
import { fmtMoney, isHourlyRate, sortGeneric } from "./format";

const PAGE_SIZE = 5;

export default function ExpiredOffersTable({ rows, onViewRequest }) {
  const [sort, setSort] = useState({
    key: "offerSubmissionDate",
    dir: "desc",
  });
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(
    () => sortGeneric(rows || [], sort.key, sort.dir),
    [rows, sort],
  );

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filtered.length]);

  const visible = filtered.slice(0, visibleCount);
  const canLoadMore = visibleCount < filtered.length;

  const toggleSort = (key) =>
    setSort((p) => ({
      key,
      dir: p.dir === "asc" ? "desc" : "asc",
    }));

  const sortMark = (key) =>
    sort.key === key ? (sort.dir === "asc" ? "↑" : "↓") : "";

  if (filtered.length === 0) {
    return <div className={emptyCard}>N/A</div>;
  }

  return (
    <>
      <div className={tableCard}>
        <div className={tableScroll}>
          <table className={table}>
            <thead>
              <tr className={theadRow}>
                <th className={th}>Offer Title</th>
                <th
                  className={`${th} cursor-pointer`}
                  onClick={() => toggleSort("clientName")}
                >
                  Client {sortMark("clientName")}
                </th>
                <th
                  className={`${th} cursor-pointer`}
                  onClick={() => toggleSort("offerSubmissionDate")}
                >
                  Offer Submitted {sortMark("offerSubmissionDate")}
                </th>
                <th
                  className={`${th} cursor-pointer`}
                  onClick={() => toggleSort("offeredPrice")}
                >
                  Offered Price (VAT 0%) {sortMark("offeredPrice")}
                </th>
                <th className={th}>Offer Submitted in Response to</th>
                <th className={th}>Outcome</th>
                <th className={th}>Winner Selected Based on</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((o) => {
                const rawReason = o.selectReason || "";
                const reasonTrimmed = rawReason.trim();
                const winnerSelectedBasedOn =
                  reasonTrimmed === "I'd rather not say"
                    ? "Not Disclosed by Client"
                    : reasonTrimmed || "—";

                return (
                  <tr key={o.offerId} className={tr}>
                    <td className={td}>{o.title}</td>
                    <td className={td}>{o.clientName || "—"}</td>
                    <td className={td}>
                      {o.offerSubmissionDate
                        ? new Date(o.offerSubmissionDate).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className={td}>
                      {fmtMoney(o.offeredPrice)}
                      {isHourlyRate(o.paymentRate) ? "/h" : ""}
                    </td>
                    <td className={td}>
                      <button
                        className={btnPrimary}
                        onClick={() => onViewRequest(o.requestId)}
                      >
                        View LEXIFY Request
                      </button>
                    </td>
                    <td className={td}>{o.offerStatus || "—"}</td>
                    <td className={td}>{winnerSelectedBasedOn}</td>
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
              setVisibleCount((n) => Math.min(n + PAGE_SIZE, filtered.length))
            }
          >
            Load more
          </button>
        </div>
      )}
    </>
  );
}
