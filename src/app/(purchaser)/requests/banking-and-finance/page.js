"use client";

import HubPage from "@/app/components/HubPage";
import { Ban, FilePen, MessageSquare, RefreshCw } from "lucide-react";

const cards = [
  {
    title: "Help with Refinancing of Existing Debt",
    href: "/contracts/finance-debt",
    icon: RefreshCw,
  },
  {
    title: "Help with Amendment of Existing Debt Terms",
    href: "/contracts/finance-debt-terms",
    icon: FilePen,
  },
  {
    title: "Help with Breach Waiver (Finance Documents)",
    href: "/contracts/finance-breach-waiver",
    icon: Ban,
  },
  {
    title: "Day-to-Day Banking & Finance Legal Advice",
    href: "/requests/legal-advice",
    icon: MessageSquare,
  },
];

export default function BankingAndFinance() {
  return (
    <HubPage
      eyebrow="Banking and Finance"
      title="What Do You Need?"
      description="Select the banking and finance support that matches your request."
      cards={cards}
      contentClassName="max-w-5xl"
    />
  );
}
