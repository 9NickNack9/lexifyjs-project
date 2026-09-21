"use client";

import HubPage from "@/app/components/HubPage";
import {
  FilePlus2,
  Files,
  MessageSquare,
  MessagesSquare,
} from "lucide-react";

const cards = [
  {
    title: "I need an employment contract template for my business",
    href: "/contracts/emp-contract",
    icon: FilePlus2,
  },
  {
    title:
      "I need other employment related document template(s) for my business",
    href: "/contracts/emp-documents",
    icon: Files,
  },
  {
    title:
      "I need help with negotiating a contract with an employee or a managing director",
    href: "/contracts/emp-negotiation",
    icon: MessagesSquare,
  },
  {
    title: "I need day-to-day legal advice related to employment matters",
    href: "/requests/legal-advice",
    icon: MessageSquare,
  },
];

export default function EmploymentDocuments() {
  return (
    <HubPage
      eyebrow="Employment"
      title="What Do You Need?"
      description="Select the employment support that matches your request."
      cards={cards}
      contentClassName="max-w-5xl"
    />
  );
}
