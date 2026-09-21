"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Lock, Mail, Shield } from "lucide-react";
import { HubShell } from "@/app/components/HubPage";

export default function ForgotPassword() {
  const [emailOrUsername, setVal] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ emailOrUsername }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j?.error || "Something went wrong");
        return;
      }
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <HubShell contentClassName="flex min-h-[calc(100vh-8rem)] max-w-xl flex-col items-center justify-center">
      <img
        src="/lexify_teal.png"
        alt="LEXIFY"
        className="mb-4 h-32 w-auto object-contain sm:h-40"
      />

      <div className="w-full rounded-2xl bg-white px-6 pt-4 pb-6 text-gray-900 shadow-[0_16px_44px_rgba(17,153,158,0.22)] ring-1 ring-black/10 sm:px-8 sm:pt-6 sm:pb-8">
        <div className="mb-6 text-center">
          <span className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#11999e] text-white">
            <Shield className="h-7 w-7" strokeWidth={1.7} aria-hidden="true" />
            <Lock
              className="absolute h-3 w-3"
              strokeWidth={2.5}
              aria-hidden="true"
            />
          </span>
          {!sent ? (
            <>
              <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-900">
                Forgot your password?
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Enter your email or username and we&apos;ll send a reset link.
              </p>
            </>
          ) : (
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-900">
              Check your inbox
            </h1>
          )}
        </div>

        {sent ? (
          <div className="space-y-5 text-center">
            <p className="text-sm text-gray-700">
              If an account exists for that email or username, we&apos;ve sent a
              reset link. Please check your inbox.
            </p>
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#11999e] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#0e8488]"
            >
              Back to login
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label
                htmlFor="emailOrUsername"
                className="mb-1.5 block text-sm font-semibold text-gray-800"
              >
                Email or Username
              </label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
                  aria-hidden="true"
                />
                <input
                  id="emailOrUsername"
                  value={emailOrUsername}
                  onChange={(e) => setVal(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pr-3 pl-10 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-[#11999e] focus:ring-1 focus:ring-[#11999e]/30"
                  placeholder="Enter your email or username"
                  autoComplete="username"
                  required
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                Usernames are case sensitive.
              </p>
            </div>

            {err ? <p className="text-sm text-red-600">{err}</p> : null}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#11999e] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#0e8488] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Sending…" : "Send reset link"}
              {!submitting ? (
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              ) : null}
            </button>

            <p className="text-center text-sm text-gray-600">
              Remembered your password?{" "}
              <Link
                href="/login"
                className="font-semibold text-[#11999e] hover:underline"
              >
                Log in
              </Link>
            </p>
          </form>
        )}
      </div>

      <p className="mt-6 flex items-center gap-2 text-sm text-gray-700">
        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
        Your data is encrypted and secure.
      </p>
    </HubShell>
  );
}
