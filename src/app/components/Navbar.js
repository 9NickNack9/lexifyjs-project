"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export default function Navbar() {
  const { data: session, status } = useSession();

  const isLoading = status === "loading";

  // NextAuth still provides session.user?.name by default; we also support fallbacks.
  const displayName = isLoading
    ? "…"
    : [session?.firstName, session?.lastName].filter(Boolean).join(" ") ||
      session?.user?.email ||
      "Guest";

  const role = session?.role ?? null; // "ADMIN" | "PROVIDER" | "PURCHASER"
  const registerStatus = session?.registerStatus ?? null; // e.g. "pending" | "approved"
  const companyName = session?.companyName ?? null;

  // Choose home route by role (adjust if your routes differ)
  let logoHref = "/main";
  if (role === "PROVIDER") logoHref = "/provider";
  if (role === "ADMIN") logoHref = "/admin";

  const handleLogout = () => {
    signOut({ callbackUrl: "/login" });
  };

  return (
    <nav className="flex justify-between items-center p-4 bg-[#11999e] text-white relative">
      <div className="flex justify-center w-full">
        <Link href={logoHref}>
          <img
            src="/lexify_wide.png"
            alt="Business Logo"
            className="w-32 md:w-64 lg:w-96 cursor-pointer"
          />
        </Link>
      </div>

      <div className="absolute right-4 flex items-center gap-4">
        <div className="text-right leading-tight">
          <div>
            Logged in as, <span className="font-semibold">{displayName}</span>
          </div>

          {/* Role + Company line (only when authenticated) */}
          {!isLoading && role && displayName !== "Guest" && (
            <div className="text-xs opacity-90">
              {companyName ? ` ${companyName}` : ""}
              {registerStatus === "pending" ? " • Pending approval" : ""}
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="bg-[#3a3a3c] px-3 py-1 rounded cursor-pointer"
        >
          Log Out
        </button>
      </div>
    </nav>
  );
}
