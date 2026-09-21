"use client";

import HubPage from "@/app/components/HubPage";
import { Banknote, Gavel, Handshake, Scale } from "lucide-react";

const cards = [
  {
    title: "I am a party to court proceedings",
    href: "/contracts/dispute-court",
    icon: Gavel,
  },
  {
    title: "I am a party to arbitration proceedings",
    href: "/contracts/dispute-arbitration",
    icon: Scale,
  },
  {
    title: "I need help with settlement negotiations",
    href: "/contracts/dispute-settlement",
    icon: Handshake,
  },
  {
    title: "I need help with debt collection",
    href: "/contracts/dispute-debt",
    icon: Banknote,
  },
];

export default function DisputeResolution() {
  return (
    <HubPage
      eyebrow="Dispute Resolution"
      title="What Kind of Dispute Resolution Support Do You Need?"
      description="Select the dispute or debt collection support that matches your request."
      cards={cards}
      contentClassName="max-w-5xl"
    />
  );
}
