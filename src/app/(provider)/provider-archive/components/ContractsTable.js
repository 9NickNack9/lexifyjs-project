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

export default function ContractsTable({ rows, onShowContract }) {
  const [sort, setSort] = useState({
    key: "contractDate",
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
                <th className={th}>Title</th>
                <th
                  className={`${th} cursor-pointer`}
                  onClick={() => toggleSort("clientName")}
                >
                  Client {sortMark("clientName")}
                </th>
                <th
                  className={`${th} cursor-pointer`}
                  onClick={() => toggleSort("contractDate")}
                >
                  Contract Date {sortMark("contractDate")}
                </th>
                <th
                  className={`${th} cursor-pointer`}
                  onClick={() => toggleSort("contractPrice")}
                >
                  Contract Price (VAT 0%) {sortMark("contractPrice")}
                </th>
                <th className={th}>View LEXIFY Contract</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr key={c.contractId} className={tr}>
                  <td className={td}>{c.title}</td>
                  <td className={td}>{c.clientName}</td>
                  <td className={td}>
                    {new Date(c.contractDate).toLocaleDateString()}
                  </td>
                  <td className={td}>
                    {fmtMoney(c.contractPrice)}
                    {isHourlyRate(
                      c.contractPriceType ||
                        c.contract?.contractPriceType ||
                        c.contract?.request?.paymentRate,
                    )
                      ? "/h"
                      : ""}
                  </td>
                  <td className={td}>
                    <button
                      className={btnPrimary}
                      onClick={() => onShowContract(c.contract)}
                    >
                      View
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
