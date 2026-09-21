"use client";

import HubPage from "@/app/components/HubPage";
import { FilePlus2, FolderOpen } from "lucide-react";

const cards = [
  {
    title: "Start a New LEXIFY Request",
    description: "Begin a new LEXIFY Request to buy legal services.",
    href: "/request-method",
    icon: FilePlus2,
    cta: "Get started",
  },
  {
    title: "Continue a Saved Draft",
    description:
      "Continue with a draft LEXIFY Request you saved earlier and submit it when ready.",
    href: "/request-drafts",
    icon: FolderOpen,
    cta: "Open drafts",
  },
];

export default function RequestStartPage() {
  return (
    <HubPage
      eyebrow="LEXIFY Request"
      title="Create a LEXIFY Request"
      description="Start a new request or pick up a draft you saved earlier."
      cards={cards}
      contentClassName="max-w-5xl"
    />
  );
}
