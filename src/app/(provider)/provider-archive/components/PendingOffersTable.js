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
import {
  fmtMoney,
  formatTimeUntilForOffer,
  isHourlyRate,
  sortGeneric,
} from "./format";

const PAGE_SIZE = 5;

export default function PendingOffersTable({ rows, onViewRequest }) {
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
                <th
                  className={`${th} cursor-pointer`}
                  onClick={() => toggleSort("deadline")}
                >
                  Time until Deadline for Offers {sortMark("deadline")}
                </th>
                <th className={th}>Offer Submitted in Response to</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((o) => (
                <tr key={o.offerId} className={tr}>
                  <td className={td}>{o.title}</td>
                  <td className={td}>
                    {(o.confidential ?? o.request?.details?.confidential)
                      ?.toString()
                      .trim()
                      .toLowerCase() === "yes"
                      ? "Disclosed to Winning Bidder Only"
                      : o.clientName || "—"}
                  </td>
                  <td className={td}>
                    {new Date(o.offerSubmissionDate).toLocaleDateString()}
                  </td>
                  <td className={td}>
                    {fmtMoney(o.offeredPrice)}
                    {isHourlyRate(o.paymentRate || o.preview?.paymentRate)
                      ? "/h"
                      : ""}
                  </td>
                  <td className={td}>{formatTimeUntilForOffer(o)}</td>
                  <td className={td}>
                    <button
                      className={btnPrimary}
                      onClick={() => onViewRequest(o.requestId)}
                    >
                      View LEXIFY Request
                    </button>
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
