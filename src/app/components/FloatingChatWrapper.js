"use client";

import { useSession } from "next-auth/react";
import FloatingChat from "@/app/components/FloatingChat";

export default function FloatingChatWrapper() {
  const { data: session, status } = useSession();

  // Keep Lexi mounted when a session is already available (avoids chat reset on navigation).
  if (status === "loading" && !session) return null;

  const role = session?.role;

  /*
  if (role !== "ADMIN" && role !== "PURCHASER") {
    return null;
  }*/

  if (role !== "ADMIN") {
    return null;
  }

  return <FloatingChat />;
}
