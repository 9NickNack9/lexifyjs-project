"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, getSession, signOut } from "next-auth/react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, Lock, Shield, User } from "lucide-react";
import { HubShell } from "@/app/components/HubPage";

const fieldClass =
  "w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-[#11999e] focus:ring-1 focus:ring-[#11999e]/30";

const LOGIN_ERROR_MESSAGES = {
  credentialssignin: "Username or password is incorrect.",
  credentialsignin: "Username or password is incorrect.",
  mfa_invalid: "The authentication code is incorrect. Please try again.",
  mfa_misconfigured:
    "Two-factor authentication could not be verified. Please contact support.",
  rate_limit: "Too many login attempts. Please try again in a few minutes.",
  accessdenied: "You do not have permission to sign in.",
  configuration: "Sign-in is temporarily unavailable. Please try again later.",
  callback: "Sign-in could not be completed. Please try again.",
};

function messageForLoginError(code) {
  const normalized = String(code || "")
    .trim()
    .replace(/[\s-]/g, "")
    .toLowerCase();

  if (!normalized) return "Username or password is incorrect.";
  return (
    LOGIN_ERROR_MESSAGES[normalized] ||
    "Something went wrong. Please try again."
  );
}

export default function Login() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [pageReady, setPageReady] = useState(false);
  const [err, setErr] = useState("");
  const [mfaStep, setMfaStep] = useState(false);
  const [otp, setOtp] = useState("");
  const [rememberDevice, setRememberDevice] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const prepareLoginPage = async () => {
      try {
        await Promise.race([
          signOut({ redirect: false }),
          new Promise((resolve) => setTimeout(resolve, 5000)),
        ]);
      } catch {
        // ignore stale session cleanup failures
      } finally {
        if (!cancelled) setPageReady(true);
      }
    };

    prepareLoginPage();

    const urlError = new URLSearchParams(window.location.search).get("error");
    if (urlError) setErr(messageForLoginError(urlError));

    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (e) => {
    setCredentials((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  const verifyFreshSession = async () => {
    const session = await getSession();
    if (!session?.userId) return { ok: false, reason: "NO_SESSION" };

    const res = await fetch(`/api/me?_ts=${Date.now()}`, {
      cache: "no-store",
      credentials: "include",
    });

    if (!res.ok) {
      return { ok: false, reason: `API_ME_${res.status}` };
    }

    const data = await res.json();

    const sUserId = session?.userId ? String(session.userId) : null;
    const sCompanyId = session?.companyId ? String(session.companyId) : null;
    const sRole = session?.role ?? null;

    const dUserId =
      data?.auth?.dbUserId ??
      (data?.userAccount?.userPkId != null
        ? String(data.userAccount.userPkId)
        : null);

    const dCompanyId =
      data?.auth?.dbCompanyId ??
      (data?.userAccount?.companyId != null
        ? String(data.userAccount.companyId)
        : null);

    const dRole = data?.auth?.dbRole ?? data?.userAccount?.role ?? null;

    const mismatch =
      !sUserId ||
      !dUserId ||
      sUserId !== dUserId ||
      (sCompanyId && dCompanyId && sCompanyId !== dCompanyId) ||
      (sRole && dRole && sRole !== dRole);

    if (mismatch) {
      return { ok: false, reason: "SESSION_MISMATCH" };
    }

    return { ok: true, session };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      await signOut({ redirect: false });

      const payload = {
        username: credentials.username.trim(),
        password: credentials.password,
        redirect: false,
      };

      if (mfaStep) {
        payload.otp = otp.replace(/\D/g, "").slice(0, 6);
      }

      const res = await signIn("credentials", payload);

      if (res?.error === "MFA_REQUIRED") {
        setLoading(false);
        setMfaStep(true);
        setOtp("");
        setErr("");
        return;
      }

      if (res?.error === "MFA_INVALID") {
        setLoading(false);
        setErr(messageForLoginError("MFA_INVALID"));
        return;
      }

      if (res?.error === "REGISTER_PENDING") {
        router.replace("/register-screening");
        return;
      }

      if (res?.error === "RATE_LIMIT") {
        setLoading(false);
        setErr(messageForLoginError("RATE_LIMIT"));
        return;
      }

      if (!res || !res.ok) {
        setLoading(false);
        setErr(messageForLoginError(res?.error));
        return;
      }

      if (res?.ok && mfaStep && rememberDevice) {
        fetch("/api/me/trusted-device", {
          method: "POST",
          cache: "no-store",
        }).catch(() => {});
      }

      const verified = await verifyFreshSession();

      if (!verified.ok) {
        await signOut({ redirect: false });
        setLoading(false);
        setErr("Your browser had a stale session. Please log in again.");
        setMfaStep(false);
        setOtp("");
        return;
      }

      const session = verified.session;
      const role = session?.role;
      const status = session?.registerStatus;

      if (role === "ADMIN") {
        router.replace("/main");
      } else if (String(status || "").toUpperCase() === "PENDING") {
        router.replace("/register-screening");
      } else if (role === "PROVIDER") {
        router.replace("/provider");
      } else {
        router.replace("/main");
      }

      router.refresh();
    } catch (error) {
      console.error("Login error:", error);
      try {
        await signOut({ redirect: false });
      } catch {}
      setErr("Login failed. Please try again.");
      setLoading(false);
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
            {mfaStep ? "Verify it's you" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {mfaStep
              ? "Enter the 6-digit code from your authenticator app."
              : ""}
          </p>
        </div>

        {!pageReady ? (
          <p className="text-center text-sm text-gray-500">
            Preparing secure login session…
          </p>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!mfaStep && (
                <>
                  <div>
                    <label
                      htmlFor="username"
                      className="mb-1.5 block text-sm font-semibold text-gray-800"
                    >
                      Username or Email
                    </label>
                    <div className="relative">
                      <User
                        className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
                        aria-hidden="true"
                      />
                      <input
                        id="username"
                        type="text"
                        name="username"
                        placeholder="Enter your username or email"
                        autoComplete="username"
                        className={`${fieldClass} pr-3`}
                        onChange={handleChange}
                        value={credentials.username}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="mb-1.5 block text-sm font-semibold text-gray-800"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <Lock
                        className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
                        aria-hidden="true"
                      />
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        name="password"
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        className={`${fieldClass} pr-11`}
                        onChange={handleChange}
                        value={credentials.password}
                        required
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 flex cursor-pointer items-center px-3 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowPassword((s) => !s)}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {mfaStep && (
                <>
                  <div>
                    <label
                      htmlFor="otp"
                      className="mb-1.5 block text-sm font-semibold text-gray-800"
                    >
                      Authenticator code
                    </label>
                    <input
                      id="otp"
                      type="text"
                      name="otp"
                      placeholder="6-digit code"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-[#11999e] focus:ring-1 focus:ring-[#11999e]/30"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={rememberDevice}
                      onChange={(e) => setRememberDevice(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-[#11999e] accent-[#11999e]"
                    />
                    Remember this device for 30 days
                  </label>
                </>
              )}

              {err ? (
                <p className="text-sm text-red-600" role="alert">
                  {err}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#11999e] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#0e8488] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Logging in…" : mfaStep ? "Verify code" : "Log In"}
                {!loading ? (
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                ) : null}
              </button>
            </form>

            {!mfaStep ? (
              <div className="mt-6 flex items-start gap-13 text-sm">
                <div>
                  <p className="text-gray-600">Don&apos;t have an account?</p>
                  <Link
                    href="/register"
                    className="font-semibold text-[#11999e] hover:underline"
                  >
                    Register
                  </Link>
                </div>
                <span
                  className="h-8 w-px shrink-0 bg-gray-300"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-gray-600">Forgot your password?</p>
                  <Link
                    href="/forgot-password"
                    className="font-semibold text-[#11999e] hover:underline"
                  >
                    Reset Password
                  </Link>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </HubShell>
  );
}
