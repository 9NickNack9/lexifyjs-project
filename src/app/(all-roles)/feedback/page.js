"use client";

import { useSession } from "next-auth/react";

export default function Feedback() {
  const { data: session } = useSession();

  // Get company name or fall back to "guest"
  const companyName =
    session?.companyName ??
    session?.user?.companyName ??
    session?.user?.name ??
    "guest";

  return (
    <div className="flex flex-col items-center min-h-screen p-8">
      <h2 className="text-xl text-center max-w-3xl mb-6">
        Thank you for using LEXIFY!
        <br />
        <br />
        We would love to hear about your LEXIFY experience so far - what is
        working well for you and what could we improve? Are there any specific
        features you would like to see added to LEXIFY? Share your thoughts by
        sending an email to feedback@lexify.online or by clicking the button
        below.
      </h2>
      <a
        href={`mailto:feedback@lexify.online?subject=Feedback to LEXIFY by ${encodeURIComponent(
          companyName
        )}`}
        className="bg-white text-[#11999e] px-4 py-2 rounded text-xl shadow-xl"
      >
        Give Feedback to LEXIFY
      </a>
      <br />
      <h2 className="text-xl text-center max-w-4xl mb-6">
        Thank you! Your feedback means a lot to us and helps us improve our
        service.
      </h2>
    </div>
  );
}
