"use client";

import { usePathname } from "next/navigation";
import Navbar from "./components/Navbar";
import FooterBanner from "./components/FooterBanner";
import "./globals.css";
import { SessionProvider } from "next-auth/react";

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const noNavPages = [
    "/login",
    "/register",
    "/register-screening",
    "/about",
    "/contact",
  ];

  return (
    <html lang="en">
      <body>
        <SessionProvider>
          {!noNavPages.includes(pathname) && <Navbar />}
          {children}
          <FooterBanner />
        </SessionProvider>
      </body>
    </html>
  );
}
