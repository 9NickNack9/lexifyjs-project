"use client";

import { useState } from "react";
import Link from "next/link";

export default function About() {
  return (
    <div className="flex flex-col items-center justify-top min-h-screen p-4">
      <img src="/lexify_wide.png" alt="Business Logo" className="mb-4 w-96" />
      <br />
      <div className="w-4/6 p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">
          LEXIFY is transforming how businesses access legal services through
          our innovative marketplace solution. We connect forward-thinking
          companies with qualified legal service providers, creating a
          streamlined ecosystem where legal expertise meets business needs.{" "}
        </h1>
        <h1 className="text-2xl font-bold mb-4">
          Our platform eliminates traditional friction points in finding,
          vetting, and engaging legal services. Companies gain access to a
          diverse network of specialized providers, while legal professionals
          connect with clients seeking their specific expertise.{" "}
        </h1>
        <h1 className="text-2xl font-bold mb-4">
          Founded on principles of efficiency and ease of use, LEXIFY is
          reimagining legal service delivery for the digital age. We&apos;re
          committed to making expert legal support more accessible, predictable,
          and value-driven for businesses.{" "}
        </h1>
        <h1 className="text-2xl font-bold mb-4">
          Join the LEXIFY community and experience a smarter, simpler approach
          to legal services.
        </h1>
      </div>
    </div>
  );
}
