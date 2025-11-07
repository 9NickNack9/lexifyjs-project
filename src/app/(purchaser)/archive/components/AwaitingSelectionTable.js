"use client";

import { fmtMoney, formatTimeUntil } from "../utils/format";
import NarrowTooltip from "../../../components/NarrowTooltip";

function formatDateDDMMYYYY(isoish) {
  const d = new Date(isoish);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export default function AwaitingSelectionTable({
  rows,
  onPreview,
  onCancel,
  onSelect, // optional custom handler
}) {
  const postSelect = async (requestId, offerId) => {
    const res = await fetch("/api/me/requests/awaiting/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, offerId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok)
      throw new Error(data?.error || "Failed to select winning offer.");
    return data;
  };

  const handleSelect = async (requestId, offerId) => {
    try {
      await postSelect(requestId, offerId);
      // refresh after success
      window.location.reload();
    } catch (e) {
      alert(e.message || "Failed to select winning offer.");
    }
  };

  const confirmAndSelect = async (row, offer) => {
    const pretty = `${fmtMoney(offer.offeredPrice, row.currency)} (${
      offer.providerCompanyName
    } / Lead: ${offer.offerLawyer}, LEXIFY rating: ${
      offer.providerTotalRating ?? "—"
    }/5)`;

    const confirmed = window.confirm(
      [
        "Please confirm you want to select this offer as the winner.",
        "",
        `Request: ${row.requestTitle}`,
        `Offer:   ${pretty}`,
        "",
        "This will create a LEXIFY contract at the above price.",
        "This action cannot be undone.",
      ].join("\n")
    );

    if (!confirmed) return;

    if (onSelect) {
      await onSelect(row.requestId, offer.offerId);
    } else {
      await handleSelect(row.requestId, offer.offerId);
    }
  };

  const postExtendOnce = async (requestId) => {
    const res = await fetch("/api/me/requests/awaiting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Failed to extend deadline.");
    return data;
  };

  const handleExtend = async (requestId) => {
    if (
      !window.confirm(
        "Add 24 hours to the decision deadline? This can only be done once."
      )
    )
      return;
    try {
      await postExtendOnce(requestId);
      window.location.reload();
    } catch (e) {
      alert(e.message || "Failed to extend deadline.");
    }
  };

  return (
    <div className="w-full mb-8">
      <h2 className="text-2xl font-semibold mb-4">
        Awaiting Winning Offer Selection
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
                My Max. Price (VAT 0%){" "}
                <NarrowTooltip tooltipText="If you have included a maximum price for the legal service in your LEXIFY Request, the maximum price is displayed here. A maximum price can be set for lump sum offers only. " />
              </th>
              <th className="border p-2 text-center">3 Best Offers</th>
              <th className="border p-2 text-center">
                Time until Automatic Rejection of All Offers
                <NarrowTooltip tooltipText="If you need more time to make decisions, you can click the 'I need more time' button to extend the deadline for selecting an offer by 1 day (24 hours). This button may only be clicked once." />
              </th>
              <th className="border p-2 text-center">Cancel LEXIFY Request</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const timeLeft =
                r.requestState === "CONFLICT_CHECK"
                  ? r.pausedRemainingMs != null
                    ? `Paused (${formatTimeUntil(
                        Date.now() + r.pausedRemainingMs
                      )})`
                    : "Paused"
                  : r.acceptDeadline
                  ? formatTimeUntil(r.acceptDeadline)
                  : "";

              return (
                <tr key={r.requestId}>
                  <td className="border p-2">
                    <div className="flex flex-col items-start">
                      <div className="font-medium">{r.requestTitle}</div>
                    </div>
                  </td>

                  <td className="border p-2 text-center">
                    {formatDateDDMMYYYY(r.dateCreated)}
                  </td>

                  <td className="border p-2 text-center">
                    {formatDateDDMMYYYY(r.dateExpired)}
                  </td>

                  <td className="border p-2 text-center">
                    {r.maxPrice != null && r.maxPrice !== ""
                      ? fmtMoney(r.maxPrice, r.currency)
                      : "N/A"}
                  </td>

                  <td className="border p-2 align-top">
                    {r.requestState === "CONFLICT_CHECK" && (
                      <div className="mb-2 text-sm text-amber-700">
                        Conflict check in progress. You will be notified if a
                        conflict prevents your selected legal service provider
                        from performing the assignment. If no conflict is found,
                        the LEXIFY Contract for the assignment will be sent to
                        you without delay.
                      </div>
                    )}
                    {Array.isArray(r.topOffers) && r.topOffers.length > 0 ? (
                      <ul className="space-y-2">
                        {r.topOffers.map((o) => (
                          <li key={o.offerId} className="text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <button
                                className={`px-3 py-1 rounded cursor-pointer ${
                                  r.requestState === "CONFLICT_CHECK"
                                    ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                                    : "bg-[#11999e] text-white"
                                }`}
                                disabled={r.requestState === "CONFLICT_CHECK"}
                                onClick={() => confirmAndSelect(r, o)}
                              >
                                Select
                              </button>
                              <div className="flex-1">
                                {fmtMoney(o.offeredPrice, r.currency)} (
                                {o.providerCompanyWebsite ? (
                                  <a
                                    href={o.providerCompanyWebsite}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                  >
                                    {o.providerCompanyName}
                                  </a>
                                ) : (
                                  <span>{o.providerCompanyName}</span>
                                )}{" "}
                                / Lead: {o.offerLawyer}, LEXIFY rating:{" "}
                                {o.providerTotalRating ?? "—"}/5)
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td
                    className="border p-2 text-center"
                    title={
                      r.acceptDeadline
                        ? new Date(r.acceptDeadline).toString()
                        : ""
                    }
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span>{timeLeft || "Expired"}</span>
                      {r.requestState === "ON HOLD" && timeLeft && (
                        <button
                          className={`px-2 py-1 rounded text-white ${
                            r.canExtend
                              ? "bg-[#11999e] hover:opacity-90"
                              : "bg-gray-400 cursor-not-allowed"
                          }`}
                          disabled={!r.canExtend}
                          onClick={() => handleExtend(r.requestId)}
                          title={
                            r.canExtend
                              ? "Adds 24 hours. Can be used only once."
                              : r.extendedOnce
                              ? "Already extended once."
                              : "Extension not available."
                          }
                        >
                          I need more time
                        </button>
                      )}
                    </div>
                  </td>

                  <td className="border p-2 text-center">
                    <div className="flex items-center justify-center gap-2">
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
