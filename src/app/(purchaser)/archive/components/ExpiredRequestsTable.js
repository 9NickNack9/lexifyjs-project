// src/app/(purchaser)/archive/components/ExpiredRequestsTable.js
"use client";

import { fmtMoney } from "../utils/format";

function formatOfferLine(offer, currency, paymentRate, showCompany) {
  if (!offer) return "—";
  const price = fmtMoney(offer.offeredPrice, currency);
  const suffix = paymentRate?.toLowerCase() === "hourly rate" ? "/h" : "";
  const base = `${price}${suffix}`;
  if (!showCompany) return base;
  const name = offer.providerCompanyName || "—";
  return `${base} (${name})`;
}

function formatDateDDMMYYYY(isoish) {
  const d = new Date(isoish);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n) => String(n).toString().padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export default function ExpiredRequestsTable({ rows, onPreview }) {
  return (
    <div className="w-full mb-8">
      <h2 className="text-2xl font-semibold mb-4">
        My Expired LEXIFY Requests
      </h2>

      {rows.length === 0 ? (
        <div className="p-4 bg-white rounded border text-black">N/A</div>
      ) : (
        <table className="w-full border-collapse border border-gray-300 bg-white text-black">
          <thead>
            <tr className="bg-[#3a3a3c] text-white">
              <th className="border p-2 text-center">Title</th>
              <th className="border p-2 text-center">Date Created</th>
              <th className="border p-2 text-center">Date Expired</th>
              <th className="border p-2 text-center">
                Did Request Result in Contract?
              </th>
              <th className="border p-2 text-center">My Max. Price (VAT 0%)</th>
              <th className="border p-2 text-center">Best Offer</th>
              <th className="border p-2 text-center">Top 2 Runner-up Offers</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const showCompany =
                (r.contractResult || "").toLowerCase() !== "no";
              const best = formatOfferLine(
                r.bestOffer,
                r.currency,
                r.paymentRate,
                showCompany
              );
              const ru1 = r.runnerUps?.[0]
                ? formatOfferLine(
                    r.runnerUps[0],
                    r.currency,
                    r.paymentRate,
                    showCompany
                  )
                : "—";
              const ru2 = r.runnerUps?.[1]
                ? formatOfferLine(
                    r.runnerUps[1],
                    r.currency,
                    r.paymentRate,
                    showCompany
                  )
                : "—";

              return (
                <tr key={r.requestId}>
                  <td className="border p-2 text-center">{r.requestTitle}</td>
                  <td className="border p-2 text-center">
                    {formatDateDDMMYYYY(r.dateCreated)}
                  </td>
                  <td className="border p-2 text-center">
                    {formatDateDDMMYYYY(r.dateExpired)}
                  </td>
                  <td className="border p-2 text-center">
                    {r.contractResult ?? "—"}
                  </td>
                  <td className="border p-2 text-center">
                    {fmtMoney(r.maxPrice, r.currency)}
                  </td>
                  <td className="border p-2 text-center">{best}</td>
                  <td className="border p-2 text-center">
                    <div className="flex flex-col items-start gap-1">
                      <span>{ru1}</span>
                      <span>{ru2}</span>
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
