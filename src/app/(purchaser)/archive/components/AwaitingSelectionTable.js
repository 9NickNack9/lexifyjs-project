"use client";

import { useState } from "react";
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
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRow, setModalRow] = useState(null);
  const [modalOffer, setModalOffer] = useState(null);

  const [selectReasonChoice, setSelectReasonChoice] = useState(
    "Law Firm's Expertise and Experience in Similar Matters"
  );
  const [selectReasonOther, setSelectReasonOther] = useState("");
  const [teamRequestText, setTeamRequestText] = useState("");

  const postSelect = async (requestId, offerId, extra = {}) => {
    const res = await fetch("/api/me/requests/awaiting/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, offerId, ...extra }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok)
      throw new Error(data?.error || "Failed to select winning offer.");
    return data;
  };

  const handleSelect = async (requestId, offerId, extra = {}) => {
    try {
      await postSelect(requestId, offerId, extra);
      // refresh after success
      window.location.reload();
    } catch (e) {
      alert(e.message || "Failed to select winning offer.");
    }
  };

  const confirmAndSelect = (row, offer) => {
    setModalRow(row);
    setModalOffer(offer);
    // reset fields each time
    setSelectReasonChoice(
      "Law Firm's Expertise and Experience in Similar Matters"
    );
    setSelectReasonOther("");
    setTeamRequestText("");
    setModalOpen(true);
  };

  const handleModalCancel = () => {
    setModalOpen(false);
    setModalRow(null);
    setModalOffer(null);
    setSelectReasonOther("");
    setTeamRequestText("");
  };

  const handleModalConfirm = async () => {
    if (!modalRow || !modalOffer) return;

    // Determine what goes into details.selectReason
    let selectReasonValue = null;
    if (selectReasonChoice === "Other") {
      const trimmed = selectReasonOther.trim();
      if (trimmed) {
        selectReasonValue = trimmed;
      }
    } else if (selectReasonChoice) {
      selectReasonValue = selectReasonChoice;
    }

    const teamRequestValue = teamRequestText.trim() || null;

    const extra = {
      // Only send if there is something meaningful to store
      ...(selectReasonValue ? { selectReason: selectReasonValue } : {}),
      ...(teamRequestValue ? { teamRequest: teamRequestValue } : {}),
    };

    try {
      if (onSelect) {
        await onSelect(modalRow.requestId, modalOffer.offerId, extra);
      } else {
        await handleSelect(modalRow.requestId, modalOffer.offerId, extra);
      }
    } finally {
      setModalOpen(false);
      setModalRow(null);
      setModalOffer(null);
      setSelectReasonOther("");
      setTeamRequestText("");
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
              <th className="border p-2 text-center">5 Best Offers</th>
              <th className="border p-2 text-center">
                Time until Automatic Rejection of All Offers{" "}
                <NarrowTooltip tooltipText="If you need additional time to decide, click the 'I need more time' button to extend your offer selection deadline by 7 days (168 hours). This extension can only be used once." />
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
                  <td className="border p-2 text-center">{r.requestTitle}</td>

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
                      <div className="mb-2 text-sm text-black">
                        Thank you for selecting your legal service provider.
                        LEXIFY will next verify with your selected provider
                        whether a conflict exists that would prevent the
                        provider from performing the assignment. If no conflict
                        is found, LEXIFY will send the LEXIFY Contract for the
                        assignment to you and your selected provider without
                        delay. If a conflict is identified, you will be notified
                        accordingly and requested to select an alternative
                        service provider from the received offers.
                      </div>
                    )}

                    {(() => {
                      // During conflict check: only show the selected offer (if we know its id)
                      const offers =
                        r.requestState === "CONFLICT_CHECK" && r.selectedOfferId
                          ? (r.topOffers || []).filter(
                              (o) =>
                                String(o.offerId) === String(r.selectedOfferId)
                            )
                          : r.topOffers || [];

                      if (!Array.isArray(offers) || offers.length === 0)
                        return "—";

                      return (
                        <ul className="space-y-2">
                          {offers.map((o) => (
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
                                      className="text-blue-600 hover:underline cursor-pointer"
                                    >
                                      {o.providerCompanyName}
                                    </a>
                                  ) : (
                                    <span>{o.providerCompanyName}</span>
                                  )}{" "}
                                  / Lead: {o.offerLawyer}, LEXIFY rating:{" "}
                                  {!o.providerHasRatings
                                    ? "No Ratings Yet"
                                    : `${o.providerTotalRating ?? "—"}/5`}
                                  )
                                  {Array.isArray(o.providerReferenceFiles) &&
                                    o.providerReferenceFiles.length > 0 && (
                                      <div className="mt-1">
                                        <span>, Written Reference(s): </span>
                                        {o.providerReferenceFiles.map(
                                          (file, idx) => {
                                            const name =
                                              file?.name ||
                                              `Reference ${idx + 1}`;
                                            const url = file?.url;

                                            if (!url)
                                              return (
                                                <span key={idx}>{name}</span>
                                              );

                                            return (
                                              <span key={url || idx}>
                                                {idx > 0 && ", "}
                                                <a
                                                  href={url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-blue-600 hover:underline cursor-pointer"
                                                >
                                                  {name}
                                                </a>
                                              </span>
                                            );
                                          }
                                        )}
                                      </div>
                                    )}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      );
                    })()}
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
                              ? "bg-[#11999e] hover:opacity-90 cursor-pointer"
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
      {modalOpen && modalRow && modalOffer && (
        <div className="fixed inset-0 bg-[#11999e] bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white text-black rounded shadow-lg w-full max-w-xl p-6">
            {/* Existing info from the old confirm window */}
            <h3 className="text-xl font-semibold mb-4">
              Please Confirm Your Selected Winning Offer
            </h3>

            <div className="mb-3 text-sm">
              <p>
                <strong>LEXIFY Request Title:</strong> {modalRow.requestTitle}
              </p>
              <p className="mt-1">
                <strong>Selected Offer:</strong>{" "}
                {fmtMoney(modalOffer.offeredPrice, modalRow.currency)} (
                {modalOffer.providerCompanyWebsite ? (
                  <a
                    href={modalOffer.providerCompanyWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {modalOffer.providerCompanyName}
                  </a>
                ) : (
                  <span>{modalOffer.providerCompanyName}</span>
                )}{" "}
                / Lead: {modalOffer.offerLawyer}, LEXIFY rating:{" "}
                {!modalOffer.providerHasRatings
                  ? "No Ratings Yet"
                  : `${modalOffer.providerTotalRating ?? "—"}/5`}
                )
              </p>
            </div>

            {/* Dropdown with tooltip */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Help us improve by sharing your primary reason for selecting
                this offer{" "}
                <NarrowTooltip tooltipText="This primary reason for the winner selection will be shared with non-winning bidders to enable them to improve their proposals in the future. If you select “I'd rather not say,” this information will not be shared with non-winning bidders." />
              </label>
              <select
                className="mt-1 block w-full border rounded p-2"
                value={selectReasonChoice}
                onChange={(e) => setSelectReasonChoice(e.target.value)}
              >
                <option value="Law Firm's Expertise and Experience in Similar Matters">
                  Law Firm&apos;s Expertise and Experience in Similar Matters
                </option>
                <option value="Law Firm's LEXIFY Rating">
                  Law Firm&apos;s LEXIFY Rating
                </option>
                <option value="Specific Lawyer(s) at Law Firm">
                  Specific Lawyer(s) at Law Firm
                </option>
                <option value="Offered Price">Offered Price</option>
                <option value="Other">Other</option>
                <option value="I'd rather not say">
                  I&apos;d rather not say
                </option>
              </select>

              {selectReasonChoice === "Other" && (
                <textarea
                  className="mt-2 block w-full border rounded p-2 min-h-[60px]"
                  value={selectReasonOther}
                  onChange={(e) => setSelectReasonOther(e.target.value)}
                  placeholder="Insert primary reason for selecting this offer"
                />
              )}
            </div>

            {/* Team request textarea with tooltip */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Request Specific Team Members (Optional){" "}
                <NarrowTooltip tooltipText="If you would like specific lawyer(s) from the winning firm to be included in the project team, please specify their name(s) below. The firm will see your request as soon as you confirm your selection." />
              </label>
              <textarea
                className="mt-1 block w-full border rounded p-2 min-h-[80px]"
                value={teamRequestText}
                onChange={(e) => setTeamRequestText(e.target.value)}
                placeholder="Insert name(s) of preferred project team member(s). If you have no particular preference, leave this field blank."
              />
            </div>

            <p className="text-sm mb-4">
              By clicking &quot;Confirm Selection&quot; below, I accept that
              LEXIFY will automatically generate a binding LEXIFY Contract
              between my company, as the legal service purchaser, and the legal
              service provider submitting the winning offer, subject to the
              parameters defined in my LEXIFY Request. The LEXIFY Contract will
              consist of (i) the service description, other specifications, and
              any procurement appendices (if applicable) designated in my LEXIFY
              Request, and (ii) the General Terms and Conditions for LEXIFY
              Contracts.
            </p>

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={handleModalCancel}
                className="px-4 py-2 rounded border border-gray-400 text-gray-700 cursor-pointer"
              >
                Cancel Selection
              </button>
              <button
                onClick={handleModalConfirm}
                className="px-4 py-2 rounded bg-[#11999e] text-white cursor-pointer"
              >
                Confirm Selection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
