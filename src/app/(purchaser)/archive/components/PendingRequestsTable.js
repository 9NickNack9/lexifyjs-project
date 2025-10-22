"use client";
// src/app/(purchaser)/archive/components/PendingRequestsTable.js

import { fmtMoney, formatTimeUntil } from "../utils/format";
import NarrowTooltip from "../../../components/NarrowTooltip";

export default function PendingRequestsTable({
  rows,
  winningOfferSelection,
  onPreview,
  onCancel,
  busyIds,
}) {
  const enriched = (rows || []).map((r) => {
    // Resolve a display deadline (offersDeadline preferred)
    const rawDeadline =
      r.offersDeadline ??
      r.offerDeadline ??
      r.deadline ??
      r?.details?.offersDeadline ??
      r?.details?.deadline ??
      null;

    const timeLeft = formatTimeUntil(rawDeadline); // "" when expired
    const isExpired = !timeLeft;

    // Compute under/over max flags
    const hasOffers = (r.offersReceived || 0) > 0;
    const hasMax = typeof r.maximumPrice === "number";
    const bestIsUnderMax =
      hasOffers && (hasMax ? r.bestOffer <= r.maximumPrice : true);
    const allOverMax =
      hasOffers && hasMax ? r.bestOffer > r.maximumPrice : false;

    let deadlineText = timeLeft;

    // Special messages for ON HOLD that are past the deadline
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

    // For PENDING, keep countdown (timeLeft). If no time left, just "Expired."
    if (r.requestState === "PENDING" && isExpired) {
      deadlineText = "Expired.";
    }

    return { ...r, rawDeadline, deadlineText, isExpired };
  });

  // Show ALL PENDING and ON HOLD (even expired), hide only EXPIRED
  const active = enriched.filter((r) => r.requestState !== "EXPIRED");

  return (
    <div className="w-full mb-8">
      <h2 className="text-2xl font-semibold mb-4">
        My Pending LEXIFY Requests
      </h2>

      {active.length === 0 ? (
        <div className="p-4 bg-white rounded border text-black">N/A</div>
      ) : (
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
              <th className="border p-2 text-center">View LEXIFY Request</th>
              <th className="border p-2 text-center">Cancel LEXIFY Request</th>
            </tr>
          </thead>
          <tbody>
            {active.map((r) => {
              // Add "/h" for hourly rate rows in the Current Best Offer column
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
      )}
    </div>
  );
}
