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
    default: "LEXIFY - Buy Legal Services Efficiently",
    template: "%s | LEXIFY",
  },
  description:
    "LEXIFY is a legal services marketplace where businesses can create requests, receive offers from legal service providers, and form contracts efficiently.",
  metadataBase: new URL("https://www.lexify.online"),
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
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
      </head>
      <body className={poppins.className}>
        <Providers>{children}</Providers>
      </body>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "LEXIFY",
            url: "https://www.lexify.online",
            logo: "https://www.lexify.online/icon.png",
          }),
        }}
      />
    </html>
  );
}
