"use client";

import { useRouter } from "next/navigation";

export default function RealEstate() {
  const router = useRouter();

  const cards = [
    {
      title: "Sale and Purchase of Real Estate",
      link: "/contracts/re-sale",
    },
    {
      title: "Sale and Leaseback of Real Estate",
      link: "/contracts/re-leaseback",
    },
    {
      title: "Lease of Business Premises, Residential Premises or Land",
      link: "/contracts/re-lease",
    },
    {
      title: "Easement Agreement",
      link: "/contracts/re-easement",
    },
    {
      title: "Construction Contract",
      link: "/contracts/re-construction",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <h2 className="text-2xl font-semibold mb-6">Specify the Contract Type</h2>
      <div className="flex items-start justify-center items-center min-h-screen p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 max-w-7xl w-full">
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
