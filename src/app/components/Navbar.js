"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef } from "react";

export default function Navbar() {
  const { data: session, status } = useSession();
  const checkedRef = useRef(false);

  const isLoading = status === "loading";

  const displayName = isLoading
    ? "…"
    : [session?.firstName, session?.lastName].filter(Boolean).join(" ") ||
      session?.user?.email ||
      "Guest";

  const role = session?.role ?? null;
  const registerStatus = session?.registerStatus ?? null;
  const companyName = session?.companyName ?? null;

  let logoHref = "/main";
  if (role === "PROVIDER") logoHref = "/provider";
  if (role === "ADMIN") logoHref = "/admin";

  const handleLogout = () => {
    signOut({ callbackUrl: "/login" });
  };

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
    <nav className="bg-[#11999e] text-white relative">
      <div className="px-4 py-3 md:p-4">
        {/* Mobile only */}
        <div className="flex flex-col items-center md:hidden gap-3">
          <Link href={logoHref}>
            <img
              src="/lexify_wide.png"
              alt="Business Logo"
              className="w-32 cursor-pointer"
            />
          </Link>

          <div className="flex items-center gap-3 max-w-full">
            <div className="text-center leading-tight text-sm">
              <div>
                Logged in as,{" "}
                <span className="font-semibold">{displayName}</span>
              </div>

              {!isLoading && role && displayName !== "Guest" && (
                <div className="text-xs opacity-90 break-words">
                  {companyName ? companyName : ""}
                  {String(registerStatus || "").toUpperCase() === "PENDING"
                    ? " • Pending approval"
                    : ""}
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="bg-[#3a3a3c] px-3 py-1 rounded cursor-pointer text-sm whitespace-nowrap"
            >
              Log Out
            </button>
          </div>
        </div>

        {/* Desktop only - unchanged layout */}
        <div className="hidden md:flex justify-between items-center relative">
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
                Logged in as,{" "}
                <span className="font-semibold">{displayName}</span>
              </div>

              {!isLoading && role && displayName !== "Guest" && (
                <div className="text-xs opacity-90">
                  {companyName ? ` ${companyName}` : ""}
                  {String(registerStatus || "").toUpperCase() === "PENDING"
                    ? " • Pending approval"
                    : ""}
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
        </div>
      </div>
    </nav>
  );
}
