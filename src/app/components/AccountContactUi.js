"use client";

import { ChevronRight } from "lucide-react";

export function AccountHeading({ icon: Icon, title, as = "h2" }) {
  const Tag = as;
  return (
    <div className="mb-5">
      <div className="flex items-center gap-3">
        {Icon ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#11999e] text-white">
            <Icon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </span>
        ) : null}
        <Tag
          className={`font-semibold text-gray-800 ${
            as === "h2" ? "text-xl sm:text-2xl" : "text-lg"
          }`}
        >
          {title}
        </Tag>
      </div>
      <div
        className={`mt-2 h-[3px] w-10 rounded-full bg-[#11999e] ${
          Icon ? "ml-12" : ""
        }`}
      />
    </div>
  );
}

export function AccountNestedCard({ children }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
      {children}
    </div>
  );
}

export function OutlinedField({
  label,
  value,
  editing = false,
  inputProps,
  className = "",
}) {
  return (
    <div className={`relative ${className}`}>
      <label className="absolute -top-2 left-3 z-[1] bg-white px-1 text-xs text-gray-500">
        {label}
      </label>
      {editing ? (
        <input
          {...inputProps}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-[#11999e] focus:ring-1 focus:ring-[#11999e]/30"
        />
      ) : (
        <div className="min-h-[42px] w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800">
          {value || "-"}
        </div>
      )}
    </div>
  );
}

export function AccountActionButton({
  icon: Icon,
  children,
  showChevron = true,
  tone = "primary",
  className = "",
  ...props
}) {
  const tones = {
    primary: "bg-[#11999e] hover:bg-[#0e8488]",
    success: "bg-green-600 hover:bg-green-700",
    danger: "bg-red-600 hover:bg-red-700",
  };

  return (
    <button
      type="button"
      className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone] || tones.primary} ${className}`}
      {...props}
    >
      {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
      <span>{children}</span>
      {showChevron ? (
        <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
      ) : null}
    </button>
  );
}
