"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import QuestionMarkTooltip from "../../components/QuestionmarkTooltip";

// ---- small helpers ----
const pad2 = (n) => String(n).padStart(2, "0");
const fmtLocalDDMMYYYY_HHMM = (isoish) => {
  const d = new Date(isoish);
  if (Number.isNaN(d.getTime())) return "—";
  return `${pad2(d.getDate())}/${pad2(
    d.getMonth() + 1
  )}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};
const formatTimeUntil = (end) => {
  const d = new Date(end);
  if (Number.isNaN(d.getTime())) return "";
  const ms = d.getTime() - Date.now();
  if (ms <= 0) return "";
  const s = Math.floor(ms / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  if (days > 0) return `${days} day${days !== 1 ? "s" : ""} ${hours} h`;
  if (hours > 0) return `${hours} h ${mins} min`;
  return `${mins} min`;
};

// ---- PreviewModal-like renderer (reads /previews/all-previews.json) ----
function Section({ title, children }) {
  return (
    <div>
      <div className="bg-[#11999e] p-2 rounded-t">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      <div className="p-4 border-x border-b rounded-b bg-white text-black">
        {children ?? "—"}
      </div>
    </div>
  );
}

function valueAtPath(obj, path) {
  if (!path) return undefined;
  return path.split(".").reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}

function isProviderReqSection(section) {
  const key = (section?.id || section?.name || section?.title || "")
    .toString()
    .toLowerCase();
  return (
    key.includes("provider requirement") ||
    key.includes("provider_requirements")
  );
}

function maybeFormatDate(v, pathHint) {
  const hint = (pathHint || "").toLowerCase();
  const looksDate =
    hint.includes("deadline") ||
    hint.includes("date") ||
    hint.includes("expire");
  if (v == null) return null;
  if (v instanceof Date) return v;
  if (typeof v === "number") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "string") {
    const s = v.trim();
    const iso = /^\d{4}-\d{2}-\d{2}t\d{2}:/i.test(s) || /z$/i.test(s);
    if (iso || looksDate) {
      const d = new Date(s);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?$/.test(s)) {
      const d = new Date(s.replace(" ", "T"));
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }
  return null;
}

function renderCell(value, pathHint) {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (value === null || value === undefined || value === "") return "—";
  const maybe = maybeFormatDate(value, pathHint);
  if (maybe)
    return `${fmtLocalDDMMYYYY_HHMM(maybe)} (${
      formatTimeUntil(maybe) || "expired"
    })`;
  return String(value);
}

export default function MakeOffer() {
  const router = useRouter();
  const params = useSearchParams();
  const requestId = params.get("requestId");

  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(null);
  const [contacts, setContacts] = useState([]); // strings (full names) from /api/me/contacts
  const [defs, setDefs] = useState(null); // preview definitions JSON
  const [agree, setAgree] = useState(false);

  const [offerLawyer, setOfferLawyer] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [offerExpectedPrice, setOfferExpectedPrice] = useState("");
  const [offerTitle, setOfferTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const paymentRate = (request?.paymentRate || "").toLowerCase();
  const deadline =
    request?.details?.offersDeadline || request?.dateExpired || null;

  useEffect(() => {
    if (!requestId) return;
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const [reqRes, conRes, defRes] = await Promise.all([
          fetch(`/api/requests/public/${requestId}`, { cache: "no-store" }),
          fetch(`/api/me/contacts`, { cache: "no-store" }),
          fetch(`/previews/all-previews.json`, { cache: "no-store" }),
        ]);
        const reqJson = reqRes.ok ? await reqRes.json() : null;
        const conJson = conRes.ok ? await conRes.json() : { contacts: [] };
        const defJson = defRes.ok ? await defRes.json() : null;
        if (!active) return;
        setRequest(reqJson);
        setContacts(Array.isArray(conJson?.contacts) ? conJson.contacts : []);
        setDefs(defJson);
        // default offer title
        const baseTitle =
          reqJson?.title || reqJson?.requestTitle || "LEXIFY Offer";
        setOfferTitle(`Offer for ${baseTitle}`);
      } catch {
        if (!active) return;
        setRequest(null);
        setContacts([]);
        setDefs(null);
      } finally {
        if (!active) return;
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [requestId]);

  const canSubmit =
    !!requestId &&
    !!offerLawyer &&
    !!offerPrice &&
    !!offerTitle &&
    (paymentRate !== "capped price" || !!offerExpectedPrice) &&
    agree &&
    !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      setSubmitting(true);
      const payload = {
        requestId: Number(requestId),
        offerLawyer,
        offerPrice,
        offerTitle,
      };
      if (paymentRate === "capped price") {
        payload.offerExpectedPrice = offerExpectedPrice;
      }
      const res = await fetch(`/api/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error || `Failed to submit offer (${res.status})`);
        return;
      }
      router.push("/provider-request");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="p-4 bg-white text-black rounded border">Loading…</div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="p-4 bg-white text-black rounded border">
          Request not found.
        </div>
      </div>
    );
  }

  // ---- dynamic preview selection ----
  // assume definitions are structured with keys by category or generic "default"
  const categoryKey =
    request.requestCategory || request.category || request.type || "default";

  const previewDef = defs?.[categoryKey] || defs?.default || null;

  // Basic fallback blocks if definitions missing
  const fallbackBlocks = [
    {
      title: "Client",
      render: () => {
        const name =
          request?.client?.companyName || request?.companyName || "—";
        const id = request?.client?.companyId || request?.companyId || null;
        const country =
          request?.client?.companyCountry || request?.companyCountry || null;
        return [name, id, country].filter(Boolean).join(", ");
      },
    },
    { title: "Scope of Work", render: () => request?.scopeOfWork || "—" },
    { title: "Description", render: () => request?.description || "—" },
    { title: "Payment Rate", render: () => request?.paymentRate || "—" },
    {
      title: "Languages",
      render: () =>
        Array.isArray(request?.language)
          ? request.language.join(", ")
          : request?.language || "—",
    },
    {
      title: "Deadline for Offers",
      render: () =>
        deadline
          ? `${fmtLocalDDMMYYYY_HHMM(deadline)} (${
              formatTimeUntil(deadline) || "expired"
            })`
          : "—",
    },
    {
      title: "Category / Subcategory",
      render: () =>
        `${request?.requestCategory || "—"} / ${
          request?.requestSubcategory || "—"
        }`,
    },
  ];

  const sections = Array.isArray(previewDef?.sections)
    ? previewDef.sections
    : null;
  const filteredSections = sections
    ? sections.filter((s) => !isProviderReqSection(s))
    : null;

  return (
    <div className="flex flex-col items-center min-h-screen p-6">
      <h1 className="text-3xl font-bold mb-4 text-center">
        Review LEXIFY Request and Submit Offer
      </h1>

      <div className="w-full max-w-7xl rounded shadow-2xl bg-white text-black p-0 overflow-hidden">
        {/* PREVIEW (dynamic like PreviewModal) */}
        <div className="space-y-6 p-6">
          {filteredSections
            ? filteredSections.map((section, idx) => {
                // section can be { title, rows:[{ label, path | named }] }
                return (
                  <Section key={idx} title={section.title || "—"}>
                    {Array.isArray(section.rows) && section.rows.length > 0 ? (
                      <table className="w-full">
                        <tbody>
                          {section.rows.map((row, i) => {
                            // Support either named blocks or path-based
                            const label = row.label || row.title || "—";
                            let value = "—";
                            if (row.named) {
                              // small named variants that PreviewModal likely has
                              if (row.named === "companyHeader") {
                                const name =
                                  request?.client?.companyName ||
                                  request?.companyName ||
                                  null;
                                const id =
                                  request?.client?.companyId ||
                                  request?.companyId ||
                                  null;
                                const country =
                                  request?.client?.companyCountry ||
                                  request?.companyCountry ||
                                  null;
                                const parts = [name, id, country].filter(
                                  Boolean
                                );
                                value = parts.length ? parts.join(", ") : "—";
                              } else if (row.named === "languageCSV") {
                                value = Array.isArray(request?.language)
                                  ? request.language.join(", ")
                                  : request?.language || "—";
                              } else if (row.named === "date") {
                                const d = deadline;
                                value = d
                                  ? `${fmtLocalDDMMYYYY_HHMM(d)} (${
                                      formatTimeUntil(d) || "expired"
                                    })`
                                  : "—";
                              } else {
                                value = "—";
                              }
                            } else if (row.path) {
                              const v = valueAtPath(request, row.path);
                              value = renderCell(v, row.path);
                            }
                            return (
                              <tr key={i}>
                                <td className="py-1 pr-4 font-semibold align-top">
                                  {label}
                                </td>
                                <td className="py-1">{value}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      "—"
                    )}
                  </Section>
                );
              })
            : // Fallback if no definitions found
              fallbackBlocks.map((b, i) => (
                <Section key={i} title={b.title}>
                  {b.render()}
                </Section>
              ))}
        </div>

        <div className="h-px w-full bg-gray-200" />

        {/* OFFER FORM */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block font-semibold mb-2">Offer Title</label>
            <input
              type="text"
              className="border p-2 w-full rounded"
              value={offerTitle}
              onChange={(e) => setOfferTitle(e.target.value)}
              placeholder="Offer title (displayed to client)"
              required
            />
          </div>

          <div>
            <label className="block font-semibold mb-2">
              Select Partner/Lawyer Responsible for the Offer
            </label>
            <select
              className="w-full border p-2 rounded"
              value={offerLawyer}
              onChange={(e) => setOfferLawyer(e.target.value)}
              required
            >
              <option value="">Select Partner/Lawyer</option>
              {contacts.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-2">
              Offer Price (VAT 0%)
            </label>
            <input
              type="text"
              inputMode="numeric"
              className="border p-2 w-full rounded"
              placeholder="Insert offered price"
              value={offerPrice}
              onChange={(e) =>
                setOfferPrice(e.target.value.replace(/[^\d.]/g, ""))
              }
              required
            />
          </div>

          {paymentRate === "capped price" && (
            <div>
              <label className="block font-semibold mb-2">
                Insert your expected price for the work (VAT 0%){" "}
                <QuestionMarkTooltip tooltipText="Expected price refers to your expected price for the work if the dispute proceedings do not involve any unexpected developments (such as an unusually high number of rounds of written pleadings)." />
              </label>
              <input
                type="text"
                inputMode="numeric"
                className="border p-2 w-full rounded"
                placeholder="Insert expected price"
                value={offerExpectedPrice}
                onChange={(e) =>
                  setOfferExpectedPrice(e.target.value.replace(/[^\d.]/g, ""))
                }
                required
              />
            </div>
          )}

          <label className="block">
            <input
              type="checkbox"
              className="mr-2"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              required
            />
            I have carefully reviewed the LEXIFY Request and I am ready to
            submit my offer.
          </label>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={!canSubmit}
              className="p-2 bg-[#11999e] text-white rounded cursor-pointer disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit Offer"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/provider-request")}
              className="p-2 bg-red-500 text-white rounded"
            >
              Exit Without Submitting an Offer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
