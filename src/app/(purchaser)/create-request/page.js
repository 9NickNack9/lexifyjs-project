"use client";

import { useRouter } from "next/navigation";

export default function CreateRequest() {
  const router = useRouter();

  const cards = [
    {
      title: "Help with Contracts",
      link: "/requests/contracts",
    },
    {
      title: "Day-to-day Legal Advice",
      link: "/requests/legal-advice",
    },
    {
      title: "Help with Employment related Documents",
      link: "/requests/employment-documents",
    },
    {
      title: "Help with Dispute Resolution or Debt Collection",
      link: "/requests/dispute-resolution",
    },
    {
      title: "Help with Mergers & Acquisitions",
      link: "/requests/mergers-aquisitions",
    },
    {
      title: "Help with Corporate Governance",
      link: "/requests/corporate-governance",
    },
    {
      title: "Help with Personal Data Protection",
      link: "/requests/privacy-selection",
    },
    {
      title:
        "Help with KYC (Know Your Customer) or Compliance related Questionnaire",
      link: "/requests/kyc",
    },
    {
      title: "Legal Training for Management and/or Personnel",
      link: "/requests/legal-training",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <h2 className="text-2xl font-semibold mb-6">
        What Kind of Legal Support Do You Need?
      </h2>
      <div className="flex items-start justify-center items-center min-h-screen p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 max-w-8xl w-full">
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
