"use client";

import HubPage from "@/app/components/HubPage";
import { Clock, FileCheck, History, Trophy, ReceiptEuro } from "lucide-react";

const cards = [
  {
    title: "My Pending LEXIFY Requests",
    description:
      "Track open LEXIFY Requests, follow incoming offers, and share Requests with colleagues.",
    href: "/archive/pending",
    icon: Clock,
    cta: "View pending",
  },
  {
    title: "Awaiting Offer Selection",
    description:
      "The offer period has closed for these LEXIFY Requests. Compare the offers you have received, select the winning offer, or extend your time to decide.",
    href: "/archive/awaiting",
    icon: Trophy,
    cta: "View offers",
  },
  {
    title: "My Expired LEXIFY Requests",
    description:
      "Look back at LEXIFY Requests that have closed, including the offers received and the outcome.",
    href: "/archive/expired",
    icon: History,
    cta: "View expired",
  },
  {
    title: "My LEXIFY Contracts",
    description:
      "A record of every LEXIFY Contract you have entered into, with the key terms and the contract document.",
    href: "/archive/contracts",
    icon: FileCheck,
    cta: "View contracts",
  },
  {
    title: "Invoices Received",
    description:
      "All invoices issued by law firms under your LEXIFY Contracts, with the total invoiced to date on each assignment.",
    href: "/archive/invoices",
    icon: ReceiptEuro,
    cta: "View invoices",
  },
];

export default function ArchivePage() {
  return (
    <HubPage
      eyebrow="Dashboard"
      title="My Dashboard"
      description="Track your LEXIFY Requests from submission through to contract and invoicing."
      cards={cards}
      contentClassName="max-w-6xl"
    />
  );
}
