"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react"; // ✅ import

export default function ChangePassword() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.currentPassword || !formData.newPassword) {
      alert("Please fill both password fields.");
      return;
    }
    if (formData.newPassword !== formData.confirmNewPassword) {
      alert("New passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/me/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      const ct = res.headers.get("content-type") || "";
      const data = ct.includes("application/json")
        ? await res.json()
        : { error: await res.text() };

      if (!res.ok) {
        alert(data?.error || "Failed to change password.");
        return;
      }

      alert("Password updated successfully. Please log in again.");

      // ✅ Sign the user out and send them to /login
      await signOut({ callbackUrl: "/login" });
    } catch (err) {
      alert("Network error while changing password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-6">Change Password</h1>
      <div className="w-full max-w-md p-6 rounded shadow-2xl bg-white text-black">
        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
          <div>
            <label className="block text-lg font-medium">
              Current Password
            </label>
            <input
              type="password"
              name="currentPassword"
              placeholder="Enter current password"
              className="border p-2 w-full"
              onChange={handleChange}
              value={formData.currentPassword}
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="block text-lg font-medium">New Password</label>
            <input
              type="password"
              name="newPassword"
              placeholder="Enter new password"
              className="border p-2 w-full"
              onChange={handleChange}
              value={formData.newPassword}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-lg font-medium">
              Confirm New Password
            </label>
            <input
              type="password"
              name="confirmNewPassword"
              placeholder="Re-enter new password"
              className="border p-2 w-full"
              onChange={handleChange}
              value={formData.confirmNewPassword}
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#11999e] text-white p-2 rounded cursor-pointer disabled:opacity-60"
          >
            {submitting ? "Updating…" : "Update Password"}
          </button>
          <button
            type="button"
            className="w-full bg-red-500 text-white p-2 rounded cursor-pointer"
            onClick={() => router.push("/account")}
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
