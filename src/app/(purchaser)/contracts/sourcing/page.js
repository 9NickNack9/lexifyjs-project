"use client";

import HubPage from "@/app/components/HubPage";
import { FilePlus2, FileSearch, MessagesSquare } from "lucide-react";

const cards = [
  {
    title: "I need a sourcing agreement template for my business",
    href: "/contracts/sourcing-agreement",
    icon: FilePlus2,
  },
  {
    title: "I need a legal review of a sourcing agreement sent by a supplier",
    href: "/contracts/sourcing-comments",
    icon: FileSearch,
  },
  {
    title:
      "I need support with negotiating a sourcing agreement with a supplier",
    href: "/contracts/sourcing-negotiation",
    icon: MessagesSquare,
  },
];

export default function Sourcing() {
  return (
    <HubPage
      eyebrow="Sourcing"
      title="What Do You Need?"
      description="Select the sourcing support that matches your request."
      cards={cards}
    />
  );
}
