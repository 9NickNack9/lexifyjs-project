"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { HubShell } from "@/app/components/HubPage";

export default function DashboardPage({
  title,
  description,
  children,
  backHref = "/archive",
  backLabel = "Back to Dashboard",
  hideBack = false,
  actions = null,
}) {
  return (
    <HubShell contentClassName="max-w-[90rem]">
      {!hideBack ? (
        <Link
          href={backHref}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#0f7c80] transition-colors hover:text-[#11999e]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {backLabel}
        </Link>
      ) : null}
      <header className="mb-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-2 max-w-3xl text-gray-600">{description}</p>
            ) : null}
          </div>
          {actions}
        </div>
      </header>
      {children}
    </HubShell>
  );
}
