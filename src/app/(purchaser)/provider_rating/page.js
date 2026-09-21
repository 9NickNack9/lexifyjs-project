"use client";

import { useEffect, useId, useMemo, useState } from "react";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Lock,
  Save,
  Search,
  Star,
  X,
  ExternalLink,
} from "lucide-react";
import QuestionMarkTooltip from "../../components/QuestionmarkTooltip";
import { HubShell } from "@/app/components/HubPage";
import { useSession } from "next-auth/react";
import { getDummyRatedProviders, isAdminRole } from "@/lib/adminDummyCases";

const CARD =
  "w-full rounded-2xl bg-white p-6 text-black shadow-[0_16px_44px_rgba(17,153,158,0.22)] ring-1 ring-black/10 sm:p-8";

const SEARCH_INPUT =
  "w-full border-0 bg-transparent py-2.5 pr-10 pl-9 text-sm text-gray-800 outline-none placeholder:text-gray-400";

const clampHalfStep = (n) => {
  if (n == null) return 0;
  const rounded = Math.round(n * 2) / 2;
  return Math.min(5, Math.max(0, rounded));
};

function formatScore(value, digits = 1) {
  const n = Number(value);
  if (Number.isNaN(n)) return (0).toFixed(digits);
  const rounded = Math.round(Math.max(0, Math.min(5, n)) * 2) / 2;
  return rounded.toFixed(digits);
}

function ProviderNameLink({ name, website, className = "" }) {
  const label = name || "(no company name)";

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
        <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
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

function StepHeader({ n, children }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#11999e] text-sm font-semibold text-white">
        {n}
      </span>
      <h3 className="text-sm font-semibold text-gray-900">{children}</h3>
    </div>
  );
}

function CardHeading({ icon: Icon, title, subtitle }) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#11999e] text-white">
        <Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
      </span>
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

function ProviderSearch({
  value,
  onChange,
  placeholder,
  searching,
  results,
  selectedId,
  onSelect,
}) {
  const open = Boolean(value);

  return (
    <div>
      <div
        className={`relative bg-white ${
          open
            ? "rounded-t-lg border border-[#11999e]"
            : "rounded-lg border border-gray-300 focus-within:border-[#11999e] focus-within:ring-1 focus-within:ring-[#11999e]/30"
        }`}
      >
        <Search
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
          aria-hidden="true"
        />
        <input
          type="text"
          className={SEARCH_INPUT}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-1/2 right-2.5 flex h-5 w-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-gray-500 text-white transition-colors hover:bg-gray-600"
            aria-label="Clear search"
          >
            <X className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="max-h-60 overflow-auto rounded-b-lg border border-t-0 border-[#11999e] bg-white shadow-md">
          {searching ? (
            <div className="px-3 py-2.5 text-sm text-gray-500">Searching…</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2.5 text-sm text-gray-500">
              No matching provider found.
            </div>
          ) : (
            results.map((r) => {
              const isSel = String(selectedId) === String(r.companyId);
              return (
                <button
                  type="button"
                  key={String(r.companyId)}
                  className={`block w-full cursor-pointer px-3 py-2.5 text-left text-sm transition-colors ${
                    isSel
                      ? "bg-[#11999e]/15 font-semibold text-[#11999e]"
                      : "text-gray-800 hover:bg-[#11999e]/10 hover:font-semibold hover:text-[#11999e]"
                  }`}
                  onClick={() => onSelect(r)}
                >
                  {r.companyName || "(no company name)"}
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}

export function RatingSlider({ label, value, onChange, tooltipText }) {
  const id = useId();
  const sliderId = `${id}-slider`;
  const listId = `${id}-ticks`;
  const display = useMemo(() => clampHalfStep(value).toFixed(1), [value]);
  const pct = (clampHalfStep(value) / 5) * 100;

  const handleChange = (e) => {
    const v = parseFloat(e.target.value);
    onChange?.(clampHalfStep(v));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label
            htmlFor={sliderId}
            className="text-sm font-semibold text-gray-800"
          >
            {label}
          </label>
          {tooltipText && <QuestionMarkTooltip tooltipText={tooltipText} />}
        </div>
        <span className="text-sm font-medium text-gray-800">{display} / 5</span>
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
        className="rating-slider w-full cursor-pointer appearance-none rounded-full"
        style={{
          background: `linear-gradient(to right, #11999e 0%, #11999e ${pct}%, #e5e7eb ${pct}%, #e5e7eb 100%)`,
        }}
        aria-valuemin={0}
        aria-valuemax={5}
        aria-valuenow={clampHalfStep(value)}
        aria-label={`${label} rating`}
      />

      <datalist id={listId}>
        {Array.from({ length: 11 }).map((_, i) => (
          <option key={i} value={(i * 0.5).toFixed(1)} />
        ))}
      </datalist>

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
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-1.5">
        <span className="text-sm text-gray-700">{label}</span>
        {tooltipText && <QuestionMarkTooltip tooltipText={tooltipText} />}
      </div>
      <span className="text-sm font-semibold text-gray-900">
        {formatScore(value)} / 5
      </span>
    </div>
  );
}

function CategoryRatingsList({
  categoriesToShow,
  practicalMap,
  expandedMap,
  onToggle,
  categoryHasRatings,
  getCategoryNumbers,
  getEntryCount,
}) {
  if (!categoriesToShow.length) {
    return (
      <div className="text-sm text-gray-500">
        No category ratings available yet.
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {categoriesToShow.map((categoryKey) => {
        const entry = practicalMap?.[categoryKey];
        const expanded = expandedMap?.[categoryKey] ?? false;
        const hasRatings = categoryHasRatings(entry);

        if (!hasRatings) {
          return (
            <div
              key={categoryKey}
              className="flex items-center justify-between py-2.5"
            >
              <span className="text-sm text-gray-800">{categoryKey}</span>
              <span className="text-sm text-gray-400">No Ratings Yet</span>
            </div>
          );
        }

        const { total, quality, communication, billing } =
          getCategoryNumbers(entry);
        const entryCount = getEntryCount(entry);

        return (
          <div key={categoryKey}>
            <button
              type="button"
              onClick={() => onToggle(categoryKey)}
              className="flex w-full cursor-pointer items-center justify-between py-2.5 text-left hover:bg-gray-50"
              aria-expanded={expanded}
            >
              <span className="flex items-center gap-2">
                {expanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
                <span className="text-sm font-semibold text-gray-800">
                  {categoryKey}
                </span>
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {formatScore(total)} / 5
              </span>
            </button>

            {expanded ? (
              <div className="mb-2 ml-6 space-y-1 pb-2">
                <div className="mb-2 text-sm text-gray-500">
                  {entryCount} rating{entryCount === 1 ? "" : "s"} received
                </div>
                <AggregateRow label="Total" value={total ?? 0} />
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
                  tooltipText="Did the legal service provider send invoices within agreed timeframes and with agreed specifications? In case of hourly rate assignments, did the legal service provider in your opinion invoice a reasonable amount of hours in relation to	the legal support that was required?"
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default function ProviderRatingPage() {
  const { data: session } = useSession();
  const isAdmin = isAdminRole(session?.role);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);

  const [qow, setQow] = useState(0);
  const [resp, setResp] = useState(0);
  const [bill, setBill] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [queryAny, setQueryAny] = useState("");
  const [resultsAny, setResultsAny] = useState([]);
  const [searchingAny, setSearchingAny] = useState(false);
  const [selectedAny, setSelectedAny] = useState(null);
  const [aggAny, setAggAny] = useState(null);
  const [aggCount, setAggCount] = useState(0);
  const [aggLoading, setAggLoading] = useState(false);

  const [showAllModal, setShowAllModal] = useState(false);
  const [allProviders, setAllProviders] = useState([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [errorAll, setErrorAll] = useState("");
  const [expandedProviders, setExpandedProviders] = useState({});

  const [showBreakdownAny, setShowBreakdownAny] = useState(false);

  const [selectedAnyFull, setSelectedAnyFull] = useState(null);
  const [expandedAnyCategories, setExpandedAnyCategories] = useState({});

  const [contractsForSelected, setContractsForSelected] = useState([]);
  const [selectedContractId, setSelectedContractId] = useState("");
  const [selectedCategoryLabel, setSelectedCategoryLabel] = useState("");
  const [selectedRequestTitle, setSelectedRequestTitle] = useState("");

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
          },
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

  const selectProvider = async (p) => {
    setSelected(p);
    setMessage("");
    setQow(0);
    setResp(0);
    setBill(0);

    setContractsForSelected([]);
    setSelectedContractId("");
    setSelectedCategoryLabel("");

    try {
      const res = await fetch(`/api/providers/${p.companyId}/rating`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();

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
      (x) => String(x.contractId) === String(contractIdStr),
    );
    setSelectedRequestTitle(c?.requestTitle || "");

    const category = mapRequestToCategory(
      c?.requestCategory,
      c?.requestSubcategory,
    );
    setSelectedCategoryLabel(category);

    if (!selected || !contractIdStr) return;

    try {
      const res = await fetch(
        `/api/providers/${
          selected.companyId
        }/rating?contractId=${encodeURIComponent(contractIdStr)}`,
        { cache: "no-store" },
      );

      if (res.ok) {
        const data = await res.json();
        if (data?.mine) {
          setQow(clampHalfStep(data.mine.quality ?? 0));
          setResp(
            clampHalfStep(
              data.mine.responsiveness ?? data.mine.communication ?? 0,
            ),
          );
          setBill(clampHalfStep(data.mine.billing ?? 0));
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
      const res = await fetch(`/api/providers/${selected.companyId}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractId: selectedContractId,
          quality: clampHalfStep(qow),
          responsiveness: clampHalfStep(resp),
          billing: clampHalfStep(bill),
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage(json?.error || "Failed to save rating.");
        return;
      }

      alert("Rating saved successfully.");

      setSelected(null);
      setContractsForSelected([]);
      setSelectedContractId("");
      setSelectedRequestTitle("");
      setSelectedCategoryLabel("");
      setQow(0);
      setResp(0);
      setBill(0);
      setQuery("");
      setResults([]);
      setMessage("");
    } catch {
      setMessage("Network error while saving rating.");
    } finally {
      setSaving(false);
    }
  };

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
          },
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

  const selectAnyProvider = async (p) => {
    setSelectedAny(p);
    setSelectedAnyFull(null);
    setAggAny(null);
    setAggCount(0);
    setAggLoading(true);
    setShowBreakdownAny(false);
    setExpandedAnyCategories({});

    try {
      const res = await fetch(`/api/providers/${p.companyId}/rating`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setAggAny(data?.aggregates ?? null);
        setAggCount(Number(data?.ratingCount ?? 0));
      } else {
        setAggAny(null);
      }

      const resPractical = await fetch("/api/providers/search?all=1", {
        cache: "no-store",
      });
      const list = await resPractical.json().catch(() => []);
      if (resPractical.ok && Array.isArray(list)) {
        const full = list.find(
          (x) => String(x.companyId) === String(p.companyId),
        );
        if (full) setSelectedAnyFull(full);
      }
    } catch {
      setAggAny(null);
    } finally {
      setAggLoading(false);
    }
  };

  const openAllProviders = async (useDummy = false) => {
    setShowAllModal(true);
    setExpandedProviders({});
    setErrorAll("");

    if (useDummy) {
      setAllProviders(getDummyRatedProviders());
      setLoadingAll(false);
      return;
    }

    setLoadingAll(true);
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
    return entry.total != null || entry.providerTotalRating != null;
  };

  const getCategoryNumbers = (entry) => {
    const total =
      entry?.total ?? entry?.providerTotalRating ?? entry?.totalRating ?? null;
    const quality = entry?.quality ?? entry?.providerQualityRating ?? null;
    const communication =
      entry?.communication ??
      entry?.responsiveness ??
      entry?.providerCommunicationRating ??
      null;
    const billing = entry?.billing ?? entry?.providerBillingRating ?? null;

    return { total, quality, communication, billing };
  };

  const getEntryCount = (entry) => {
    return Number(entry?.ratingCount ?? entry?.count ?? 0);
  };

  const browsePracticalMap = normalizePracticalRatings(
    selectedAnyFull || selectedAny,
  );
  const browseCategories = Array.from(
    new Set([
      ...PRACTICAL_CATEGORIES,
      ...Object.keys(browsePracticalMap || {}),
    ]),
  ).filter(Boolean);

  return (
    <HubShell contentClassName="max-w-3xl">
      <style>{`
        .rating-slider {
          height: 6px;
        }
        .rating-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          height: 18px;
          width: 18px;
          border-radius: 9999px;
          background: #11999e;
          border: 2px solid #fff;
          box-shadow: 0 1px 4px rgba(17, 153, 158, 0.45);
          cursor: pointer;
        }
        .rating-slider::-moz-range-thumb {
          height: 18px;
          width: 18px;
          border: 2px solid #fff;
          border-radius: 9999px;
          background: #11999e;
          box-shadow: 0 1px 4px rgba(17, 153, 158, 0.45);
          cursor: pointer;
        }
      `}</style>

      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Rate Legal Service Providers
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-gray-600">
          Rate the law firms you have worked with, based on their performance in
          a specific matter. You can also view each firm's average rating from
          other members.
        </p>
      </header>

      <div className="space-y-6">
        <section className={CARD}>
          <CardHeading
            icon={Star}
            title="Rate Your Legal Service Provider"
            subtitle="Your ratings make firms comparable in the practice areas that matter, for you and for other members."
          />

          <StepHeader n={1}>
            Find a legal service provider you&apos;ve worked with
          </StepHeader>
          <p className="mb-3 text-sm text-gray-500">
            You can search only legal service providers with whom you have at
            least one LEXIFY contract.
          </p>
          <ProviderSearch
            value={query}
            onChange={setQuery}
            placeholder="Search provider name"
            searching={searching}
            results={results}
            selectedId={selected?.companyId}
            onSelect={selectProvider}
          />

          <div className="mt-8">
            <StepHeader n={2}>
              Rate the Selected Legal Service Provider
            </StepHeader>

            {!selected ? (
              <p className="text-sm text-gray-500">
                Select a provider above to choose an assignment and leave a
                rating.
              </p>
            ) : (
              <>
                <label
                  htmlFor="selectedContract"
                  className="mb-1.5 block text-sm font-medium text-gray-800"
                >
                  Select the assignment you want to rate {selected.companyName}{" "}
                  for
                </label>
                <div className="relative">
                  <select
                    className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-10 text-sm text-gray-800 outline-none focus:border-[#11999e] focus:ring-1 focus:ring-[#11999e]/30"
                    value={selectedContractId}
                    onChange={(e) => selectContract(e.target.value)}
                    id="selectedContract"
                  >
                    <option value="">Select contract</option>
                    {contractsForSelected.map((c) => (
                      <option
                        key={String(c.contractId)}
                        value={String(c.contractId)}
                      >
                        {c.requestTitle}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-400"
                    aria-hidden="true"
                  />
                </div>

                {selectedContractId ? (
                  <>
                    <p className="mt-4 text-sm font-semibold text-gray-800">
                      Rate the performance of {selected.companyName} on{" "}
                      {selectedRequestTitle}
                    </p>
                    <p className="mt-1 mb-4 text-sm text-gray-500">
                      Use the sliders to set your rating. You can update your
                      rating anytime.
                    </p>

                    <div className="grid grid-cols-1 gap-5">
                      <RatingSlider
                        label="Quality of Work"
                        value={qow}
                        onChange={setQow}
                        tooltipText="How satisfied were you in general with the quality of the legal advice and documentation provided by the legal service provider?"
                      />
                      <RatingSlider
                        label="Responsiveness & Communication"
                        value={resp}
                        onChange={setResp}
                        tooltipText="Did you receive timely responses and communications from the legal service provider? Was the advice you received clear and actionable or ambiguous analysis without clear value-adding guidance?"
                      />
                      <RatingSlider
                        label="Billing Practices"
                        value={bill}
                        onChange={setBill}
                        tooltipText="Did the legal service provider send invoices within agreed timeframes and with agreed specifications? In case of hourly rate assignments, did the legal service provider in your opinion invoice a reasonable amount of hours in relation to	the legal support that was required?"
                      />
                    </div>

                    {message ? (
                      <p className="mt-4 text-sm text-red-600">{message}</p>
                    ) : null}

                    <button
                      type="button"
                      className="mt-5 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#11999e] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#0e8488] disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={saveRating}
                      disabled={saving}
                    >
                      <Save className="h-4 w-4" aria-hidden="true" />
                      {saving ? "Saving…" : "Save Rating"}
                    </button>
                    <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-gray-500">
                      <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                      Ratings are shown only as a combined average, never
                      attributed to you or your company.
                    </p>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-gray-500">
                    Select a contract above to rate this provider.
                  </p>
                )}
              </>
            )}
          </div>
        </section>

        <section className={CARD}>
          <CardHeading
            icon={Search}
            title="Browse Legal Service Providers"
            subtitle="Browse the legal service providers on LEXIFY and view their average ratings from our member companies."
          />

          <h3 className="mb-3 text-sm font-semibold text-gray-900">
            Find a specific legal service provider on LEXIFY
          </h3>
          <p className="mb-3 text-sm text-gray-500">
            You can search for any legal service provider on LEXIFY to check
            their current rating.
          </p>
          <ProviderSearch
            value={queryAny}
            onChange={setQueryAny}
            placeholder="Search provider name"
            searching={searchingAny}
            results={resultsAny}
            selectedId={selectedAny?.companyId}
            onSelect={selectAnyProvider}
          />

          {selectedAny ? (
            <div className="mt-6 rounded-xl border border-gray-200 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="min-w-0">
                    <ProviderNameLink
                      name={selectedAny.companyName}
                      website={selectedAny.companyWebsite}
                      className="text-lg"
                    />
                    <p className="mt-0.5 text-sm text-gray-500">
                      {aggCount} rating{aggCount === 1 ? "" : "s"} received
                    </p>
                  </div>
                </div>

                {aggLoading ? (
                  <p className="text-sm text-gray-500">Loading ratings…</p>
                ) : aggCount > 0 && aggAny ? (
                  <TotalRatingButton
                    score={aggAny.total}
                    expanded={showBreakdownAny}
                    onToggle={() => setShowBreakdownAny((v) => !v)}
                    ariaLabel="Toggle total rating breakdown"
                  />
                ) : (
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-400">
                      No Ratings Yet
                    </div>
                    <div className="text-xs text-gray-500">Total Rating</div>
                  </div>
                )}
              </div>

              {showBreakdownAny ? (
                <>
                  {aggAny ? (
                    <div className="mt-4 space-y-1 border-t border-gray-200 pt-3">
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
                    </div>
                  ) : null}

                  <div className="mt-5">
                    <h4 className="mb-2 text-sm font-semibold text-gray-900">
                      Category-based ratings
                    </h4>
                    <CategoryRatingsList
                      categoriesToShow={browseCategories}
                      practicalMap={browsePracticalMap}
                      expandedMap={expandedAnyCategories}
                      onToggle={toggleAnyCategoryExpand}
                      categoryHasRatings={categoryHasRatings}
                      getCategoryNumbers={getCategoryNumbers}
                      getEntryCount={getEntryCount}
                    />
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          <div className="mt-8 border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-900">
              View all legal service providers on LEXIFY
            </h3>
            <p className="mt-1 mb-4 text-sm text-gray-500">
              Click below to see all legal service providers currently offering
              services on LEXIFY, along with their ratings.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                className="inline-flex w-full cursor-pointer items-center justify-center rounded-lg bg-[#11999e] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0e8488] sm:w-auto"
                onClick={() => openAllProviders(false)}
              >
                Show all legal service providers
              </button>
              {isAdmin ? (
                <button
                  type="button"
                  className="inline-flex w-full cursor-pointer items-center justify-center rounded-lg bg-[#11999e] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0e8488] sm:w-auto"
                  onClick={() => openAllProviders(true)}
                >
                  (Admin) Show all legal service providers
                </button>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      {showAllModal ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowAllModal(false);
          }}
        >
          <div className="relative max-h-[80vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 text-black shadow-[0_16px_44px_rgba(17,153,158,0.22)] ring-1 ring-black/10 sm:p-8">
            <button
              type="button"
              className="absolute top-4 right-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
              onClick={() => setShowAllModal(false)}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="pr-10 text-xl font-semibold text-gray-900">
              LEXIFY Legal Service Providers
            </h3>
            <p className="mt-1 mb-5 text-sm text-gray-500">
              Browse every legal service provider on LEXIFY and their aggregated
              ratings.
            </p>

            {loadingAll ? (
              <div className="text-sm text-gray-500">Loading providers…</div>
            ) : errorAll ? (
              <div className="text-sm text-red-600">{errorAll}</div>
            ) : allProviders.length === 0 ? (
              <div className="text-sm text-gray-500">
                No legal service providers found.
              </div>
            ) : (
              <div className="space-y-4">
                {allProviders.map((p) => {
                  const practicalMap = normalizePracticalRatings(p);
                  const categoriesToShow = Array.from(
                    new Set([
                      ...PRACTICAL_CATEGORIES,
                      ...Object.keys(practicalMap || {}),
                    ]),
                  ).filter(Boolean);
                  const ratingCount = Array.isArray(p.providerIndividualRating)
                    ? p.providerIndividualRating.length
                    : 0;
                  const hasTotalRatings = ratingCount > 0;
                  const totalExpanded =
                    expandedProviders?.[p.companyId]?.__TOTAL__ ?? false;

                  return (
                    <div
                      key={String(p.companyId)}
                      className="rounded-xl border border-gray-200 p-4 sm:p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="min-w-0">
                            <ProviderNameLink
                              name={p.companyName}
                              website={p.companyWebsite}
                              className="text-lg"
                            />
                            <p className="mt-0.5 text-sm text-gray-500">
                              {ratingCount} rating
                              {ratingCount === 1 ? "" : "s"} received
                            </p>
                          </div>
                        </div>

                        {hasTotalRatings ? (
                          <TotalRatingButton
                            score={p.providerTotalRating}
                            expanded={totalExpanded}
                            onToggle={() =>
                              toggleProviderCategoryExpand(
                                p.companyId,
                                "__TOTAL__",
                              )
                            }
                            ariaLabel={`Toggle total rating breakdown for ${p.companyName || "provider"}`}
                          />
                        ) : (
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-400">
                              No Ratings Yet
                            </div>
                          </div>
                        )}
                      </div>

                      {totalExpanded && hasTotalRatings ? (
                        <>
                          <div className="mt-4 space-y-1 border-t border-gray-200 pt-3">
                            <div className="mb-2 text-sm text-gray-500">
                              {ratingCount} rating
                              {ratingCount === 1 ? "" : "s"} received
                            </div>
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

                          <div className="mt-5">
                            <h4 className="mb-2 text-sm font-semibold text-gray-900">
                              Category-based ratings
                            </h4>
                            <CategoryRatingsList
                              categoriesToShow={categoriesToShow}
                              practicalMap={practicalMap}
                              expandedMap={
                                expandedProviders?.[p.companyId] || {}
                              }
                              onToggle={(categoryKey) =>
                                toggleProviderCategoryExpand(
                                  p.companyId,
                                  categoryKey,
                                )
                              }
                              categoryHasRatings={categoryHasRatings}
                              getCategoryNumbers={getCategoryNumbers}
                              getEntryCount={getEntryCount}
                            />
                          </div>
                        </>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </HubShell>
  );
}
