"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  FileText,
  FolderOpen,
  Search,
  Upload,
} from "lucide-react";
import DashboardPage from "@/app/(purchaser)/archive/components/DashboardPage";
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
} from "@/app/(purchaser)/archive/components/tableUi";
import InvoicePreviewModal from "@/app/components/invoices/InvoicePreviewModal";
import InvoiceStatCards from "@/app/components/invoices/InvoiceStatCards";
import {
  invoiceCard,
  invoiceInput,
  invoiceSelect,
  StatusBadge,
  TypeBadge,
} from "@/app/components/invoices/invoiceUi";
import { formatInvoiceDate, fmtInvoiceMoney } from "@/lib/invoices";
import QuestionMarkTooltip from "@/app/components/QuestionmarkTooltip";

const PAGE_SIZE = 10;

export default function ProviderInvoicesPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [query, setQuery] = useState("");
  const [contractFilter, setContractFilter] = useState("all");
  const [memberFilter, setMemberFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState(null);
  const [busyContractId, setBusyContractId] = useState(null);

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
        setData({
          invoices: [],
          contracts: [],
          stats: {},
          members: [],
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const invoices = data?.invoices || [];
  const contracts = data?.contracts || [];
  const stats = data?.stats || {};
  const members = useMemo(
    () =>
      Array.from(
        new Set(
          contracts.map((c) => c.clientName).filter((n) => n && n !== "—"),
        ),
      ),
    [contracts],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = invoices.filter((row) => {
      if (contractFilter !== "all" && String(row.contractId) !== contractFilter)
        return false;
      if (memberFilter !== "all" && row.clientName !== memberFilter)
        return false;
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (dateFrom && new Date(row.invoiceDate) < new Date(dateFrom))
        return false;
      if (dateTo && new Date(row.invoiceDate) > new Date(`${dateTo}T23:59:59`))
        return false;
      if (!q) return true;
      return [
        row.invoiceNumber,
        row.contractTitle,
        row.contractRef,
        row.clientName,
        row.uploadedByName,
        row.documentType,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });

    rows.sort((a, b) => {
      const da = new Date(a.invoiceDate).getTime();
      const db = new Date(b.invoiceDate).getTime();
      return sort === "oldest" ? da - db : db - da;
    });
    return rows;
  }, [
    invoices,
    query,
    contractFilter,
    memberFilter,
    statusFilter,
    dateFrom,
    dateTo,
    sort,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    query,
    contractFilter,
    memberFilter,
    statusFilter,
    dateFrom,
    dateTo,
    sort,
  ]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const markAssignmentCompleted = async (row) => {
    if (!row || row.status === "Completed" || busyContractId != null) return;
    const confirmed = window.confirm(
      "Mark this assignment as completed? This cannot be undone.",
    );
    if (!confirmed) return;
    setBusyContractId(row.contractId);
    try {
      const res = await fetch("/api/me/invoices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractId: row.contractId,
          assignmentStatus: "Completed",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to update status");
      setPreview((prev) =>
        prev && prev.contractId === row.contractId
          ? { ...prev, status: "Completed" }
          : prev,
      );
      setData((prev) => {
        if (!prev) return prev;
        const nextContracts = (prev.contracts || []).map((c) =>
          c.contractId === row.contractId ? { ...c, status: "Completed" } : c,
        );
        return {
          ...prev,
          contracts: nextContracts,
          invoices: (prev.invoices || []).map((i) =>
            i.contractId === row.contractId ? { ...i, status: "Completed" } : i,
          ),
          stats: prev.stats
            ? {
                ...prev.stats,
                activeContracts: nextContracts.filter(
                  (c) => c.status === "Ongoing",
                ).length,
              }
            : prev.stats,
        };
      });
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyContractId(null);
    }
  };

  const clearFilters = () => {
    setQuery("");
    setContractFilter("all");
    setMemberFilter("all");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  return (
    <DashboardPage
      eyebrow=""
      title="My Invoices"
      description="Upload invoices issued under your LEXIFY Contracts and track amounts invoiced against agreed fees."
      backHref="/provider-archive"
      backLabel="Back to Dashboard"
    >
      {loading ? (
        <div className={loadingCard}>Loading invoices…</div>
      ) : (
        <div className="space-y-6">
          <InvoiceStatCards
            columnsClassName="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
            leading={
              <Link
                href="/provider-invoices/upload"
                className="flex items-start justify-between gap-3 rounded-2xl bg-[#11999e] p-6 text-white shadow-[0_16px_44px_rgba(17,153,158,0.22)] ring-1 ring-black/10 transition-colors hover:bg-[#0e8488]"
              >
                <div>
                  <p className="mt-1 text-2xl font-semibold tracking-tight">
                    Upload Invoice
                  </p>
                  <p className="mt-1 text-sm text-white/80">
                    Upload a new invoice or credit note under a LEXIFY Contract.
                  </p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Upload
                    className="h-5 w-5"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </span>
              </Link>
            }
            items={[
              {
                label: "Invoices this month",
                value: stats.invoicesThisMonth ?? 0,
                hint:
                  stats.invoicesThisMonthChange != null
                    ? `${stats.invoicesThisMonthChange > 0 ? "+" : ""}${stats.invoicesThisMonthChange}% vs. last month`
                    : "vs. last month",
                hintClass:
                  (stats.invoicesThisMonthChange || 0) >= 0
                    ? "text-emerald-600"
                    : "text-rose-600",
                icon: FileText,
              },
              {
                label: "Active contracts",
                value: stats.activeContracts ?? 0,
                hint:
                  stats.activeContractsDelta != null
                    ? `${stats.activeContractsDelta > 0 ? "+" : ""}${stats.activeContractsDelta} since last month`
                    : "Ongoing assignments",
                icon: FolderOpen,
              },
              {
                label: "Without invoices",
                value: stats.noInvoice ?? 0,
                hint: "Contracts still awaiting an invoice",
                icon: Clock,
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

          <div className={`${invoiceCard} space-y-3`}>
            <h2 className="text-lg font-semibold text-gray-900">
              Filter Invoices
            </h2>
            <h2 className="text-sm text-gray-600">
              Search, filter, and review invoices across your assignments.
            </h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5 mt-5">
              <label className="text-sm text-gray-600">
                LEXIFY Contract
                <select
                  className={`${invoiceSelect} mt-1`}
                  value={contractFilter}
                  onChange={(e) => setContractFilter(e.target.value)}
                >
                  <option value="all">All contracts</option>
                  {contracts.map((c) => (
                    <option key={c.contractId} value={String(c.contractId)}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-gray-600">
                Client
                <select
                  className={`${invoiceSelect} mt-1`}
                  value={memberFilter}
                  onChange={(e) => setMemberFilter(e.target.value)}
                >
                  <option value="all">All clients</option>
                  {members.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-gray-600">
                Assignment Status
                <select
                  className={`${invoiceSelect} mt-1`}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="Ongoing">Assignment ongoing</option>
                  <option value="Completed">Assignment completed</option>
                </select>
              </label>
              <label className="text-sm text-gray-600">
                From (Invoice Date)
                <input
                  type="date"
                  className={`${invoiceInput} mt-1`}
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </label>
              <label className="text-sm text-gray-600">
                To (Invoice Date)
                <input
                  type="date"
                  className={`${invoiceInput} mt-1`}
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </label>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full max-w-md">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search invoices, contract, or client…"
                  className={`${invoiceInput} pl-9`}
                />
              </div>
              <button type="button" className={btnGhost} onClick={clearFilters}>
                Clear filters
              </button>
            </div>
          </div>

          <div className={invoiceCard}>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Invoices ({filtered.length})
              </h2>
              <label className="flex shrink-0 items-center gap-2 whitespace-nowrap text-sm text-gray-600">
                Sort by
                <select
                  className={`${invoiceSelect} w-auto`}
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="newest">Date (newest first)</option>
                  <option value="oldest">Date (oldest first)</option>
                </select>
              </label>
            </div>

            {filtered.length === 0 ? (
              <div className={emptyCard}>
                No invoices match the current filters. Upload an invoice to get
                started.
              </div>
            ) : (
              <>
                <div className={tableCard}>
                  <div className={tableScroll}>
                    <table className={`${table} min-w-[1200px]`}>
                      <thead>
                        <tr className={theadRow}>
                          <th className={th}>LEXIFY Contract</th>
                          <th className={th}>Client</th>
                          <th className={th}>Invoice number</th>
                          <th className={th}>Invoice date</th>
                          <th className={th}>
                            Document Type (Invoice/credit note)
                          </th>
                          <th className={th}>Fees excl. VAT</th>
                          <th className={th}>Disbursements excl. VAT</th>
                          <th className={th}>
                            Total invoiced / agreed fee{" "}
                            <QuestionMarkTooltip tooltipText="For fixed-fee assignments, this column shows the amount invoiced to date compared with the agreed fixed fee. For hourly-rate assignments, it shows the amount invoiced to date only." />
                          </th>
                          <th className={th}>Assignment Status</th>
                          <th className={th}>
                            Update Assignment status{" "}
                            <QuestionMarkTooltip tooltipText="When the work on an assignment is complete and no further invoices will be submitted to the client, click 'Mark as completed' to change the assignment's status from ongoing to completed. This keeps your invoicing overview accurate and confirms that billing for the assignment has finished." />
                          </th>
                          <th className={th}>View invoice</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visible.map((row) => (
                          <tr key={row.invoiceId} className={tr}>
                            <td className={td}>
                              <div className="text-left">
                                <div className="font-medium text-[#0f7c80]">
                                  {row.contractTitle}
                                </div>
                                <div className="text-xs text-gray-500">
                                  awarded {formatInvoiceDate(row.contractDate)}
                                </div>
                              </div>
                            </td>
                            <td className={td}>{row.clientName}</td>
                            <td className={td}>{row.invoiceNumber}</td>
                            <td className={td}>
                              {formatInvoiceDate(row.invoiceDate)}
                            </td>
                            <td className={td}>
                              <TypeBadge type={row.documentType} />
                            </td>
                            <td className={td}>
                              {fmtInvoiceMoney(row.feesExclVat, row.currency)}
                            </td>
                            <td className={td}>
                              {fmtInvoiceMoney(
                                row.disbursementsExclVat,
                                row.currency,
                              )}
                            </td>
                            <td className={td}>
                              {row.isHourly
                                ? fmtInvoiceMoney(row.runningFees, row.currency)
                                : `${fmtInvoiceMoney(row.runningFees, row.currency)} / ${fmtInvoiceMoney(row.agreedFee, row.currency)}`}
                            </td>
                            <td className={td}>
                              <StatusBadge status={row.status} />
                            </td>
                            <td className={td}>
                              {row.status === "Completed" ? (
                                <span className="text-sm text-gray-500">
                                  N/A
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  disabled={busyContractId != null}
                                  onClick={() => markAssignmentCompleted(row)}
                                  className={`${btnPrimary} whitespace-nowrap disabled:opacity-60`}
                                >
                                  {busyContractId === row.contractId
                                    ? "Updating…"
                                    : "Mark as completed"}
                                </button>
                              )}
                            </td>
                            <td className={td}>
                              <button
                                type="button"
                                className={btnGhost}
                                onClick={() => setPreview(row)}
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                {pageCount > 1 ? (
                  <div className="mt-4 flex justify-center gap-1">
                    {Array.from({ length: pageCount }, (_, i) => i + 1).map(
                      (n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setPage(n)}
                          className={`h-8 min-w-8 rounded-lg px-2 text-sm font-medium ${
                            n === page
                              ? "bg-[#11999e] text-white"
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          {n}
                        </button>
                      ),
                    )}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      )}

      <InvoicePreviewModal
        open={!!preview}
        invoice={preview}
        onClose={() => setPreview(null)}
      />
    </DashboardPage>
  );
}
