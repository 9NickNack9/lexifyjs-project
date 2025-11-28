"use client";
// Uses api/me/contracts/route.js
import { fmtMoney } from "../utils/format";

function formatDateDDMMYYYY(isoish) {
  const d = new Date(isoish);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

const numify = (v) => {
  if (v == null) return null;
  const s = typeof v === "object" && v.toString ? v.toString() : String(v);
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
};

function coerceProviderRating(row) {
  // If API already provided a populated providerRating, use it
  if (
    row?.providerRating &&
    (row.providerRating.total != null ||
      row.providerRating.quality != null ||
      row.providerRating.communication != null ||
      row.providerRating.billing != null)
  ) {
    return row.providerRating;
  }

  // Otherwise, build from row.provider.* (present in your admin payload)
  const p = row?.provider || {};
  const q = numify(p.providerQualityRating);
  const co = numify(p.providerCommunicationRating);
  const b = numify(p.providerBillingRating);
  const t = numify(p.providerTotalRating);

  const parts = [q, co, b].filter((n) => typeof n === "number");
  const computed = parts.length
    ? Number((parts.reduce((s, v) => s + v, 0) / parts.length).toFixed(1))
    : null;

  return {
    total: t ?? computed,
    quality: q ?? null,
    communication: co ?? null,
    billing: b ?? null,
  };
}

function RatingDetails({ label, rating, hasRatings = true }) {
  if (!hasRatings) {
    return <span>No Ratings Yet</span>;
  }

  const has =
    rating &&
    (rating.total != null ||
      rating.quality != null ||
      rating.communication != null ||
      rating.billing != null);

  if (!has) return <span>N/A</span>;

  return (
    <details>
      <summary className="cursor-pointer">
        {label}: {rating.total != null ? `${rating.total}/5` : "N/A"}
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
  const enriched = (rows || []).map((c) => ({
    ...c,
    providerRating: coerceProviderRating(c),
  }));

  return (
    <div className="w-full mb-8">
      <h2 className="text-2xl font-semibold mb-4">My LEXIFY Contracts</h2>

      {enriched.length === 0 ? (
        <div className="p-4 bg-white rounded border text-black">N/A</div>
      ) : (
        <table className="w-full border-collapse border border-gray-300 bg-white text-black">
          <thead>
            <tr className="bg-[#3a3a3c] text-white">
              <th className="border p-2 text-center">Title</th>
              <th className="border p-2 text-center">Date of Contract</th>
              <th className="border p-2 text-center">Legal Service Provider</th>
              <th className="border p-2 text-center">Contract Price</th>
              <th className="border p-2 text-center">View LEXIFY Contract</th>
              <th className="border p-2 text-center">
                My Rating of the Legal Service Provider on LEXIFY
              </th>
              <th className="border p-2 text-center">
                Aggregate Rating of the Legal Service Provider on LEXIFY
              </th>
            </tr>
          </thead>
          <tbody>
            {enriched.map((c) => (
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
                  <RatingDetails
                    label="My Rating"
                    rating={c.myRating}
                    hasRatings={c.myHasRating}
                  />
                </td>

                <td className="border p-2 text-center">
                  <RatingDetails
                    label="Provider Total Rating"
                    rating={c.providerRating}
                    hasRatings={c.providerHasRatings}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
