"use client";

import { useEffect, useMemo, useState } from "react";
import QuestionMarkTooltip from "../../components/QuestionmarkTooltip";

// RatingSlider.js (or inline in the same file)
import { useId } from "react";

const clampHalfStep = (n) => {
  if (n == null) return 0;
  // round to nearest 0.5 and clamp to [0,5]
  const rounded = Math.round(n * 2) / 2;
  return Math.min(5, Math.max(0, rounded));
};

export function RatingSlider({ label, value, onChange, tooltipText }) {
  const id = useId();
  const sliderId = `${id}-slider`;
  const listId = `${id}-ticks`;

  const display = useMemo(() => clampHalfStep(value).toFixed(1), [value]);

  const handleChange = (e) => {
    const v = parseFloat(e.target.value);
    onChange?.(clampHalfStep(v));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <label htmlFor={sliderId} className="text-sm font-semibold">
            {label}
          </label>
          {tooltipText && <QuestionMarkTooltip tooltipText={tooltipText} />}
        </div>
        <span className="text-sm text-gray-800">{display} / 5</span>
      </div>

      <input
        id={sliderId}
        type="range"
        min="0"
        max="5"
        step="0.5"
        list={listId}
        value={clampHalfStep(value)}
        onChange={handleChange}
        className="w-full accent-[#119999]"
        aria-valuemin={0}
        aria-valuemax={5}
        aria-valuenow={clampHalfStep(value)}
        aria-label={`${label} rating`}
      />

      {/* Tick marks at 0, 0.5, …, 5 */}
      <datalist id={listId}>
        {Array.from({ length: 11 }).map((_, i) => (
          <option key={i} value={(i * 0.5).toFixed(1)} />
        ))}
      </datalist>

      {/* Optional: a tiny bar with tick labels (purely visual) */}
      <div className="flex justify-between text-[11px] text-gray-500">
        <span>0</span>
        <span>1</span>
        <span>2</span>
        <span>3</span>
        <span>4</span>
        <span>5</span>
      </div>
    </div>
  );
}

function AggregateRow({ label, value, tooltipText }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1">
        <span className="text-sm">{label}</span>
        {tooltipText && <QuestionMarkTooltip tooltipText={tooltipText} />}
      </div>
      <span className="font-semibold">
        {!isNaN(Number(value)) ? Number(value).toFixed(2) : "0.00"} / 5
      </span>
    </div>
  );
}

export default function ProviderRatingPage() {
  // -------- Contracted provider search & rating --------
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);

  const [qow, setQow] = useState(0);
  const [resp, setResp] = useState(0);
  const [bill, setBill] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // -------- Any provider search (read-only aggregates) --------
  const [queryAny, setQueryAny] = useState("");
  const [resultsAny, setResultsAny] = useState([]);
  const [searchingAny, setSearchingAny] = useState(false);
  const [selectedAny, setSelectedAny] = useState(null);
  const [aggAny, setAggAny] = useState(null);
  const [aggCount, setAggCount] = useState(0);
  const [aggLoading, setAggLoading] = useState(false);

  // -------- All providers list modal --------
  const [showAllModal, setShowAllModal] = useState(false);
  const [allProviders, setAllProviders] = useState([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [errorAll, setErrorAll] = useState("");
  const [expandedProviders, setExpandedProviders] = useState({});

  // controls whether sub-ratings are shown for the ANY-provider aggregate card
  const [showBreakdownAny, setShowBreakdownAny] = useState(false);

  // practical category ratings for the selected ANY-provider card
  const [selectedAnyFull, setSelectedAnyFull] = useState(null);
  const [expandedAnyCategories, setExpandedAnyCategories] = useState({});

  const [contractsForSelected, setContractsForSelected] = useState([]);
  const [selectedContractId, setSelectedContractId] = useState("");
  const [selectedCategoryLabel, setSelectedCategoryLabel] = useState("");
  const [selectedRequestTitle, setSelectedRequestTitle] = useState("");

  // live search: contracted providers
  useEffect(() => {
    let active = true;
    (async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const res = await fetch(
          `/api/me/contracted-providers?q=${encodeURIComponent(query)}`,
          {
            cache: "no-store",
          }
        );
        const json = await res.json();
        if (!active) return;
        if (res.ok && Array.isArray(json)) setResults(json);
        else setResults([]);
      } catch {
        if (active) setResults([]);
      } finally {
        if (active) setSearching(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [query]);

  // on select contracted provider: load my previous rating + aggregates (optional)
  const selectProvider = async (p) => {
    setSelected(p);
    setMessage("");
    setQow(0);
    setResp(0);
    setBill(0);

    // reset contract selection
    setContractsForSelected([]);
    setSelectedContractId("");
    setSelectedCategoryLabel("");

    try {
      const res = await fetch(`/api/providers/${p.userId}/rating`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();

        // contracts for dropdown
        if (Array.isArray(data?.contracts)) {
          setContractsForSelected(data.contracts);
        }
      }
    } catch {
      /* ignore */
    }
  };

  const selectContract = async (contractIdStr) => {
    setSelectedContractId(contractIdStr);
    setMessage("");
    setQow(0);
    setResp(0);
    setBill(0);

    const c = contractsForSelected.find(
      (x) => String(x.contractId) === String(contractIdStr)
    );
    setSelectedRequestTitle(c?.requestTitle || "");

    const category = mapRequestToCategory(
      c?.requestCategory,
      c?.requestSubcategory
    );
    setSelectedCategoryLabel(category);

    if (!selected || !contractIdStr) return;

    try {
      const res = await fetch(
        `/api/providers/${
          selected.userId
        }/rating?contractId=${encodeURIComponent(contractIdStr)}`,
        { cache: "no-store" }
      );

      if (res.ok) {
        const data = await res.json();
        if (data?.mine) {
          setQow(data.mine.quality ?? 0);
          setResp(data.mine.responsiveness ?? 0);
          setBill(data.mine.billing ?? 0);
        }
      }
    } catch {
      /* ignore */
    }
  };

  const saveRating = async () => {
    if (!selected) return;

    if (!selectedContractId) {
      setMessage("Please select a contract before rating.");
      return;
    }

    if ([qow, resp, bill].some((v) => v < 0 || v > 5)) {
      setMessage("Ratings must be between 0 and 5.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/providers/${selected.userId}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractId: selectedContractId,
          quality: qow,
          responsiveness: resp,
          billing: bill,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) setMessage(json?.error || "Failed to save rating.");
      else setMessage("Rating saved.");
    } catch {
      setMessage("Network error while saving rating.");
    } finally {
      setSaving(false);
    }
  };

  // live search: ANY provider
  useEffect(() => {
    let active = true;
    (async () => {
      if (!queryAny.trim()) {
        setResultsAny([]);
        return;
      }
      setSearchingAny(true);
      try {
        const res = await fetch(
          `/api/providers/search?q=${encodeURIComponent(queryAny)}`,
          {
            cache: "no-store",
          }
        );
        const json = await res.json();
        if (!active) return;
        if (res.ok && Array.isArray(json)) setResultsAny(json);
        else setResultsAny([]);
      } catch {
        if (active) setResultsAny([]);
      } finally {
        if (active) setSearchingAny(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [queryAny]);

  // on select ANY provider: fetch aggregates
  // on select ANY provider: fetch aggregates + practical category ratings (if available)
  const selectAnyProvider = async (p) => {
    setSelectedAny(p);
    setSelectedAnyFull(null);
    setAggAny(null);
    setAggCount(0);
    setAggLoading(true);
    setShowBreakdownAny(false);
    setExpandedAnyCategories({});

    try {
      // Aggregated “total” ratings (existing behavior)
      const res = await fetch(`/api/providers/${p.userId}/rating`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setAggAny(data?.aggregates ?? null);
        setAggCount(Number(data?.ratingCount ?? 0));
      } else {
        setAggAny(null);
      }

      // Practical category ratings are returned by the “all providers” search endpoint.
      // To avoid adding a new endpoint, we load the list once and pick the selected provider.
      const resPractical = await fetch("/api/providers/search?all=1", {
        cache: "no-store",
      });
      const list = await resPractical.json().catch(() => []);
      if (resPractical.ok && Array.isArray(list)) {
        const full = list.find((x) => String(x.userId) === String(p.userId));
        if (full) setSelectedAnyFull(full);
      }
    } catch {
      setAggAny(null);
    } finally {
      setAggLoading(false);
    }
  };

  const openAllProviders = async () => {
    setShowAllModal(true);

    // If we’ve already loaded them once, don’t refetch
    if (allProviders.length > 0) return;

    setLoadingAll(true);
    setErrorAll("");
    try {
      const res = await fetch("/api/providers/search?all=1", {
        cache: "no-store",
      });
      const json = await res.json();
      if (res.ok && Array.isArray(json)) {
        setAllProviders(json);
      } else {
        setErrorAll("Failed to load providers.");
      }
    } catch {
      setErrorAll("Failed to load providers.");
    } finally {
      setLoadingAll(false);
    }
  };

  const toggleProviderCategoryExpand = (providerId, categoryKey) => {
    setExpandedProviders((prev) => ({
      ...prev,
      [providerId]: {
        ...(prev[providerId] || {}),
        [categoryKey]: !(prev[providerId]?.[categoryKey] ?? false),
      },
    }));
  };

  const toggleAnyCategoryExpand = (categoryKey) => {
    setExpandedAnyCategories((prev) => ({
      ...prev,
      [categoryKey]: !(prev?.[categoryKey] ?? false),
    }));
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
    if (cat === "Help with Banking & Finance Matters")
      return "Banking & Finance";

    return sub || cat || "Other";
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

  const normalizePracticalRatings = (provider) => {
    const pr = provider?.providerPracticalRatings;

    // Supports either:
    // 1) Object keyed by category, or
    // 2) Array of { category, total, quality, communication, billing, ratingCount }
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
      return map;
    }

    return map;
  };

  const categoryHasRatings = (entry) => {
    if (!entry) return false;
    const count = Number(entry.ratingCount ?? entry.count ?? 0);
    if (count > 0) return true;
    // Fallback: treat non-null totals as “rated”
    return entry.total != null || entry.providerTotalRating != null;
  };

  const getCategoryNumbers = (entry) => {
    const total =
      entry?.total ?? entry?.providerTotalRating ?? entry?.totalRating ?? null;
    const quality = entry?.quality ?? entry?.providerQualityRating ?? null;
    // Some datasets store this as `responsiveness` (instead of `communication`).
    const communication =
      entry?.communication ??
      entry?.responsiveness ??
      entry?.providerCommunicationRating ??
      null;
    const billing = entry?.billing ?? entry?.providerBillingRating ?? null;

    return { total, quality, communication, billing };
  };

  return (
    <div className="flex flex-col items-center min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-6">
        Rate Your Legal Service Provider
      </h1>

      {/* Card 1: Search contracted providers (rate) */}
      <div className="w-full max-w-3xl p-6 rounded shadow-2xl bg-white text-black">
        <h2 className="text-xl font-semibold mb-2">
          Find a legal service provider you&apos;ve worked with
        </h2>
        <p className="text-sm text-gray-700 mb-3">
          You can search only legal service providers with whom you have at
          least one LEXIFY contract.
        </p>

        <input
          type="text"
          className="border rounded bg-[#11999e] text-white placeholder-white/80 p-2 w-full"
          placeholder="Insert legal service provider name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {query && (
          <div className="border mt-2 max-h-60 overflow-auto bg-white">
            {searching ? (
              <div className="p-2 text-sm text-gray-500">Searching…</div>
            ) : results.length === 0 ? (
              <div className="p-2 text-sm text-gray-500">
                No matching provider found.
              </div>
            ) : (
              results.map((r) => {
                const isSel = selected?.userId === r.userId;
                return (
                  <div
                    key={String(r.userId)}
                    className={`p-2 text-sm cursor-pointer ${
                      isSel ? "bg-[#e6f7f7] border-l-4 border-[#11999e]" : ""
                    }`}
                    onClick={() => selectProvider(r)}
                  >
                    <div className="font-medium">
                      {r.companyName || "(no company name)"}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {selected && (
        <div className="w-full max-w-3xl p-6 mt-6 rounded shadow-2xl bg-white text-black">
          <h3 className="text-xl font-semibold mb-1">
            Rate a Legal Service Provider
          </h3>
          {/* Contract dropdown */}
          <div className="mb-4">
            <div className="text-sm font-semibold mb-1">
              Select the assignment you want to rate {selected.companyName} for
            </div>

            <select
              className="border rounded p-2 w-full"
              value={selectedContractId}
              onChange={(e) => selectContract(e.target.value)}
              id="selectedContract"
            >
              <option value="">Select contract</option>
              {contractsForSelected.map((c) => (
                <option key={String(c.contractId)} value={String(c.contractId)}>
                  {c.requestTitle}
                </option>
              ))}
            </select>
          </div>
          {/* Only show rating UI after a contract is chosen */}
          {selectedContractId ? (
            <>
              <div className="text-sm font-semibold mb-4">
                Rate the performance of {selected.companyName} on{" "}
                {selectedRequestTitle}
              </div>
              <p className="text-sm text-gray-700 mb-4">
                Use the sliders to set your rating for {selected.companyName}.
                You can update your rating anytime.
              </p>

              <div className="grid grid-cols-1 gap-4">
                <RatingSlider
                  label="Quality of Work"
                  value={qow}
                  onChange={setQow}
                  tooltipText="How satisfied were you in general with the quality of the legal advice and documentation provided by the legal service provider?"
                />{" "}
                <RatingSlider
                  label="Responsiveness & Communication"
                  value={resp}
                  onChange={setResp}
                  tooltipText="Did you receive timely responses and communications from the legal service provider? Was the advice you received clear and actionable or ambiguous analysis without clear value-adding guidance?"
                />{" "}
                <RatingSlider
                  label="Billing Practices"
                  value={bill}
                  onChange={setBill}
                  tooltipText="Did the legal service provider send invoices within agreed timeframes and with agreed specifications? In case of hourly rate assignments, did the legal service provider in your opinion invoice a reasonable amount of hours in relation to	the legal support that was required?"
                />{" "}
              </div>

              <div className="mt-5 flex items-center gap-3">
                <button
                  className="bg-[#11999e] text-white px-4 py-2 rounded disabled:opacity-50 cursor-pointer"
                  onClick={saveRating}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save Rating"}
                </button>
                {message && (
                  <div className="text-sm text-gray-700">{message}</div>
                )}
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-600">
              Select a contract above to rate this provider.
            </div>
          )}
        </div>
      )}
      <br />
      <br />
      <h1 className="text-2xl font-bold">Browse Legal Service Providers</h1>
      {/* Card 2: Search ANY provider (show read-only aggregates) */}
      <div className="w-full max-w-3xl p-6 mt-5 rounded shadow-2xl bg-white text-black">
        <h2 className="text-xl font-semibold mb-2">
          Find a specific legal service provider on LEXIFY
        </h2>
        <p className="text-sm text-gray-700 mb-3">
          You can search for any legal service provider on LEXIFY to check their
          current aggregated user rating.
        </p>

        <input
          type="text"
          className="border rounded bg-[#11999e] text-white placeholder-white/80 p-2 w-full"
          placeholder="Insert legal service provider name"
          value={queryAny}
          onChange={(e) => setQueryAny(e.target.value)}
        />

        {queryAny && (
          <div className="border mt-2 max-h-60 overflow-auto bg-white">
            {searchingAny ? (
              <div className="p-2 text-sm text-gray-500">Searching…</div>
            ) : resultsAny.length === 0 ? (
              <div className="p-2 text-sm text-gray-500">
                No matching provider found.
              </div>
            ) : (
              resultsAny.map((r) => {
                const isSel = selectedAny?.userId === r.userId;
                return (
                  <div
                    key={String(r.userId)}
                    className={`p-2 text-sm cursor-pointer hover:bg-gray-100 ${
                      isSel ? "bg-[#e6f7f7] border-l-4 border-[#11999e]" : ""
                    }`}
                    onClick={() => selectAnyProvider(r)}
                  >
                    <div className="font-medium">
                      {r.companyName || "(no company name)"}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {selectedAny && (
          <>
            <div className="mt-5 border rounded p-4">
              <div className="text-lg font-semibold mb-1">
                {selectedAny.companyWebsite ? (
                  <a
                    href={selectedAny.companyWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {selectedAny.companyName}
                  </a>
                ) : (
                  selectedAny.companyName
                )}
              </div>
              <div className="text-sm text-gray-700 mb-3">
                {aggCount} rating{aggCount === 1 ? "" : "s"} received
              </div>
              {aggLoading ? (
                <div className="text-sm text-gray-600">Loading ratings…</div>
              ) : aggAny ? (
                <div className="space-y-2">
                  {aggCount > 0 ? (
                    <>
                      {/* TOTAL row acts as an expander */}
                      <button
                        type="button"
                        className="w-full -mx-2 px-2 py-1 rounded flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                        onClick={() => setShowBreakdownAny((v) => !v)}
                        aria-expanded={showBreakdownAny}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg text-gray-600 select-none">
                            {showBreakdownAny ? "▾" : "▸"}
                          </span>

                          <span className="text-sm font-semibold">Total</span>
                        </div>
                        <span className="font-semibold">
                          {(aggAny.total ?? 0).toFixed(2)} / 5
                        </span>
                      </button>

                      {/* Only show sub-ratings when expanded */}
                      {showBreakdownAny && (
                        <>
                          <AggregateRow
                            label="Quality of Work"
                            value={aggAny.quality ?? 0}
                            tooltipText="How satisfied were you in general with the quality of the legal advice and documentation provided by the legal service provider?"
                          />
                          <AggregateRow
                            label="Responsiveness & Communication"
                            value={
                              aggAny.responsiveness ?? aggAny.communication ?? 0
                            }
                            tooltipText="Did you receive timely responses and communications from the legal service provider? Was the advice you received clear and actionable or ambiguous analysis without clear value-adding guidance?"
                          />
                          <AggregateRow
                            label="Billing Practices"
                            value={aggAny.billing ?? 0}
                            tooltipText="Did the legal service provider send invoices within agreed timeframes and with agreed specifications? In case of hourly rate assignments, did the legal service provider in your opinion invoice a reasonable amount of hours in relation to the legal support that was required?"
                          />
                        </>
                      )}
                      {/* Practical category ratings (expand per category) */}
                      <div className="mt-5 border-t pt-4">
                        <div className="text-sm font-semibold mb-2">
                          Category-based ratings
                        </div>

                        {(() => {
                          const providerForCategories =
                            selectedAnyFull || selectedAny;
                          const practicalMap = normalizePracticalRatings(
                            providerForCategories
                          );

                          const categoriesToShow = Array.from(
                            new Set([
                              ...PRACTICAL_CATEGORIES,
                              ...Object.keys(practicalMap || {}),
                            ])
                          ).filter(Boolean);

                          if (!categoriesToShow.length) {
                            return (
                              <div className="text-sm text-gray-600">
                                No category ratings available yet.
                              </div>
                            );
                          }

                          return (
                            <div className="space-y-2">
                              {categoriesToShow.map((categoryKey) => {
                                const entry = practicalMap?.[categoryKey];
                                const expanded =
                                  expandedAnyCategories?.[categoryKey] ?? false;
                                const hasRatings = categoryHasRatings(entry);

                                if (!hasRatings) {
                                  return (
                                    <div
                                      key={categoryKey}
                                      className="flex items-center justify-between"
                                    >
                                      <span className="text-sm">
                                        {categoryKey}
                                      </span>
                                      <span className="font-semibold">
                                        No Ratings Yet
                                      </span>
                                    </div>
                                  );
                                }

                                const {
                                  total,
                                  quality,
                                  communication,
                                  billing,
                                } = getCategoryNumbers(entry);

                                return (
                                  <div key={categoryKey}>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        toggleAnyCategoryExpand(categoryKey)
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
                                          value={communication ?? 0}
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
                          );
                        })()}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Total</span>
                        <span className="font-semibold">No Ratings Yet</span>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-600">
                  No ratings available yet.
                </div>
              )}
            </div>
          </>
        )}
        <div className="mt-10">
          <h2 className="text-xl font-semibold mb-2">
            View all legal service providers on LEXIFY
          </h2>
          <p className="text-sm text-gray-700 mb-4">
            Click below to see all legal service providers currently offering
            services on LEXIFY, along with their aggregated user ratings.
          </p>
          <button
            type="button"
            className="bg-[#11999e] text-white px-4 py-2 rounded cursor-pointer"
            onClick={openAllProviders}
          >
            Show all legal service providers
          </button>
        </div>
        {showAllModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white text-black shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-y-auto p-6 relative">
              <button
                type="button"
                className="absolute top-4 right-4 text-white bg-[#3a3a3c] rounded-full w-8 h-8 flex items-center justify-center text-xl hover:bg-red-600 transition cursor-pointer"
                onClick={() => setShowAllModal(false)}
              >
                x
              </button>

              <h3 className="text-xl font-semibold mb-2">
                LEXIFY Legal Service Providers
              </h3>

              {loadingAll ? (
                <div className="text-sm text-gray-600">Loading providers…</div>
              ) : errorAll ? (
                <div className="text-sm text-red-600">{errorAll}</div>
              ) : allProviders.length === 0 ? (
                <div className="text-sm text-gray-600">
                  No legal service providers found.
                </div>
              ) : (
                <div className="space-y-4 mt-2">
                  {allProviders.map((p) => {
                    // Practical category ratings (expand per category)
                    const practicalMap = normalizePracticalRatings(p);

                    const categoriesToShow = Array.from(
                      new Set([
                        ...PRACTICAL_CATEGORIES,
                        ...Object.keys(practicalMap || {}),
                      ])
                    ).filter(Boolean);

                    return (
                      <div
                        key={String(p.userId)}
                        className="border rounded p-4 bg-white"
                      >
                        <div className="text-lg font-semibold mb-1">
                          {p.companyWebsite ? (
                            <a
                              href={p.companyWebsite}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {p.companyName}
                            </a>
                          ) : (
                            p.companyName
                          )}
                        </div>

                        <div className="mt-2 space-y-2">
                          {/* Total rating (expandable) */}
                          {(() => {
                            const totalExpanded =
                              expandedProviders?.[p.userId]?.__TOTAL__ ?? false;

                            const hasTotalRatings =
                              Array.isArray(p.providerIndividualRating) &&
                              p.providerIndividualRating.length > 0;

                            if (!hasTotalRatings) {
                              return (
                                <div className="flex items-center justify-between">
                                  <span className="text-sm">Total</span>
                                  <span className="font-semibold">
                                    No Ratings Yet
                                  </span>
                                </div>
                              );
                            }

                            return (
                              <div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleProviderCategoryExpand(
                                      p.userId,
                                      "__TOTAL__"
                                    )
                                  }
                                  className="w-full -mx-2 px-2 py-1 rounded flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                                  aria-expanded={totalExpanded}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg text-gray-600 select-none">
                                      {totalExpanded ? "▾" : "▸"}
                                    </span>
                                    <span className="text-sm font-semibold">
                                      Total
                                    </span>
                                  </div>
                                  <span className="font-semibold">
                                    {!isNaN(Number(p.providerTotalRating))
                                      ? Number(p.providerTotalRating).toFixed(2)
                                      : "0.00"}{" "}
                                    / 5
                                  </span>
                                </button>

                                {totalExpanded && (
                                  <div className="mt-1 space-y-1">
                                    <AggregateRow
                                      label="Total"
                                      value={p.providerTotalRating ?? 0}
                                    />
                                    <AggregateRow
                                      label="Quality of Work"
                                      value={p.providerQualityRating ?? 0}
                                      tooltipText="How satisfied were you in general with the quality of the legal advice and documentation provided by the legal service provider?"
                                    />
                                    <AggregateRow
                                      label="Responsiveness & Communication"
                                      value={p.providerCommunicationRating ?? 0}
                                      tooltipText="Did you receive timely responses and clear communications from the legal service provider? Was the advice you received clear and actionable (i.e. not just generic analysis without clear value-adding guidance)?"
                                    />
                                    <AggregateRow
                                      label="Billing Practices"
                                      value={p.providerBillingRating ?? 0}
                                      tooltipText="Did the legal service provider invoice you in line with agreed specifications? In case of hourly rate assignments, did the legal service provider give sufficient transparency about time spent and tasks performed?"
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          <div className="text-sm font-semibold mb-2 border-t mt-5 pt-4">
                            Category-based ratings
                          </div>

                          {categoriesToShow.map((categoryKey) => {
                            const entry = practicalMap?.[categoryKey];
                            const expanded =
                              expandedProviders?.[p.userId]?.[categoryKey] ??
                              false;

                            const hasRatings = categoryHasRatings(entry);

                            // If category has no ratings yet → show simple “No Ratings Yet”
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

                            const { total, quality, communication, billing } =
                              getCategoryNumbers(entry);

                            return (
                              <div key={categoryKey}>
                                {/* Expandable CATEGORY row */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleProviderCategoryExpand(
                                      p.userId,
                                      categoryKey
                                    )
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

                                {/* Category breakdown (visible only when expanded) */}
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
                                      value={communication ?? 0}
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
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
