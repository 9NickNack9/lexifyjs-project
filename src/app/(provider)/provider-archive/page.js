"use client";

import { useEffect, useMemo, useState } from "react";
import ContractModal from "../../(purchaser)/archive/components/ContractModal";

function EmptyBox({ children }) {
  return (
    <div className="p-4 bg-white text-black border border-black rounded">
      {children}
    </div>
  );
}

function formatTimeUntil(deadlineISO) {
  if (!deadlineISO) return "";
  const end = new Date(deadlineISO).getTime();
  if (Number.isNaN(end)) return "";
  const diffMs = end - Date.now();
  if (diffMs <= 0) return "Expired.";

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0 && hours > 0)
    return `${days} day${days !== 1 ? "s" : ""} ${hours} hour${
      hours !== 1 ? "s" : ""
    }`;
  if (days > 0) return `${days} day${days !== 1 ? "s" : ""}`;
  if (hours > 0) return `${hours} hour${hours !== 1 ? "s" : ""}`;
  return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
}

function fmtMoney(num, suffix = "€") {
  if (typeof num !== "number") return "—";
  return `${num.toLocaleString("fi-FI").replace(/\s/g, " ")} ${suffix}`;
}

function Section({ title, children }) {
  return (
    <div>
      <div className="bg-[#11999e] p-2">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ---------- helpers from PreviewModal ----------

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

// -------- filtering (hide provider requirements + five specific fields) -------
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

export default function ProviderArchive() {
  const [loading, setLoading] = useState(true);

  // Filters
  const [contactFilterPending, setContactFilterPending] = useState("All");
  const [contactFilterContracts, setContactFilterContracts] = useState("All");
  const [contactOptions, setContactOptions] = useState(["All"]);

  // Pending offers data & sorting
  const [offers, setOffers] = useState([]);
  const [pendingSort, setPendingSort] = useState({
    key: "clientName",
    dir: "asc",
  });

  // Contracts data & sorting
  const [contracts, setContracts] = useState([]);
  const [contractSort, setContractSort] = useState({
    key: "clientName",
    dir: "asc",
  });

  // Preview defs
  const [defs, setDefs] = useState(null);

  // Modals
  const [showReq, setShowReq] = useState(false);
  const [reqPreview, setReqPreview] = useState(null); // Will hold full request row

  const [showContract, setShowContract] = useState(false);
  const [contractPreview, setContractPreview] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const [offRes, conRes, defsRes] = await Promise.all([
          fetch("/api/me/offers/pending", { cache: "no-store" }),
          fetch("/api/me/contracts/provider", { cache: "no-store" }),
          fetch("/previews/all-previews.json", { cache: "no-store" }),
        ]);

        const read = async (r) => {
          const ct = r.headers.get("content-type") || "";
          return ct.includes("application/json")
            ? await r.json()
            : { error: await r.text() };
        };

        const [off, con, jsonDefs] = await Promise.all([
          read(offRes),
          read(conRes),
          read(defsRes),
        ]);

        if (!offRes.ok)
          throw new Error(off?.error || "Failed to load pending offers");
        if (!conRes.ok)
          throw new Error(con?.error || "Failed to load contracts");

        setOffers(off.offers || []);
        setContracts(con.contracts || []);
        setDefs(jsonDefs);

        // Merge contact options from both endpoints
        const list = Array.from(
          new Set([...(off.contacts || []), ...(con.contacts || [])])
        );
        setContactOptions(["All", ...list]);
      } catch (e) {
        alert(e.message);
        setOffers([]);
        setContracts([]);
        setContactOptions(["All"]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleViewRequest = async (requestId) => {
    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load request");
      setReqPreview(json);
      setShowReq(true);
    } catch (e) {
      alert(e.message);
    }
  };

  // Sorting helpers
  const sortGeneric = (arr, key, dir) => {
    const copy = [...arr];
    copy.sort((a, b) => {
      let va = a[key],
        vb = b[key];

      if (key === "offerSubmissionDate" || key === "contractDate") {
        va = va ? new Date(va).getTime() : 0;
        vb = vb ? new Date(vb).getTime() : 0;
      } else if (key === "offeredPrice" || key === "contractPrice") {
        va = typeof va === "number" ? va : -Infinity;
        vb = typeof vb === "number" ? vb : -Infinity;
      } else if (key === "deadline") {
        va = a.dateExpired
          ? new Date(a.dateExpired).getTime() - Date.now()
          : -Infinity;
        vb = b.dateExpired
          ? new Date(b.dateExpired).getTime() - Date.now()
          : -Infinity;
      } else {
        va = (va ?? "").toString().toLowerCase();
        vb = (vb ?? "").toString().toLowerCase();
      }

      if (va < vb) return dir === "asc" ? -1 : 1;
      if (va > vb) return dir === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  };

  const filteredOffers = useMemo(() => {
    const f =
      contactFilterPending === "All"
        ? offers
        : offers.filter((o) => o.offerSubmittedBy === contactFilterPending);
    return sortGeneric(f, pendingSort.key, pendingSort.dir);
  }, [offers, contactFilterPending, pendingSort]);

  const filteredContracts = useMemo(() => {
    const f =
      contactFilterContracts === "All"
        ? contracts
        : contracts.filter((c) => c.contractOwner === contactFilterContracts);
    return sortGeneric(f, contractSort.key, contractSort.dir);
  }, [contracts, contactFilterContracts, contractSort]);

  const def = useMemo(() => {
    if (!defs || !reqPreview) return null;
    const list = Array.isArray(defs.requests) ? defs.requests : [];
    return (
      list.find(
        (d) =>
          (d.category || "") === (reqPreview.requestCategory || "") &&
          (d.subcategory || null) === (reqPreview.requestSubcategory ?? null) &&
          (d.assignmentType || null) === (reqPreview.assignmentType ?? null)
      ) ||
      list.find(
        (d) =>
          (d.category || "") === (reqPreview.requestCategory || "") &&
          (d.subcategory || null) === (reqPreview.requestSubcategory ?? null)
      ) ||
      list.find(
        (d) => (d.category || "") === (reqPreview.requestCategory || "")
      )
    );
  }, [defs, reqPreview]);

  return (
    <div className="flex flex-col items-center min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-6">My Dashboard</h1>

      {loading ? (
        <div className="p-4 bg-white rounded border">Loading…</div>
      ) : (
        <>
          {/* Pending Offers */}
          <div className="w-full mb-8">
            <h2 className="text-2xl font-semibold mb-4">My Pending Offers</h2>

            <select
              value={contactFilterPending}
              onChange={(e) => setContactFilterPending(e.target.value)}
              className="mb-4 p-2 border rounded bg-white text-black"
            >
              {contactOptions.map((n) => (
                <option key={n} value={n}>
                  {n === "All" ? "Filter Pending Offers by Offer Owner" : n}
                </option>
              ))}
            </select>

            {filteredOffers.length === 0 ? (
              <EmptyBox>N/A</EmptyBox>
            ) : (
              <table className="w-full border-collapse border border-gray-300 bg-white text-black">
                <thead>
                  <tr className="bg-[#3a3a3c] text-white">
                    <th className="border p-2 text-center">Title</th>
                    <th
                      className="border p-2 text-center cursor-pointer"
                      onClick={() =>
                        setPendingSort((p) => ({
                          key: "clientName",
                          dir: p.dir === "asc" ? "desc" : "asc",
                        }))
                      }
                    >
                      Client Name{" "}
                      {pendingSort.key === "clientName"
                        ? pendingSort.dir === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </th>
                    <th className="border p-2 text-center">
                      Offer Submitted By
                    </th>
                    <th
                      className="border p-2 text-center cursor-pointer"
                      onClick={() =>
                        setPendingSort((p) => ({
                          key: "offerSubmissionDate",
                          dir: p.dir === "asc" ? "desc" : "asc",
                        }))
                      }
                    >
                      Offer Submission Date{" "}
                      {pendingSort.key === "offerSubmissionDate"
                        ? pendingSort.dir === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </th>
                    <th
                      className="border p-2 text-center cursor-pointer"
                      onClick={() =>
                        setPendingSort((p) => ({
                          key: "offeredPrice",
                          dir: p.dir === "asc" ? "desc" : "asc",
                        }))
                      }
                    >
                      Offered Price (VAT 0%){" "}
                      {pendingSort.key === "offeredPrice"
                        ? pendingSort.dir === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </th>
                    <th
                      className="border p-2 text-center cursor-pointer"
                      onClick={() =>
                        setPendingSort((p) => ({
                          key: "deadline",
                          dir: p.dir === "asc" ? "desc" : "asc",
                        }))
                      }
                    >
                      Time until Deadline for Offers{" "}
                      {pendingSort.key === "deadline"
                        ? pendingSort.dir === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </th>
                    <th className="border p-2 text-center">
                      Offer Submitted in Response to
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOffers.map((o) => (
                    <tr key={o.offerId}>
                      <td className="border p-2 text-center">{o.title}</td>
                      <td className="border p-2 text-center">{o.clientName}</td>
                      <td className="border p-2 text-center">
                        {o.offerSubmittedBy}
                      </td>
                      <td className="border p-2 text-center">
                        {new Date(o.offerSubmissionDate).toLocaleDateString()}
                      </td>
                      <td className="border p-2 text-center">
                        {fmtMoney(o.offeredPrice)}
                      </td>
                      <td className="border p-2 text-center">
                        {formatTimeUntil(o.dateExpired)}
                      </td>
                      <td className="border p-2 text-center">
                        <button
                          className="bg-[#11999e] text-white px-3 py-1 rounded cursor-pointer"
                          onClick={() => handleViewRequest(o.requestId)}
                        >
                          View LEXIFY Request
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Contracts */}
          <div className="w-full mb-8">
            <h2 className="text-2xl font-semibold mb-4">My LEXIFY Contracts</h2>

            <select
              value={contactFilterContracts}
              onChange={(e) => setContactFilterContracts(e.target.value)}
              className="mb-4 p-2 border rounded bg-white text-black"
            >
              {contactOptions.map((n) => (
                <option key={n} value={n}>
                  {n === "All" ? "Filter Contracts by Contract Owner" : n}
                </option>
              ))}
            </select>

            {filteredContracts.length === 0 ? (
              <EmptyBox>N/A</EmptyBox>
            ) : (
              <table className="w-full border-collapse border border-gray-300 bg-white text-black">
                <thead>
                  <tr className="bg-[#3a3a3c] text-white">
                    <th className="border p-2 text-center">Title</th>
                    <th
                      className="border p-2 text-center cursor-pointer"
                      onClick={() =>
                        setContractSort((p) => ({
                          key: "clientName",
                          dir: p.dir === "asc" ? "desc" : "asc",
                        }))
                      }
                    >
                      Client Name{" "}
                      {contractSort.key === "clientName"
                        ? contractSort.dir === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </th>
                    <th className="border p-2 text-center">Contract Owner</th>
                    <th
                      className="border p-2 text-center cursor-pointer"
                      onClick={() =>
                        setContractSort((p) => ({
                          key: "contractDate",
                          dir: p.dir === "asc" ? "desc" : "asc",
                        }))
                      }
                    >
                      Contract Date{" "}
                      {contractSort.key === "contractDate"
                        ? contractSort.dir === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </th>
                    <th
                      className="border p-2 text-center cursor-pointer"
                      onClick={() =>
                        setContractSort((p) => ({
                          key: "contractPrice",
                          dir: p.dir === "asc" ? "desc" : "asc",
                        }))
                      }
                    >
                      Contract Price (VAT 0%){" "}
                      {contractSort.key === "contractPrice"
                        ? contractSort.dir === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </th>
                    <th className="border p-2 text-center">
                      View LEXIFY Contract
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContracts.map((c) => (
                    <tr key={c.contractId}>
                      <td className="border p-2 text-center">{c.title}</td>
                      <td className="border p-2 text-center">{c.clientName}</td>
                      <td className="border p-2 text-center">
                        {c.contractOwner}
                      </td>
                      <td className="border p-2 text-center">
                        {new Date(c.contractDate).toLocaleDateString()}
                      </td>
                      <td className="border p-2 text-center">
                        {fmtMoney(c.contractPrice)}
                      </td>
                      <td className="border p-2 text-center">
                        <button
                          className="bg-[#11999e] text-white px-3 py-1 rounded cursor-pointer"
                          onClick={() => {
                            setContractPreview(c.contract);
                            setShowContract(true);
                          }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Contract Preview Modal */}
          {showContract && contractPreview && (
            <ContractModal
              open={showContract}
              onClose={() => setShowContract(false)}
              contract={contractPreview}
              companyName={contractPreview?.purchaser?.companyName}
            />
          )}

          {/* Request Preview Modal */}
          {showReq && reqPreview && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="w-[min(900px,95vw)] max-h-[90vh] overflow-auto rounded-xl bg-white text-black p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">
                    Preview — {reqPreview.title || "LEXIFY Request"}
                  </h3>
                  <button
                    className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
                    onClick={() => setShowReq(false)}
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
                    {!def ? (
                      <div className="p-3 border rounded bg-gray-50">
                        No matching preview definition found.
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {(def.preview?.sections || [])
                          .filter(
                            (section) => !looksLikeProviderReqSection(section)
                          )
                          .map((section, si) => {
                            // If this is a fields-table section, strip hidden fields.
                            const fields = Array.isArray(section.fields)
                              ? section.fields.filter(
                                  (f) => !shouldHideField(f)
                                )
                              : null;

                            // Skip empty sections after filtering
                            if (
                              Array.isArray(section.fields) &&
                              fields.length === 0
                            )
                              return null;

                            return (
                              <div key={si} className="border rounded-lg">
                                <div className="px-4 py-2 font-medium bg-[#119999] text-black rounded-lg">
                                  {section.title}
                                </div>

                                {Array.isArray(fields) ? (
                                  <table className="w-full">
                                    <tbody>
                                      {fields.map((f, fi) => {
                                        const label = f.label || "—";
                                        // 1) primary: resolve by path
                                        let raw = resolvePath(
                                          reqPreview,
                                          f.path
                                        );
                                        let display = renderValue(raw, f.path);

                                        // 2) fallback: resolve by label (for parity with Make Offer)
                                        if (display === "—") {
                                          const byLabel = resolveByLabel(
                                            reqPreview,
                                            label
                                          );
                                          if (byLabel !== undefined) {
                                            raw = byLabel;
                                            display = renderValue(raw, f.path);
                                          }
                                        }

                                        return (
                                          <tr key={fi} className="border-t">
                                            <td className="p-3 align-top w-1/3 font-medium">
                                              {label}
                                            </td>
                                            <td className="p-3 align-top">
                                              {display}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                ) : section.value ? (
                                  <div className="p-3">
                                    {renderNamedBlock(
                                      section.value,
                                      reqPreview
                                    )}
                                  </div>
                                ) : (
                                  <div className="p-3 text-sm text-gray-500">
                                    —
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
