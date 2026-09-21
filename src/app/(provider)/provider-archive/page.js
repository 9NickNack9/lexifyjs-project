"use client";

import HubPage from "@/app/components/HubPage";
import { Clock, FileCheck, History, ReceiptEuro } from "lucide-react";

const cards = [
  {
    title: "Pending Offers",
    description:
      "Track offers you have submitted that are still waiting for the client's decision.",
    href: "/provider-archive/pending",
    icon: Clock,
    cta: "View Pending",
  },
  {
    title: "Past Offers",
    description:
      "Review offers the client has decided on, and the outcome of each.",
    href: "/provider-archive/expired",
    icon: History,
    cta: "View Past",
  },
  {
    title: "LEXIFY Contracts",
    description: "A record of every LEXIFY Contract you have entered into.",
    href: "/provider-archive/contracts",
    icon: FileCheck,
    cta: "View Contracts",
  },
];

export default function ProviderArchivePage() {
  return (
    <HubPage
      eyebrow=""
      title="My Dashboard"
      description="Track your offers from submission through to LEXIFY Contract."
      cards={cards}
      contentClassName="max-w-5xl"
    />
  );
}
