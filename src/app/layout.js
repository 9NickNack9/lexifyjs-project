// app/layout.js
import "./globals.css";
import { Poppins } from "next/font/google";
import Script from "next/script";
import Providers from "./providers";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata = {
  title: {
    default: "LEXIFY - The marketplace for legal services",
    template: "%s | LEXIFY",
  },
  description:
    "LEXIFY is a legal services marketplace where businesses can create requests, receive offers from legal service providers, and form contracts efficiently.",
  metadataBase: new URL("https://www.lexify.online"),
  openGraph: {
    title: "LEXIFY",
    description: "The marketplace for legal services",
    url: "https://www.lexify.online",
    siteName: "LEXIFY",
    images: [
      {
        url: "https://www.lexify.online/lexify.png",
        width: 1200,
        height: 630,
        alt: "LEXIFY",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  twitter: {
    card: "summary_large_image",
    title: "LEXIFY",
    description: "The marketplace for legal services",
    images: ["https://www.lexify.online/lexify.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <Script
          id="cookieyes"
          type="text/javascript"
          src="https://cdn-cookieyes.com/client_data/1ef10650c8505320b7959abd/script.js"
          strategy="beforeInteractive"
        />

        <Script
          async
          src="https://plausible.io/js/pa-_m3r8liTzHC9bWKOcrX3T.js"
          strategy="afterInteractive"
        />
        <Script id="plausible-init" strategy="afterInteractive">
          {`
            window.plausible = window.plausible || function(){
              (plausible.q = plausible.q || []).push(arguments)
            };
            plausible.init = plausible.init || function(i){
              plausible.o = i || {}
            };
            plausible.init();
          `}
        </Script>
      </head>
      <body className={poppins.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
