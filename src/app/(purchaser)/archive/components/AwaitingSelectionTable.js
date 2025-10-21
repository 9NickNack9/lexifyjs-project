"use client";

import { fmtMoney, formatTimeUntil } from "../utils/format";

function addDays(dateLike, days) {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateDDMMYYYY(isoish) {
  const d = new Date(isoish);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export default function AwaitingSelectionTable({ rows, onPreview, onCancel }) {
  return (
    <div className="w-full mb-8">
      <h2 className="text-2xl font-semibold mb-4">Awaiting Winner Selection</h2>

      {rows.length === 0 ? (
        <div className="p-4 bg-white rounded border text-black">N/A</div>
      ) : (
        <table className="w-full border-collapse border border-gray-300 bg-white text-black">
          <thead>
            <tr className="bg-[#3a3a3c] text-white">
              <th className="border p-2 text-center">Title</th>
              <th className="border p-2 text-center">Date Created</th>
              <th className="border p-2 text-center">Date Expired</th>
              <th className="border p-2 text-center">3 Best Offers</th>
              <th className="border p-2 text-center">My Max. Price (VAT 0%)</th>
              <th className="border p-2 text-center">
                Time until Automatic Rejection of All Offers
              </th>
              <th className="border p-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const autoRejectAt = addDays(r.dateExpired, 7);
              const timeLeft = autoRejectAt
                ? formatTimeUntil(autoRejectAt)
                : "";
              return (
                <tr key={r.requestId}>
                  <td className="border p-2">
                    <div className="flex flex-col items-start">
                      <div className="font-medium">{r.requestTitle}</div>
                      {/* optional: primaryContactPerson under title */}
                      {r.primaryContactPerson ? (
                        <div className="text-sm opacity-70">
                          {r.primaryContactPerson}
                        </div>
                      ) : null}
                    </div>
                  </td>

                  <td className="border p-2 text-center">
                    {formatDateDDMMYYYY(r.dateCreated)}
                  </td>

                  <td className="border p-2 text-center">
                    {formatDateDDMMYYYY(r.dateExpired)}
                  </td>

                  <td className="border p-2">
                    {Array.isArray(r.topOffers) && r.topOffers.length > 0 ? (
                      <ul className="space-y-2">
                        {r.topOffers.map((o, idx) => (
                          <li key={idx} className="text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span>
                                {fmtMoney(o.offeredPrice, r.currency)} —{" "}
                                {o.providerCompanyName}{" "}
                                <span className="opacity-70">
                                  ({o.providerContactPersonName})
                                </span>
                              </span>
                              {/* clickable rating breakdown */}
                              <details className="ml-2">
                                <summary className="cursor-pointer underline">
                                  Rating: {o.providerTotalRating ?? "—"}/5
                                </summary>
                                <div className="mt-1 pl-4">
                                  <div>
                                    Quality: {o.providerQualityRating ?? "—"}/5
                                  </div>
                                  <div>
                                    Communication:{" "}
                                    {o.providerCommunicationRating ?? "—"}/5
                                  </div>
                                  <div>
                                    Billing: {o.providerBillingRating ?? "—"}/5
                                  </div>
                                </div>
                              </details>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td className="border p-2 text-center">
                    {fmtMoney(r.maxPrice, r.currency)}
                  </td>

                  <td
                    className="border p-2 text-center"
                    title={autoRejectAt ? autoRejectAt.toString() : ""}
                  >
                    {timeLeft || "Expired"}
                  </td>

                  <td className="border p-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        className="bg-[#11999e] text-white px-3 py-1 rounded cursor-pointer"
                        onClick={() => onPreview?.(r)}
                      >
                        View
                      </button>
                      <button
                        className="bg-red-500 text-white px-3 py-1 rounded cursor-pointer"
                        onClick={() => onCancel?.(r.requestId)}
                      >
                        Cancel
                      </button>
                    </div>
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
