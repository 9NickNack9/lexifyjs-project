"use client";

export default function PdfPreviewModal({
  open,
  onClose,
  title = "Document",
  subtitle,
  url,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative flex max-h-[90vh] w-11/12 max-w-5xl flex-col overflow-hidden rounded-2xl bg-[linear-gradient(45deg,#11999e_0%,#cfecee_30%,#cfecee_70%,#11999e_100%)] bg-fixed shadow-[0_16px_44px_rgba(17,153,158,0.22)] ring-1 ring-black/10">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close document"
          className="absolute right-4 top-4 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[#3a3a3c] text-xl text-white transition hover:bg-red-600"
        >
          &times;
        </button>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-10 sm:px-8">
          <header className="mb-6 text-center">
            <p className="text-sm font-medium tracking-[0.28em] text-[#11999e] uppercase">
              LEXIFY Contract
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-2 text-gray-600">{subtitle}</p>
            ) : null}
          </header>
          <div className="overflow-hidden rounded-2xl bg-white shadow-[0_16px_44px_rgba(17,153,158,0.22)] ring-1 ring-black/10">
            {url ? (
              <iframe
                title={title}
                src={url}
                className="h-[min(70vh,720px)] w-full bg-gray-100"
              />
            ) : (
              <div className="flex h-64 items-center justify-center text-sm text-gray-500">
                No contract PDF is available for this assignment.
              </div>
            )}
          </div>
          <div className="mt-8 flex justify-center gap-3">
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-[#11999e] px-8 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(17,153,158,0.18)] transition hover:bg-[#0e8488]"
              >
                Open PDF
              </a>
            ) : null}
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
