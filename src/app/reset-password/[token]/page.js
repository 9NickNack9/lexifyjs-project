"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  Lock,
  Shield,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { HubShell } from "@/app/components/HubPage";
import { getPasswordRequirementResults } from "@/lib/password";

function PasswordField({
  id,
  name,
  label,
  value,
  onChange,
  placeholder,
  visible,
  onToggleVisible,
  tone,
}) {
  const toneClass =
    tone === "mismatch"
      ? "border-red-500 focus:border-red-600 focus:ring-red-500/30"
      : "border-gray-300 focus:border-[#11999e] focus:ring-[#11999e]/30";
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-semibold text-gray-800"
      >
        {label}
      </label>
      <div className="relative">
        <Lock
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
          aria-hidden="true"
        />
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onInput={(e) => onChange(e.currentTarget.value)}
          placeholder={placeholder}
          autoComplete="new-password"
          className={`w-full rounded-lg border bg-white py-2.5 pr-11 pl-10 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:ring-1 ${toneClass}`}
          required
        />
        <button
          type="button"
          onClick={onToggleVisible}
          className="absolute inset-y-0 right-0 flex cursor-pointer items-center px-3 text-gray-400 hover:text-gray-600"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}

function PasswordMatchHint({ password, confirm }) {
  if (!confirm || password === confirm) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-sm text-red-600">
      <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
      Passwords do not match
    </p>
  );
}

function PasswordRequirements({ password }) {
  const requirements = getPasswordRequirementResults(password);

  return (
    <div className="rounded-xl border border-[#11999e]/25 bg-[#e7f6f7] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
        <ShieldCheck className="h-4 w-4 text-[#11999e]" aria-hidden="true" />
        Password Requirements
      </div>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {requirements.map((requirement) => (
          <li
            key={`${requirement.id}-${requirement.met ? "met" : "unmet"}`}
            className={`flex items-center gap-2 text-sm ${
              requirement.met ? "font-medium text-gray-900" : "text-gray-700"
            }`}
          >
            {requirement.met ? (
              <CheckCircle2
                className="h-5 w-5 shrink-0 text-green-600"
                aria-hidden="true"
              />
            ) : (
              <Circle
                className="h-5 w-5 shrink-0 text-gray-300"
                aria-hidden="true"
              />
            )}
            {requirement.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ResetPasswordPage() {
  const { token } = useParams();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [visible, setVisible] = useState({
    password: false,
    confirm: false,
  });

  const submit = async (e) => {
    e.preventDefault();
    setErr("");

    if (password !== confirm) {
      setErr("Passwords do not match");
      return;
    }
    if (getPasswordRequirementResults(password).some((requirement) => !requirement.met)) {
      setErr(
        "New password must be at least 8 characters and include one uppercase letter, one number, and one special character.",
      );
      return;
    }

    setSubmitting(true);
    try {
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
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-900">
            Choose a new password
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Keep your account secure by choosing a strong password.
          </p>
        </div>

        {ok ? (
          <p className="text-center text-sm text-gray-700">
            Password updated. Redirecting to login…
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <PasswordField
              id="newPassword"
              name="newPassword"
              label="New password"
              value={password}
              onChange={setPassword}
              placeholder="Enter your new password"
              visible={visible.password}
              onToggleVisible={() =>
                setVisible((v) => ({ ...v, password: !v.password }))
              }
            />
            <div>
              <PasswordField
                id="confirmPassword"
                name="confirmPassword"
                label="Confirm new password"
                value={confirm}
                onChange={setConfirm}
                placeholder="Re-enter your new password"
                visible={visible.confirm}
                onToggleVisible={() =>
                  setVisible((v) => ({ ...v, confirm: !v.confirm }))
                }
                tone={confirm && password !== confirm ? "mismatch" : undefined}
              />
              <PasswordMatchHint password={password} confirm={confirm} />
            </div>
            <PasswordRequirements password={password} />

            <p className="flex items-center gap-2 text-sm text-gray-500">
              <ShieldCheck
                className="h-4 w-4 shrink-0 text-[#11999e]"
                aria-hidden="true"
              />
              <span>Use a unique password you don&apos;t use elsewhere.</span>
            </p>

            {err ? <p className="text-sm text-red-600">{err}</p> : null}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#11999e] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#0e8488] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Resetting…" : "Reset password"}
              {!submitting ? (
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              ) : null}
            </button>

            <p className="text-center text-sm text-gray-600">
              <Link
                href="/login"
                className="font-semibold text-[#11999e] hover:underline"
              >
                Back to login
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
