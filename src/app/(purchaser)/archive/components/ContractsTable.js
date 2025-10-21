"use client";

import { fmtMoney } from "../utils/format";

function formatDateDDMMYYYY(isoish) {
  const d = new Date(isoish);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function RatingDetails({ label, rating }) {
  if (!rating || rating.total == null) return <span>—</span>;
  return (
    <details>
      <summary className="cursor-pointer underline">
        {label}: {rating.total}/5
      </summary>
      <div className="mt-1 pl-4 text-left">
        <div>Quality: {rating.quality ?? "—"}/5</div>
        <div>Communication: {rating.communication ?? "—"}/5</div>
        <div>Billing: {rating.billing ?? "—"}/5</div>
      </div>
    </details>
  );
}

export default function ContractsTable({ rows, onShowContract }) {
  return (
    <div className="w-full mb-8">
      <h2 className="text-2xl font-semibold mb-4">My LEXIFY Contracts</h2>

      {rows.length === 0 ? (
        <div className="p-4 bg-white rounded border text-black">N/A</div>
      ) : (
        <table className="w-full border-collapse border border-gray-300 bg-white text-black">
          <thead>
            <tr className="bg-[#3a3a3c] text-white">
              <th className="border p-2 text-center">Request</th>
              <th className="border p-2 text-center">Contract Date</th>
              <th className="border p-2 text-center">Provider</th>
              <th className="border p-2 text-center">Price</th>
              <th className="border p-2 text-center">Preview</th>
              <th className="border p-2 text-center">My Rating</th>
              <th className="border p-2 text-center">Provider Rating</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.contractId}>
                <td className="border p-2 text-center">
                  {c.request?.title || "—"}
                </td>
                <td className="border p-2 text-center">
                  {formatDateDDMMYYYY(c.contractDate)}
                </td>
                <td className="border p-2 text-center">
                  {c.provider?.companyName || "—"}
                </td>
                <td className="border p-2 text-center">
                  {fmtMoney(c.contractPrice, c.contractPriceCurrency)}
                </td>
                <td className="border p-2 text-center">
                  <button
                    className="bg-[#11999e] text-white px-3 py-1 rounded cursor-pointer"
                    onClick={() => onShowContract(c)}
                  >
                    View
                  </button>
                </td>
                <td className="border p-2 text-center">
                  <RatingDetails label="My Rating" rating={c.myRating} />
                </td>
                <td className="border p-2 text-center">
                  <RatingDetails label="Total" rating={c.providerRating} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
