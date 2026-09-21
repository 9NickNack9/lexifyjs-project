"use client";
import { useMemo } from "react";
import Link from "next/link";
import { AppPage } from "@/app/components/HubPage";

function TutorialGrid() {
  const tutorials = useMemo(
    () => [
      {
        id: "t1",
        number: 1,
        title: "My Account",
        description:
          'A quick walkthrough of "My Account" - your firm\'s information, personal details, login security, notification preferences, and invoicing contacts. Set these up before making your first offer.',
        src: "/videos/provider-account-settings.mp4",
        poster: "/videos/my-account-settings.png",
        duration: "2:33",
      },
      {
        id: "t2",
        number: 2,
        title: "Review LEXIFY Requests",
        description:
          "LEXIFY Requests are how clients post requests for proposal on the platform. Learn how to browse available requests, review client requirements, ask clarifying questions, and submit your offer.",
        src: "/videos/provider-offer.mp4",
        poster: "/videos/provider-offer.png",
        duration: "2:30",
      },
      {
        id: "t3",
        number: 3,
        title: "My Dashboard",
        description:
          '"My Dashboard" is your central hub for tracking all your offers and contracts. Monitor pending bids, review outcomes of expired offers, and access all LEXIFY Contracts you\'ve entered into on the platform.',
        src: "/videos/provider-dashboard.mp4",
        poster: "/videos/lexify-dashboard.png",
        duration: "1:19",
      },
    ],
    [],
  );

  return (
    <div className="relative mt-6">
      <div className="pointer-events-none grid select-none grid-cols-1 gap-6 md:grid-cols-3">
        {tutorials.map((t) => (
          <div
            key={t.id}
            className="flex h-full flex-col overflow-hidden rounded-2xl bg-white text-left shadow-[0_16px_44px_rgba(17,153,158,0.22)] ring-1 ring-black/10"
          >
            <div className="relative">
              <img
                src={t.poster}
                alt={`${t.number}. ${t.title}`}
                className="aspect-video w-full bg-black/5 object-cover object-top"
                loading="lazy"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/70">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6 translate-x-[1px] text-white"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
              {t.duration ? (
                <div className="absolute right-3 bottom-3 rounded bg-black/75 px-2 py-1 text-xs text-white">
                  {t.duration}
                </div>
              ) : null}
            </div>
            <div className="flex flex-1 flex-col p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base leading-snug font-semibold">
                  {t.number}. {t.title}
                </h3>
                <span className="mt-0.5 text-xs whitespace-nowrap text-black/50">
                  Tutorial
                </span>
              </div>
              <p className="mt-2 text-sm text-black/70">{t.description}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/40 backdrop-blur-sm">
        <span className="rounded-xl bg-white/95 px-6 py-3 text-2xl font-semibold text-gray-900 shadow-sm ring-1 ring-black/10">
          New video tutorials coming soon!
        </span>
      </div>
    </div>
  );
}

export default function ProviderHelp() {
  return (
    <AppPage eyebrow="" title="Help & Resources">
      {/* Video Tutorials */}
      <div className="w-full rounded-2xl bg-white p-6 text-black shadow-[0_16px_44px_rgba(17,153,158,0.22)] ring-1 ring-black/10">
        <h2 className="text-2xl font-semibold mb-2">Video Tutorials</h2>
        <p className="text-md text-black">
          Get started and make the most of the platform with our step-by-step
          video guides. For a complete introduction to LEXIFY, watch the videos
          in numbered order.
        </p>
        <TutorialGrid />
      </div>

      {/* Contact */}
      <div className="w-full rounded-2xl bg-white p-6 text-black shadow-[0_16px_44px_rgba(17,153,158,0.22)] ring-1 ring-black/10">
        <h2 className="text-2xl font-semibold mb-4">
          Contact Our Support Team
        </h2>
        <h4 className="text-md font-semibold">General support</h4>
        <h4 className="text-md">
          For questions about using the platform or your account, please contact
          us at{" "}
          <a href="mailto:support@lexify.online" className="underline">
            support@lexify.online
          </a>
          .
        </h4>
        <br />
        <h4 className="text-md font-semibold">Technical support</h4>
        <h4 className="text-md">
          For technical issues or problems accessing the platform, please
          contact us by phone at +358 (45) 7833 4005 or by email at{" "}
          <a href="mailto:support@lexify.online" className="underline">
            support@lexify.online
          </a>
          . Phone support is available Monday to Friday, 09:00-12:00 (EET),
          excluding public holidays. Outside phone support hours, please contact
          us by email and we will respond as soon as possible.
        </h4>
        <br />
        <h4 className="text-md font-semibold">Billing support</h4>
        <h4 className="text-md">
          For invoicing and service fee related queries, please contact us at{" "}
          <a href="mailto:billing@lexify.online" className="underline">
            billing@lexify.online
          </a>
          .
        </h4>
      </div>

      {/* Feedback */}
      <div className="w-full rounded-2xl bg-white p-6 text-black shadow-[0_16px_44px_rgba(17,153,158,0.22)] ring-1 ring-black/10">
        <h2 className="text-2xl font-semibold mb-4">Give Feedback to LEXIFY</h2>
        <h4 className="text-md">
          Let us know what you like about LEXIFY and what we could do better.
          Your feedback helps us improve the platform for everyone.
        </h4>
        <Link
          href="/feedback"
          className="inline-block mt-4 px-6 py-3 rounded-lg text-white bg-[#19999e] hover:opacity-90 transition"
        >
          Give Feedback
        </Link>
      </div>

      {/* LEXIFY Legal Terms and Conditions */}
      <div className="w-full rounded-2xl bg-white p-6 text-black shadow-[0_16px_44px_rgba(17,153,158,0.22)] ring-1 ring-black/10">
        <h2 className="text-2xl font-semibold mb-4">
          LEXIFY Legal Terms and Conditions
        </h2>
        <h4 className="text-md">
          By using LEXIFY to sell legal services, you confirm you understand,
          accept and comply with the following terms and conditions governing
          the use of the LEXIFY platform and individual LEXIFY Contracts entered
          into by legal service purchasers and legal service providers on the
          LEXIFY platform, as applicable and as such terms and conditions may be
          amended from time to time:
        </h4>
        <br />
        <ul className="max-w-full space-y-1 text-black list-disc list-inside dark:text-black">
          <li>
            <Link
              href="/docs/lexify-tos-september-2026.pdf"
              target="_blank"
              rel="noopener"
              className="text-blue-600 dark:text-blue-500 hover:underline"
            >
              LEXIFY Terms of Service
            </Link>
          </li>
          <li>
            <Link
              href="/docs/lexify-privacy-statement-september-2026.pdf"
              target="_blank"
              rel="noopener"
              className="text-blue-600 dark:text-blue-500 hover:underline"
            >
              Privacy Statement for LEXIFY Platform
            </Link>
          </li>
          <li>
            <Link
              href="/docs/lexify-gtcs.pdf"
              target="_blank"
              rel="noopener"
              className="text-blue-600 dark:text-blue-500 hover:underline"
            >
              General Terms and Conditions for LEXIFY Contracts
            </Link>
          </li>
        </ul>
        <br />
        <h4 className="text-md">
          In the event LEXIFY implements any material change to the above legal
          terms and conditions, you will be notified of the change in advance
          and provided an option to end your use of all LEXIFY services if such
          change is not acceptable to you.
        </h4>
      </div>
    </AppPage>
  );
}
