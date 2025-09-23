// app/main/MainClient.jsx
"use client";

import { useRouter } from "next/navigation";

export default function MainClient() {
  const router = useRouter();

  const cards = [
    {
      title: "Create a LEXIFY Request",
      description: "Create a request for tender to buy legal services.",
      link: "/create-request",
    },
    {
      title: "My Dashboard",
      description:
        "All your LEXIFY Requests and LEXIFY Contracts can be found here.",
      link: "/archive",
    },
    {
      title: "My Account",
      description:
        "Your account and contact details can be found and updated here. Here you can also manage which legal service providers can view your LEXIFY Requests and make offers to you.",
      link: "/account",
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
      <div className="flex items-start justify-center min-h-screen p-8">
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
