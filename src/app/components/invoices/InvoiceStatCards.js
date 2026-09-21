"use client";

import { invoiceCard } from "./invoiceUi";

export default function InvoiceStatCards({
  items,
  leading = null,
  columnsClassName = "grid gap-4 sm:grid-cols-2 xl:grid-cols-4",
}) {
  return (
    <div className={columnsClassName}>
      {leading}
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className={invoiceCard}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-gray-500">{item.label}</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">
                  {item.value}
                </p>
                {item.hint ? (
                  <p
                    className={`mt-1 text-sm ${item.hintClass || "text-gray-500"}`}
                  >
                    {item.hint}
                  </p>
                ) : null}
              </div>
              {Icon ? (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#11999e]/10 text-[#11999e]">
                  <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
