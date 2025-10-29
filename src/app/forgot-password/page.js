"use client";
import { useState } from "react";

export default function ForgotPassword() {
  const [emailOrUsername, setVal] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
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
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <img src="/lexify_wide.png" alt="Lexify" className="mb-4 w-96" />
      <div className="w-full max-w-md p-4 rounded shadow-2xl bg-white text-black">
        {sent ? (
          <p className="text-md text-center">
            If an account exists for that email or username, we&apos;ve sent a
            reset link. Please check your inbox.{" "}
            <a className="text-[#119999]" href="/login">
              Back to login page
            </a>
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <h1 className="text-lg font-semibold">Forgot your password?</h1>
            <input
              value={emailOrUsername}
              onChange={(e) => setVal(e.target.value)}
              className="w-full p-2 border"
              placeholder="Insert your Email or Username (case sensitive)"
              required
            />
            {err && <p className="text-red-600 text-sm">{err}</p>}
            <button
              type="submit"
              className="p-2 bg-[#11999e] text-white w-full rounded cursor-pointer"
            >
              Send reset link
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
