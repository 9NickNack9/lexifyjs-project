"use client";

export function PreviewSection({ title, children }) {
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-black/10">
      <div className="bg-[#11999e] px-4 py-2.5">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      <div className="bg-white p-4 text-black">{children ?? "—"}</div>
    </div>
  );
}

export default function RequestPreviewModal({
  open,
  onClose,
  children,
  title = "LEXIFY Request Preview",
  closeLabel = "Close Preview",
  headerAction = null,
  overlayClassName = "z-50",
}) {
  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center bg-black/40 p-4 ${overlayClassName}`}
    >
      <div className="relative flex max-h-[90vh] w-11/12 max-w-4xl flex-col overflow-hidden rounded-2xl bg-[linear-gradient(45deg,#11999e_0%,#cfecee_30%,#cfecee_70%,#11999e_100%)] bg-fixed shadow-[0_16px_44px_rgba(17,153,158,0.22)] ring-1 ring-black/10">
        <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
          {headerAction}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[#3a3a3c] text-xl text-white transition hover:bg-red-600"
          >
            &times;
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-10 sm:px-8">
          <header className="mb-8 text-center">
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {title}
            </h2>
          </header>
          <div
            id="lexify-preview"
            className="space-y-6 rounded-2xl bg-white p-6 text-black shadow-[0_16px_44px_rgba(17,153,158,0.22)] ring-1 ring-black/10"
          >
            {children}
          </div>
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-white px-8 py-2.5 text-sm font-semibold text-[#11999e] shadow-[0_8px_24px_rgba(17,153,158,0.18)] ring-1 ring-black/10 transition hover:bg-[#f8fbfb] hover:shadow-[0_12px_28px_rgba(17,153,158,0.24)]"
            >
              {closeLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
