"use client";

import HubPage from "@/app/components/HubPage";
import { FilePlus2, FileSearch, MessagesSquare } from "lucide-react";

const cards = [
  {
    title: "I need an ICT/IT contract template for my business",
    href: "/contracts/ict-template",
    icon: FilePlus2,
  },
  {
    title: "I need a legal review of an ICT/IT contract sent by a supplier",
    href: "/contracts/ict-review",
    icon: FileSearch,
  },
  {
    title:
      "I need support with negotiating an ICT/IT contract with a counterparty",
    href: "/contracts/ict-negotiation",
    icon: MessagesSquare,
  },
];

export default function Ict() {
  return (
    <HubPage
      eyebrow="ICT and IT"
      title="What Do You Need?"
      description="Select the ICT/IT support that matches your request."
      cards={cards}
    />
  );
}
