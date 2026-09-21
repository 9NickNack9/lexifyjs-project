export const INVOICE_DOCUMENT_TYPES = ["Invoice", "Credit note"];
export const MAX_INVOICE_FILE_BYTES = 10 * 1024 * 1024;
export const NEAR_CEILING_RATIO = 0.9;
/** Non-admins may only select contracts dated after this calendar day. */
export const INVOICE_UPLOAD_CUTOFF = { year: 2026, month: 8, day: 1 };

export function isAdminRole(role) {
  return String(role || "").toUpperCase() === "ADMIN";
}

export function isContractDateAfterInvoiceUploadCutoff(contractDate) {
  if (!contractDate) return false;
  const d = contractDate instanceof Date ? contractDate : new Date(contractDate);
  if (Number.isNaN(d.getTime())) return false;
  const y = d.getFullYear();
  const m = d.getMonth();
  const day = d.getDate();
  const cutoff = INVOICE_UPLOAD_CUTOFF;
  return (
    y > cutoff.year ||
    (y === cutoff.year && (m > cutoff.month || (m === cutoff.month && day > cutoff.day)))
  );
}

export function canSelectContractForInvoiceUpload(contractDate, role) {
  return (
    isAdminRole(role) || isContractDateAfterInvoiceUploadCutoff(contractDate)
  );
}

export function numify(value) {
  if (value == null) return null;
  const n = parseFloat(
    typeof value === "object" && value.toString ? value.toString() : String(value),
  );
  return Number.isFinite(n) ? n : null;
}

export function isHourlyRate(paymentRate) {
  return String(paymentRate || "")
    .toLowerCase()
    .includes("hourly");
}

export function isCreditNote(documentType) {
  return String(documentType || "")
    .toLowerCase()
    .includes("credit");
}

export function signedAmount(documentType, amount) {
  const n = numify(amount) ?? 0;
  return isCreditNote(documentType) ? -Math.abs(n) : Math.abs(n);
}

export function contractRef(contract) {
  const id = contract?.contractId;
  if (id == null) return "—";
  const year = contract?.contractDate
    ? new Date(contract.contractDate).getFullYear()
    : "";
  const padded = String(id).padStart(3, "0");
  return year ? `LEX-${year}-${padded}` : `LEX-${padded}`;
}

export function currencyCode(label) {
  const s = String(label || "").toLowerCase();
  if (s.includes("usd") || s.includes("dollar")) return "USD";
  if (s.includes("gbp") || s.includes("pound")) return "GBP";
  if (s.includes("sek") || s.includes("krona")) return "SEK";
  if (s.includes("nok") || s.includes("krone")) return "NOK";
  if (s.includes("dkk")) return "DKK";
  if (s.includes("chf") || s.includes("franc")) return "CHF";
  if (s.includes("pln") || s.includes("złoty") || s.includes("zloty"))
    return "PLN";
  return "EUR";
}

export function fmtInvoiceMoney(value, currencyLabel = "EUR") {
  const n = numify(value);
  if (n == null) return "—";
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currencyCode(currencyLabel),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `€ ${n.toFixed(2)}`;
  }
}

export function formatInvoiceDate(value) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatPeriod(start, end) {
  if (!start && !end) return "—";
  return `${formatInvoiceDate(start)} – ${formatInvoiceDate(end)}`;
}

export function fileSizeLabel(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function fullName(person) {
  return [person?.firstName, person?.lastName].filter(Boolean).join(" ").trim();
}

export function progressRatio(invoicedFees, agreedFee) {
  const invoiced = numify(invoicedFees) ?? 0;
  const agreed = numify(agreedFee);
  if (agreed == null || agreed <= 0) return null;
  return invoiced / agreed;
}

export function remainingHeadroom(invoicedFees, agreedFee) {
  const invoiced = numify(invoicedFees) ?? 0;
  const agreed = numify(agreedFee);
  if (agreed == null) return null;
  return agreed - invoiced;
}

export function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function startOfQuarter(date = new Date()) {
  const quarter = Math.floor(date.getMonth() / 3) * 3;
  return new Date(date.getFullYear(), quarter, 1);
}

export function startOfPreviousMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}

export function percentChange(current, previous) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}
