// src/app/(purchaser)/archive/components/ExpiredRequestsTable.js
"use client";

import { fmtMoney } from "../utils/format";
import NarrowTooltip from "../../../components/NarrowTooltip";

function formatOfferLine(offer, currency, paymentRate) {
  if (!offer) return "N/A";
  const price = fmtMoney(offer.offeredPrice, currency);
  const suffix = paymentRate?.toLowerCase().startsWith("hourly rate")
    ? "/h"
    : "";
  const name = offer.providerCompanyName || "—";
  return `${price}${suffix} (${name})`;
}

function formatDateDDMMYYYY(isoish) {
  const d = new Date(isoish);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export default function ExpiredRequestsTable({ rows }) {
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
              <th className="border p-2 text-center">
                My Max. Price (VAT 0%){" "}
                <NarrowTooltip tooltipText="If you have included a maximum price for the legal service in your LEXIFY Request, the maximum price is displayed here. A maximum price can be set for lump sum offers only. " />
              </th>
              <th className="border p-2 text-center">Best Offer (VAT 0%)</th>
              <th className="border p-2 text-center">
                Top 2 Runner-up Offers (VAT 0%)
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const best = formatOfferLine(
                r.bestOffer,
                r.currency,
                r.paymentRate
              );

              let runnerUpContent = "N/A";
              if (Array.isArray(r.runnerUps) && r.runnerUps.length > 0) {
                if (r.runnerUps.length === 1) {
                  runnerUpContent = formatOfferLine(
                    r.runnerUps[0],
                    r.currency,
                    r.paymentRate
                  );
                } else {
                  runnerUpContent = (
                    <div className="flex flex-col items-start gap-1">
                      <span>
                        {formatOfferLine(
                          r.runnerUps[0],
                          r.currency,
                          r.paymentRate
                        )}
                      </span>
                      <span>
                        {formatOfferLine(
                          r.runnerUps[1],
                          r.currency,
                          r.paymentRate
                        )}
                      </span>
                    </div>
                  );
                }
              }

              const suffixForMax = r.paymentRate
                ?.toLowerCase()
                .startsWith("hourly rate")
                ? "/h"
                : "";

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
                    {r.maxPrice != null && r.maxPrice !== ""
                      ? `${fmtMoney(r.maxPrice, r.currency)}${suffixForMax}`
                      : "N/A"}
                  </td>
                  <td className="border p-2 text-center">{best}</td>
                  <td className="border p-2 text-center">{runnerUpContent}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
