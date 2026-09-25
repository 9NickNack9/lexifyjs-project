"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import FloatingChat from "@/app/components/FloatingChat";
import { isProviderSidePath } from "@/lib/providerPaths";

export default function FloatingChatWrapper() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Keep Lexi mounted when a session is already available (avoids chat reset on navigation).
  if (status === "loading" && !session) return null;

  const role = session?.role;
  const showLexi =
    role === "PURCHASER" ||
    (role === "ADMIN" && !isProviderSidePath(pathname));

  if (!showLexi) {
    return null;
  }

  return <FloatingChat />;
}
