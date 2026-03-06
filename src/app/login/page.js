"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, getSession, signOut } from "next-auth/react";

export default function Login() {
  const router = useRouter();
  const bootstrappedRef = useRef(false);

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
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    let cancelled = false;

    (async () => {
      try {
        // Kill any stale session when user lands on /login
        await signOut({ redirect: false });
      } catch {
        // ignore
      } finally {
        if (!cancelled) setPageReady(true);
      }
    })();

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
      // Kill any stale session again immediately before a new login attempt
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
        setErr("Invalid authentication code");
        return;
      }

      if (res?.error === "REGISTER_PENDING") {
        router.replace("/register-screening");
        return;
      }

      if (res?.error === "RATE_LIMIT") {
        setLoading(false);
        setErr("Too many attempts. Try again in a few minutes.");
        return;
      }

      if (!res || !res.ok) {
        setLoading(false);
        setErr(res?.error || "Invalid credentials");
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

  if (!pageReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <img src="/lexify_wide.png" alt="LEXIFY" className="mb-4 w-96" />
        <div className="w-full max-w-md p-3 rounded shadow-2xl bg-white text-black">
          <p className="text-center">Preparing secure login session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <img src="/lexify_wide.png" alt="LEXIFY" className="mb-4 w-96" />
      <div className="w-full max-w-md p-3 rounded shadow-2xl bg-white text-black">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col w-full max-w-md space-y-2"
        >
          <input
            type="text"
            name="username"
            placeholder="Username"
            className="p-2 border"
            onChange={handleChange}
            value={credentials.username}
            required
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              className="p-2 border w-full"
              onChange={handleChange}
              value={credentials.password}
              required
            />
            <button
              type="button"
              className="absolute right-2 top-2 cursor-pointer"
              onClick={() => setShowPassword((s) => !s)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {mfaStep && (
            <input
              type="text"
              name="otp"
              placeholder="Authenticator code (6 digits)"
              className="p-2 border"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              required
            />
          )}

          {mfaStep && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
              />
              Remember this device for 30 days
            </label>
          )}

          {err && <p className="text-red-600 text-sm">{err}</p>}

          <button
            type="submit"
            disabled={loading}
            className="p-2 bg-[#11999e] text-white cursor-pointer disabled:opacity-60"
          >
            {loading ? "Logging in…" : mfaStep ? "Verify code" : "Login"}
          </button>
        </form>

        <div className="flex justify-between w-full max-w-md mt-2">
          <button
            onClick={() => router.push("/register")}
            className="text-[#11999e] cursor-pointer"
          >
            Register
          </button>
          <button
            onClick={() => router.push("/forgot-password")}
            className="text-[#11999e] cursor-pointer"
          >
            Forgot Password?
          </button>
        </div>
      </div>
    </div>
  );
}
