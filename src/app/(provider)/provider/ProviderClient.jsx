"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowRight,
  BookOpen,
  FileText,
  LayoutGrid,
  UserRound,
  ReceiptEuro,
} from "lucide-react";
import { HubShell } from "@/app/components/HubPage";

const cards = [
  {
    title: "Review LEXIFY Requests",
    description:
      "Browse pending requests for proposal and submit offers in response.",
    href: "/provider-request",
    icon: FileText,
    cta: "View Requests",
  },
  {
    title: "My Dashboard",
    description:
      "Offers you have previously submitted and your LEXIFY Contracts can be viewed here.",
    href: "/provider-archive",
    icon: LayoutGrid,
    cta: "View Dashboard",
  },
  {
    title: "My Invoices",
    description:
      "Upload invoices issued under your LEXIFY Contracts, and see the total invoiced on each assignment.",
    href: "/provider-invoices",
    icon: ReceiptEuro,
    cta: "View Invoices",
  },
  {
    title: "My Account",
    description:
      "Your account settings and contact details can be found and updated here.",
    href: "/provider-account",
    icon: UserRound,
    cta: "Manage Account",
  },
  {
    title: "Help & Resources",
    description:
      "Watch video tutorials on using the platform and find our support contact details.",
    href: "/provider-help",
    icon: BookOpen,
    cta: "Explore Resources",
  },
];

export default function Provider() {
  const { data: session } = useSession();
  const fullName = [session?.firstName, session?.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <HubShell>
      <header className="mb-12 text-center">
        <p className="text-sm font-medium tracking-[0.28em] text-gray-900 uppercase">
          Welcome back,
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          {fullName || "LEXIFY"}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">
          Review open RFPs, submit offers, and manage your LEXIFY Contracts in
          one place.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group flex h-full flex-col items-center rounded-2xl bg-white px-7 py-8 text-center shadow-[0_16px_44px_rgba(17,153,158,0.28)] ring-1 ring-black/10 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_56px_rgba(17,153,158,0.38)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#11999e]"
            >
              <Icon
                className="h-9 w-9 text-[#11999e]"
                strokeWidth={1.6}
                aria-hidden="true"
              />
              <h2 className="mt-5 text-lg font-bold text-gray-900">
                {card.title}
              </h2>
              <p className="mt-2 mb-6 flex-1 text-sm leading-relaxed text-gray-500">
                {card.description}
              </p>
              <span className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#11999e] bg-white px-4 py-2.5 text-sm font-medium text-[#11999e] transition-colors duration-300 ease-in-out group-hover:bg-[#11999e]/10 group-focus-visible:bg-[#11999e]/10">
                {card.cta}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </Link>
          );
        })}
      </div>
    </HubShell>
  );
}
