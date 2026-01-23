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

export const metadata = {
  title: {
    default: "LEXIFY - Buy Legal Services Efficiently",
    template: "%s | LEXIFY",
  },
  description:
    "LEXIFY is a legal services marketplace where businesses can create requests, receive offers from legal service providers, and form contracts efficiently.",
  metadataBase: new URL("https://www.lexify.online"),

  icons: {
    icon: "/icon.png", // shown in Google results
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }) {
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
          {!noNavPages.some((p) => pathname.startsWith(p)) && <Navbar />}
          {children}
          <FooterBanner />
        </SessionProvider>
      </body>
    </html>
  );
}
