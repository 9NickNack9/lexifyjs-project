"use client";

import { useState } from "react";
import Link from "next/link";

export default function RegisterScreening() {
  return (
    <div className="flex flex-col items-center justify-top min-h-screen p-4">
      <img src="/lexify_wide.png" alt="Business Logo" className="mb-4 w-96" />
      <br />
      <div className="w-4/6 p-4 text-center">
        <h1 className="text-3xl font-bold mb-4">
          Thank you for registering with LEXIFY!{" "}
        </h1>
        <h1 className="text-2xl font-bold mb-4">
          Your registration is currently being reviewed by our team. We process
          all applications as quickly as possible and will notify you once the
          review is complete. Upon approval, you will receive immediate access
          to the LEXIFY platform along with further instructions to help you get
          started.{" "}
        </h1>
        <h1 className="text-2xl font-bold mb-4">
          If you have any questions in the meantime, please don&apos;t hesitate
          to contact our support team at{" "}
          <a href="mailto:support@lexify.online" className="underline">
            support@lexify.online
          </a>
          .{" "}
        </h1>
        <h1 className="text-2xl font-bold mb-4">
          We look forward to welcoming you aboard!{" "}
        </h1>
        <h1 className="text-2xl font-bold mb-4">Warm regards, </h1>
        <h1 className="text-2xl font-bold mb-4">The LEXIFY Team </h1>
      </div>
    </div>
  );
}
