// src/app/components/Navbar.js
"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export default function Navbar() {
  const { data: session, status } = useSession();

  const username = status === "loading" ? "…" : session?.user?.name || "Guest";
  const role = session?.role || null;

  let logoHref = "/main";
  if (role === "PROVIDER") logoHref = "/provider";

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
        <span>Logged in as, {username}</span>
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
