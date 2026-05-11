"use client";

import { useRouter } from "next/navigation";

export default function RequestStartPage() {
  const router = useRouter();

  const cards = [
    {
      title: "Start a New LEXIFY Request",
      description:
        "Begin a new LEXIFY Request by selecting the legal topic you need help with.",
      link: "/create-request",
    },
    {
      title: "Continue a Saved Draft",
      description:
        "Continue with a draft LEXIFY Request you saved earlier and submit it when ready.",
      link: "/request-drafts",
    },
  ];

  return (
    <div className="flex items-start justify-center min-h-screen p-8">
      <div className="w-full max-w-5xl">
        <h1 className="text-3xl font-bold mb-8 text-center">
          Create a LEXIFY Request
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {cards.map((card) => (
            <div
              key={card.title}
              onClick={() => router.push(card.link)}
              className="p-6 bg-[#3a3a3c] ring-10 border rounded-lg shadow-lg cursor-pointer text-center hover:shadow-xl transition delay-150 duration-300 ease-in-out hover:-translate-y-1 hover:scale-110"
            >
              <h2 className="text-2xl font-bold mb-2">{card.title}</h2>
              <p className="text-md text-white">{card.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
