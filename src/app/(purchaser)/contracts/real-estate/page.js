"use client";

import HubPage from "@/app/components/HubPage";
import {
  Hammer,
  Home,
  KeyRound,
  Map,
  RefreshCw,
  Waypoints,
} from "lucide-react";

const cards = [
  {
    title: "Sale and Purchase of Real Estate",
    href: "/contracts/re-sale",
    icon: Home,
  },
  {
    title: "Sale and Leaseback of Real Estate",
    href: "/contracts/re-leaseback",
    icon: RefreshCw,
  },
  {
    title: "Lease of Business Premises, Residential Premises or Land",
    href: "/contracts/re-lease",
    icon: KeyRound,
  },
  {
    title: "Easement Agreement",
    href: "/contracts/re-easement",
    icon: Waypoints,
  },
  {
    title: "Land Use Agreement",
    href: "/contracts/re-landuse",
    icon: Map,
  },
  {
    title: "Construction Contract",
    href: "/contracts/re-construction",
    icon: Hammer,
  },
];

export default function RealEstate() {
  return (
    <HubPage
      eyebrow="Real Estate and Construction"
      title="Specify the Contract Type"
      description="Choose the real estate or construction contract you need help with."
      cards={cards}
    />
  );
}
