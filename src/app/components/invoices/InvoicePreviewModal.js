"use client";

import { formatInvoiceDate, formatPeriod, fmtInvoiceMoney } from "@/lib/invoices";
import { TypeBadge } from "./invoiceUi";

export default function InvoicePreviewModal({ open, onClose, invoice }) {
  if (!open || !invoice) return null;

  const fileUrl = invoice.file?.url || null;
  const fileName = invoice.file?.name || "Invoice.pdf";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative flex max-h-[90vh] w-11/12 max-w-5xl flex-col overflow-hidden rounded-2xl bg-[linear-gradient(45deg,#11999e_0%,#cfecee_30%,#cfecee_70%,#11999e_100%)] bg-fixed shadow-[0_16px_44px_rgba(17,153,158,0.22)] ring-1 ring-black/10">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close invoice"
          className="absolute right-4 top-4 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[#3a3a3c] text-xl text-white transition hover:bg-red-600"
        >
          &times;
        </button>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-10 sm:px-8">
          <header className="mb-8 text-center">
            <p className="text-sm font-medium tracking-[0.28em] text-[#11999e] uppercase">
              Invoice
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              {invoice.invoiceNumber}
            </h2>
            <p className="mt-2 text-gray-600">
              {invoice.contractTitle}
            </p>
          </header>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div className="space-y-4 rounded-2xl bg-white p-6 text-black shadow-[0_16px_44px_rgba(17,153,158,0.22)] ring-1 ring-black/10">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-gray-900">Details</h3>
                <TypeBadge type={invoice.documentType} />
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-gray-500">Invoice number</dt>
                  <dd className="font-medium text-gray-900">
                    {invoice.invoiceNumber}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Date</dt>
                  <dd className="font-medium text-gray-900">
                    {formatInvoiceDate(invoice.invoiceDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Period covered</dt>
                  <dd className="font-medium text-gray-900">
                    {formatPeriod(invoice.periodStart, invoice.periodEnd)}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Uploaded by</dt>
                  <dd className="font-medium text-gray-900">
                    {invoice.uploadedByName || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Fees excl. VAT</dt>
                  <dd className="font-medium text-gray-900">
                    {fmtInvoiceMoney(invoice.feesExclVat, invoice.currency)}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Disbursements excl. VAT</dt>
                  <dd className="font-medium text-gray-900">
                    {fmtInvoiceMoney(
                      invoice.disbursementsExclVat,
                      invoice.currency,
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">VAT amount</dt>
                  <dd className="font-medium text-gray-900">
                    {fmtInvoiceMoney(invoice.vatAmount, invoice.currency)}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Total excl. VAT</dt>
                  <dd className="font-medium text-gray-900">
                    {fmtInvoiceMoney(invoice.totalExclVat, invoice.currency)}
                  </dd>
                </div>
              </dl>
              {fileUrl ? (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-lg bg-[#11999e] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0e8488]"
                >
                  Open PDF
                </a>
              ) : null}
            </div>

            <div className="overflow-hidden rounded-2xl bg-white shadow-[0_16px_44px_rgba(17,153,158,0.22)] ring-1 ring-black/10">
              {fileUrl ? (
                <iframe
                  title={fileName}
                  src={fileUrl}
                  className="h-[min(70vh,640px)] w-full bg-gray-100"
                />
              ) : (
                <div className="flex h-[min(70vh,640px)] items-center justify-center text-sm text-gray-500">
                  No PDF is attached to this invoice.
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-white px-8 py-2.5 text-sm font-semibold text-[#11999e] shadow-[0_8px_24px_rgba(17,153,158,0.18)] ring-1 ring-black/10 transition hover:bg-[#f8fbfb]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
