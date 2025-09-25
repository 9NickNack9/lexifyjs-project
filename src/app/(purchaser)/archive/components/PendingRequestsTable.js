"use client";
// src/app/(purchaser)/archive/components/PendingRequestsTable.js

import { fmtMoney, formatTimeUntil } from "../utils/format";

export default function PendingRequestsTable({
  rows,
  winningOfferSelection,
  onPreview,
  onCancel,
  busyIds,
}) {
  const enriched = (rows || []).map((r) => {
    const timeLeft = formatTimeUntil(r.dateExpired);
    let deadlineText = timeLeft;

    if (!timeLeft) {
      const hasOffers = (r.offersReceived || 0) > 0;
      const hasMax = typeof r.maximumPrice === "number";
      const allOverMax =
        hasOffers && hasMax
          ? typeof r.bestOffer === "number" &&
            typeof r.maximumPrice === "number"
            ? r.bestOffer > r.maximumPrice
            : false
          : false;

      if ((winningOfferSelection || "").toLowerCase() === "manual") {
        deadlineText = "Expired. Awaiting Winning Offer Selection.";
      } else if (allOverMax) {
        deadlineText =
          "Expired. Best offer over maximum price - awaiting approval or rejection.";
      } else {
        deadlineText = "Expired.";
      }
    }

    return { ...r, deadlineText, isExpired: !timeLeft };
  });

  return (
    <div className="w-full mb-8">
      <h2 className="text-2xl font-semibold mb-4">
        My Pending LEXIFY Requests
      </h2>

      {enriched.length === 0 ? (
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
              <th className="border p-2 text-center">My Max. Price (VAT 0%)</th>
              <th className="border p-2 text-center">View LEXIFY Request</th>
              <th className="border p-2 text-center">Cancel LEXIFY Request</th>
            </tr>
          </thead>
          <tbody>
            {enriched.map((r) => (
              <tr key={r.requestId}>
                <td className="border p-2 text-center">{r.title}</td>
                <td className="border p-2 text-center">
                  {r.primaryContactPerson || "—"}
                </td>
                <td className="border p-2 text-center">
                  {new Date(r.dateCreated).toLocaleDateString()}
                </td>
                <td className="border p-2 text-center">{r.deadlineText}</td>
                <td className="border p-2 text-center">
                  {r.offersReceived || 0}
                </td>
                <td className="border p-2 text-center">
                  {fmtMoney(r.bestOffer, r.currency)}
                </td>
                <td className="border p-2 text-center">
                  {fmtMoney(r.maximumPrice, r.currency)}
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
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
