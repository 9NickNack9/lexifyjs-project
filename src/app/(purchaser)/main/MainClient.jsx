"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowRight,
  BookOpen,
  FilePlus2,
  LayoutGrid,
  Star,
  UserPlus,
  UserRound,
} from "lucide-react";
import { HubShell } from "@/app/components/HubPage";

const cards = [
  {
    title: "Create a LEXIFY Request",
    description: "Create a request for proposal to buy legal services.",
    href: "/request-start",
    icon: FilePlus2,
    cta: "Create Request",
  },
  {
    title: "My Dashboard",
    description:
      "All your LEXIFY Requests, LEXIFY Contracts and law firm invoices can be found here.",
    href: "/archive",
    icon: LayoutGrid,
    cta: "Go to Dashboard",
  },
  {
    title: "Rate Legal Service Providers",
    description:
      "Rate law firms based on performance in a specific matter. You can also view the average ratings other members have given.",
    href: "/provider_rating",
    icon: Star,
    cta: "Law Firm Ratings",
  },
  {
    title: "Invite a Law Firm",
    description:
      "Invite a law firm you work with to join LEXIFY and receive your requests.",
    href: "/invite",
    icon: UserPlus,
    cta: "Invite Law Firm",
  },
  {
    title: "My Account",
    description:
      "Manage your account settings, contact details, preferences, and which law firms can see your LEXIFY Requests and submit offers.",
    href: "/account",
    icon: UserRound,
    cta: "Manage Account",
  },
  {
    title: "Help & Resources",
    description:
      "Watch video tutorials, find our support contacts, share your feedback, or book a guided LEXIFY Request preparation session.",
    href: "/help",
    icon: BookOpen,
    cta: "Explore Resources",
  },
];

export default function MainClient() {
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
          The smart, transparent way to buy legal services. Post a request,
          compare providers, and get the right legal help—faster.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
