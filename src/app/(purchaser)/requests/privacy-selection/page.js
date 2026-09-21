"use client";

import HubPage from "@/app/components/HubPage";
import {
  CircleHelp,
  FileStack,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

const cards = [
  {
    title: "I need a general analysis of my company's GDPR compliance",
    href: "/contracts/gdpr-compliance",
    icon: ShieldCheck,
  },
  {
    title: "I need help with creating data privacy related documentation",
    href: "/contracts/privacy-documentation",
    icon: FileStack,
  },
  {
    title: "I need help with a personal data breach related matter",
    href: "/contracts/data-breach",
    icon: TriangleAlert,
  },
  {
    title: "I need help with a specific data privacy related question",
    href: "/contracts/data-question",
    icon: CircleHelp,
  },
];

export default function PrivacySelection() {
  return (
    <HubPage
      eyebrow="Personal Data Protection"
      title="What Kind of Personal Data Protection Support Do You Need?"
      description="Select the data privacy support that matches your request."
      cards={cards}
      contentClassName="max-w-5xl"
    />
  );
}
