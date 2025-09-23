"use client";

import { fmtMoney } from "../utils/format";

export default function ContractsTable({ rows, onShowContract }) {
  return (
    <div className="w-full mb-8">
      <h2 className="text-2xl font-semibold mb-4">My LEXIFY Contracts</h2>

      {rows.length === 0 ? (
        <div className="p-4 bg-white rounded border text-black">
          No contracts yet.
        </div>
      ) : (
        <table className="w-full border-collapse border border-gray-300 bg-white text-black">
          <thead>
            <tr className="bg-[#3a3a3c] text-white">
              <th className="border p-2 text-center">Contract Date</th>
              <th className="border p-2 text-center">Provider</th>
              <th className="border p-2 text-center">Price</th>
              <th className="border p-2 text-center">Type</th>
              <th className="border p-2 text-center">View Contract</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.contractId}>
                <td className="border p-2 text-center">
                  {new Date(c.contractDate).toLocaleDateString()}
                </td>
                <td className="border p-2 text-center">
                  {c.provider?.companyName || "—"}
                </td>
                <td className="border p-2 text-center">
                  {fmtMoney(c.contractPrice, c.contractPriceCurrency)}
                </td>
                <td className="border p-2 text-center">
                  {c.contractPriceType || "—"}
                </td>
                <td className="border p-2 text-center">
                  <button
                    className="bg-[#11999e] text-white px-3 py-1 rounded cursor-pointer"
                    onClick={() => onShowContract(c)}
                  >
                    View Contract
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
