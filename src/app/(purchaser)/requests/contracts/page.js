"use client";

import HubPage from "@/app/components/HubPage";
import { Handshake, Home, Monitor, Package, ShoppingBag } from "lucide-react";

const cards = [
  {
    title: "Sales (B2B)",
    href: "/contracts/sales-b2b",
    icon: Handshake,
  },
  {
    title: "Sales (B2C)",
    href: "/contracts/sales-b2c",
    icon: ShoppingBag,
  },
  {
    title: "Real Estate and Construction",
    href: "/contracts/real-estate",
    icon: Home,
  },
  {
    title: "Sourcing",
    href: "/contracts/sourcing",
    icon: Package,
  },
  {
    title: "ICT and IT",
    href: "/contracts/ict-it",
    icon: Monitor,
  },
];

export default function Contracts() {
  return (
    <HubPage
      eyebrow="Contracts"
      title="What Kind of Contract Do You Need Help With?"
      description="Select the contract category to continue your LEXIFY Request."
      cards={cards}
    />
  );
}
