"use client";
// src/app/(purchaser)/archive/components/PendingRequestsTable.js

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fmtMoney, formatTimeUntil } from "../utils/format";
import NarrowTooltip from "../../../components/NarrowTooltip";

export default function PendingRequestsTable({
  rows,
  winningOfferSelection,
  onPreview,
  onCancel,
  busyIds,
}) {
  const router = useRouter();

  const enriched = useMemo(() => {
    return (rows || []).map((r) => {
      const rawDeadline =
        r.offersDeadline ??
        r.offerDeadline ??
        r.deadline ??
        r?.details?.offersDeadline ??
        r?.details?.deadline ??
        null;

      const timeLeft = formatTimeUntil(rawDeadline);
      const isExpired = !timeLeft;

      const hasOffers = (r.offersReceived || 0) > 0;
      const hasMax = typeof r.maximumPrice === "number";
      const bestIsUnderMax =
        hasOffers && (hasMax ? r.bestOffer <= r.maximumPrice : true);
      const allOverMax =
        hasOffers && hasMax ? r.bestOffer > r.maximumPrice : false;

      let deadlineText = timeLeft;

      if (r.requestState === "CONFLICT_CHECK" && isExpired) {
        deadlineText = "Expired. Awaiting Conflict Check for Selected Offer.";
      }

      if (r.requestState === "ON HOLD" && isExpired) {
        if (bestIsUnderMax) {
          deadlineText = "Expired. Awaiting Winning Offer Selection.";
        } else if (allOverMax) {
          deadlineText =
            "Expired. Best offer over maximum price - awaiting approval or cancellation";
        } else {
          deadlineText = "Expired.";
        }
      }

      if (r.requestState === "PENDING" && isExpired) {
        deadlineText = "Expired.";
      }

      return { ...r, rawDeadline, deadlineText, isExpired };
    });
  }, [rows]);

  const active = useMemo(
    () => enriched.filter((r) => r.requestState !== "EXPIRED"),
    [enriched],
  );

  // Load-more paging
  const PAGE_SIZE = 5;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => setVisibleCount(PAGE_SIZE), [active.length]);

  const visibleRows = active.slice(0, visibleCount);
  const canLoadMore = visibleCount < active.length;

  return (
    <div className="w-full mb-8">
      <h2 className="text-2xl font-semibold mb-4">
        My Pending LEXIFY Requests
      </h2>

      {active.length === 0 ? (
        <div className="p-4 bg-white rounded border text-black">N/A</div>
      ) : (
        <>
          <table className="w-full border-collapse border border-gray-300 bg-white text-black">
            <thead>
              <tr className="bg-[#3a3a3c] text-white">
                <th className="border p-2 text-center">Title</th>
                <th className="border p-2 text-center">Created by</th>
                <th className="border p-2 text-center">Date Created</th>
                <th className="border p-2 text-center">
                  Time until Deadline for Offers
                </th>
                <th className="border p-2 text-center">Offers Received</th>
                <th className="border p-2 text-center">
                  Current Best Offer (VAT 0%)
                </th>
                <th className="border p-2 text-center">
                  My Max. Price (VAT 0%){" "}
                  <NarrowTooltip tooltipText="If you have included a maximum price for the legal service in your LEXIFY Request, the maximum price is displayed here. A maximum price can be set for lump sum offers only. " />
                </th>
                <th className="border p-2 text-center">
                  Additional Information Requests from Legal Service Providers
                </th>
                <th className="border p-2 text-center">View LEXIFY Request</th>
                <th className="border p-2 text-center">
                  Cancel LEXIFY Request
                </th>
              </tr>
            </thead>

            <tbody>
              {visibleRows.map((r) => {
                const addPerHour =
                  typeof r.paymentRate === "string" &&
                  r.paymentRate.toLowerCase().startsWith("hourly rate");

                return (
                  <tr key={r.requestId}>
                    <td className="border p-2 text-center">{r.title}</td>
                    <td className="border p-2 text-center">
                      {r.primaryContactPerson || "—"}
                    </td>
                    <td className="border p-2 text-center">
                      {new Date(r.dateCreated).toLocaleDateString()}
                    </td>
                    <td
                      className="border p-2 text-center"
                      title={
                        r.rawDeadline ? new Date(r.rawDeadline).toString() : ""
                      }
                    >
                      {r.deadlineText}
                    </td>
                    <td className="border p-2 text-center">
                      {r.offersReceived || 0}
                    </td>
                    <td className="border p-2 text-center">
                      {fmtMoney(r.bestOffer, r.currency)}
                      {addPerHour ? "/h" : ""}
                    </td>
                    <td className="border p-2 text-center">
                      {r.maximumPrice != null && r.maximumPrice !== ""
                        ? fmtMoney(r.maximumPrice, r.currency)
                        : "N/A"}
                    </td>

                    <td className="border p-2 text-center">
                      {(() => {
                        const aq = r.details?.additionalQuestions;
                        const isObj =
                          aq && typeof aq === "object" && !Array.isArray(aq);
                        const count = isObj ? Object.keys(aq).length : 0;
                        if (!count) return "N/A";

                        return (
                          <div className="flex items-center justify-center gap-2">
                            <span>
                              {count} Additional Information Request(s)
                            </span>
                            <button
                              type="button"
                              className="bg-[#11999e] text-white px-3 py-1 rounded cursor-pointer"
                              onClick={() =>
                                router.push(
                                  `/archive/requests/${r.requestId}/additional-questions`,
                                )
                              }
                            >
                              Review and Respond
                            </button>
                          </div>
                        );
                      })()}
                    </td>

                    <td className="border p-2 text-center">
                      <button
                        className="bg-[#11999e] text-white px-3 py-1 rounded cursor-pointer"
                        onClick={() => onPreview(r)}
                      >
                        View
                      </button>
                    </td>

                    <td className="border p-2 text-center">
                      <button
                        className="bg-red-500 text-white px-3 py-1 rounded cursor-pointer disabled:opacity-50"
                        disabled={r.isExpired || busyIds.has(r.requestId)}
                        onClick={() => onCancel(r.requestId)}
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {canLoadMore && (
            <div className="mt-4 flex justify-center">
              <button
                className="bg-[#11999e] text-white px-4 py-2 rounded cursor-pointer"
                onClick={() =>
                  setVisibleCount((n) => Math.min(n + PAGE_SIZE, active.length))
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
