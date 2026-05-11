"use client";
// src/app/(purchaser)/archive/components/PendingRequestsTable.js

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fmtMoney, formatTimeUntil } from "../utils/format";
import NarrowTooltip from "../../../components/NarrowTooltip";

export default function PendingRequestsTable({
  rows,
  winningOfferSelection,
  onPreview,
  onCancel,
  busyIds,
  refreshAllRequests,
}) {
  const router = useRouter();

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

  const enriched = useMemo(() => {
    return (rows || []).map((r) => {
      const rawDeadline =
        r.offersDeadline ??
        r.offerDeadline ??
        r.deadline ??
        r?.details?.offersDeadline ??
        r?.details?.deadline ??
        null;

      const timeLeft = formatTimeUntil(rawDeadline);
      const isExpired = !timeLeft;

      const hasOffers = (r.offersReceived || 0) > 0;
      const hasMax = typeof r.maximumPrice === "number";
      const bestIsUnderMax =
        hasOffers && (hasMax ? r.bestOffer <= r.maximumPrice : true);
      const allOverMax =
        hasOffers && hasMax ? r.bestOffer > r.maximumPrice : false;

      let deadlineText = timeLeft;

      if (r.requestState === "CONFLICT_CHECK" && isExpired) {
        deadlineText = "Expired. Awaiting Conflict Check for Selected Offer.";
      }

      if (r.requestState === "ON HOLD" && isExpired) {
        if (bestIsUnderMax) {
          deadlineText = "Expired. Awaiting Winning Offer Selection.";
        } else if (allOverMax) {
          deadlineText =
            "Expired. Best offer over maximum price - awaiting approval or cancellation";
        } else {
          deadlineText = "Expired.";
        }
      }

      if (r.requestState === "PENDING" && isExpired) {
        deadlineText = "Expired.";
      }

      return { ...r, rawDeadline, deadlineText, isExpired };
    });
  }, [rows]);

  const active = useMemo(
    () => enriched.filter((r) => r.requestState !== "EXPIRED"),
    [enriched],
  );

  // Load-more paging
  const PAGE_SIZE = 5;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => setVisibleCount(PAGE_SIZE), [active.length]);

  const visibleRows = active.slice(0, visibleCount);
  const canLoadMore = visibleCount < active.length;

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
    <div className="w-full mb-8">
      <h2 className="text-2xl font-semibold mb-4">
        My Pending LEXIFY Requests
      </h2>

      {active.length === 0 ? (
        <div className="p-4 bg-white rounded border text-black">N/A</div>
      ) : (
        <>
          <table className="w-full border-collapse border border-gray-300 bg-white text-black">
            <thead>
              <tr className="bg-[#3a3a3c] text-white">
                <th className="border p-2 text-center">Title</th>
                <th className="border p-2 text-center">Created by</th>
                <th className="border p-2 text-center">Date Created</th>
                <th className="border p-2 text-center">
                  Time until Deadline for Offers
                </th>
                <th className="border p-2 text-center">Offers Received</th>
                <th className="border p-2 text-center">
                  Current Best Offer (VAT 0%)
                </th>
                <th className="border p-2 text-center">
                  My Max. Price (VAT 0%){" "}
                  <NarrowTooltip tooltipText="If you have included a maximum price for the legal service in your LEXIFY Request, the maximum price is displayed here. A maximum price can be set for lump sum offers only. " />
                </th>
                <th className="border p-2 text-center">
                  Additional Information Requests from Legal Service Providers
                </th>
                <th className="border p-2 text-center">View LEXIFY Request</th>
                <th className="border p-2 text-center">
                  Share LEXIFY Request{" "}
                  <NarrowTooltip tooltipText="You can share a LEXIFY Request with colleagues in your organization. You choose whether each colleague can only view the Request — useful for keeping stakeholders informed — or have full co-owner rights, equivalent to your own. You control their access level and can revoke it anytime." />
                </th>
                <th className="border p-2 text-center">
                  Cancel LEXIFY Request
                </th>
              </tr>
            </thead>

            <tbody>
              {visibleRows.map((r) => {
                const addPerHour =
                  typeof r.paymentRate === "string" &&
                  r.paymentRate.toLowerCase().startsWith("blended hourly rate");

                return (
                  <tr key={r.requestId}>
                    <td className="border p-2 text-center">{r.title}</td>
                    <td className="border p-2 text-center">
                      {r.primaryContactPerson || "—"}
                    </td>
                    <td className="border p-2 text-center">
                      {new Date(r.dateCreated).toLocaleDateString()}
                    </td>
                    <td
                      className="border p-2 text-center"
                      title={
                        r.rawDeadline ? new Date(r.rawDeadline).toString() : ""
                      }
                    >
                      {r.deadlineText}
                    </td>
                    <td className="border p-2 text-center">
                      {r.offersReceived || 0}
                    </td>
                    <td className="border p-2 text-center">
                      {fmtMoney(r.bestOffer, r.currency)}
                      {addPerHour ? "/h" : ""}
                    </td>
                    <td className="border p-2 text-center">
                      {r.maximumPrice != null && r.maximumPrice !== ""
                        ? fmtMoney(r.maximumPrice, r.currency)
                        : "N/A"}
                    </td>

                    <td className="border p-2 text-center">
                      {(() => {
                        const aq = r.details?.additionalQuestions;
                        const isObj =
                          aq && typeof aq === "object" && !Array.isArray(aq);
                        const count = isObj ? Object.keys(aq).length : 0;
                        if (!count) return "N/A";

                        return (
                          <div className="flex items-center justify-center gap-2">
                            <span>
                              {count} Additional Information Request(s)
                            </span>
                            <button
                              type="button"
                              className="bg-[#11999e] text-white px-3 py-1 rounded cursor-pointer"
                              onClick={() =>
                                router.push(
                                  `/archive/requests/${r.requestId}/additional-questions`,
                                )
                              }
                            >
                              Review and Respond
                            </button>
                          </div>
                        );
                      })()}
                    </td>

                    <td className="border p-2 text-center">
                      <button
                        className="bg-[#11999e] text-white px-3 py-1 rounded cursor-pointer"
                        onClick={() => onPreview(r)}
                      >
                        View
                      </button>
                    </td>
                    <td className="border p-2 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {(() => {
                          const count = r.details?.sharedAccounts?.length || 0;
                          if (count > 0) {
                            return (
                              <span className="text-xs text-gray-600">
                                Shared with {count}{" "}
                                {count === 1 ? "person" : "people"}
                              </span>
                            );
                          }
                          return null;
                        })()}

                        <button
                          className={`px-3 py-1 rounded shrink-0 ${
                            isViewer(r)
                              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                              : "cursor-pointer bg-[#11999e] text-white"
                          }`}
                          onClick={() => openShareForRequest(r)}
                          disabled={isViewer(r)}
                        >
                          Manage Access
                        </button>
                      </div>
                    </td>
                    <td className="border p-2 text-center">
                      <button
                        className={`px-3 py-1 rounded ${
                          isViewer(r)
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-red-500 text-white cursor-pointer"
                        }`}
                        disabled={
                          r.isExpired || busyIds.has(r.requestId) || isViewer(r)
                        }
                        onClick={() => onCancel(r.requestId)}
                      >
                        Cancel
                      </button>
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
                  setVisibleCount((n) => Math.min(n + PAGE_SIZE, active.length))
                }
              >
                Load more
              </button>
            </div>
          )}
          {isShareOpen && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
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
                      const isOwner = isOriginalOwnerInShareModal(
                        user.userPkId,
                      );
                      const isSelected =
                        !!selectedUsers[user.userPkId] || isOwner;

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
                                isOwner
                                  ? "cursor-not-allowed"
                                  : "cursor-pointer"
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
        </>
      )}
    </div>
  );
}
