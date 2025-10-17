"use client";

import { useEffect, useMemo, useState } from "react";
import QuestionMarkTooltip from "../../components/QuestionmarkTooltip";

// ⭐ half-star rating widget
function StarInput({ value, onChange, label }) {
  // values are 0..5 in steps of 0.5
  const steps = useMemo(
    () => Array.from({ length: 10 }, (_, i) => (i + 1) * 0.5),
    []
  );
  return (
    <div className="space-y-1">
      <div className="text-sm font-semibold">{label}</div>
      <div className="flex items-center gap-1">
        {steps.map((step) => {
          const filled = value >= step;
          return (
            <button
              key={step}
              type="button"
              onClick={() => onChange(step)}
              className="p-0.5"
              aria-label={`${label} ${step} stars`}
              title={`${step} / 5`}
            >
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <defs>
                  <clipPath id={`half-${label}-${step}`}>
                    <rect x="0" y="0" width="12" height="24" />
                  </clipPath>
                </defs>
                <path
                  d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.401 8.163L12 18.896l-7.335 3.864 1.401-8.163L.132 9.21l8.2-1.192z"
                  fill="none"
                  stroke="#999"
                  strokeWidth="1"
                />
                <path
                  d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.401 8.163L12 18.896l-7.335 3.864 1.401-8.163L.132 9.21l8.2-1.192z"
                  clipPath={`url(#half-${label}-${step})`}
                  fill={
                    value >= Math.floor(step * 2) / 2 - 0.5
                      ? "#f59e0b"
                      : "transparent"
                  }
                />
                <path
                  d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.401 8.163L12 18.896l-7.335 3.864 1.401-8.163L.132 9.21l8.2-1.192z"
                  fill={filled ? "#f59e0b" : "transparent"}
                />
              </svg>
            </button>
          );
        })}
        <span className="ml-2 text-sm text-gray-700">
          {value.toFixed(1)} / 5
        </span>
      </div>
    </div>
  );
}

function AggregateRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <span className="font-semibold">{value?.toFixed(2) ?? "0.00"} / 5</span>
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
  const [aggLoading, setAggLoading] = useState(false);

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
    try {
      const res = await fetch(`/api/providers/${p.userId}/rating`, {
        cache: "no-store",
      });
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
  const selectAnyProvider = async (p) => {
    setSelectedAny(p);
    setAggAny(null);
    setAggLoading(true);
    try {
      const res = await fetch(`/api/providers/${p.userId}/rating`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setAggAny(data?.aggregates ?? null);
      } else {
        setAggAny(null);
      }
    } catch {
      setAggAny(null);
    } finally {
      setAggLoading(false);
    }
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
                    className={`p-2 text-sm cursor-pointer hover:bg-gray-100 ${
                      isSel ? "bg-gray-100" : ""
                    }`}
                    onClick={() => selectProvider(r)}
                  >
                    <div className="font-medium">
                      {r.companyName || "(no company name)"}
                    </div>
                    <div className="text-xs text-gray-600">
                      Username: {r.username}
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
            Rate: {selected.companyName}
          </h3>
          <p className="text-sm text-gray-700 mb-4">
            Click stars (half-stars supported). You can update your rating
            anytime.
          </p>

          <div className="grid grid-cols-1 gap-4">
            <StarInput label="Quality of Work" value={qow} onChange={setQow} />{" "}
            <QuestionMarkTooltip tooltipText="How satisfied were you in general with the quality of the legal advice and documentation provided by the legal service provider?" />
            <StarInput
              label="Responsiveness & Communication"
              value={resp}
              onChange={setResp}
            />{" "}
            <QuestionMarkTooltip tooltipText="Did you receive timely responses and communications from the legal service provider? Was the advice you received clear and actionable or ambiguous analysis without clear value-adding guidance?" />
            <StarInput
              label="Billing Practices"
              value={bill}
              onChange={setBill}
            />{" "}
            <QuestionMarkTooltip tooltipText="Did the legal service provider send invoices within agreed timeframes and with agreed specifications? In case of hourly rate assignments, did the legal service provider in your opinion invoice a reasonable amount of hours in relation to	the legal support that was required?" />
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              className="bg-[#11999e] text-white px-4 py-2 rounded disabled:opacity-50"
              onClick={saveRating}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save Rating"}
            </button>
            {message && <div className="text-sm text-gray-700">{message}</div>}
          </div>
        </div>
      )}
      <br />
      <br />
      <h1 className="text-2xl font-bold">
        Check Aggregated Rating of a Legal Service Provider
      </h1>
      {/* Card 2: Search ANY provider (show read-only aggregates) */}
      <div className="w-full max-w-3xl p-6 mt-5 rounded shadow-2xl bg-white text-black">
        <h2 className="text-xl font-semibold mb-2">
          Find any legal service provider on LEXIFY
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
                      isSel ? "bg-gray-100" : ""
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
          <div className="mt-5 border rounded p-4">
            <div className="text-lg font-semibold mb-2">
              {selectedAny.companyName}
            </div>
            {aggLoading ? (
              <div className="text-sm text-gray-600">Loading ratings…</div>
            ) : aggAny ? (
              <div className="space-y-2">
                <AggregateRow label="Total" value={aggAny.total ?? 0} />
                <AggregateRow
                  label="Quality of Work"
                  value={aggAny.quality ?? 0}
                />{" "}
                <QuestionMarkTooltip tooltipText="How satisfied were you in general with the quality of the legal advice and documentation provided by the legal service provider?" />
                <AggregateRow
                  label="Responsiveness & Communication"
                  value={aggAny.communication ?? 0}
                />{" "}
                <QuestionMarkTooltip tooltipText="Did you receive timely responses and communications from the legal service provider? Was the advice you received clear and actionable or ambiguous analysis without clear value-adding guidance?" />
                <AggregateRow
                  label="Billing Practices"
                  value={aggAny.billing ?? 0}
                />{" "}
                <QuestionMarkTooltip tooltipText="Did the legal service provider send invoices within agreed timeframes and with agreed specifications? In case of hourly rate assignments, did the legal service provider in your opinion invoice a reasonable amount of hours in relation to	the legal support that was required?" />
              </div>
            ) : (
              <div className="text-sm text-gray-600">
                No ratings available yet.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
