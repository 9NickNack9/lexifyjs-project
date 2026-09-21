"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Upload } from "lucide-react";
import DashboardPage from "@/app/(purchaser)/archive/components/DashboardPage";
import {
  btnGhost,
  btnPrimary,
  loadingCard,
} from "@/app/(purchaser)/archive/components/tableUi";
import {
  invoiceCard,
  invoiceInput,
  invoiceSelect,
  ProgressBar,
} from "@/app/components/invoices/invoiceUi";
import PdfPreviewModal from "@/app/components/invoices/PdfPreviewModal";
import {
  canSelectContractForInvoiceUpload,
  fileSizeLabel,
  fmtInvoiceMoney,
  formatInvoiceDate,
  INVOICE_DOCUMENT_TYPES,
  isCreditNote,
  MAX_INVOICE_FILE_BYTES,
  NEAR_CEILING_RATIO,
  remainingHeadroom,
  signedAmount,
} from "@/lib/invoices";
import QuestionMarkTooltip from "@/app/components/QuestionmarkTooltip";

const emptyForm = {
  contractId: "",
  documentType: "Invoice",
  invoiceNumber: "",
  invoiceDate: "",
  periodStart: "",
  periodEnd: "",
  feesExclVat: "",
  disbursementsExclVat: "",
  vatAmount: "",
};

export default function UploadInvoicePage() {
  return (
    <Suspense
      fallback={
        <DashboardPage
          title="Upload Invoice"
          description="Upload an invoice issued under your LEXIFY Contract."
          backHref="/provider-invoices"
          backLabel="Back to My Invoices"
        >
          <div className={loadingCard}>Loading…</div>
        </DashboardPage>
      }
    >
      <UploadInvoiceForm />
    </Suspense>
  );
}

function UploadInvoiceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetContractId = searchParams.get("contractId") || "";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [contracts, setContracts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [form, setForm] = useState({
    ...emptyForm,
    contractId: presetContractId,
  });
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const [showContractPdf, setShowContractPdf] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/me/invoices", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load contracts");
        const role = json.isAdmin ? "ADMIN" : json.role || "";
        const visibleContracts = (json.contracts || []).filter((c) =>
          canSelectContractForInvoiceUpload(c.contractDate, role),
        );
        setContracts(visibleContracts);
        setInvoices(json.invoices || []);
        setForm((prev) => {
          const requested = prev.contractId || presetContractId;
          const stillVisible = visibleContracts.some(
            (c) => String(c.contractId) === String(requested),
          );
          return {
            ...prev,
            contractId: stillVisible
              ? String(requested)
              : String(visibleContracts[0]?.contractId || ""),
          };
        });
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [presetContractId]);

  const selected = contracts.find(
    (c) => String(c.contractId) === String(form.contractId),
  );
  const contractPdfUrl = selected?.contractPdf?.url || null;

  const duplicate = useMemo(() => {
    const number = form.invoiceNumber.trim().toLowerCase();
    if (!number || !form.contractId) return null;
    return invoices.find(
      (inv) =>
        String(inv.contractId) === String(form.contractId) &&
        String(inv.invoiceNumber).trim().toLowerCase() === number,
    );
  }, [invoices, form.contractId, form.invoiceNumber]);

  const preview = useMemo(() => {
    if (!selected) return null;
    const fees = Number(String(form.feesExclVat).replace(",", ".")) || 0;
    const disbursements =
      Number(String(form.disbursementsExclVat).replace(",", ".")) || 0;
    const signedFees = signedAmount(form.documentType, fees);
    const nextFees = (selected.invoicedFees || 0) + signedFees;
    const nextDisbursements = (selected.disbursements || 0) + disbursements;
    const remaining = selected.isHourly
      ? null
      : remainingHeadroom(nextFees, selected.agreedFee);
    const progress =
      selected.isHourly || !selected.agreedFee
        ? null
        : (nextFees / selected.agreedFee) * 100;
    return {
      fees: signedFees,
      disbursements,
      nextFees,
      nextDisbursements,
      remaining,
      progress,
    };
  }, [
    selected,
    form.documentType,
    form.feesExclVat,
    form.disbursementsExclVat,
  ]);

  const feeCeilingWarning = useMemo(() => {
    if (!selected || selected.isHourly || isCreditNote(form.documentType)) {
      return null;
    }
    if (form.feesExclVat === "") return null;
    const fees = Number(String(form.feesExclVat).replace(",", "."));
    if (!Number.isFinite(fees) || fees < 0) return null;
    const agreed = selected.agreedFee;
    if (agreed == null) return null;
    const nextFees = (selected.invoicedFees || 0) + fees;
    if (fees > agreed || nextFees > agreed) {
      return "The total invoice amount can't exceed the agreed amount.";
    }
    return null;
  }, [selected, form.documentType, form.feesExclVat]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError("");
    if (key === "invoiceNumber") setConfirmDuplicate(false);
  };

  const onFile = (next) => {
    setError("");
    if (!next) {
      setFile(null);
      return;
    }
    const name = String(next.name || "").toLowerCase();
    if (next.type !== "application/pdf" && !name.endsWith(".pdf")) {
      setError("PDF files only.");
      return;
    }
    if (next.size > MAX_INVOICE_FILE_BYTES) {
      setError("File is larger than 10MB.");
      return;
    }
    setFile(next);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.contractId) return setError("Select a LEXIFY Contract.");
    if (!form.invoiceNumber.trim())
      return setError("Invoice number is required.");
    if (!form.invoiceDate) return setError("Invoice date is required.");
    if (!form.periodStart || !form.periodEnd) {
      return setError("Time period covered by the invoice is required.");
    }
    if (new Date(form.periodEnd) < new Date(form.periodStart)) {
      return setError("Period end cannot be before period start.");
    }
    if (form.feesExclVat === "" || Number(form.feesExclVat) < 0) {
      return setError("Fees excl. VAT must be a valid amount.");
    }
    if (
      form.disbursementsExclVat === "" ||
      Number(form.disbursementsExclVat) < 0
    ) {
      return setError("Disbursements excl. VAT must be a valid amount.");
    }
    if (feeCeilingWarning) return setError(feeCeilingWarning);
    if (!file) return setError("Please attach a PDF invoice.");
    if (duplicate && !confirmDuplicate) {
      return setError(
        `Possible duplicate invoice number ${form.invoiceNumber} on this contract — confirm to continue.`,
      );
    }

    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => body.append(key, value));
    body.append("file", file);
    if (confirmDuplicate) body.append("confirmDuplicate", "true");

    setSubmitting(true);
    try {
      const res = await fetch("/api/me/invoices", { method: "POST", body });
      const json = await res.json();
      if (res.status === 409 && json?.duplicate) {
        setConfirmDuplicate(true);
        setError(json.error);
        return;
      }
      if (!res.ok) throw new Error(json?.error || "Upload failed");
      router.push("/provider-invoices");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardPage
      eyebrow=""
      title="Upload Invoice"
      description="Upload a new invoice or credit note under a LEXIFY Contract. Fill in the details below and confirm to submit."
      backHref="/provider-invoices"
      backLabel="Back to My Invoices"
    >
      {loading ? (
        <div className={loadingCard}>Loading contract details…</div>
      ) : contracts.length === 0 ? (
        <div className={invoiceCard}>
          <p className="text-sm text-gray-600">
            You do not have any LEXIFY Contracts yet, so there is nothing to
            invoice.
          </p>
          <Link
            href="/provider-archive/contracts"
            className={`${btnGhost} mt-4`}
          >
            View contracts
          </Link>
        </div>
      ) : (
        <form
          onSubmit={submit}
          className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]"
        >
          <div className="space-y-6">
            <div className={`${invoiceCard} space-y-1`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                  Contract selection
                </p>
                <button
                  type="button"
                  onClick={() => setShowContractPdf(true)}
                  disabled={!selected}
                  className="shrink-0 cursor-pointer text-sm font-medium text-[#0f7c80] hover:text-[#11999e] disabled:cursor-not-allowed disabled:text-gray-400"
                >
                  View contract →
                </button>
              </div>
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#11999e]/10 text-[#11999e]">
                  <FileText className="h-5 w-5" />
                </span>
                <label className="min-w-0 flex-1">
                  <span className="sr-only">LEXIFY Contract</span>
                  <select
                    className={`${invoiceSelect} font-semibold text-gray-900`}
                    value={form.contractId}
                    onChange={(e) => setField("contractId", e.target.value)}
                  >
                    {contracts.length === 0 ? (
                      <option value="">No eligible LEXIFY Contracts</option>
                    ) : null}
                    {contracts.map((c) => (
                      <option key={c.contractId} value={String(c.contractId)}>
                        {c.clientName} / {c.offerTitle || c.title}
                      </option>
                    ))}
                  </select>
                  {selected ? (
                    <span className="mt-1 block text-sm text-gray-500">
                      awarded {formatInvoiceDate(selected.contractDate)}
                    </span>
                  ) : null}
                </label>
              </div>
            </div>

            <div className={invoiceCard}>
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  onFile(e.dataTransfer.files?.[0]);
                }}
                className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 border-dashed px-4 py-3 transition ${
                  dragOver
                    ? "border-[#11999e] bg-[#11999e]/5"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <Upload className="h-5 w-5 shrink-0 text-[#11999e]" />
                <span className="min-w-0 flex-1 text-left">
                  <span className="block text-sm font-medium text-gray-900">
                    Drag and drop or upload your invoice/credit note here
                  </span>
                  <span className="block text-xs text-gray-500">
                    PDF files only, max 10MB
                  </span>
                </span>
                <span className={btnGhost}>Upload file</span>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="sr-only"
                  onChange={(e) => onFile(e.target.files?.[0])}
                />
              </label>
              {file ? (
                <div className="mt-3 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                  <span className="font-medium text-gray-800">
                    {file.name}{" "}
                    <span className="text-gray-500">
                      {fileSizeLabel(file.size)}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="text-gray-500 hover:text-rose-600 cursor-pointer"
                    onClick={() => setFile(null)}
                  >
                    Remove
                  </button>
                </div>
              ) : null}
            </div>

            {duplicate ? (
              <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
                <p className="font-semibold">
                  Possible duplicate invoice number {form.invoiceNumber} on this
                  contract — upload allowed with confirmation.
                </p>
                <p className="mt-1">
                  An invoice with this number already exists for this contract.
                  Please check before continuing.
                </p>
                <label className="mt-3 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={confirmDuplicate}
                    onChange={(e) => setConfirmDuplicate(e.target.checked)}
                  />
                  I confirm this is not a duplicate and want to upload it
                  anyway.
                </label>
              </div>
            ) : null}

            {preview &&
            !feeCeilingWarning &&
            preview.progress != null &&
            preview.progress >= NEAR_CEILING_RATIO * 100 ? (
              <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
                This upload would bring cumulative fees to{" "}
                {(Math.round(preview.progress * 100) / 100).toFixed(2)}% of the
                agreed fee.
                {preview.remaining != null ? (
                  <>
                    {" "}
                    Left to invoice after upload:{" "}
                    {fmtInvoiceMoney(preview.remaining, selected?.currency)}.
                  </>
                ) : null}
              </div>
            ) : null}

            <div className={`${invoiceCard} grid gap-4 sm:grid-cols-2`}>
              <label className="text-sm text-gray-600">
                Document type
                <select
                  className={`${invoiceSelect} mt-1`}
                  value={form.documentType}
                  onChange={(e) => setField("documentType", e.target.value)}
                >
                  {INVOICE_DOCUMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-gray-600">
                Invoice/credit note number
                <input
                  className={`${invoiceInput} mt-1`}
                  value={form.invoiceNumber}
                  onChange={(e) => setField("invoiceNumber", e.target.value)}
                  required
                />
              </label>
              <label className="text-sm text-gray-600">
                Invoice/credit note date
                <input
                  type="date"
                  className={`${invoiceInput} mt-1`}
                  value={form.invoiceDate}
                  onChange={(e) => setField("invoiceDate", e.target.value)}
                  required
                />
              </label>
              <label className="text-sm text-gray-600">
                {isCreditNote(form.documentType)
                  ? "Credit amount excl. VAT"
                  : "Fees excluding VAT"}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={`${invoiceInput} mt-1 ${
                    feeCeilingWarning ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200" : ""
                  }`}
                  value={form.feesExclVat}
                  onChange={(e) => setField("feesExclVat", e.target.value)}
                  required
                />
                {feeCeilingWarning ? (
                  <span className="mt-1.5 block text-sm text-rose-700">
                    {feeCeilingWarning}
                  </span>
                ) : null}
              </label>
              <div className="text-sm text-gray-600 sm:col-span-2">
                Time period covered by invoice/credit note{" "}
                <QuestionMarkTooltip tooltipText="Select the period during which the invoiced or credited work was performed. This is typically a calendar month, such as 1-31 March 2026, but may cover another period where applicable." />
                <div className="mt-1 grid grid-cols-2 gap-3">
                  <label>
                    From
                    <input
                      type="date"
                      className={`${invoiceInput} mt-1`}
                      value={form.periodStart}
                      onChange={(e) => setField("periodStart", e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    To
                    <input
                      type="date"
                      className={`${invoiceInput} mt-1`}
                      value={form.periodEnd}
                      onChange={(e) => setField("periodEnd", e.target.value)}
                      required
                    />
                  </label>
                </div>
              </div>
              <label className="text-sm text-gray-600">
                Disbursements excluding VAT{" "}
                <QuestionMarkTooltip tooltipText="Costs you have paid on the client's behalf and pass on without mark-up — court fees, registration fees, official certificates, travel and similar. Disbursements are not counted toward any agreed fee for an assignment." />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={`${invoiceInput} mt-1`}
                  value={form.disbursementsExclVat}
                  onChange={(e) =>
                    setField("disbursementsExclVat", e.target.value)
                  }
                  required
                />
              </label>
              <label className="text-sm text-gray-600">
                Total VAT amount on the invoice or credit note (optional)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={`${invoiceInput} mt-1`}
                  value={form.vatAmount}
                  onChange={(e) => setField("vatAmount", e.target.value)}
                />
              </label>
            </div>

            {error ? (
              <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
                {error}
              </div>
            ) : null}

            <div className="rounded-2xl bg-[#e8f7f7] px-4 py-3 text-sm text-gray-600 ring-1 ring-[#11999e]/15">
              <strong>
                LEXIFY does not machine-read, analyse or otherwise utilise the
                contents of your uploaded document. The uploaded invoice or
                credit note is stored with access restricted to the parties to
                the LEXIFY Contract, and LEXIFY personnel do not access it
                except at the explicit request of a party to the LEXIFY Contract
                or of a competent authority.
              </strong>
            </div>

            <div className="flex justify-end gap-3">
              <Link href="/provider-invoices" className={btnGhost}>
                Cancel
              </Link>
              <button
                type="submit"
                className={btnPrimary}
                disabled={submitting || !!feeCeilingWarning}
              >
                {submitting ? "Uploading…" : "Confirm Upload"}
              </button>
            </div>
          </div>

          <aside className="space-y-6">
            {selected ? (
              <div className={invoiceCard}>
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Contract summary
                    </h2>
                    <p className="text-sm text-gray-500">
                      {selected.clientName} /{" "}
                      {selected.offerTitle || selected.title}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowContractPdf(true)}
                    className="cursor-pointer text-sm font-medium text-[#0f7c80] hover:text-[#11999e]"
                  >
                    View contract →
                  </button>
                </div>
                <dl className="space-y-2 text-sm">
                  <Row
                    label={
                      selected.isHourly
                        ? "Agreed hourly rate"
                        : "Agreed fixed fee"
                    }
                    value={fmtInvoiceMoney(
                      selected.agreedFee,
                      selected.currency,
                    )}
                  />
                  <Row
                    label="Fees invoiced to date"
                    value={fmtInvoiceMoney(
                      selected.invoicedFees,
                      selected.currency,
                    )}
                  />
                  {!selected.isHourly ? (
                    <Row
                      label="Left to invoice"
                      value={fmtInvoiceMoney(
                        selected.remaining,
                        selected.currency,
                      )}
                    />
                  ) : null}
                  <Row
                    label="Disbursements total (not counted toward fee)"
                    value={fmtInvoiceMoney(
                      selected.disbursements,
                      selected.currency,
                    )}
                  />
                </dl>
                <div className="mt-4">
                  <ProgressBar
                    pct={selected.progressPct}
                    agreed={!selected.isHourly}
                  />
                </div>
              </div>
            ) : null}

            {preview && selected ? (
              <div className={invoiceCard}>
                <h2 className="mb-3 text-lg font-semibold text-gray-900">
                  After this upload (preview)
                </h2>
                <dl className="space-y-2 text-sm">
                  <Row
                    label="Fees excl. VAT (this invoice/credit note)"
                    value={fmtInvoiceMoney(preview.fees, selected.currency)}
                  />
                  <Row
                    label="Total fees invoiced"
                    value={fmtInvoiceMoney(preview.nextFees, selected.currency)}
                  />
                  {!selected.isHourly ? (
                    <Row
                      label="Left to invoice"
                      value={fmtInvoiceMoney(
                        preview.remaining,
                        selected.currency,
                      )}
                    />
                  ) : null}
                </dl>
                <div className="mt-4">
                  <ProgressBar
                    pct={preview.progress}
                    agreed={!selected.isHourly}
                  />
                </div>
              </div>
            ) : null}

            <div className={invoiceCard}>
              <h2 className="text-lg font-semibold text-gray-900">
                Need help?
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Visit Help & Resources in the LEXIFY main menu, or contact us at{" "}
                <a
                  href="mailto:support@lexify.online"
                  className="text-[#0f7c80] hover:text-[#11999e]"
                >
                  support@lexify.online
                </a>
                .
              </p>
              <Link
                href="/provider-help"
                className="mt-3 inline-flex text-sm font-medium text-[#0f7c80] hover:text-[#11999e]"
              >
                Go to Help & Resources →
              </Link>
            </div>
          </aside>
        </form>
      )}
      <PdfPreviewModal
        open={showContractPdf}
        onClose={() => setShowContractPdf(false)}
        title={selected?.offerTitle || selected?.title || "LEXIFY Contract"}
        subtitle={
          selected
            ? `${selected.clientName} · ${formatInvoiceDate(selected.contractDate)}`
            : null
        }
        url={contractPdfUrl}
      />
    </DashboardPage>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="min-w-0 flex-1 text-gray-500">{label}</dt>
      <dd className="shrink-0 whitespace-nowrap text-right font-semibold text-gray-900">
        {value}
      </dd>
    </div>
  );
}
