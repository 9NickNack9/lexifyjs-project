"use client";
import { useMemo, useState } from "react";
import VideoPlayer from "@/app/components/VideoPlayer";
import Script from "next/script";
import Link from "next/link";

function TutorialGrid() {
  const tutorials = useMemo(
    () => [
      {
        id: "t1",
        number: 1,
        title: "My Account",
        description:
          'A quick walkthrough of "My Account" — your company information, personal details, login security, and notification preferences. Set these up before creating your first LEXIFY Request.',
        src: "/videos/my-account-settings.mp4",
        poster: "/videos/my-account-settings.png",
        duration: "1:56",
      },
      {
        id: "t2",
        number: 2,
        title: "Making a LEXIFY Request",
        description:
          "A LEXIFY Request is how you post a request for proposal on the platform. Learn how to create one — from selecting a legal service category to setting your criteria and submitting it for offers from law firms.",
        src: "/videos/lexify-request.mp4",
        poster: "/videos/lexify-request.png",
        duration: "2:30",
      },
      {
        id: "t3",
        number: 3,
        title: "My Dashboard",
        description:
          '"My Dashboard" is your central hub for managing all LEXIFY Requests. Learn how to track pending requests, review and compare offers, select a winning bidder, and access your contracts — all in one place.',
        src: "/videos/lexify-dashboard.mp4",
        poster: "/videos/lexify-dashboard.png",
        duration: "3:15",
      },
      {
        id: "t4",
        number: 4,
        title: "Rate Legal Service Providers",
        description:
          "Learn how to rate law firms after completed assignments and review their LEXIFY ratings. The LEXIFY rating system is built by members, for members — helping everyone make more informed decisions when selecting legal service providers.",
        src: "/videos/provider-rating.mp4",
        poster: "/videos/provider-rating.png",
        duration: "1:42",
      },
      {
        id: "t5",
        number: 5,
        title: "Legal Service Provider Management",
        description:
          "Beyond the law firm filters available when creating each LEXIFY Request, our Legal Service Provider Management tools give you advanced controls over which firms can see and respond to your requests. Block firms, set preferred providers, or create an exclusive legal panel — tailored to your needs.",
        src: "/videos/lexify-provider-management.mp4",
        poster: "/videos/lexify-provider-management.png",
        duration: "2:15",
      },
    ],
    [],
  );

  const [active, setActive] = useState(null); // active tutorial object or null

  return (
    <>
      {/* Cards */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {tutorials.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(t)}
            className="group flex h-full flex-col text-left rounded-xl border border-black/10 bg-white shadow-md hover:shadow-xl transition overflow-hidden cursor-pointer"
          >
            {/* Thumbnail */}
            <div className="relative">
              <img
                src={t.poster}
                alt={`${t.number}. ${t.title}`}
                className="w-full aspect-video object-cover object-top bg-black/5"
                loading="lazy"
              />

              {/* Play overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-12 w-12 rounded-full bg-black/70 flex items-center justify-center group-hover:bg-black/80 transition">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6 text-white translate-x-[1px]"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>

              {/* Duration pill */}
              {t.duration ? (
                <div className="absolute bottom-3 right-3 text-xs px-2 py-1 rounded bg-black/75 text-white">
                  {t.duration}
                </div>
              ) : null}
            </div>

            {/* Text */}
            <div className="flex flex-1 flex-col p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-base leading-snug">
                  {t.number}. {t.title}
                </h3>
                <span className="text-xs text-black/50 whitespace-nowrap mt-0.5">
                  Tutorial
                </span>
              </div>
              <p className="mt-2 text-sm text-black/70">{t.description}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Modal */}
      {active ? (
        <VideoModal tutorial={active} onClose={() => setActive(null)} />
      ) : null}
    </>
  );
}

function VideoModal({ tutorial, onClose }) {
  // Close on backdrop click
  const onBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onMouseDown={onBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label={`${tutorial.number}. ${tutorial.title}`}
    >
      <div className="w-full max-w-5xl rounded-xl bg-white shadow-xl overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/10">
          <div>
            <div className="text-sm text-black/60">
              Tutorial {tutorial.number}
            </div>
            <div className="font-semibold">{tutorial.title}</div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm bg-black/5 hover:bg-black/10 transition cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* Player */}
        <div className="p-4">
          <div className="w-full min-h-[280px]">
            <VideoPlayer
              key={tutorial.id}
              title=""
              src={tutorial.src}
              poster={tutorial.poster}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Help() {
  const [calendlyReady, setCalendlyReady] = useState(false);
  return (
    <div className="flex flex-col items-center min-h-screen p-6">
      <h1 className="text-3xl font-bold mb-6">Help & Resources</h1>

      {/* Book a Session */}
      <div className="w-full max-w-6xl p-6 rounded shadow-2xl bg-white text-black">
        <h2 className="text-2xl font-semibold mb-4">
          Book a Guided LEXIFY Request Preparation Session
        </h2>
        <h4 className="text-md">
          Book time with a LEXIFY representative for guided support in preparing
          a LEXIFY Request, whenever you have a legal need and would like extra
          guidance.
        </h4>
        <Script
          src="https://assets.calendly.com/assets/external/widget.js"
          strategy="afterInteractive"
          onLoad={() => setCalendlyReady(true)}
        />

        <link
          rel="stylesheet"
          href="https://assets.calendly.com/assets/external/widget.css"
        />

        <button
          type="button"
          disabled={!calendlyReady}
          onClick={() => {
            if (!window?.Calendly?.initPopupWidget) return;

            window.Calendly.initPopupWidget({
              url: "https://calendly.com/kimmo-kantele-lexify/guided-lexify-request-preparation-session",
            });
          }}
          className={`mt-4 px-6 py-3 rounded-lg text-white cursor-pointer ${
            calendlyReady
              ? "bg-[#19999e] hover:opacity-90"
              : "bg-[#19999e]/60 cursor-not-allowed"
          }`}
        >
          {calendlyReady ? "Book a Session" : "Loading…"}
        </button>
      </div>

      <br />

      {/* Video Tutorials */}
      <div className="w-full max-w-6xl p-6 rounded bg-white text-black">
        <h2 className="text-2xl font-semibold mb-2">Video Tutorials</h2>
        <p className="text-md text-black">
          Get started and make the most of the platform with our step-by-step
          video guides. For a complete introduction to LEXIFY, watch the videos
          in numbered order.
        </p>

        <TutorialGrid />
      </div>
      <br />
      {/* Contact */}
      <div className="w-full max-w-6xl p-6 rounded shadow-2xl bg-white text-black">
        <h2 className="text-2xl font-semibold mb-4">
          Contact Our Support Team
        </h2>
        <h4 className="text-md font-semibold">General support</h4>
        <h4 className="text-md">
          For questions about using the platform, your account, or LEXIFY
          Requests, please contact us at{" "}
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
      </div>
      <br />
      {/* LEXIFY Legal Terms and Conditions */}
      <div className="w-full max-w-6xl p-6 rounded shadow-2xl bg-white text-black">
        <h2 className="text-2xl font-semibold mb-4">
          LEXIFY Legal Terms and Conditions
        </h2>
        <h4 className="text-md">
          By using LEXIFY to purchase legal services, you confirm you
          understand, accept and comply with the following terms and conditions
          governing the use of the LEXIFY platform and individual LEXIFY
          Contracts entered into by legal service purchasers and legal service
          providers on the LEXIFY platform, as applicable and as such terms and
          conditions may be amended from time to time:
        </h4>
        <br />
        <ul className="max-w-md space-y-1 text-black list-disc list-inside dark:text-black">
          <li>
            <Link
              href="/docs/lexify-tos.pdf"
              target="_blank"
              rel="noopener"
              className="text-blue-600 dark:text-blue-500 hover:underline"
            >
              LEXIFY Terms of Service
            </Link>
          </li>
          <li>
            <Link
              href="/docs/lexify-privacy-statement.pdf"
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
    </div>
  );
}
