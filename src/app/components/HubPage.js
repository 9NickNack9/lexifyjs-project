"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function HubShell({ children, contentClassName = "max-w-6xl" }) {
  return (
    <div className="relative min-h-screen bg-[linear-gradient(45deg,#11999e_0%,#cfecee_30%,#cfecee_70%,#11999e_100%)] bg-fixed text-gray-900">
      <div
        className={`relative mx-auto px-6 py-14 sm:px-8 sm:py-16 ${contentClassName}`}
      >
        {children}
      </div>
    </div>
  );
}

function gridClass(count) {
  if (count <= 2) return "grid-cols-1 md:grid-cols-2";
  if (count === 4) return "grid-cols-1 sm:grid-cols-2";
  return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
}

export function AppPage({
  title,
  description,
  children,
  contentClassName = "max-w-6xl",
}) {
  return (
    <HubShell contentClassName={contentClassName}>
      {title ? (
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-gray-600">
              {description}
            </p>
          ) : null}
        </header>
      ) : null}
      <div className="space-y-6">{children}</div>
    </HubShell>
  );
}

export default function HubPage({
  title,
  description,
  cards,
  contentClassName,
}) {
  return (
    <HubShell contentClassName={contentClassName}>
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          {title}
        </h1>
        {description ? (
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">
            {description}
          </p>
        ) : null}
      </header>

      <div className={`grid gap-6 ${gridClass(cards.length)}`}>
        {cards.map((card) => {
          const Icon = card.icon;
          const cardClassName =
            "group flex h-full w-full flex-col items-center rounded-2xl bg-white px-7 py-8 text-center shadow-[0_16px_44px_rgba(17,153,158,0.28)] ring-1 ring-black/10 transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_56px_rgba(17,153,158,0.38)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#11999e] cursor-pointer";
          const cardBody = (
            <>
              {Icon ? (
                <Icon
                  className="h-9 w-9 text-[#11999e]"
                  strokeWidth={1.6}
                  aria-hidden="true"
                />
              ) : null}
              <h2
                className={`text-lg font-bold text-gray-900 ${Icon ? "mt-5" : ""}`}
              >
                {card.title}
              </h2>
              {card.description ? (
                <p className="mt-2 mb-6 flex-1 text-sm leading-relaxed text-gray-500">
                  {card.description}
                </p>
              ) : (
                <div className="mb-6 flex-1" />
              )}
              <span className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#11999e] bg-white px-4 py-2.5 text-sm font-medium text-[#11999e] transition-colors duration-300 ease-in-out group-hover:bg-[#11999e]/10 group-focus-visible:bg-[#11999e]/10">
                {card.cta || "Continue"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </>
          );

          if (card.onClick) {
            return (
              <button
                key={card.title}
                type="button"
                onClick={card.onClick}
                className={cardClassName}
              >
                {cardBody}
              </button>
            );
          }

          return (
            <Link key={card.href} href={card.href} className={cardClassName}>
              {cardBody}
            </Link>
          );
        })}
      </div>
    </HubShell>
  );
}
