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
            href="/contact"
            className="hover:text-[#11999e] transition-colors"
          >
            Contact LEXIFY
          </Link>
          <Link
            href="/docs/lexify-privacy-statement-partners-2025.pdf"
            target="_blank"
            rel="noopener"
            className="hover:text-[#11999e] transition-colors"
          >
            Privacy Statement
          </Link>
        </div>
        <div className="text-gray-500">© LEXIFY 2026</div>
      </div>
    </footer>
  );
}
