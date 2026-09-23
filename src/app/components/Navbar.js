"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { isProviderSidePath } from "@/lib/providerPaths";
import {
  BookOpen,
  ChevronDown,
  FileText,
  Home,
  LayoutGrid,
  LogOut,
  Menu,
  UserPlus,
  UserRound,
  Users,
  X,
  ReceiptEuro,
} from "lucide-react";

const purchaserLinks = [
  { href: "/main", label: "Home", icon: Home },
  { href: "/request-start", label: "Create RFP", icon: FileText },
  { href: "/archive", label: "Dashboard", icon: LayoutGrid },
  { href: "/provider_rating", label: "Law Firm Ratings", icon: Users },
  { href: "/invite", label: "Invite", icon: UserPlus },
  { href: "/help", label: "Resources", icon: BookOpen },
];

const providerLinks = [
  { href: "/provider", label: "Home", icon: Home },
  { href: "/provider-request", label: "Review RFPs", icon: FileText },
  { href: "/provider-archive", label: "Dashboard", icon: LayoutGrid },
  { href: "/provider-invoices", label: "My Invoices", icon: ReceiptEuro },
  { href: "/provider-help", label: "Help & Resources", icon: BookOpen },
];

const adminLinks = [
  { href: "/main", label: "Home", icon: Home },
  { href: "/request-start", label: "Create RFP", icon: FileText },
  { href: "/archive", label: "Dashboard", icon: LayoutGrid },
  { href: "/provider_rating", label: "Law Firm Ratings", icon: Users },
  { href: "/invite", label: "Invite Law Firm", icon: UserPlus },
  { href: "/help", label: "Help & Resources", icon: BookOpen },
];

function isLinkActive(href, pathname) {
  if (href === "/main") return pathname === "/main";
  if (href === "/provider") return pathname === "/provider";
  if (href === "/admin") return pathname.startsWith("/admin");
  if (href === "/archive") return pathname.startsWith("/archive");
  if (href === "/request-start") {
    return (
      pathname.startsWith("/request-start") ||
      pathname.startsWith("/request-method") ||
      pathname.startsWith("/create-request") ||
      pathname.startsWith("/request-drafts") ||
      pathname.startsWith("/requests") ||
      pathname.startsWith("/contracts")
    );
  }
  if (href === "/provider_rating") {
    return pathname.startsWith("/provider_rating");
  }
  if (href === "/invite") return pathname.startsWith("/invite");
  if (href === "/help") return pathname.startsWith("/help");
  if (href === "/provider-archive")
    return pathname.startsWith("/provider-archive");
  if (href === "/provider-request") {
    return (
      pathname.startsWith("/provider-request") ||
      pathname.startsWith("/make-offer")
    );
  }
  if (href === "/provider-help") return pathname.startsWith("/provider-help");
  if (href === "/provider-invoices")
    return pathname.startsWith("/provider-invoices");
  return pathname === href;
}

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const checkedRef = useRef(false);
  const menuRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isLoading = status === "loading";

  const displayName = isLoading
    ? "…"
    : [session?.firstName, session?.lastName].filter(Boolean).join(" ") ||
      session?.user?.email ||
      "Guest";

  const role = session?.role ?? null;
  const registerStatus = session?.registerStatus ?? null;
  const companyName = session?.companyName ?? null;

  const onProviderSide = isProviderSidePath(pathname);
  const showProviderNav =
    role === "PROVIDER" || (role === "ADMIN" && onProviderSide);

  let logoHref = "/main";
  if (showProviderNav) logoHref = "/provider";
  else if (role === "ADMIN") logoHref = "/admin";

  const accountHref = showProviderNav ? "/provider-account" : "/account";

  const navLinks = showProviderNav
    ? providerLinks
    : role === "ADMIN"
      ? adminLinks
      : purchaserLinks;

  const handleLogout = () => {
    setMenuOpen(false);
    signOut({ callbackUrl: "/login" });
  };

  useEffect(() => {
    const onPointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (status !== "authenticated") {
      checkedRef.current = false;
      return;
    }

    if (checkedRef.current) return;
    checkedRef.current = true;

    let cancelled = false;

    const run = async () => {
      try {
        const res = await fetch(`/api/me?_ts=${Date.now()}`, {
          cache: "no-store",
          credentials: "include",
        });

        if (cancelled) return;

        if (res.status === 401) {
          signOut({ callbackUrl: "/login?reason=session-expired" });
          return;
        }

        if (!res.ok) {
          signOut({ callbackUrl: "/login?reason=session-check-failed" });
          return;
        }

        const data = await res.json();

        const sUserId = session?.userId ? String(session.userId) : null;
        const sCompanyId = session?.companyId
          ? String(session.companyId)
          : null;
        const sRole = session?.role ?? null;

        const dUserId =
          data?.auth?.dbUserId ??
          (data?.userAccount?.userPkId != null
            ? String(data.userAccount.userPkId)
            : null);

        const dCompanyId =
          data?.auth?.dbCompanyId ??
          (data?.userAccount?.companyId != null
            ? String(data.userAccount.companyId)
            : null);

        const dRole = data?.auth?.dbRole ?? data?.userAccount?.role ?? null;

        const mismatch =
          !sUserId ||
          !dUserId ||
          sUserId !== dUserId ||
          (sCompanyId && dCompanyId && sCompanyId !== dCompanyId) ||
          (sRole && dRole && sRole !== dRole);

        if (mismatch) {
          signOut({ callbackUrl: "/login?reason=session-mismatch" });
        }
      } catch {
        signOut({ callbackUrl: "/login?reason=session-check-failed" });
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [status, session?.userId, session?.companyId, session?.role]);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/95 text-gray-800 backdrop-blur-md">
      <div className="flex w-full items-center gap-5 px-4 py-0 sm:px-5">
        <Link href={logoHref} className="shrink-0 leading-none">
          <img
            src="/lexify_teal.png"
            alt="LEXIFY"
            className="h-24 w-auto object-contain sm:h-18"
          />
        </Link>

        <div className="hidden flex-1 items-end justify-center gap-9 lg:flex">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const active = isLinkActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center gap-1.5 pb-1.5 text-sm font-medium tracking-wide transition-colors duration-200 ${
                  active
                    ? "text-[#11999e]"
                    : "text-gray-500 hover:text-[#11999e]"
                }`}
              >
                <Icon
                  className="h-6 w-6"
                  strokeWidth={1.7}
                  aria-hidden="true"
                />
                {item.label}
                <span
                  className={`absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-[#11999e] transition-opacity duration-200 ${
                    active ? "opacity-100" : "opacity-0"
                  }`}
                />
              </Link>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2.5">
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex cursor-pointer items-center gap-3 rounded-full py-2 pr-2 pl-3 transition-colors duration-200 hover:bg-gray-50"
            >
              <span className="min-w-0 text-left leading-tight">
                <span className="block max-w-[9rem] truncate text-sm font-semibold text-gray-900 sm:max-w-[14rem] sm:text-base">
                  {displayName}
                </span>
                {!isLoading && role && displayName !== "Guest" && (
                  <span className="hidden max-w-[14rem] truncate text-sm text-gray-500 sm:block">
                    {companyName || ""}
                    {String(registerStatus || "").toUpperCase() === "PENDING"
                      ? `${companyName ? " • " : ""}Pending approval`
                      : ""}
                  </span>
                )}
              </span>
              <ChevronDown
                className={`hidden h-5 w-5 text-gray-400 transition-transform duration-200 sm:block ${
                  menuOpen ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2.5 w-60 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-lg ring-1 ring-black/5"
              >
                <Link
                  href={accountHref}
                  role="menuitem"
                  className="flex items-center gap-2.5 px-4 py-3 text-base text-gray-700 transition-colors duration-150 hover:bg-gray-50 hover:text-[#11999e]"
                  onClick={() => setMenuOpen(false)}
                >
                  <UserRound className="h-5 w-5" aria-hidden="true" />
                  My Account
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-3 text-left text-base text-gray-700 transition-colors duration-150 hover:bg-gray-50 hover:text-[#11999e]"
                >
                  <LogOut className="h-5 w-5" aria-hidden="true" />
                  Log Out
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            className="inline-flex cursor-pointer rounded-lg p-2.5 text-gray-600 lg:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-gray-100 bg-white px-4 py-4 lg:hidden">
          <div
            className={`grid gap-2.5 ${
              navLinks.length <= 4
                ? "grid-cols-2 sm:grid-cols-4"
                : "grid-cols-3 sm:grid-cols-6"
            }`}
          >
            {navLinks.map((item) => {
              const Icon = item.icon;
              const active = isLinkActive(item.href, pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-1.5 rounded-xl px-2 py-4 text-sm font-medium ${
                    active
                      ? "bg-[#11999e]/10 text-[#11999e]"
                      : "text-gray-600 hover:bg-gray-50 hover:text-[#11999e]"
                  }`}
                >
                  <Icon className="h-6 w-6" strokeWidth={1.7} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
