"use client";

import { useRouter } from "next/navigation";

export default function Provider() {
  const router = useRouter();

  const cards = [
    {
      title: "Review LEXIFY Requests",
      description:
        "Browse pending requests for tender and submit offers in response.",
      link: "/provider-request",
    },
    {
      title: "My Dashboard",
      description:
        "Offers you have previously submitted and your LEXIFY Contracts can be viewed here.",
      link: "/provider-archive",
    },
    {
      title: "My Account",
      description:
        "Your account and contact details can be found and updated here.",
      link: "/provider-account",
    },
    {
      title: "Give Feedback to LEXIFY",
      description:
        "Let us know what you like about LEXIFY and what we could do better.",
      link: "/feedback",
    },
  ];

  return (
    <div>
      <div className="flex items-start justify-center items-center min-h-screen p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 max-w-7xl w-full">
          {cards.map((card, index) => (
            <div
              key={index}
              className="p-6 bg-[#3a3a3c] ring-10 border rounded-lg shadow-lg cursor-pointer text-center hover:shadow-xl transition delay-150 duration-300 ease-in-out hover:-translate-y-1 hover:scale-110"
              onClick={() => router.push(card.link)}
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
