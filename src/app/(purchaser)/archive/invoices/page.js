"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  FileText,
  ReceiptEuro,
  Search,
} from "lucide-react";
import DashboardPage from "../components/DashboardPage";
import {
  btnGhost,
  btnPrimary,
  emptyCard,
  loadingCard,
  table,
  tableCard,
  tableScroll,
  td,
  th,
  theadRow,
  tr,
} from "../components/tableUi";
import InvoicePreviewModal from "@/app/components/invoices/InvoicePreviewModal";
import PdfPreviewModal from "@/app/components/invoices/PdfPreviewModal";
import PdfThumbnail from "@/app/components/invoices/PdfThumbnail";
import InvoiceStatCards from "@/app/components/invoices/InvoiceStatCards";
import {
  invoiceCard,
  invoiceInput,
  ProgressBar,
  StatusBadge,
  TypeBadge,
} from "@/app/components/invoices/invoiceUi";
import { formatInvoiceDate, fmtInvoiceMoney } from "@/lib/invoices";
import QuestionMarkTooltip from "@/app/components/QuestionmarkTooltip";

const PAGE_SIZE = 8;

export default function PurchaserInvoicesPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selectedContractId, setSelectedContractId] = useState(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [showContractPdf, setShowContractPdf] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/me/invoices", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load invoices");
        setData(json);
      } catch (e) {
        alert(e.message);
        setData({ invoices: [], contracts: [], stats: {} });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const invoices = data?.invoices || [];
  const contracts = data?.contracts || [];
  const stats = data?.stats || {};

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices.filter((row) => {
      if (!q) return true;
      return [
        row.invoiceNumber,
        row.contractTitle,
        row.contractRef,
        row.providerName,
        row.documentType,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [invoices, query]);

  useEffect(() => {
    setPage(1);
  }, [query, tab]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selectedContract =
    contracts.find((c) => c.contractId === selectedContractId) || null;
  const latestForContract = invoices.find(
    (i) => i.contractId === selectedContract?.contractId,
  );

  const selectInvoice = (row) => {
    setSelectedInvoiceId(row.invoiceId);
    setSelectedContractId(row.contractId);
  };

  const selectContract = (contractId, rows = []) => {
    setSelectedContractId(contractId);
    const match =
      rows.find((row) => row.invoiceId === selectedInvoiceId) || rows[0];
    if (match) setSelectedInvoiceId(match.invoiceId);
  };

  const byProvider = useMemo(() => {
    const map = new Map();
    for (const inv of filtered) {
      const key = inv.providerName || "—";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(inv);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const byContract = useMemo(() => {
    const map = new Map();
    for (const inv of filtered) {
      if (!map.has(inv.contractId)) {
        map.set(
          inv.contractId,
          contracts.find((c) => c.contractId === inv.contractId) || {
            contractId: inv.contractId,
            title: inv.contractTitle,
            contractRef: inv.contractRef,
            providerName: inv.providerName,
            invoices: [],
          },
        );
      }
    }
    return Array.from(map.values()).map((contract) => ({
      ...contract,
      rows: filtered.filter((i) => i.contractId === contract.contractId),
    }));
  }, [filtered, contracts]);

  const tabs = [
    { id: "all", label: "All invoices" },
    { id: "contract", label: "By contract" },
    { id: "provider", label: "By service provider" },
  ];

  return (
    <DashboardPage
      eyebrow=""
      title="My Invoices"
      description="View all invoices from your legal matters in one place. Invoices are organised by contract, making it easy to track spend and access documents."
    >
      {loading ? (
        <div className={loadingCard}>Loading invoices…</div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <InvoiceStatCards
              items={[
                {
                  label: "Total invoices",
                  value: stats.totalInvoices ?? 0,
                  hint:
                    stats.invoicesThisQuarter > 0
                      ? `+${stats.invoicesThisQuarter} this quarter`
                      : "This quarter",
                  hintClass: "text-emerald-600",
                  icon: FileText,
                },
                {
                  label: "Total fees (excl. VAT)",
                  value: fmtInvoiceMoney(stats.totalFees ?? 0),
                  hint: "Across all contracts",
                  icon: ReceiptEuro,
                },
                {
                  label: "Active matters",
                  value: stats.activeMatters ?? 0,
                  hint: "With invoices",
                  icon: Building2,
                },
                {
                  label: "Fixed-fee assignments nearing their fee limit",
                  value: stats.nearFeeCeiling ?? 0,
                  hint: "90% or more of the agreed fee invoiced",
                  hintClass:
                    (stats.nearFeeCeiling || 0) > 0
                      ? "text-amber-700"
                      : "text-gray-500",
                  icon: AlertTriangle,
                },
              ]}
            />
            <div className={`${invoiceCard} bg-[#e8f7f7]`}>
              <h2 className="text-sm font-semibold text-[#0f7c80]">
                About invoicing
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                LEXIFY does not handle payments. Invoices are uploaded by law
                firms and stored with the relevant contract for your
                convenience.
              </p>
            </div>
          </div>

          <div className={invoiceCard}>
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition cursor-pointer ${
                      tab === t.id
                        ? "bg-[#11999e] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="relative w-full max-w-sm">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search invoices…"
                  className={`${invoiceInput} pl-9`}
                />
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className={emptyCard}>
                No invoices have been uploaded under your LEXIFY Contracts yet.
              </div>
            ) : tab === "all" ? (
              <>
                <InvoiceTable
                  rows={visible}
                  selectedInvoiceId={selectedInvoiceId}
                  onView={setPreview}
                  onSelectInvoice={selectInvoice}
                />
                <Pagination
                  page={page}
                  pageCount={pageCount}
                  total={filtered.length}
                  onChange={setPage}
                />
              </>
            ) : tab === "contract" ? (
              <div className="space-y-4">
                {byContract.map((contract) => (
                  <div
                    key={contract.contractId}
                    className="overflow-hidden rounded-xl ring-1 ring-black/10"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        selectContract(contract.contractId, contract.rows)
                      }
                      className="flex w-full items-center justify-between bg-gray-50 px-4 py-3 text-left"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">
                          {contract.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {contract.contractRef} · {contract.providerName}
                        </p>
                      </div>
                      <StatusBadge status={contract.status} />
                    </button>
                    <InvoiceTable
                      rows={contract.rows}
                      selectedInvoiceId={selectedInvoiceId}
                      onView={setPreview}
                      onSelectInvoice={selectInvoice}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {byProvider.map(([provider, rows]) => (
                  <div
                    key={provider}
                    className="overflow-hidden rounded-xl ring-1 ring-black/10"
                  >
                    <div className="bg-gray-50 px-4 py-3">
                      <p className="font-semibold text-gray-900">{provider}</p>
                      <p className="text-xs text-gray-500">
                        {rows.length} invoice{rows.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <InvoiceTable
                      rows={rows}
                      selectedInvoiceId={selectedInvoiceId}
                      onView={setPreview}
                      onSelectInvoice={selectInvoice}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className={invoiceCard}>
              <div className="mb-4 flex items-start justify-between gap-3">
                <h2 className="text-xl font-semibold text-gray-900">
                  Fee Status
                </h2>
                {selectedContract ? (
                  <StatusBadge status={selectedContract.status} />
                ) : null}
              </div>
              {selectedContract ? (
                <>
                  <h3 className="mb-4 text-lg font-semibold text-gray-900">
                    {selectedContract.title}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Invoiced to date</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {fmtInvoiceMoney(
                          selectedContract.invoicedFees,
                          selectedContract.currency,
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">
                        {selectedContract.isHourly
                          ? "Hourly rate"
                          : "Agreed fee"}
                      </p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {fmtInvoiceMoney(
                          selectedContract.agreedFee,
                          selectedContract.currency,
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <ProgressBar
                      pct={selectedContract.progressPct}
                      agreed={!selectedContract.isHourly}
                    />
                  </div>
                  <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-gray-500">Service provider</dt>
                      <dd className="font-medium text-gray-900">
                        {selectedContract.providerName}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Contract date</dt>
                      <dd className="font-medium text-gray-900">
                        {formatInvoiceDate(selectedContract.contractDate)}
                      </dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    onClick={() => setShowContractPdf(true)}
                    className="mt-5 inline-flex cursor-pointer text-sm font-medium text-[#0f7c80] hover:text-[#11999e]"
                  >
                    View contract →
                  </button>
                </>
              ) : (
                <p className="text-sm text-gray-500">
                  Select a matter above to see the fees invoiced in that matter
                  against its agreed fee.
                </p>
              )}
            </div>

            <div className={invoiceCard}>
              <h2 className="mb-4 text-xl font-semibold text-gray-900">
                {selectedContract
                  ? `Latest invoice for ${selectedContract.title}`
                  : "Latest invoice"}
              </h2>
              {!selectedContract ? (
                <p className="text-sm text-gray-500">
                  Select a matter above to see the most recent invoice or credit
                  note uploaded for it.
                </p>
              ) : latestForContract ? (
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-gray-500">Invoice number</dt>
                      <dd className="font-medium">
                        {latestForContract.invoiceNumber}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Date</dt>
                      <dd className="font-medium">
                        {formatInvoiceDate(latestForContract.invoiceDate)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Type</dt>
                      <dd className="mt-1.5">
                        <TypeBadge type={latestForContract.documentType} />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Fees excl. VAT</dt>
                      <dd className="font-medium">
                        {fmtInvoiceMoney(
                          latestForContract.feesExclVat,
                          latestForContract.currency,
                        )}
                      </dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    onClick={() => setPreview(latestForContract)}
                    className="relative h-40 overflow-hidden rounded-xl bg-white ring-1 ring-black/10"
                  >
                    {latestForContract.file?.url ? (
                      <PdfThumbnail url={latestForContract.file.url} />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-gray-400">
                        No PDF
                      </div>
                    )}
                  </button>
                  <button
                    type="button"
                    className={`${btnPrimary} sm:col-span-2`}
                    onClick={() => setPreview(latestForContract)}
                  >
                    View invoice
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No invoices have been uploaded for this contract yet.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <InvoicePreviewModal
        open={!!preview}
        invoice={preview}
        onClose={() => setPreview(null)}
      />
      <PdfPreviewModal
        open={showContractPdf}
        onClose={() => setShowContractPdf(false)}
        title={selectedContract?.title || "LEXIFY Contract"}
        subtitle={
          selectedContract
            ? `${selectedContract.providerName} · ${formatInvoiceDate(selectedContract.contractDate)}`
            : null
        }
        url={selectedContract?.contractPdf?.url || null}
      />
    </DashboardPage>
  );
}

function InvoiceTable({ rows, selectedInvoiceId, onView, onSelectInvoice }) {
  return (
    <div className={tableCard}>
      <div className={tableScroll}>
        <table className={`${table} min-w-[1100px]`}>
          <thead>
            <tr className={theadRow}>
              <th className={th}>Invoice number</th>
              <th className={th}>Date</th>
              <th className={th}>Contract / Matter</th>
              <th className={th}>Service provider</th>
              <th className={th}>Type</th>
              <th className={th}>Fees (excl. VAT)</th>
              <th className={th}>
                Disbursements{" "}
                <QuestionMarkTooltip tooltipText="Disbursements are costs the law firm has paid on your behalf and passes on to you — court fees, registration fees, official certificates, travel and similar. They are shown separately and are not counted toward the agreed fee." />
              </th>
              <th className={th}>Total (excl. VAT)</th>
              <th className={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const selected = row.invoiceId === selectedInvoiceId;
              return (
                <tr
                  key={row.invoiceId}
                  aria-selected={selected}
                  className={`cursor-pointer transition-colors ${
                    selected
                      ? "bg-[#e8f7f7] shadow-[inset_3px_0_0_#11999e] hover:bg-[#d7f1f1]"
                      : tr
                  }`}
                  onClick={() => onSelectInvoice?.(row)}
                >
                  <td className={td}>{row.invoiceNumber}</td>
                  <td className={td}>{formatInvoiceDate(row.invoiceDate)}</td>
                  <td className={td}>
                    <div className="text-center">
                      <div className="font-medium text-[#0f7c80]">
                        {row.contractTitle}
                      </div>
                    </div>
                  </td>
                  <td className={td}>{row.providerName}</td>
                  <td className={td}>
                    <TypeBadge type={row.documentType} />
                  </td>
                  <td
                    className={`${td} ${row.feesExclVat < 0 ? "text-rose-600" : ""}`}
                  >
                    {fmtInvoiceMoney(row.feesExclVat, row.currency)}
                  </td>
                  <td className={td}>
                    {fmtInvoiceMoney(row.disbursementsExclVat, row.currency)}
                  </td>
                  <td
                    className={`${td} ${row.totalExclVat < 0 ? "text-rose-600" : ""}`}
                  >
                    {fmtInvoiceMoney(row.totalExclVat, row.currency)}
                  </td>
                  <td className={td}>
                    <button
                      type="button"
                      className={btnGhost}
                      onClick={(e) => {
                        e.stopPropagation();
                        onView(row);
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Pagination({ page, pageCount, total, onChange }) {
  if (pageCount <= 1) {
    return (
      <p className="mt-3 text-sm text-gray-500">
        Showing {total} of {total} invoices
      </p>
    );
  }
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <p className="text-sm text-gray-500">
        Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}{" "}
        of {total} invoices
      </p>
      <div className="flex items-center gap-1">
        {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`h-8 min-w-8 rounded-lg px-2 text-sm font-medium ${
              n === page
                ? "bg-[#11999e] text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
