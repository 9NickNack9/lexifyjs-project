"use client";

import HubPage from "@/app/components/HubPage";
import { LEXI_START_DRAFT_EVENT } from "@/lib/lexiChat";
import { FilePen, Sparkles } from "lucide-react";

const cards = [
  {
    title: "Create a LEXIFY Request with Lexi",
    description:
      "Describe your legal need and Lexi will prepare a draft Request for you to review and submit.",
    icon: Sparkles,
    cta: "Ask Lexi",
    onClick: () => {
      window.dispatchEvent(new Event(LEXI_START_DRAFT_EVENT));
    },
  },
  {
    title: "Create a LEXIFY Request Manually",
    description:
      "Choose the legal topic you need help with and complete the Request step by step.",
    href: "/create-request",
    icon: FilePen,
    cta: "Get Started",
  },
];

export default function RequestMethodPage() {
  return (
    <HubPage
      eyebrow="LEXIFY Request"
      title="How Would You Like to Create Your Request?"
      cards={cards}
      contentClassName="max-w-5xl"
    />
  );
}
