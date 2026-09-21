"use client";

import HubPage from "@/app/components/HubPage";
import {
  Banknote,
  Briefcase,
  Building2,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Landmark,
  MessageSquare,
  Scale,
  Shield,
} from "lucide-react";

const cards = [
  {
    title: "Help with Contracts",
    href: "/requests/contracts",
    icon: FileText,
  },
  {
    title: "Day-to-day Legal Advice",
    href: "/requests/legal-advice",
    icon: MessageSquare,
  },
  {
    title: "Help with Employment related Documents",
    href: "/requests/employment-documents",
    icon: Briefcase,
  },
  {
    title: "Help with Dispute Resolution or Debt Collection",
    href: "/requests/dispute-resolution",
    icon: Scale,
  },
  {
    title: "Help with Mergers & Acquisitions",
    href: "/requests/mergers-acquisitions",
    icon: Building2,
  },
  {
    title: "Help with Corporate Governance",
    href: "/requests/corporate-governance",
    icon: Landmark,
  },
  {
    title: "Help with Personal Data Protection",
    href: "/requests/privacy-selection",
    icon: Shield,
  },
  {
    title: "Help with Banking and Finance Matters",
    href: "/requests/banking-and-finance",
    icon: Banknote,
  },
  {
    title:
      "Help with KYC (Know Your Customer) or Compliance related Questionnaire",
    href: "/requests/kyc",
    icon: ClipboardCheck,
  },
  {
    title: "Legal Training for Management and/or Personnel",
    href: "/requests/legal-training",
    icon: GraduationCap,
  },
];

export default function CreateRequest() {
  return (
    <HubPage
      eyebrow="LEXIFY Request"
      title="What Kind of Legal Support Do You Need?"
      description="Choose the topic that best matches the help you are looking for."
      cards={cards}
    />
  );
}
