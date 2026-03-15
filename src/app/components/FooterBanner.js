"use client";
import Link from "next/link";

export default function FooterBanner() {
  return (
    <footer className="w-full bg-gray-100 border-t border-gray-300 mt-10 py-6 px-4 text-center text-sm text-gray-600">
      <div className="flex flex-col md:flex-row justify-between items-center max-w-5xl mx-auto space-y-4 md:space-y-0">
        <div className="flex space-x-6">
          <Link
            href="/about"
            className="hover:text-[#11999e] transition-colors"
          >
            About LEXIFY
          </Link>
          <Link
            href="/docs/lexify-general-privacy-statement.pdf"
            target="_blank"
            rel="noopener"
            className="hover:text-[#11999e] transition-colors"
          >
            General Privacy Statement
          </Link>
        </div>
        <div className="text-gray-600">
          © LEXIFY Oy 2026. All rights reserved.
        </div>
        <a
          href="https://www.linkedin.com/company/lexify-online/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-600 hover:text-[#11999e] transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
          <span className="text-sm">Follow us on LinkedIn</span>
        </a>
      </div>
    </footer>
  );
}
