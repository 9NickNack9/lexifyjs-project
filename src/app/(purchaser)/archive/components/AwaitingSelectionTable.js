"use client";

import { fmtMoney } from "../utils/format";

export default function AwaitingSelectionTable({ rows, onPreview }) {
  return (
    <div className="w-full mb-8">
      <h2 className="text-2xl font-semibold mb-4">
        Awaiting Winning Offer Selection
      </h2>

      {rows.length === 0 ? (
        <div className="p-4 bg-white rounded border text-black">
          No requests awaiting your selection.
        </div>
      ) : (
        <table className="w-full border-collapse border border-gray-300 bg-white text-black">
          <thead>
            <tr className="bg-[#3a3a3c] text-white">
              <th className="border p-2 text-center">Title</th>
              <th className="border p-2 text-center">Created by</th>
              <th className="border p-2 text-center">Date Created</th>
              <th className="border p-2 text-center">Expired</th>
              <th className="border p-2 text-center">Offers Received</th>
              <th className="border p-2 text-center">
                Current Best Offer (VAT 0%)
              </th>
              <th className="border p-2 text-center">My Max. Price (VAT 0%)</th>
              <th className="border p-2 text-center">View LEXIFY Request</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.requestId}>
                <td className="border p-2 text-center">{r.title}</td>
                <td className="border p-2 text-center">
                  {r.primaryContactPerson || "—"}
                </td>
                <td className="border p-2 text-center">
                  {new Date(r.dateCreated).toLocaleDateString()}
                </td>
                <td className="border p-2 text-center">
                  Expired. Awaiting Winning Offer Selection.
                </td>
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
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
