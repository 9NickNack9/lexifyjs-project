"use client";

import { useEffect, useMemo, useState } from "react";
import { fmtMoney } from "./format";
import HubPreviewModal, {
  PreviewSection,
} from "@/app/components/request-wizard/RequestPreviewModal";

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

function buildClientLine(row) {
  const name =
    row?.clientCompany?.companyName ||
    row?.clientCompanyName ||
    row?.client?.companyName ||
    row?.companyName ||
    row?.clientName ||
    row?.purchaser?.companyName ||
    null;

  const id =
    row?.clientCompany?.businessId ||
    row?.client?.companyId ||
    row?.companyId ||
    row?.businessId ||
    row?.purchaser?.companyId ||
    null;

  const country =
    row?.clientCompany?.companyCountry ||
    row?.client?.companyCountry ||
    row?.companyCountry ||
    row?.country ||
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

function primaryContactPersonConfidential(row) {
  const confidential =
    row?.details?.confidential?.toString().toLowerCase() === "yes";

  if (confidential) return "Disclosed to Winning Bidder Only";

  return row?.primaryContactPerson ?? row?.details?.primaryContactPerson ?? "—";
}

function counterpartyOrWinnerOnly(row) {
  const w = winnerOnly(row);
  if (w) return w;
  return (
    row?.details?.breachCompany ||
    row?.details?.winnerBidderOnlyStatus ||
    row?.details?.counterparty ||
    row?.counterparty ||
    "—"
  );
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

function resolvePath(row, path) {
  if (!path) return "—";
  if (path.startsWith("__")) {
    switch (path) {
      case "__clientLine__":
        return buildClientLine(row);
      case "__clientLineOrDisclosed__":
        return winnerOnly(row) || buildClientLine(row);
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
  return deepGet(row, path) ?? "—";
}

function renderValue(v, pathHint) {
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

  const maybeDate = parseIfDateLike(v, pathHint);
  if (maybeDate) return formatLocalDDMMYYYY_HHMM(maybeDate);

  return String(v);
}

function renderNamedBlock(name, row) {
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
        parseIfDateLike(row?.dateExpired, "dateExpired");
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

const HIDE_PATHS = new Set([
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

  "offersDeadline",
  "details.offersDeadline",
  "dateExpired",
  "details.dateExpired",
  "title",
  "requestTitle",
  "requestState",
  "maximumPrice",
  "details.maximumPrice",
  "providerReferences",
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
  if (
    label === "service provider type" ||
    label === "domestic offers" ||
    label === "minimum provider size" ||
    label === "minimum company age" ||
    label === "minimum rating" ||
    label.includes("provider size") ||
    label.includes("company age")
  )
    return true;

  if (
    label === "offers deadline" ||
    label === "request title" ||
    label === "request state" ||
    label === "date expired" ||
    label === "maximum price"
  )
    return true;

  return false;
}

export default function RequestPreviewModal({ open, onClose, row }) {
  const [defs, setDefs] = useState(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const res = await fetch("/previews/all-previews.json", {
        cache: "no-store",
      });
      const json = await res.json();
      if (!cancelled) setDefs(json);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const def = useMemo(() => {
    if (!defs || !row) return null;
    const list = Array.isArray(defs.requests) ? defs.requests : [];
    return (
      list.find(
        (d) =>
          (d.category || "") === (row.requestCategory || "") &&
          (d.subcategory || null) === (row.requestSubcategory ?? null) &&
          (d.assignmentType || null) === (row.assignmentType ?? null),
      ) ||
      list.find(
        (d) =>
          (d.category || "") === (row.requestCategory || "") &&
          (d.subcategory || null) === (row.requestSubcategory ?? null),
      ) ||
      list.find((d) => (d.category || "") === (row.requestCategory || ""))
    );
  }, [defs, row]);

  if (!open || !row) return null;

  return (
    <HubPreviewModal
      open
      onClose={onClose}
      overlayClassName="z-[100]"
    >
      {!def ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-black">
          No matching preview definition found.
        </div>
      ) : (
        (def.preview?.sections || [])
          .filter((section) => !looksLikeProviderReqSection(section))
          .map((section, si) => {
            const fields = Array.isArray(section.fields)
              ? section.fields.filter((f) => !shouldHideField(f))
              : null;

            if (Array.isArray(section.fields) && fields.length === 0)
              return null;

            return (
              <PreviewSection key={si} title={section.title || "—"}>
                {Array.isArray(fields) ? (
                  <table className="w-full">
                    <tbody>
                      {fields.map((f, fi) => {
                        const label = f.label || "—";
                        let raw = resolvePath(row, f.path);
                        let display = renderValue(raw, f.path);

                        if (display === "—") {
                          const byLabel = resolveByLabel(row, label);
                          if (byLabel !== undefined) {
                            raw = byLabel;
                            display = renderValue(raw, f.path);
                          }
                        }

                        return (
                          <tr key={fi} className="border-t border-gray-200">
                            <td className="w-1/3 py-2 pr-4 align-top font-semibold text-gray-800">
                              {label}
                            </td>
                            <td className="py-2 align-top text-gray-800">
                              {display}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : section.value ? (
                  renderNamedBlock(section.value, row)
                ) : (
                  "—"
                )}
              </PreviewSection>
            );
          })
      )}
    </HubPreviewModal>
  );
}
