"use client";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function ResetPasswordPage() {
  const { token } = useParams();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (password !== confirm) {
      setErr("Passwords do not match");
      return;
    }
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, newPassword: password }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(j?.error || "Could not reset password");
      return;
    }
    setOk(true);
    setTimeout(() => router.replace("/login"), 1500);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <img src="/lexify_wide.png" alt="Lexify" className="mb-4 w-96" />
      <div className="w-full max-w-md p-4 rounded shadow-2xl bg-white text-black">
        {ok ? (
          <p className="text-sm">Password updated. Redirecting to login…</p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <h1 className="text-lg font-semibold">Choose a new password</h1>
            <input
              type="password"
              className="w-full p-2 border"
              placeholder="New password (min 8 chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            <input
              type="password"
              className="w-full p-2 border"
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={8}
              required
            />
            {err && <p className="text-red-600 text-sm">{err}</p>}
            <button
              type="submit"
              className="p-2 bg-[#11999e] text-white w-full rounded cursor-pointer"
            >
              Reset password
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
