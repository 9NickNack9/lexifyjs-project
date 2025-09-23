"use client";

import { useRouter } from "next/navigation";

export default function EmploymentDocuments() {
  const router = useRouter();

  const cards = [
    {
      title: "I need an employment contract template for my business",
      link: "/contracts/emp-contract",
    },
    {
      title:
        "I need other employment related document template(s) for my business",
      link: "/contracts/emp-documents",
    },
    {
      title:
        "I need help with negotiating a contract with an employee or a managing director",
      link: "/contracts/emp-negotiation",
    },
    {
      title: "I need day-to-day legal advice related to employment matters",
      link: "/requests/legal-advice",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <h2 className="text-2xl font-semibold mb-6">What Do You Need?</h2>
      <div className="flex items-start justify-center items-center min-h-screen p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-10 max-w-7xl w-full">
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
