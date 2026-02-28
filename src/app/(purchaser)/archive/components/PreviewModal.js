"use client";

import { useEffect, useMemo, useState } from "react";
import { fmtMoney } from "../utils/format";

function formatLocalDDMMYYYY_HHMM(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  const dd = pad(date.getDate());
  const mm = pad(date.getMonth() + 1);
  const yyyy = date.getFullYear();
  const HH = pad(date.getHours());
  const MM = pad(date.getMinutes());
  return `${dd}/${mm}/${yyyy} ${HH}:${MM}`;
}

function parseIfDateLike(value, pathHint) {
  // If the path suggests a date/deadline, treat strings/numbers as dates
  const hint = (pathHint || "").toLowerCase();
  const looksLikeDateByPath =
    hint.includes("deadline") ||
    hint.includes("date") ||
    hint.includes("expire");

  // Common ISO / timestamp handling
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
    // also handle "YYYY-MM-DD HH:mm" → ISO-like
    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?$/.test(s)) {
      const d = new Date(s.replace(" ", "T"));
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }
  return looksLikeDateByPath ? new Date(value) : null;
}

export default function PreviewModal({ open, onClose, row, companyName }) {
  const [defs, setDefs] = useState(null);
  useEffect(() => {
    if (!open) return;
    (async () => {
      const res = await fetch("/previews/all-previews.json", {
        cache: "no-store",
      });
      const json = await res.json();
      setDefs(json);
    })();
  }, [open]);

  const def = useMemo(() => {
    if (!defs || !row) return null;
    const list = Array.isArray(defs.requests) ? defs.requests : [];
    const norm = (s) => (s ?? "").toString().trim().toLowerCase();

    const cat =
      norm(row.requestCategory) || norm(row?.details?.requestCategory);
    const sub =
      norm(row.requestSubcategory) || norm(row?.details?.requestSubcategory);
    const asg = norm(row.assignmentType) || norm(row?.details?.assignmentType);

    return (
      list.find(
        (d) =>
          norm(d.category) === cat &&
          norm(d.subcategory) === sub &&
          norm(d.assignmentType) === asg,
      ) ||
      list.find(
        (d) => norm(d.category) === cat && norm(d.subcategory) === sub,
      ) ||
      list.find((d) => norm(d.category) === cat) ||
      null
    );
  }, [defs, row]);

  if (!open) return null;
  if (!row) return null;

  const resolvePath = (path) => {
    if (!path) return "—";
    // Virtual helpers (double-underscore "paths")
    if (path.startsWith("__")) {
      switch (path) {
        case "__clientLine__":
          return buildClientLine(row, companyName);
        case "__clientLineOrDisclosed__":
          return winnerOnly(row) || buildClientLine(row, companyName);
        case "__counterpartyConfidential__":
          return counterpartyOrWinnerOnly(row);
        case "__currencyMax__":
          return [row.currency || "—", fmtMoney(row.maximumPrice, row.currency)]
            .filter(Boolean)
            .join(" / ");
        case "__primaryContactPersonConfidential__":
          return primaryContactPersonConfidential(row);

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
    // Regular deep path (e.g., "details.expectedValue")
    return deepGet(row, path) ?? "—";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[min(900px,95vw)] max-h-[90vh] overflow-auto bg-white text-black p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">
            Preview — {row.title || "LEXIFY Request"}
          </h3>
          <button
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 cursor-pointer"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {!def ? (
          <div className="p-3 border rounded bg-gray-50">
            No matching preview definition found.
          </div>
        ) : (
          <div className="space-y-6">
            {(def.preview?.sections || []).map((section, si) => (
              <div key={si} className="border border-white">
                <div className="px-4 py-2 font-medium bg-[#119999] text-white">
                  {section.title}
                </div>

                {/* two supported shapes:
                    1) { fields: [{label, path}, ...] }
                    2) { value: "<named-block>" }  (some entries in JSON use this) */}
                {Array.isArray(section.fields) ? (
                  <table className="w-full">
                    <tbody>
                      {section.fields.map((f, fi) => (
                        <tr key={fi} className="border-t">
                          <td className="p-3 align-top w-1/3 font-medium">
                            {f.label}
                          </td>
                          <td className="p-3 align-top">
                            {renderValue(resolvePath(f.path), f.path)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : section.value ? (
                  <div className="p-3">
                    {renderNamedBlock(section.value, row, companyName)}
                  </div>
                ) : (
                  <div className="p-3 text-sm text-gray-500">—</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- helpers ----------

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

function buildClientLine(row, companyName) {
  const name =
    companyName ||
    row.companyName ||
    row.clientName ||
    row?.purchaser?.companyName ||
    row?.client?.companyName ||
    null;

  const id =
    row.companyId ||
    row.businessId ||
    row?.purchaser?.businessId ||
    row?.client?.businessId ||
    row?.purchaser?.companyId ||
    row?.client?.companyId ||
    null;

  const country =
    row.companyCountry ||
    row.country ||
    row?.purchaser?.companyCountry ||
    row?.client?.companyCountry ||
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
  // If the request is flagged confidential to winner only, show the fixed text
  const w = winnerOnly(row);
  if (w) return w;
  // Else try a few plausible fields where the counterparty may live
  return (
    row?.details?.breachCompany ||
    row?.details?.winnerBidderOnlyStatus ||
    row?.details?.counterparty ||
    row?.counterparty ||
    "—"
  );
}

function primaryContactPersonConfidential(row) {
  const confidential =
    row?.details?.confidential?.toString().toLowerCase() === "yes";

  if (confidential) {
    return "Disclosed to Winning Bidder Only";
  }

  return row?.primaryContactPerson ?? row?.details?.primaryContactPerson ?? "—";
}

function priceModel(row) {
  const rate = row.paymentRate || "—";
  const ccy = row.currency || "";
  const max =
    typeof row.maximumPrice === "number"
      ? ` / Max ${fmtMoney(row.maximumPrice, ccy)}`
      : "";
  return `${rate}${ccy ? ` (${ccy})` : ""}${max}`;
}

function docsWithOther(row) {
  // Try to show selected docs + any "other" text the form captured
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

function renderValue(v, pathHint) {
  // Special handling for file arrays
  if (
    pathHint === "backgroundInfoFiles" ||
    pathHint === "supplierCodeOfConductFiles"
  ) {
    if (Array.isArray(v) && v.length > 0) {
      return (
        <div className="space-y-1">
          {v.map((file, idx) => (
            <div key={idx}>
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                {file.name || `File ${idx + 1}`}
              </a>
              {file.size && (
                <span className="text-gray-500 text-sm ml-2">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              )}
            </div>
          ))}
        </div>
      );
    }
    return "—";
  }

  if (
    pathHint === "details.additionalQuestions" &&
    v &&
    typeof v === "object" &&
    !Array.isArray(v)
  ) {
    const entries = Object.entries(v);
    if (!entries.length) return "—";

    return (
      <div className="space-y-2">
        {entries.map(([question, answer], idx) => (
          <div key={idx} className="border-b last:border-b-0 pb-2 last:pb-0">
            <div className="flex">
              <span className="font-semibold mr-1">Information Request:</span>
              <span className="whitespace-pre-wrap flex-1">{question}</span>
            </div>

            <div className="flex mt-1">
              <span className="font-semibold mr-1">
                Client&apos;s Response:
              </span>
              <span className="whitespace-pre-wrap flex-1">
                {answer && String(answer).trim() ? answer : "(no answer yet)"}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (Array.isArray(v)) {
    return v.length ? v.join(", ") : "—";
  }
  if (v === null || v === undefined || v === "") return "—";

  // Try to pretty-print dates (local time)
  const maybeDate = parseIfDateLike(v, pathHint);
  if (maybeDate) return formatLocalDDMMYYYY_HHMM(maybeDate);

  return String(v);
}

function renderNamedBlock(name, row, companyName) {
  switch (name) {
    case "companyHeader":
      return buildClientLine(row, companyName);
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
        parseIfDateLike(row?.dateExpired, "dateExpired");
      return d ? formatLocalDDMMYYYY_HHMM(d) : "—";
    }
    default:
      return row?.[name] ?? row?.details?.[name] ?? "—";
  }
}
