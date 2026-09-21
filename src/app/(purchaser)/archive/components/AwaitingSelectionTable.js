"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, Star, X } from "lucide-react";
import { fmtMoney, formatTimeUntil, isHourlyRate } from "../utils/format";
import NarrowTooltip from "../../../components/NarrowTooltip";
import {
  btnDisabled,
  btnGhost,
  btnOutline,
  btnOutlineDanger,
  btnPrimary,
  emptyCard,
  table,
  tableCard,
  tableScroll,
  td,
  tdTop,
  th,
  theadRow,
  tr,
} from "./tableUi";

function formatDateDDMMYYYY(isoish) {
  const d = new Date(isoish);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function formatScore(value, digits = 1) {
  const n = Number(value);
  if (Number.isNaN(n)) return (0).toFixed(digits);
  const rounded = Math.round(Math.max(0, Math.min(5, n)) * 2) / 2;
  return rounded.toFixed(digits);
}

function getRowOffers(row) {
  const list = row?.offers || row?.topOffers || [];
  return Array.isArray(list) ? list : [];
}

function getOfferWebsite(offer) {
  return offer?.providerWebsite || offer?.providerCompanyWebsite || "";
}

function formatOfferedPrice(offer, request) {
  const price = fmtMoney(offer?.offeredPrice, request?.currency);
  return `${price}${isHourlyRate(request?.paymentRate) ? "/h" : ""}`;
}

function RatingWithStar({ value }) {
  if (value == null || Number.isNaN(Number(value))) {
    return <span>No Ratings Yet</span>;
  }

  return (
    <span className="inline-flex items-center gap-0.5 whitespace-nowrap">
      {formatScore(value)}
      <Star
        className="h-3.5 w-3.5 fill-[#11999e] text-[#11999e]"
        aria-hidden="true"
      />
    </span>
  );
}

function ProviderNameLink({ name, website, className = "" }) {
  const label = name || "—";

  if (website) {
    return (
      <a
        href={website}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex max-w-full items-center gap-1.5 font-semibold text-[#11999e] underline decoration-[#11999e]/40 underline-offset-2 transition-colors hover:text-[#0e8488] hover:decoration-[#0e8488] ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="truncate">{label}</span>
        <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="sr-only">(opens website)</span>
      </a>
    );
  }

  return (
    <span className={`font-semibold text-gray-900 ${className}`}>{label}</span>
  );
}

function TotalRatingButton({ score, expanded, onToggle, ariaLabel }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-right transition-colors ${
        expanded ? "bg-[#11999e]/10" : "hover:bg-[#11999e]/10"
      }`}
      aria-expanded={expanded}
      aria-label={ariaLabel}
    >
      <span className="flex items-center justify-end gap-1">
        <span className="text-2xl font-semibold text-[#11999e]">
          {formatScore(score)} / 5
        </span>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-[#11999e]" aria-hidden="true" />
        ) : (
          <ChevronRight className="h-4 w-4 text-[#11999e]" aria-hidden="true" />
        )}
      </span>
      <span className="block text-xs font-medium text-[#11999e]">
        {expanded ? "Hide rating breakdown" : "View rating breakdown"}
      </span>
    </button>
  );
}

export default function AwaitingSelectionTable({
  rows,
  onPreview,
  onCancel,
  onSelect, // optional custom handler
  refreshAllRequests,
  hideHeading = false,
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
  const [offersPopupRow, setOffersPopupRow] = useState(null);
  const [expandedOfferIds, setExpandedOfferIds] = useState({});
  const [offerShowTotalBreakdown, setOfferShowTotalBreakdown] = useState({});
  const [offerExpandedCategories, setOfferExpandedCategories] = useState({});

  const safeRows = useMemo(() => rows || [], [rows]);

  const PAGE_SIZE = 5;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState({});

  const [companyUsers, setCompanyUsers] = useState([]);
  const [shareRequestId, setShareRequestId] = useState(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [shareOwnerUserId, setShareOwnerUserId] = useState(null);

  useEffect(() => {
    if (!isShareOpen) return;

    const fetchUsers = async () => {
      setIsLoadingUsers(true);

      try {
        const res = await fetch("/api/me/company/users");
        const data = await res.json();

        if (data?.users) {
          setCompanyUsers(data.users);
          setCompanyName(data.companyName || "");
        } else {
          setCompanyUsers([]);
        }
      } catch (err) {
        console.error("Failed to fetch users:", err);
        setCompanyUsers([]);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [isShareOpen]);

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
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-gray-700">{label}</span>
          {tooltipText && <NarrowTooltip tooltipText={tooltipText} />}
        </div>
        <span className="text-sm font-semibold text-gray-900">
          {formatScore(value)} / 5
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
    "Banking & Finance",
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

  const getEntryCount = (entry) =>
    Number(entry?.ratingCount ?? entry?.count ?? 0);

  const handleCancelRequest = async (row) => {
    if (!row?.requestId) return;

    const confirmed = window.confirm(
      `Are you sure you want to cancel "${row.requestTitle}"? This will permanently delete the request and notify all providers who submitted an offer.`,
    );
    if (!confirmed) return;

    try {
      if (onCancel) {
        await onCancel(row.requestId, row);
        return;
      }

      const res = await fetch("/api/me/requests/awaiting", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: row.requestId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to cancel request.");
      }

      window.location.reload();
    } catch (e) {
      alert(e.message || "Failed to cancel request.");
    }
  };

  const openShareModal = () => {
    setIsShareOpen(true);
  };

  const closeShareModal = () => {
    setIsShareOpen(false);
  };

  const toggleUser = (userId) => {
    if (isOriginalOwnerInShareModal(userId)) return;

    setSelectedUsers((prev) => {
      const updated = { ...prev };

      if (updated[userId]) {
        delete updated[userId];
      } else {
        updated[userId] = "viewer";
      }

      return updated;
    });
  };

  const updatePermission = (userId, permission) => {
    if (isOriginalOwnerInShareModal(userId)) return;

    setSelectedUsers((prev) => ({
      ...prev,
      [userId]: permission,
    }));
  };

  const handleShare = async () => {
    const selected = Object.entries(selectedUsers)
      .filter(([userPkId, permission]) => {
        if (permission === "owner") return false;
        if (isOriginalOwnerInShareModal(userPkId)) return false;
        return true;
      })
      .map(([userPkId, permission]) => {
        const user = companyUsers.find((u) => u.userPkId === Number(userPkId));

        return {
          userPkId: Number(userPkId),
          fullName: user?.fullName || "",
          permission,
        };
      });

    await fetch("/api/me/requests/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: shareRequestId,
        sharedUsers: selected,
      }),
    });

    await refreshAllRequests();
    setIsShareOpen(false);
  };

  const isViewer = (r) => r.permission === "viewer";

  const getOriginalOwnerUserId = (r) => {
    const rawOwnerId =
      r.createdByUserId ??
      r.createdByUser?.userPkId ??
      r.createdBy?.userPkId ??
      r.clientUserId ??
      r.clientId ??
      r.details?.createdByUserId ??
      r.details?.ownerUserId ??
      null;

    return rawOwnerId != null ? Number(rawOwnerId) : null;
  };

  const openShareForRequest = (r) => {
    const ownerUserId = getOriginalOwnerUserId(r);

    setShareRequestId(r.requestId);
    setShareOwnerUserId(ownerUserId);

    const existingShared = r.details?.sharedAccounts || [];
    const prefilled = {};

    for (const u of existingShared) {
      prefilled[Number(u.userPkId)] = u.permission || "viewer";
    }

    // When a co-owner opens the share window, show the original owner as
    // permanently selected. Do not save this as a shared account later.
    if (ownerUserId != null) {
      prefilled[ownerUserId] = "owner";
    }

    setSelectedUsers(prefilled);
    setIsShareOpen(true);
  };

  const isOriginalOwnerInShareModal = (userId) =>
    shareOwnerUserId != null && Number(userId) === Number(shareOwnerUserId);

  return (
    <div className="w-full">
      {!hideHeading && (
        <h2 className="mb-4 text-2xl font-semibold text-gray-900">
          Awaiting Offer Selection
        </h2>
      )}

      {safeRows.length === 0 ? (
        <div className={emptyCard}>N/A</div>
      ) : (
        <>
          <div className={tableCard}>
            <div className={tableScroll}>
              <table className={table}>
                <thead>
                  <tr className={theadRow}>
                    <th className={th}>Title</th>
                    <th className={th}>Created by</th>
                    <th className={th}>Date Created</th>
                    <th className={th}>Date Expired</th>
                    <th className={th}>
                      Received Offers{" "}
                      <NarrowTooltip tooltipText="You can click a legal service provider's company name to access their website." />
                    </th>
                    <th className={`${th} w-48 max-w-48 whitespace-normal leading-snug`}>
                      Time until Automatic Rejection
                      <br />
                      of All Offers{" "}
                      <NarrowTooltip tooltipText="If you need additional time to decide, click the 'I need more time' button to extend your offer selection deadline by 7 days (168 hours). This extension can only be used once." />
                    </th>
                    <th className={th}>
                      Share LEXIFY Request{" "}
                      <NarrowTooltip tooltipText="You can share a LEXIFY Request with colleagues in your organization. You choose whether each colleague can only view the Request — useful for keeping stakeholders informed — or have full co-owner rights, equivalent to your own. You control their access level and can revoke it anytime." />
                    </th>
                    <th className={th}>Cancel LEXIFY Request</th>
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
                      <tr key={r.requestId} className={tr}>
                        <td className={td}>{r.requestTitle}</td>
                        <td className={td}>{r.primaryContactPerson || "—"}</td>
                        <td className={td}>
                          {formatDateDDMMYYYY(r.dateCreated)}
                        </td>
                        <td className={td}>
                          {formatDateDDMMYYYY(r.dateExpired)}
                        </td>

                        <td className={tdTop}>
                          {r.requestState === "CONFLICT_CHECK" && (
                            <div className="mb-2 text-left text-sm text-black">
                              Thank you for selecting your legal service
                              provider. LEXIFY will next verify with your
                              selected provider whether a conflict exists that
                              would prevent the provider from performing the
                              assignment. If no conflict is found, LEXIFY will
                              send the LEXIFY Contract for the assignment to you
                              and your selected provider without delay. If a
                              conflict is identified, you will be notified
                              accordingly and requested to select an alternative
                              service provider from the received offers.
                            </div>
                          )}

                          {(() => {
                            const offers = getRowOffers(r);
                            if (!offers.length) return "—";

                            const bestOffer = offers.reduce((best, offer) =>
                              offer.offeredPrice < best.offeredPrice
                                ? offer
                                : best,
                            );
                            const bestWebsite = getOfferWebsite(bestOffer);
                            const hasBestRating =
                              bestOffer.providerTotalRating != null &&
                              !Number.isNaN(
                                Number(bestOffer.providerTotalRating),
                              );

                            return (
                              <div className="mx-auto flex w-fit flex-col items-start gap-1 text-left text-sm text-gray-700">
                                <div>{offers.length} offer(s) received</div>
                                <div>
                                  Best Offer: {formatOfferedPrice(bestOffer, r)}
                                </div>
                                <div className="flex max-w-[16rem] items-center gap-1">
                                  {bestWebsite ? (
                                    <a
                                      href={bestWebsite}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="truncate text-[#11999e] hover:underline"
                                    >
                                      {bestOffer.providerCompanyName}
                                    </a>
                                  ) : (
                                    <span className="truncate">
                                      {bestOffer.providerCompanyName}
                                    </span>
                                  )}
                                  <span aria-hidden="true">•</span>
                                  {hasBestRating ? (
                                    <RatingWithStar
                                      value={bestOffer.providerTotalRating}
                                    />
                                  ) : (
                                    <span className="whitespace-nowrap text-gray-500">
                                      No Ratings Yet
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  className={`${btnPrimary} mt-1`}
                                  onClick={() => {
                                    setOffersPopupRow(r);
                                    setExpandedOfferIds({});
                                    setOfferShowTotalBreakdown({});
                                    setOfferExpandedCategories({});
                                  }}
                                >
                                  View Offers
                                </button>
                              </div>
                            );
                          })()}
                        </td>

                        <td
                          className={`${td} w-48 max-w-48`}
                          title={
                            r.acceptDeadline
                              ? new Date(r.acceptDeadline).toString()
                              : ""
                          }
                        >
                          <div className="flex flex-col items-center justify-center gap-2">
                            <span>{timeLeft || "Expired"}</span>
                            {r.requestState === "ON HOLD" && timeLeft && (
                              <button
                                className={btnOutline}
                                disabled={!r.canExtend || isViewer(r)}
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
                        <td className={td}>
                          <div className="flex flex-col items-center gap-1">
                            {(() => {
                              const count =
                                r.details?.sharedAccounts?.length || 0;
                              if (count > 0) {
                                return (
                                  <span className="text-xs text-gray-500">
                                    Shared with {count}{" "}
                                    {count === 1 ? "person" : "people"}
                                  </span>
                                );
                              }
                              return null;
                            })()}

                            <button
                              className={btnOutline}
                              onClick={() => openShareForRequest(r)}
                              disabled={isViewer(r)}
                            >
                              Manage Access
                            </button>
                          </div>
                        </td>
                        <td className={td}>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              disabled={isViewer(r)}
                              className={btnOutlineDanger}
                              onClick={() => handleCancelRequest(r)}
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
            </div>
          </div>
          {canLoadMore && (
            <div className="mt-4 flex justify-center">
              <button
                className={btnGhost}
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
      {offersPopupRow ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !modalOpen) {
              setOffersPopupRow(null);
            }
          }}
        >
          <div className="relative max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white text-black shadow-[0_16px_44px_rgba(17,153,158,0.22)] ring-1 ring-black/10">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Received Offers
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {offersPopupRow.requestTitle}
                </p>
              </div>
              <button
                type="button"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
                onClick={() => setOffersPopupRow(null)}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[calc(85vh-5rem)] space-y-3 overflow-y-auto p-6">
              {getRowOffers(offersPopupRow).length === 0 ? (
                <div className="text-sm text-gray-500">
                  No offers received for this request.
                </div>
              ) : (
                getRowOffers(offersPopupRow).map((offer) => {
                  const expanded = !!expandedOfferIds[offer.offerId];
                  const categoryKey = mapRequestToCategory(
                    offersPopupRow.requestCategory,
                    offersPopupRow.requestSubcategory,
                  );
                  const practicalMap = normalizePracticalRatings(
                    offer.providerPracticalRatings,
                  );
                  const categoryTotal = getCategoryTotal(
                    practicalMap?.[categoryKey],
                  );
                  const canSelect =
                    offersPopupRow.requestState !== "CONFLICT_CHECK" &&
                    !isViewer(offersPopupRow);
                  const showTotalBreakdown =
                    !!offerShowTotalBreakdown[offer.offerId];
                  const categoriesToShow = Array.from(
                    new Set([
                      ...PRACTICAL_CATEGORIES,
                      ...Object.keys(practicalMap || {}),
                    ]),
                  ).filter(Boolean);
                  const hasAnyTotalRatings = offer.providerHasRatings === true;

                  return (
                    <div
                      key={offer.offerId}
                      className="overflow-hidden rounded-xl border border-gray-200"
                    >
                      <div className="flex flex-wrap items-center gap-3 p-4">
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 text-left"
                          onClick={() =>
                            setExpandedOfferIds((prev) => ({
                              ...prev,
                              [offer.offerId]: !prev[offer.offerId],
                            }))
                          }
                          aria-expanded={expanded}
                        >
                          {expanded ? (
                            <ChevronDown className="mt-0.5 h-5 w-5 shrink-0 text-gray-500" />
                          ) : (
                            <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-gray-500" />
                          )}
                          <div className="min-w-0 flex-1">
                            <ProviderNameLink
                              name={offer.providerCompanyName}
                              website={getOfferWebsite(offer)}
                              className="text-base"
                            />
                            <div className="mt-1 flex flex-col gap-0.5 text-sm text-gray-700">
                              <span className="inline-flex items-center gap-1">
                                Overall LEXIFY Rating:{" "}
                                <RatingWithStar
                                  value={offer.providerTotalRating}
                                />
                              </span>
                              <span className="inline-flex items-center gap-1">
                                LEXIFY Rating in {categoryKey}:{" "}
                                <RatingWithStar value={categoryTotal} />
                              </span>
                              <span>
                                Offered Price:{" "}
                                <span className="font-bold">
                                  {formatOfferedPrice(offer, offersPopupRow)}
                                </span>
                              </span>
                            </div>
                          </div>
                        </button>
                        <button
                          type="button"
                          disabled={!canSelect}
                          className={canSelect ? btnPrimary : btnDisabled}
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmAndSelect(offersPopupRow, offer);
                          }}
                        >
                          Select
                        </button>
                      </div>

                      {expanded ? (
                        <div className="space-y-4 border-t border-gray-200 px-4 py-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-sm font-semibold">
                                LEXIFY Request
                              </span>
                              <span className="text-sm">
                                {offersPopupRow.requestTitle}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-sm font-semibold">
                                Legal Service Provider
                              </span>
                              <span className="text-sm">
                                {offer.providerCompanyName}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-sm font-semibold">
                                {offer.offerExpectedPrice != null ? (
                                  <>
                                    Offered Capped Price{" "}
                                    <NarrowTooltip tooltipText="Capped price refers to the maximum price for the work, taking into account all possible unexpected developments in the dispute proceedings such as an unusually high number of rounds of written pleadings." />
                                  </>
                                ) : (
                                  "Offered Price"
                                )}
                              </span>
                              <span className="text-sm font-bold">
                                {formatOfferedPrice(offer, offersPopupRow)}
                              </span>
                            </div>
                            {offer.offerExpectedPrice != null ? (
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-sm font-semibold">
                                  Expected Price{" "}
                                  <NarrowTooltip tooltipText="Expected price refers to the expected price for the work if the dispute proceedings do not involve any unexpected developments (such as an unusually high number of rounds of written pleadings)." />
                                </span>
                                <span className="text-sm">
                                  {fmtMoney(
                                    offer.offerExpectedPrice,
                                    offersPopupRow.currency,
                                  )}
                                </span>
                              </div>
                            ) : null}
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-sm font-semibold">
                                Responsible Partner/Lawyer
                              </span>
                              <span className="text-sm">
                                {offer.offerLawyer || "—"}
                              </span>
                            </div>
                          </div>

                          <div className="border-t border-gray-200 pt-4">
                            <div className="mb-2 text-sm font-semibold">
                              Cover Note from Legal Service Provider
                            </div>
                            <div className="text-sm whitespace-pre-wrap text-gray-800">
                              {(offer.providerAdditionalInfo || "").trim() ||
                                "—"}
                            </div>
                          </div>

                          {Array.isArray(offer.providerReferenceFiles) &&
                          offer.providerReferenceFiles.length > 0 ? (
                            <div className="border-t border-gray-200 pt-4">
                              <div className="mb-2 text-sm font-semibold">
                                Written reference(s)
                              </div>
                              <div className="text-sm text-gray-800">
                                {offer.providerReferenceFiles.map(
                                  (file, idx) => {
                                    const name =
                                      file?.name || `Reference ${idx + 1}`;
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
                                          className="cursor-pointer text-[#11999e] hover:underline"
                                        >
                                          {name}
                                        </a>
                                      </span>
                                    );
                                  },
                                )}
                              </div>
                            </div>
                          ) : null}

                          <div className="rounded-xl border border-gray-200 p-4 sm:p-5">
                            <div className="mb-3 text-sm font-semibold text-gray-900">
                              LEXIFY ratings for
                            </div>
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div className="min-w-0">
                                <ProviderNameLink
                                  name={offer.providerCompanyName}
                                  website={getOfferWebsite(offer)}
                                  className="text-lg"
                                />
                                <p className="mt-0.5 text-sm text-gray-500">
                                  {offer.providerRatingCount || 0} rating
                                  {offer.providerRatingCount === 1
                                    ? ""
                                    : "s"}{" "}
                                  received
                                </p>
                              </div>
                              {hasAnyTotalRatings ? (
                                <TotalRatingButton
                                  score={offer.providerTotalRating}
                                  expanded={showTotalBreakdown}
                                  onToggle={() =>
                                    setOfferShowTotalBreakdown((prev) => ({
                                      ...prev,
                                      [offer.offerId]: !prev[offer.offerId],
                                    }))
                                  }
                                  ariaLabel={`Toggle total rating breakdown for ${offer.providerCompanyName}`}
                                />
                              ) : (
                                <div className="text-right">
                                  <div className="text-sm font-medium text-gray-400">
                                    No Ratings Yet
                                  </div>
                                </div>
                              )}
                            </div>

                            {showTotalBreakdown && hasAnyTotalRatings ? (
                              <>
                                <div className="mt-4 space-y-1 border-t border-gray-200 pt-3">
                                  <div className="mb-2 text-sm text-gray-500">
                                    {offer.providerRatingCount || 0} rating
                                    {offer.providerRatingCount === 1
                                      ? ""
                                      : "s"}{" "}
                                    received
                                  </div>
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

                                <div className="mt-5">
                                  <h4 className="mb-2 text-sm font-semibold text-gray-900">
                                    Category-based ratings
                                  </h4>
                                  {categoriesToShow.length === 0 ? (
                                    <div className="text-sm text-gray-500">
                                      No category ratings available yet.
                                    </div>
                                  ) : (
                                    <div className="divide-y divide-gray-200">
                                      {categoriesToShow.map((catKey) => {
                                        const entry = practicalMap?.[catKey];
                                        const catExpanded =
                                          offerExpandedCategories?.[
                                            offer.offerId
                                          ]?.[catKey] ?? false;
                                        const hasRatings =
                                          categoryHasRatings(entry);

                                        if (!hasRatings) {
                                          return (
                                            <div
                                              key={catKey}
                                              className="flex items-center justify-between py-2.5"
                                            >
                                              <span className="text-sm text-gray-800">
                                                {catKey}
                                              </span>
                                              <span className="text-sm text-gray-400">
                                                No Ratings Yet
                                              </span>
                                            </div>
                                          );
                                        }

                                        const {
                                          total,
                                          quality,
                                          responsiveness,
                                          billing,
                                        } = getCategoryNumbers(entry);
                                        const entryCount = getEntryCount(entry);

                                        return (
                                          <div key={catKey}>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setOfferExpandedCategories(
                                                  (prev) => ({
                                                    ...prev,
                                                    [offer.offerId]: {
                                                      ...(prev[offer.offerId] ||
                                                        {}),
                                                      [catKey]: !(
                                                        prev[offer.offerId]?.[
                                                          catKey
                                                        ] ?? false
                                                      ),
                                                    },
                                                  }),
                                                )
                                              }
                                              className="flex w-full cursor-pointer items-center justify-between py-2.5 text-left hover:bg-gray-50"
                                              aria-expanded={catExpanded}
                                            >
                                              <span className="flex items-center gap-2">
                                                {catExpanded ? (
                                                  <ChevronDown className="h-4 w-4 text-gray-500" />
                                                ) : (
                                                  <ChevronRight className="h-4 w-4 text-gray-500" />
                                                )}
                                                <span className="text-sm font-semibold text-gray-800">
                                                  {catKey}
                                                </span>
                                              </span>
                                              <span className="text-sm font-semibold text-gray-900">
                                                {formatScore(total)} / 5
                                              </span>
                                            </button>
                                            {catExpanded ? (
                                              <div className="mb-2 ml-6 space-y-1 pb-2">
                                                <div className="mb-2 text-sm text-gray-500">
                                                  {entryCount} rating
                                                  {entryCount === 1
                                                    ? ""
                                                    : "s"}{" "}
                                                  received
                                                </div>
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
                                            ) : null}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : null}

      {modalOpen && modalRow && modalOffer && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) handleModalCancel();
          }}
        >
          <div className="relative max-h-[85vh] w-full max-w-xl overflow-hidden rounded-2xl bg-white text-black shadow-[0_16px_44px_rgba(17,153,158,0.22)] ring-1 ring-black/10">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4">
              <h3 className="text-xl font-semibold text-gray-900">
                Please Confirm Your Selected Winning Offer
              </h3>
              <button
                type="button"
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
                onClick={handleModalCancel}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[calc(85vh-4.5rem)] overflow-y-auto p-6">
              <div className="mb-4 space-y-1 text-sm text-gray-700">
                <p>
                  <span className="font-semibold text-gray-900">
                    LEXIFY Request Title:
                  </span>{" "}
                  {modalRow.requestTitle}
                </p>
                <p>
                  <span className="font-semibold text-gray-900">
                    Selected Offer:
                  </span>{" "}
                  {fmtMoney(modalOffer.offeredPrice, modalRow.currency)}
                  {isHourlyRate(modalRow.paymentRate) ? "/h" : ""} (
                  <ProviderNameLink
                    name={modalOffer.providerCompanyName}
                    website={getOfferWebsite(modalOffer)}
                    className="inline text-sm"
                  />{" "}
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
                    return (
                      <RatingWithStar value={categoryTotal} />
                    );
                  })()}
                  )
                </p>
              </div>

              <div className="mb-4">
                <label className="mb-1.5 block text-sm font-semibold text-gray-800">
                  Help us improve by sharing your primary reason for selecting
                  this offer{" "}
                  <NarrowTooltip tooltipText="This primary reason for the winner selection will be shared with non-winning bidders to enable them to improve their proposals in the future. If you select “I'd rather not say,” this information will not be shared with non-winning bidders." />
                </label>
                <select
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none focus:border-[#11999e] focus:ring-1 focus:ring-[#11999e]/30"
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
                    className="mt-2 block min-h-[60px] w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-[#11999e] focus:ring-1 focus:ring-[#11999e]/30"
                    value={selectReasonOther}
                    onChange={(e) => setSelectReasonOther(e.target.value)}
                    placeholder="Insert primary reason for selecting this offer"
                  />
                )}
              </div>

              <div className="mb-4">
                <label className="mb-1.5 block text-sm font-semibold text-gray-800">
                  Request Specific Team Members (Optional){" "}
                  <NarrowTooltip tooltipText="If you would like specific lawyer(s) from the winning firm to be included in the project team, please specify their name(s) below. The firm will see your request as soon as you confirm your selection." />
                </label>
                <textarea
                  className="mt-1 block min-h-[80px] w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-[#11999e] focus:ring-1 focus:ring-[#11999e]/30"
                  value={teamRequestText}
                  onChange={(e) => setTeamRequestText(e.target.value)}
                  placeholder="Insert name(s) of preferred project team member(s). If you have no particular preference, leave this field blank."
                />
              </div>

              <p className="mb-4 text-sm text-gray-700">
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

              <div className="mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleModalCancel}
                  className={btnGhost}
                >
                  Cancel Selection
                </button>
                <button
                  type="button"
                  onClick={handleModalConfirm}
                  className={btnPrimary}
                >
                  Confirm Selection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ratingPopupOpen && popupOffer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white text-black shadow-2xl max-w-3xl w-full max-h-[80vh] relative overflow-visible">
            <div className="max-h-[80vh] overflow-y-auto p-6">
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
                        <NarrowTooltip tooltipText="Capped price refers to the maximum price for the work, taking into account all possible unexpected developments in the dispute proceedings such as an unusually high number of rounds of written pleadings." />
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
                    {isHourlyRate(fullOfferPopupData.request.paymentRate)
                      ? "/h"
                      : ""}
                  </span>
                </div>

                {fullOfferPopupData.offer.offerExpectedPrice != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      Expected Price{" "}
                      <NarrowTooltip tooltipText="Expected price refers to the expected price for the work if the dispute proceedings do not involve any unexpected developments (such as an unusually high number of rounds of written pleadings)." />
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
                            {fullOfferPopupData.offer.providerRatingCount}{" "}
                            rating
                            {fullOfferPopupData.offer.providerRatingCount === 1
                              ? ""
                              : "s"}{" "}
                            received
                          </div>
                          <button
                            type="button"
                            className="w-full -mx-2 px-2 py-1 rounded flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                            onClick={() =>
                              setPopupShowTotalBreakdown((v) => !v)
                            }
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
        </div>
      )}
      {isShareOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
          <div className="bg-white text-black rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-semibold mb-4">
              Share this LEXIFY Request with colleagues at{" "}
              {companyName || "your company"}{" "}
              <NarrowTooltip tooltipText="You can share a LEXIFY Request with colleagues in your organization. You choose whether each colleague can only view the Request — useful for keeping stakeholders informed — or have full co-owner rights, equivalent to your own. You control their access level and can revoke it anytime." />
            </h3>

            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {isLoadingUsers ? (
                <div className="text-sm text-gray-600 text-center py-4">
                  Loading company users...
                </div>
              ) : companyUsers.length === 0 ? (
                <div className="text-sm text-gray-600 text-center py-4">
                  No other user accounts registered for your company.
                </div>
              ) : (
                companyUsers.map((user) => {
                  const isOwner = isOriginalOwnerInShareModal(user.userPkId);
                  const isSelected = !!selectedUsers[user.userPkId] || isOwner;

                  return (
                    <div
                      key={user.userPkId}
                      className="flex items-center justify-between gap-3"
                    >
                      <label
                        className={`flex items-center gap-2 ${
                          isOwner
                            ? "cursor-not-allowed text-gray-700"
                            : "cursor-pointer"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isOwner}
                          onChange={() => toggleUser(user.userPkId)}
                          className={
                            isOwner ? "cursor-not-allowed" : "cursor-pointer"
                          }
                        />

                        <span>
                          {user.fullName}
                          {isOwner && (
                            <span className="ml-2 text-xs font-semibold text-gray-600">
                              Owner
                            </span>
                          )}
                        </span>
                      </label>

                      {isSelected && (
                        <select
                          value={
                            isOwner ? "owner" : selectedUsers[user.userPkId]
                          }
                          disabled={isOwner}
                          onChange={(e) =>
                            updatePermission(user.userPkId, e.target.value)
                          }
                          className={`border rounded px-2 py-1 text-sm ${
                            isOwner
                              ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                              : ""
                          }`}
                        >
                          {isOwner && <option value="owner">Owner</option>}
                          <option value="viewer">Viewer</option>
                          <option value="co-owner">Co-owner</option>
                        </select>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => closeShareModal()}
                className="px-4 py-2 border border-gray-400 rounded text-gray-700 cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleShare}
                disabled={companyUsers.length === 0}
                className={`px-4 py-2 rounded ${
                  companyUsers.length === 0
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-[#11999e] text-white cursor-pointer"
                }`}
              >
                Update Permissions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
