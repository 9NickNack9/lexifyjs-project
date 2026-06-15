import Link from "next/link";

export default function ReferralLinkUsedPage() {
  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-6 text-center">
      <img src="/lexify_wide.png" alt="Lexify" className="mb-4 w-96" />
      <div className="w-full max-w-xl p-8 rounded shadow-2xl bg-white text-black">
        <h1 className="text-2xl font-bold mb-4">Referral link already used</h1>
        <p className="text-md mb-6">
          This referral link has already been used to register a law firm on
          LEXIFY and is no longer valid.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-3 rounded-lg text-white bg-[#19999e] hover:opacity-90 transition"
        >
          Go to Login
        </Link>
      </div>
    </div>
  );
}
