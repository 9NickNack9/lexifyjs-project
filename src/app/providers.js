"use client";

import { SessionProvider } from "next-auth/react";
import { usePathname } from "next/navigation";
import Navbar from "./components/Navbar";
import FooterBanner from "./components/FooterBanner";

export default function Providers({ children }) {
  const pathname = usePathname();

  const noNavPages = [
    "/login",
    "/register",
    "/register-screening",
    "/about",
    "/contact",
    "/forgot-password",
    "/reset-password",
  ];

  const hideNav = noNavPages.some((p) => pathname.startsWith(p));

  return (
    <SessionProvider>
      {!hideNav && <Navbar />}
      {children}
      <FooterBanner />
    </SessionProvider>
  );
}
