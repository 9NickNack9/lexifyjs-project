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
  const [aggCount, setAggCount] = useState(0);
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
    setAggCount(0);
    setAggLoading(true);
    try {
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
          <p className="text-sm text-gray-700 mb-4">
            Use the sliders to set your rating for {selected.companyName}. You
            can update your rating anytime.
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
                    <AggregateRow label="Total" value={aggAny.total ?? 0} />
                    <AggregateRow
                      label="Quality of Work"
                      value={aggAny.quality ?? 0}
                      tooltipText="How satisfied were you in general with the quality of the legal advice and documentation provided by the legal service provider?"
                    />
                    <AggregateRow
                      label="Responsiveness & Communication"
                      value={aggAny.communication ?? 0}
                      tooltipText="Did you receive timely responses and communications from the legal service provider? Was the advice you received clear and actionable or ambiguous analysis without clear value-adding guidance?"
                    />
                    <AggregateRow
                      label="Billing Practices"
                      value={aggAny.billing ?? 0}
                      tooltipText="Did the legal service provider send invoices within agreed timeframes and with agreed specifications? In case of hourly rate assignments, did the legal service provider in your opinion invoice a reasonable amount of hours in relation to the legal support that was required?"
                    />
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Total</span>
                      <span className="font-semibold">No Ratings Yet</span>
                    </div>
                    {/* Sub rating rows are intentionally hidden when there are no ratings */}
                  </>
                )}
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
