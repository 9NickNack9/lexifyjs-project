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
    "/",
  ];

  const noBannerPages = ["/", "/login", "/register"];

  const hideNav = noNavPages.some((p) => {
    if (p === "/") return pathname === "/";
    return pathname.startsWith(p);
  });

  const hideBanner = noBannerPages.some((p) => {
    if (p === "/") return pathname === "/";
    return pathname.startsWith(p);
  });

  return (
    <SessionProvider>
      {!hideNav && <Navbar />}
      {children}
      {!hideBanner && <FooterBanner />}
    </SessionProvider>
  );
}
