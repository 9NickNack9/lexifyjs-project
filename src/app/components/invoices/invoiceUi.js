"use client";

export const invoiceCard =
  "rounded-2xl bg-white p-6 shadow-[0_16px_44px_rgba(17,153,158,0.22)] ring-1 ring-black/10";

export const invoiceInput =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#11999e] focus:ring-1 focus:ring-[#11999e]/30";

export const invoiceSelect =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#11999e] focus:ring-1 focus:ring-[#11999e]/30";

export function TypeBadge({ type }) {
  const credit = String(type || "")
    .toLowerCase()
    .includes("credit");
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        credit
          ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
          : "bg-[#11999e]/10 text-[#0f7c80] ring-1 ring-[#11999e]/20"
      }`}
    >
      {type || "Invoice"}
    </span>
  );
}

export function StatusBadge({ status }) {
  const completed = status === "Completed";
  return (
    <span
      className={`inline-flex rounded-xl px-2.5 py-1 text-xs font-medium ${
        completed
          ? "bg-slate-700 text-white ring-1 ring-slate-700"
          : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
      }`}
    >
      {completed ? "Assignment completed" : "Assignment ongoing"}
    </span>
  );
}

export function ProgressBar({ pct, agreed }) {
  if (pct == null || !agreed) {
    return (
      <p className="text-sm text-gray-500">
        Hourly engagement — no fee ceiling.
      </p>
    );
  }
  const width = Math.max(0, Math.min(100, Number(pct) || 0));
  const label = Math.round(width * 100) / 100;
  const barClass =
    width >= 90 ? "bg-red-500" : width >= 60 ? "bg-orange-500" : "bg-[#11999e]";
  return (
    <div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full ${barClass}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-gray-500">
        {label.toFixed(2)}% of agreed fee
      </p>
    </div>
  );
}
