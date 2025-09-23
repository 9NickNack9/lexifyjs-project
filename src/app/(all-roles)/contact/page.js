"use client";

import { useState } from "react";
import Link from "next/link";

export default function Contact() {
  return (
    <div className="flex flex-col items-center justify-top min-h-screen p-4">
      <img src="/lexify_wide.png" alt="Business Logo" className="mb-4 w-96" />
      <br />
      <div className="w-4/6 p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">
          Have questions about our platform or services? We&apos;re here to
          help.{" "}
        </h1>
        <h1 className="text-2xl font-bold mb-4">
          Reach out to us at{" "}
          <a href="mailto:support@lexify.online" className="underline">
            support@lexify.online
          </a>{" "}
          for any inquiries about LEXIFY. Our dedicated team is committed to
          responding promptly and providing the assistance you need.{" "}
        </h1>
      </div>
    </div>
  );
}
