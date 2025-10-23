"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import QuestionMarkTooltip from "../../components/QuestionmarkTooltip";

// ---------------- small helpers ----------------
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

// ---------------- PreviewModal parity helpers ----------------
// (Mirrors the resolver logic used in your PreviewModal so values match exactly.)
function deepGet(obj, dotted) {
  try {
    return dotted
      .split(".")
      .reduce((o, k) => (o == null ? undefined : o[k]), obj);
  } catch {
    return undefined;
  }
}
function isYesString(v) {
  return typeof v === "string" ? v.trim().toLowerCase() === "yes" : v === true;
}
function formatLocalDDMMYYYY_HHMM(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(
    date.getMonth() + 1
  )}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function parseIfDateLike(value, pathHint) {
  const hint = (pathHint || "").toLowerCase();
  const looksLikeDateByPath =
    hint.includes("deadline") ||
    hint.includes("date") ||
    hint.includes("expire");
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "string") {
    const s = value.trim();
    if (
      looksLikeDateByPath ||
      /^\d{4}-\d{2}-\d{2}t\d{2}:/i.test(s) ||
      /z$/i.test(s)
    ) {
      const d = new Date(s);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?$/.test(s)) {
      const d = new Date(s.replace(" ", "T"));
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }
  return looksLikeDateByPath ? new Date(value) : null;
}

function buildClientLine(row) {
  const name =
    row?.client?.companyName ||
    row.companyName ||
    row.clientName ||
    row?.purchaser?.companyName ||
    null;
  const id =
    row?.client?.companyId ||
    row.companyId ||
    row.businessId ||
    row?.purchaser?.companyId ||
    null;
  const country =
    row?.client?.companyCountry ||
    row.companyCountry ||
    row.country ||
    row?.purchaser?.companyCountry ||
    null;
  const parts = [name, id, country].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}
function getAssignmentType(row) {
  return row?.assignmentType ?? row?.details?.assignmentType ?? "";
}
function winnerOnly(row) {
  const status = (
    row?.details?.winnerBidderOnlyStatus ||
    row?.winnerBidderOnlyStatus ||
    ""
  ).trim();
  const confidentialYes =
    isYesString(row?.details?.confidential) || isYesString(row?.confidential);
  if (confidentialYes || status === "Disclosed to Winning Bidder Only") {
    return "Disclosed to Winning Bidder Only";
  }
  return "";
}
function counterpartyOrWinnerOnly(row) {
  const w = winnerOnly(row);
  if (w) return w;
  return (
    row?.details?.breachCompany ||
    row?.details?.counterparty ||
    row?.details?.winnerBidderOnlyStatus ||
    row?.counterparty ||
    "—"
  );
}
function priceModel(row) {
  const rate = row.paymentRate || "—";
  const ccy = row.currency || "";
  const max =
    typeof row.maximumPrice === "number"
      ? ` / Max ${row.maximumPrice.toLocaleString(undefined, {
          minimumFractionDigits: 0,
        })}`
      : "";
  return `${rate}${ccy ? ` (${ccy})` : ""}${max}`;
}
function docsWithOther(row) {
  const fromDetails =
    row?.details?.documentTypes ||
    row?.details?.documents ||
    row?.scopeOfWork ||
    "";
  const other = row?.details?.otherDocument || row?.details?.otherArea || "";
  return [fromDetails, other].filter(Boolean).join(", ") || "—";
}
function supportWithDueDiligence(row) {
  const base = row?.scopeOfWork || "—";
  const dd =
    row?.details?.dueDiligence &&
    row.details.dueDiligence !== "Legal Due Diligence inspection not needed"
      ? ` (Due Diligence: ${row.details.dueDiligence})`
      : "";
  return `${base}${dd}`;
}
function resolvePath(row, path) {
  if (!path) return "—";

  // Virtuals used in PreviewModal / JSON defs
  if (path.startsWith("__")) {
    switch (path) {
      case "__clientLine__":
        return buildClientLine(row);
      case "__clientLineOrDisclosed__":
        return winnerOnly(row) || buildClientLine(row);
      case "__counterpartyConfidential__":
        return counterpartyOrWinnerOnly(row);
      case "primaryContactPerson":
      case "details.primaryContactPerson":
        return (
          row?.primaryContactPerson ?? row?.details?.primaryContactPerson ?? "—"
        );

      case "currency":
      case "details.currency":
        return row?.currency ?? row?.details?.currency ?? "—";

      case "invoiceType":
      case "details.invoiceType":
        return row?.invoiceType ?? row?.details?.invoiceType ?? "—";

      case "advanceRetainerFee":
      case "details.advanceRetainerFee":
        return (
          row?.advanceRetainerFee ?? row?.details?.advanceRetainerFee ?? "—"
        );

      case "additionalBackgroundInfo":
      case "details.additionalBackgroundInfo":
      case "details.background":
        return (
          row?.additionalBackgroundInfo ??
          row?.details?.additionalBackgroundInfo ??
          row?.details?.background ??
          "—"
        );

      case "__currencyMax__":
        return [
          row.currency || row?.details?.currency || "—",
          row.maximumPrice ?? "—",
        ]
          .filter(Boolean)
          .join(" / ");
      case "__priceModel__":
      case "__priceModel_LumpSumWithCurrency__":
      case "__priceModel_HourlyWithCurrency__":
      case "__priceModel_Arbitration__":
      case "__priceModel_Court__":
        return priceModel(row);
      case "__docsWithOther__":
        return docsWithOther(row);
      case "__supportWithDueDiligenceFormat__":
        return supportWithDueDiligence(row);
      default:
        return "—";
    }
  }

  // Smart fallbacks for commonly missing fields
  switch (path) {
    case "assignmentType":
      return getAssignmentType(row) || "—";

    case "primaryContactPerson":
    case "details.primaryContactPerson":
      return (
        row?.primaryContactPerson ?? row?.details?.primaryContactPerson ?? "—"
      );

    case "currency":
    case "details.currency":
      return row?.currency ?? row?.details?.currency ?? "—";

    case "invoiceType":
    case "details.invoiceType":
      return row?.invoiceType ?? row?.details?.invoiceType ?? "—";

    case "advanceRetainerFee":
    case "details.advanceRetainerFee":
      return row?.advanceRetainerFee ?? row?.details?.advanceRetainerFee ?? "—";

    case "additionalBackgroundInfo":
    case "details.additionalBackgroundInfo":
    case "details.background":
      return (
        row?.additionalBackgroundInfo ??
        row?.details?.additionalBackgroundInfo ??
        row?.details?.background ??
        "—"
      );

    case "language":
    case "details.language":
      // support CSV string or array
      if (Array.isArray(row?.language)) return row.language.join(", ");
      if (Array.isArray(row?.details?.language))
        return row.details.language.join(", ");
      return row?.language ?? row?.details?.language ?? "—";

    default:
      // Generic nested getter
      const v = deepGet(row, path);
      return v ?? "—";
  }
}

function renderValue(v, pathHint) {
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  if (v === null || v === undefined || v === "") return "—";
  const maybeDate = parseIfDateLike(v, pathHint);
  if (maybeDate) return formatLocalDDMMYYYY_HHMM(maybeDate);
  return String(v);
}
function renderNamedBlock(name, row, deadline) {
  switch (name) {
    case "companyHeader":
      return buildClientLine(row);
    case "description":
      return row?.description || "—";
    case "assignmentType":
      return getAssignmentType(row) || "—";
    case "languageCSV":
      return Array.isArray(row?.language)
        ? row.language.join(", ")
        : row?.language || "—";
    case "date": {
      const d =
        parseIfDateLike(row?.offersDeadline, "offersDeadline") ||
        parseIfDateLike(row?.dateExpired, "dateExpired") ||
        parseIfDateLike(deadline, "deadline");
      return d ? formatLocalDDMMYYYY_HHMM(d) : "—";
    }
    default:
      return "—";
  }
}

function getFirstByPath(row, paths = []) {
  for (const p of paths) {
    const v = p === "." ? row : deepGet(row, p);
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

// Label-based alias fallback when the field path misses:
function resolveByLabel(row, labelRaw) {
  if (!labelRaw) return undefined;
  const label = String(labelRaw).trim().toLowerCase();

  if (label === "primary contact person") {
    return getFirstByPath(row, [
      "primaryContactPerson",
      "details.primaryContactPerson",
      "client.primaryContactPerson",
      "clientContactPerson",
      "contactPerson",
    ]);
  }

  if (label === "currency") {
    return getFirstByPath(row, [
      "currency",
      "details.currency",
      "requestCurrency",
    ]);
  }

  if (label === "invoice type" || label === "invoicing") {
    return getFirstByPath(row, [
      "invoiceType",
      "details.invoiceType",
      "paymentTerms",
    ]);
  }

  if (label === "advance retainer fee") {
    return getFirstByPath(row, [
      "advanceRetainerFee",
      "details.advanceRetainerFee",
      "retainerFee",
    ]);
  }

  if (label === "assignment type") {
    // keep using the same resolver you already have
    return getAssignmentType(row);
  }

  if (
    label === "additional background information" ||
    label === "background information"
  ) {
    return getFirstByPath(row, [
      "additionalBackgroundInfo",
      "details.additionalBackgroundInfo",
      "details.background",
    ]);
  }

  return undefined;
}

// -------- filtering (hide provider requirements + five specific fields) -------
const HIDE_PATHS = new Set([
  // Provider requirement fields to hide
  "serviceProviderType",
  "domesticOffers",
  "providerSize",
  "providerCompanyAge",
  "providerMinimumRating",
  "details.serviceProviderType",
  "details.domesticOffers",
  "details.providerSize",
  "details.providerCompanyAge",
  "details.providerMinimumRating",

  // Additional fields to hide
  "offersDeadline",
  "details.offersDeadline",
  "dateExpired",
  "details.dateExpired",
  "title",
  "requestTitle",
  "requestState",
  "maximumPrice",
  "details.maximumPrice",
]);

function looksLikeProviderReqSection(section) {
  const key = (section?.id || section?.name || section?.title || "")
    .toString()
    .toLowerCase();
  return (
    key.includes("provider requirement") ||
    key.includes("provider_requirements")
  );
}

function shouldHideField(field) {
  const path = (field?.path || "").toString();
  if (HIDE_PATHS.has(path)) return true;

  const label = (field?.label || "").toString().toLowerCase();

  // Label-based fallbacks (in case path differs)
  if (
    label === "service provider type" ||
    label === "domestic offers" ||
    label === "minimum provider size" ||
    label === "minimum company age" ||
    label === "minimum rating" ||
    label.includes("provider size") ||
    label.includes("company age")
  ) {
    return true;
  }

  // Hide these by label too, if present
  if (
    label === "offers deadline" ||
    label === "request title" ||
    label === "request state" ||
    label === "date expired" ||
    label === "maximum price"
  ) {
    return true;
  }

  return false;
}

// ---------------- page ----------------
export default function MakeOffer() {
  const router = useRouter();
  const params = useSearchParams();
  const requestId = params.get("requestId");

  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [defs, setDefs] = useState(null);

  // form state (UNCHANGED)
  const [offerLawyer, setOfferLawyer] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [offerExpectedPrice, setOfferExpectedPrice] = useState("");
  const [offerTitle, setOfferTitle] = useState("");
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const paymentRate = (request?.paymentRate || "").toLowerCase();
  const isCapped = paymentRate.startsWith("capped price");
  const deadline =
    request?.details?.offersDeadline || request?.dateExpired || null;

  useEffect(() => {
    if (!requestId) return;
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const [reqRes, conRes, defRes] = await Promise.all([
          fetch(`/api/requests/${requestId}`, { cache: "no-store" }),
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

  const def = useMemo(() => {
    // Always call the hook; handle nulls inside.
    if (!defs || !request) return null;
    const list = Array.isArray(defs.requests) ? defs.requests : [];
    return (
      list.find(
        (d) =>
          (d.category || "") === (request.requestCategory || "") &&
          (d.subcategory || null) === (request.requestSubcategory ?? null) &&
          (d.assignmentType || null) === (request.assignmentType ?? null)
      ) ||
      list.find(
        (d) =>
          (d.category || "") === (request.requestCategory || "") &&
          (d.subcategory || null) === (request.requestSubcategory ?? null)
      ) ||
      list.find((d) => (d.category || "") === (request.requestCategory || ""))
    );
  }, [defs, request]);

  const canSubmit =
    !!requestId &&
    !!offerLawyer &&
    !!offerPrice &&
    !!offerTitle &&
    (!isCapped || !!offerExpectedPrice) && // ← only require when capped
    agree &&
    !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      setSubmitting(true);
      const payload = {
        requestId: requestId,
        offerLawyer,
        offerPrice,
        offerTitle,
      };
      if (isCapped) {
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
      alert("Your offer has been successfully submitted!");
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

  return (
    <div className="flex flex-col items-center min-h-screen p-6">
      <h1 className="text-3xl font-bold mb-4 text-center">
        Review LEXIFY Request and Submit Offer
      </h1>

      <div className="w-full max-w-7xl rounded shadow-2xl bg-white text-black p-0 overflow-hidden">
        {/* ---------- PREVIEW (PreviewModal-equivalent, with filtering) ---------- */}
        <div className="space-y-6 p-6">
          {!def ? (
            <div className="p-3 border rounded bg-gray-50 text-black">
              No matching preview definition found.
            </div>
          ) : (
            (def.preview?.sections || [])
              .filter((section) => !looksLikeProviderReqSection(section))
              .map((section, si) => {
                // If this is a fields-table section, strip hidden fields.
                const fields = Array.isArray(section.fields)
                  ? section.fields.filter((f) => !shouldHideField(f))
                  : null;

                // If all fields got filtered out, skip rendering the section entirely.
                if (Array.isArray(section.fields) && fields.length === 0)
                  return null;

                return (
                  <Section key={si} title={section.title || "—"}>
                    {Array.isArray(fields) ? (
                      <table className="w-full">
                        <tbody>
                          {fields.map((f, fi) => {
                            const label = f.label || "—";
                            // 1) try by path (your resolvePath already checks top-level + details)
                            let raw = resolvePath(request, f.path);
                            let display = renderValue(raw, f.path);

                            // 2) if still empty, try by label aliases (pull “straight from the request”)
                            if (display === "—") {
                              const byLabel = resolveByLabel(request, label);
                              if (byLabel !== undefined) {
                                raw = byLabel;
                                display = renderValue(raw, f.path);
                              }
                            }

                            return (
                              <tr key={fi} className="border-t">
                                <td className="py-1 pr-4 font-semibold align-top w-1/3">
                                  {label}
                                </td>
                                <td className="py-1 align-top">{display}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : section.value ? (
                      <div className="p-1">
                        {renderNamedBlock(section.value, request, deadline)}
                      </div>
                    ) : (
                      "—"
                    )}
                  </Section>
                );
              })
          )}
        </div>

        <div className="h-px w-full bg-gray-200" />

        {/* ---------------------- OFFER FORM (unchanged) ---------------------- */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block font-semibold mb-2">
              Offer Title{" "}
              <QuestionMarkTooltip
                tooltipText="This title will not be shown to the client and will only be used
              in your personal offer archive (see My Dashboard in the LEXIFY
              main menu)."
              />
            </label>
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
              {isCapped ? (
                <>
                  Insert Your Offered Capped Price (VAT 0%){" "}
                  <QuestionMarkTooltip tooltipText="Capped price refers to your offered maximum price for the work, taking into account all possible unexpected developments in the dispute proceedings such as an unusually high number of rounds of written pleadings." />
                </>
              ) : (
                "Insert Your Offered Price (VAT 0%)"
              )}
            </label>
            <input
              type="text"
              inputMode="numeric"
              className="border p-2 w-full rounded"
              placeholder={
                paymentRate === "capped price"
                  ? "Insert your offered capped price"
                  : "Insert offered price"
              }
              value={offerPrice}
              onChange={(e) =>
                setOfferPrice(e.target.value.replace(/[^\d.]/g, ""))
              }
              required
            />
          </div>

          {isCapped && (
            <div>
              <label className="block font-semibold mb-2">
                Insert Your Expected Price (VAT 0%){" "}
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
          <p className="text-xs">
            <em>
              <strong>
                By submitting my offer I accept that, if my offer becomes the
                winning offer upon the expiration of the related LEXIFY Request,
                LEXIFY will automatically generate a binding LEXIFY Contract
                between my company as the legal service provider and the client
                as the legal service purchaser. Such LEXIFY Contract will
                consist of i) the service description, other specifications and
                the client&apos;s Supplier Code of Conduct and other procurement
                related requirements (if applicable) as designated by the client
                in the related LEXIFY Request and ii) the General Terms and
                Conditions for LEXIFY Contracts.
              </strong>
            </em>
          </p>
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
