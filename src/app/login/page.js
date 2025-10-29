"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react";

export default function Login() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleChange = (e) => {
    setCredentials((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    // 1) Try to sign in (no auto redirect)
    const res = await signIn("credentials", {
      username: credentials.username,
      password: credentials.password,
      redirect: false, // ⬅️ important
    });

    if (res?.error === "REGISTER_PENDING") {
      // Not logged in; send them to the screening page
      router.replace("/register-screening");
      return;
    }

    if (!res || !res.ok) {
      setLoading(false);
      setErr(res?.error || "Invalid credentials");
      return;
    }

    // 2) Session now exists; read it and route by role
    const session = await getSession();
    const role = session?.role;
    const status = session?.registerStatus;

    if (role === "ADMIN") {
      router.replace("/main");
    } else if (status === "pending") {
      router.replace("/register-screening");
    } else if (role === "PROVIDER") {
      router.replace("/provider");
    } else {
      router.replace("/main");
    }

    // Optional: refresh to hydrate Navbar instantly
    router.refresh();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <img src="/lexify_wide.png" alt="Business Logo" className="mb-4 w-96" />
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
            required
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              className="p-2 border w-full"
              onChange={handleChange}
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

          {err && <p className="text-red-600 text-sm">{err}</p>}

          <button
            type="submit"
            disabled={loading}
            className="p-2 bg-[#11999e] text-white cursor-pointer disabled:opacity-60"
          >
            {loading ? "Logging in…" : "Login"}
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
