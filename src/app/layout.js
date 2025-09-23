"use client";

import { usePathname } from "next/navigation";
import Navbar from "./components/Navbar";
import FooterBanner from "./components/FooterBanner";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

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
      <body className={poppins.className}>
        <SessionProvider>
          {!noNavPages.includes(pathname) && <Navbar />}
          {children}
          <FooterBanner />
        </SessionProvider>
      </body>
    </html>
  );
}
