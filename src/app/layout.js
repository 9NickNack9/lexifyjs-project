"use client";

import { usePathname } from "next/navigation";
import Navbar from "./components/Navbar";
import FooterBanner from "./components/FooterBanner";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { Poppins } from "next/font/google";
import Script from "next/script";

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
      <head>
        <Script
          id="cookieyes"
          type="text/javascript"
          src="https://cdn-cookieyes.com/client_data/1ef10650c8505320b7959abd/script.js"
          strategy="beforeInteractive"
        ></Script>
      </head>
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
