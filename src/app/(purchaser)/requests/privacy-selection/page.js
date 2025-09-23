"use client";

import { useRouter } from "next/navigation";

export default function PrivacySelection() {
  const router = useRouter();

  const cards = [
    {
      title: "I need a general analysis of my company's GDPR compliance",
      link: "/contracts/gdpr-compliance",
    },
    {
      title: "I need help with creating data privacy related documentation",
      link: "/contracts/privacy-documentation",
    },
    {
      title: "I need help with a personal data breach related matter",
      link: "/contracts/data-breach",
    },
    {
      title: "I need help with a specific data privacy related question ",
      link: "/contracts/data-question",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <h2 className="text-2xl font-semibold mb-6">
        What Kind of Personal Data Protection Support Do You Need?
      </h2>
      <div className="flex items-start justify-center items-center min-h-screen p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 max-w-7xl w-full">
          {cards.map((card, index) => (
            <div
              key={index}
              className="flex items-center justify-center h-64 p-10 bg-[#3a3a3c] ring-10 border rounded-lg shadow-lg cursor-pointer text-center hover:shadow-xl transition delay-150 duration-300 ease-in-out hover:-translate-y-1 hover:scale-110"
              onClick={() => router.push(card.link)}
            >
              <h2 className="text-2xl font-bold mb-2">{card.title}</h2>
              <p className="text-xl text-white">{card.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
