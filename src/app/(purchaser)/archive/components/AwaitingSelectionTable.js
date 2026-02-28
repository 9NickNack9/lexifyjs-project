"use client";

import { useEffect, useMemo, useState } from "react";
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
    "Law Firm's Expertise and Experience in Similar Matters",
  );
  const [selectReasonOther, setSelectReasonOther] = useState("");
  const [teamRequestText, setTeamRequestText] = useState("");
  const [ratingPopupOpen, setRatingPopupOpen] = useState(false);
  const [popupOffer, setPopupOffer] = useState(null);
  const [popupShowTotalBreakdown, setPopupShowTotalBreakdown] = useState(false);
  const [popupExpandedCategories, setPopupExpandedCategories] = useState({});

  const [fullOfferPopupOpen, setFullOfferPopupOpen] = useState(false);
  const [fullOfferPopupData, setFullOfferPopupData] = useState(null);

  const safeRows = useMemo(() => rows || [], [rows]);

  const PAGE_SIZE = 5;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [safeRows.length]);

  const visibleRows = safeRows.slice(0, visibleCount);
  const canLoadMore = visibleCount < safeRows.length;

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
      "Law Firm's Expertise and Experience in Similar Matters",
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
        "Add 24 hours to the decision deadline? This can only be done once.",
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

  function mapRequestToCategory(requestCategory, requestSubcategory) {
    const sub = (requestSubcategory || "").trim();
    const cat = (requestCategory || "").trim();

    if (sub === "Real Estate and Construction" || sub === "ICT and IT")
      return sub;

    if (cat === "Help with Contracts") return "Contracts";
    if (cat === "Day-to-day Legal Advice") return "Day-to-day Legal Advice";
    if (cat === "Help with Employment related Documents") return "Employment";
    if (cat === "Help with Dispute Resolution or Debt Collection")
      return "Dispute Resolution";
    if (cat === "Help with Mergers & Acquisitions") return "M&A";
    if (cat === "Help with Corporate Governance") return "Corporate Advisory";
    if (cat === "Help with Personal Data Protection") return "Data Protection";
    if (
      cat ===
      "Help with KYC (Know Your Customer) or Compliance related Questionnaire"
    )
      return "Compliance";
    if (cat === "Legal Training for Management and/or Personnel")
      return "Legal Training";

    return sub || cat || "Other";
  }

  const normalizePracticalRatings = (providerPracticalRatings) => {
    const pr = providerPracticalRatings;
    const map = {};

    if (Array.isArray(pr)) {
      for (const item of pr) {
        const key = (
          item?.category ||
          item?.categoryLabel ||
          item?.name ||
          ""
        ).trim();
        if (key) map[key] = item;
      }
      return map;
    }

    if (pr && typeof pr === "object") {
      for (const [key, val] of Object.entries(pr)) {
        if (key) map[key] = val;
      }
    }

    return map;
  };

  const getCategoryTotal = (entry) =>
    entry?.total ?? entry?.providerTotalRating ?? entry?.totalRating ?? null;

  function AggregateRow({ label, value, tooltipText }) {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-sm">{label}</span>
          {tooltipText && <NarrowTooltip tooltipText={tooltipText} />}
        </div>
        <span className="font-semibold">
          {!isNaN(Number(value)) ? Number(value).toFixed(2) : "0.00"} / 5
        </span>
      </div>
    );
  }

  const PRACTICAL_CATEGORIES = [
    "Contracts",
    "Day-to-day Legal Advice",
    "Employment",
    "Dispute Resolution",
    "M&A",
    "Corporate Advisory",
    "Data Protection",
    "Compliance",
    "Legal Training",
    "Real Estate and Construction",
    "ICT and IT",
    "Other",
  ];

  const categoryHasRatings = (entry) => {
    if (!entry) return false;
    const count = Number(entry.ratingCount ?? entry.count ?? 0);
    if (count > 0) return true;
    return (
      entry.total != null ||
      entry.providerTotalRating != null ||
      entry.totalRating != null
    );
  };

  const getCategoryNumbers = (entry) => {
    const total =
      entry?.total ?? entry?.providerTotalRating ?? entry?.totalRating ?? null;
    const quality = entry?.quality ?? entry?.providerQualityRating ?? null;

    // NOTE: ratings page uses responsiveness when present
    const responsiveness =
      entry?.responsiveness ??
      entry?.communication ??
      entry?.providerCommunicationRating ??
      null;

    const billing = entry?.billing ?? entry?.providerBillingRating ?? null;

    return { total, quality, responsiveness, billing };
  };

  return (
    <div className="w-full mb-8">
      <h2 className="text-2xl font-semibold mb-4">
        Awaiting Winning Offer Selection
      </h2>

      {safeRows.length === 0 ? (
        <div className="p-4 bg-white rounded border text-black">N/A</div>
      ) : (
        <>
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
                <th className="border p-2 text-center">
                  5 Best Offers{" "}
                  <NarrowTooltip tooltipText="You can click a legal service provider's company name to access their website." />
                </th>
                <th className="border p-2 text-center">
                  Time until Automatic Rejection of All Offers{" "}
                  <NarrowTooltip tooltipText="If you need additional time to decide, click the 'I need more time' button to extend your offer selection deadline by 7 days (168 hours). This extension can only be used once." />
                </th>
                <th className="border p-2 text-center">
                  Cancel LEXIFY Request
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => {
                const timeLeft =
                  r.requestState === "CONFLICT_CHECK"
                    ? r.pausedRemainingMs != null
                      ? `Paused (${formatTimeUntil(
                          Date.now() + r.pausedRemainingMs,
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
                          provider from performing the assignment. If no
                          conflict is found, LEXIFY will send the LEXIFY
                          Contract for the assignment to you and your selected
                          provider without delay. If a conflict is identified,
                          you will be notified accordingly and requested to
                          select an alternative service provider from the
                          received offers.
                        </div>
                      )}

                      {(() => {
                        // During conflict check: only show the selected offer (if we know its id)
                        const offers =
                          r.requestState === "CONFLICT_CHECK" &&
                          r.selectedOfferId
                            ? (r.topOffers || []).filter(
                                (o) =>
                                  String(o.offerId) ===
                                  String(r.selectedOfferId),
                              )
                            : r.topOffers || [];

                        if (!Array.isArray(offers) || offers.length === 0)
                          return "—";

                        return (
                          <ul className="space-y-2">
                            {offers.map((o) => (
                              <li key={o.offerId} className="text-sm">
                                <div className="flex items-center gap-2">
                                  {/* Select button */}
                                  <button
                                    className={`px-3 py-1 rounded cursor-pointer ${
                                      r.requestState === "CONFLICT_CHECK"
                                        ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                                        : "bg-[#11999e] text-white"
                                    }`}
                                    disabled={
                                      r.requestState === "CONFLICT_CHECK"
                                    }
                                    onClick={() => confirmAndSelect(r, o)}
                                  >
                                    Select
                                  </button>

                                  {/* Summary line: price + company + rating */}
                                  <div className="flex-1">
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                      <span className="text-md">
                                        {fmtMoney(o.offeredPrice, r.currency)}
                                      </span>

                                      <span>(</span>
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
                                      )}

                                      <span>/</span>

                                      {/* Category rating (NON-clickable) */}
                                      {(() => {
                                        const categoryKey =
                                          mapRequestToCategory(
                                            r.requestCategory,
                                            r.requestSubcategory,
                                          );

                                        const practicalMap =
                                          normalizePracticalRatings(
                                            o.providerPracticalRatings,
                                          );
                                        const categoryEntry =
                                          practicalMap?.[categoryKey];
                                        const categoryTotal =
                                          getCategoryTotal(categoryEntry);

                                        const ratingText =
                                          categoryTotal == null
                                            ? "No Ratings Yet"
                                            : `${Number(categoryTotal).toFixed(2)} / 5`;

                                        return (
                                          <span>
                                            LEXIFY Rating: {ratingText}
                                          </span>
                                        );
                                      })()}

                                      <span>)</span>

                                      {/* Full offer details button */}
                                      <button
                                        type="button"
                                        className="ml-2 px-3 py-1 rounded bg-[#11999e] text-white cursor-pointer"
                                        onClick={() => {
                                          const categoryKey =
                                            mapRequestToCategory(
                                              r.requestCategory,
                                              r.requestSubcategory,
                                            );
                                          setFullOfferPopupData({
                                            offer: o,
                                            request: r,
                                            categoryKey,
                                          });
                                          setFullOfferPopupOpen(true);

                                          // Reset expanders (reuse the same expander state you already have for rating UI)
                                          setPopupShowTotalBreakdown(false);
                                          setPopupExpandedCategories({});
                                        }}
                                      >
                                        Show full offer details
                                      </button>
                                    </div>
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
                                ? "bg-[#11999e] cursor-pointer"
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
          {canLoadMore && (
            <div className="mt-4 flex justify-center">
              <button
                className="bg-[#11999e] text-white px-4 py-2 rounded cursor-pointer"
                onClick={() =>
                  setVisibleCount((n) =>
                    Math.min(n + PAGE_SIZE, safeRows.length),
                  )
                }
              >
                Load more
              </button>
            </div>
          )}
        </>
      )}
      {modalOpen && modalRow && modalOffer && (
        <div className="fixed inset-0 bg-[#11999e] bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white text-black rounded shadow-lg w-full max-w-xl p-6">
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
                {(() => {
                  const categoryKey = mapRequestToCategory(
                    modalRow.requestCategory,
                    modalRow.requestSubcategory,
                  );

                  const practicalMap = normalizePracticalRatings(
                    modalOffer.providerPracticalRatings,
                  );
                  const entry = practicalMap?.[categoryKey];
                  const categoryTotal = getCategoryTotal(entry);

                  if (categoryTotal == null) return "No Ratings Yet";
                  return `${Number(categoryTotal).toFixed(2)} / 5`;
                })()}
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

      {ratingPopupOpen && popupOffer && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white text-black rounded-lg shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-y-auto p-6 relative">
            <button
              type="button"
              className="absolute top-4 right-4 text-white bg-[#3a3a3c] rounded-full w-8 h-8 flex items-center justify-center text-xl hover:bg-red-600 transition cursor-pointer"
              onClick={() => setRatingPopupOpen(false)}
            >
              x
            </button>

            <div className="text-xl font-semibold mb-1">
              {popupOffer.offer.providerCompanyName}
            </div>

            <div className="text-sm text-gray-700 mb-4">
              {popupOffer.offer.providerRatingCount} rating
              {popupOffer.offer.providerRatingCount === 1 ? "" : "s"} received
            </div>

            {(() => {
              const offer = popupOffer?.offer;
              if (!offer) return null;

              // These depend on your awaiting route changes:
              // - offer.providerPracticalRatings must be included
              // - offer.providerRatingCount must be included
              // - offer.providerTotalRating must be included
              const practicalMap = normalizePracticalRatings(
                offer.providerPracticalRatings,
              );

              const categoriesToShow = Array.from(
                new Set([
                  ...PRACTICAL_CATEGORIES,
                  ...Object.keys(practicalMap || {}),
                ]),
              ).filter(Boolean);

              const hasAnyTotalRatings = offer.providerHasRatings === true;

              return (
                <div className="space-y-4">
                  {/* TOTAL (expandable) */}
                  <div className="space-y-2">
                    {hasAnyTotalRatings ? (
                      <>
                        <button
                          type="button"
                          className="w-full -mx-2 px-2 py-1 rounded flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                          onClick={() => setPopupShowTotalBreakdown((v) => !v)}
                          aria-expanded={popupShowTotalBreakdown}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg text-gray-600 select-none">
                              {popupShowTotalBreakdown ? "▾" : "▸"}
                            </span>
                            <span className="text-sm font-semibold">Total</span>
                          </div>
                          <span className="font-semibold">
                            {!isNaN(Number(offer.providerTotalRating))
                              ? Number(offer.providerTotalRating).toFixed(2)
                              : "0.00"}{" "}
                            / 5
                          </span>
                        </button>

                        {popupShowTotalBreakdown && (
                          <div className="mt-1 space-y-1">
                            <AggregateRow
                              label="Total"
                              value={offer.providerTotalRating ?? 0}
                            />
                            <AggregateRow
                              label="Quality of Work"
                              value={offer.providerQualityRating ?? 0}
                              tooltipText="How satisfied were you in general with the quality of the legal advice and documentation provided by the legal service provider?"
                            />
                            <AggregateRow
                              label="Responsiveness & Communication"
                              value={
                                offer.providerResponsivenessRating ??
                                offer.providerCommunicationRating ??
                                0
                              }
                              tooltipText="Did you receive timely responses and communications from the legal service provider? Was the advice you received clear and actionable or ambiguous analysis without clear value-adding guidance?"
                            />
                            <AggregateRow
                              label="Billing Practices"
                              value={offer.providerBillingRating ?? 0}
                              tooltipText="Did the legal service provider send invoices within agreed timeframes and with agreed specifications? In case of hourly rate assignments, did the legal service provider in your opinion invoice a reasonable amount of hours in relation to the legal support that was required?"
                            />
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">Total</span>
                        <span className="font-semibold">No Ratings Yet</span>
                      </div>
                    )}
                  </div>

                  {/* CATEGORY-BASED RATINGS */}
                  <div className="border-t pt-4">
                    <div className="text-sm font-semibold mb-2">
                      Category-based ratings
                    </div>

                    {categoriesToShow.length === 0 ? (
                      <div className="text-sm text-gray-600">
                        No category ratings available yet.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {categoriesToShow.map((categoryKey) => {
                          const entry = practicalMap?.[categoryKey];
                          const expanded =
                            popupExpandedCategories?.[categoryKey] ?? false;
                          const hasRatings = categoryHasRatings(entry);

                          if (!hasRatings) {
                            return (
                              <div
                                key={categoryKey}
                                className="flex items-center justify-between"
                              >
                                <span className="text-sm">{categoryKey}</span>
                                <span className="font-semibold">
                                  No Ratings Yet
                                </span>
                              </div>
                            );
                          }

                          const { total, quality, responsiveness, billing } =
                            getCategoryNumbers(entry);

                          return (
                            <div key={categoryKey}>
                              <button
                                type="button"
                                onClick={() =>
                                  setPopupExpandedCategories((prev) => ({
                                    ...prev,
                                    [categoryKey]: !(
                                      prev?.[categoryKey] ?? false
                                    ),
                                  }))
                                }
                                className="w-full -mx-2 px-2 py-1 rounded flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                                aria-expanded={expanded}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-lg text-gray-600 select-none">
                                    {expanded ? "▾" : "▸"}
                                  </span>
                                  <span className="text-sm font-semibold">
                                    {categoryKey}
                                  </span>
                                </div>
                                <span className="font-semibold">
                                  {!isNaN(Number(total))
                                    ? Number(total).toFixed(2)
                                    : "0.00"}{" "}
                                  / 5
                                </span>
                              </button>

                              {expanded && (
                                <div className="mt-1 space-y-1">
                                  <AggregateRow
                                    label="Total"
                                    value={total ?? 0}
                                  />
                                  <AggregateRow
                                    label="Quality of Work"
                                    value={quality ?? 0}
                                    tooltipText="How satisfied were you in general with the quality of the legal advice and documentation provided by the legal service provider?"
                                  />
                                  <AggregateRow
                                    label="Responsiveness & Communication"
                                    value={responsiveness ?? 0}
                                    tooltipText="Did you receive timely responses and communications from the legal service provider? Was the advice you received clear and actionable or ambiguous analysis without clear value-adding guidance?"
                                  />
                                  <AggregateRow
                                    label="Billing Practices"
                                    value={billing ?? 0}
                                    tooltipText="Did the legal service provider send invoices within agreed timeframes and with agreed specifications? In case of hourly rate assignments, did the legal service provider in your opinion invoice a reasonable amount of hours in relation to the legal support that was required?"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {fullOfferPopupOpen && fullOfferPopupData?.offer && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white text-black shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-y-auto p-6 relative">
            <button
              type="button"
              className="absolute top-4 right-4 text-white bg-[#3a3a3c] rounded-full w-8 h-8 flex items-center justify-center text-xl hover:bg-red-600 transition cursor-pointer"
              onClick={() => {
                setFullOfferPopupOpen(false);
                setFullOfferPopupData(null);
              }}
            >
              x
            </button>

            <div className="text-xl font-semibold mb-1">
              {fullOfferPopupData.offer.providerCompanyName}
              &apos;s Offer
            </div>

            {/* Prices */}
            <div className="space-y-2 mb-4 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">LEXIFY Request</span>
                <span className="text-sm">
                  {fullOfferPopupData.request.requestTitle}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">
                  Legal Service Provider
                </span>
                <span className="text-sm">
                  {fullOfferPopupData.offer.providerCompanyName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">
                  {fullOfferPopupData.offer.offerExpectedPrice != null ? (
                    <>
                      Offered Capped Price{" "}
                      <NarrowTooltip tooltipText="Capped price refers to your offered maximum price for the work, taking into account all possible unexpected developments in the dispute proceedings such as an unusually high number of rounds of written pleadings." />
                    </>
                  ) : (
                    "Offered Price"
                  )}
                </span>
                <span className="text-sm">
                  {fmtMoney(
                    fullOfferPopupData.offer.offeredPrice,
                    fullOfferPopupData.request.currency,
                  )}
                </span>
              </div>

              {fullOfferPopupData.offer.offerExpectedPrice != null && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    Offer Expected Price{" "}
                    <NarrowTooltip tooltipText="Expected price refers to your expected price for the work if the dispute proceedings do not involve any unexpected developments (such as an unusually high number of rounds of written pleadings)." />
                  </span>
                  <span className="text-sm">
                    {fmtMoney(
                      fullOfferPopupData.offer.offerExpectedPrice,
                      fullOfferPopupData.request.currency,
                    )}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">
                  Responsible Partner/Lawyer
                </span>
                <span className="text-sm">
                  {fullOfferPopupData.offer.offerLawyer || "—"}
                </span>
              </div>
            </div>

            {/* Provider additional message */}
            <div className="border-t mt-6 pt-4">
              <div className="text-sm font-semibold mb-2">
                Cover Note from Legal Service Provider
              </div>
              <div className="text-sm text-gray-800 whitespace-pre-wrap">
                {(
                  fullOfferPopupData.offer.providerAdditionalInfo || ""
                ).trim() || "—"}
              </div>
            </div>

            {/* Written references */}
            {Array.isArray(fullOfferPopupData.offer.providerReferenceFiles) &&
              fullOfferPopupData.offer.providerReferenceFiles.length > 0 && (
                <div className="border-t mt-6 pt-4">
                  <div className="text-sm font-semibold mb-2">
                    Written reference(s)
                  </div>

                  <div className="text-sm text-gray-800">
                    {fullOfferPopupData.offer.providerReferenceFiles.map(
                      (file, idx) => {
                        const name = file?.name || `Reference ${idx + 1}`;
                        const url = file?.url;

                        if (!url) {
                          return (
                            <span key={idx}>
                              {idx > 0 && ", "}
                              {name}
                            </span>
                          );
                        }

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
                      },
                    )}
                  </div>
                </div>
              )}

            {/* Rating breakdown (same structure as your existing rating popup) */}
            {(() => {
              const offer = fullOfferPopupData.offer;

              const practicalMap = normalizePracticalRatings(
                offer.providerPracticalRatings,
              );

              const categoriesToShow = Array.from(
                new Set([
                  ...PRACTICAL_CATEGORIES,
                  ...Object.keys(practicalMap || {}),
                ]),
              ).filter(Boolean);

              const hasAnyTotalRatings = offer.providerHasRatings === true;

              return (
                <div className="space-y-4 border-t pt-4 mt-6">
                  {/* TOTAL (expandable) */}
                  <div className="space-y-2">
                    {hasAnyTotalRatings ? (
                      <>
                        <span className="text-md font-semibold">
                          {fullOfferPopupData.offer.providerCompanyName}
                          &apos;s LEXIFY Rating
                        </span>
                        <div className="text-sm text-gray-700 mb-4">
                          {fullOfferPopupData.offer.providerRatingCount} rating
                          {fullOfferPopupData.offer.providerRatingCount === 1
                            ? ""
                            : "s"}{" "}
                          received
                        </div>
                        <button
                          type="button"
                          className="w-full -mx-2 px-2 py-1 rounded flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                          onClick={() => setPopupShowTotalBreakdown((v) => !v)}
                          aria-expanded={popupShowTotalBreakdown}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg text-gray-600 select-none">
                              {popupShowTotalBreakdown ? "▾" : "▸"}
                            </span>
                            <span className="text-sm font-semibold">
                              Overall Rating
                            </span>
                          </div>
                          <span className="font-semibold">
                            {!isNaN(Number(offer.providerTotalRating))
                              ? Number(offer.providerTotalRating).toFixed(2)
                              : "0.00"}{" "}
                            / 5
                          </span>
                        </button>

                        {popupShowTotalBreakdown && (
                          <div className="mt-1 space-y-1">
                            <AggregateRow
                              label="Overall Rating"
                              value={offer.providerTotalRating ?? 0}
                            />
                            <AggregateRow
                              label="Quality of Work"
                              value={offer.providerQualityRating ?? 0}
                              tooltipText="How satisfied were you in general with the quality of the legal advice and documentation provided by the legal service provider?"
                            />
                            <AggregateRow
                              label="Responsiveness & Communication"
                              value={offer.providerCommunicationRating ?? 0}
                              tooltipText="Did you receive timely responses and communications from the legal service provider? Was the advice you received clear and actionable or ambiguous analysis without clear value-adding guidance?"
                            />
                            <AggregateRow
                              label="Billing Practices"
                              value={offer.providerBillingRating ?? 0}
                              tooltipText="Did the legal service provider send invoices within agreed timeframes and with agreed specifications? In case of hourly rate assignments, did the legal service provider in your opinion invoice a reasonable amount of hours in relation to the legal support that was required?"
                            />
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">
                          Overall rating
                        </span>
                        <span className="font-semibold">No Ratings Yet</span>
                      </div>
                    )}
                  </div>

                  {/* CATEGORY-BASED RATINGS */}
                  <div className="border-t pt-4">
                    <div className="text-sm font-semibold mb-2">
                      Ratings by Area of Expertise
                    </div>

                    {categoriesToShow.length === 0 ? (
                      <div className="text-sm text-gray-600">
                        No category ratings available yet.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {categoriesToShow.map((categoryKey) => {
                          const entry = practicalMap?.[categoryKey];
                          const expanded =
                            popupExpandedCategories?.[categoryKey] ?? false;
                          const hasRatings = categoryHasRatings(entry);

                          if (!hasRatings) {
                            return (
                              <div
                                key={categoryKey}
                                className="flex items-center justify-between"
                              >
                                <span className="text-sm">{categoryKey}</span>
                                <span className="font-semibold">
                                  No Ratings Yet
                                </span>
                              </div>
                            );
                          }

                          const { total, quality, responsiveness, billing } =
                            getCategoryNumbers(entry);

                          return (
                            <div key={categoryKey}>
                              <button
                                type="button"
                                onClick={() =>
                                  setPopupExpandedCategories((prev) => ({
                                    ...prev,
                                    [categoryKey]: !(
                                      prev?.[categoryKey] ?? false
                                    ),
                                  }))
                                }
                                className="w-full -mx-2 px-2 py-1 rounded flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                                aria-expanded={expanded}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-lg text-gray-600 select-none">
                                    {expanded ? "▾" : "▸"}
                                  </span>
                                  <span className="text-sm font-semibold">
                                    {categoryKey}
                                  </span>
                                </div>
                                <span className="font-semibold">
                                  {!isNaN(Number(total))
                                    ? Number(total).toFixed(2)
                                    : "0.00"}{" "}
                                  / 5
                                </span>
                              </button>

                              {expanded && (
                                <div className="mt-1 space-y-1">
                                  <AggregateRow
                                    label="Overall Rating"
                                    value={total ?? 0}
                                  />
                                  <AggregateRow
                                    label="Quality of Work"
                                    value={quality ?? 0}
                                    tooltipText="How satisfied were you in general with the quality of the legal advice and documentation provided by the legal service provider?"
                                  />
                                  <AggregateRow
                                    label="Responsiveness & Communication"
                                    value={responsiveness ?? 0}
                                    tooltipText="Did you receive timely responses and communications from the legal service provider? Was the advice you received clear and actionable or ambiguous analysis without clear value-adding guidance?"
                                  />
                                  <AggregateRow
                                    label="Billing Practices"
                                    value={billing ?? 0}
                                    tooltipText="Did the legal service provider send invoices within agreed timeframes and with agreed specifications? In case of hourly rate assignments, did the legal service provider in your opinion invoice a reasonable amount of hours in relation to the legal support that was required?"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
