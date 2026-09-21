"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { HubShell } from "@/app/components/HubPage";
import { AccountActionButton } from "@/app/components/AccountContactUi";
import { getPasswordRequirementResults } from "@/lib/password";

function PasswordField({
  id,
  label,
  name,
  value,
  onChange,
  placeholder,
  autoComplete,
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
        className="mb-1.5 block text-sm font-medium text-gray-800"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`w-full rounded-md border bg-white py-2.5 pr-11 pl-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:ring-1 ${toneClass}`}
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

export default function ChangePassword() {
  const router = useRouter();
  const { data: session } = useSession();
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [visible, setVisible] = useState({
    currentPassword: false,
    newPassword: false,
    confirmNewPassword: false,
  });

  const accountHref =
    session?.role === "PROVIDER" ? "/provider-account" : "/account";
  const requirements = getPasswordRequirementResults(formData.newPassword);
  const confirmMismatched =
    Boolean(formData.confirmNewPassword) &&
    formData.newPassword !== formData.confirmNewPassword;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.currentPassword ||
      !formData.newPassword ||
      !formData.confirmNewPassword
    ) {
      alert("Please fill all password fields.");
      return;
    }
    if (formData.newPassword !== formData.confirmNewPassword) {
      alert("New passwords do not match.");
      return;
    }
    if (requirements.some((requirement) => !requirement.met)) {
      alert(
        "New password must be at least 8 characters and include one uppercase letter, one number, and one special character.",
      );
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
      await signOut({ callbackUrl: "/login" });
    } catch {
      alert("Network error while changing password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <HubShell contentClassName="max-w-3xl">
      <div className="rounded-2xl bg-white p-6 text-gray-900 shadow-[0_16px_44px_rgba(17,153,158,0.22)] ring-1 ring-black/10 sm:p-8">
        <div className="mb-6 flex items-start gap-3">
          <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#11999e] text-white">
            <Lock className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Change Password
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Keep your account secure by choosing a strong password.
            </p>
            <div className="mt-2 h-[3px] w-10 rounded-full bg-[#11999e]" />
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5 rounded-xl border border-gray-200 p-5 sm:p-6">
            <PasswordField
              id="currentPassword"
              label="Current Password"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              placeholder="Enter your current password"
              autoComplete="current-password"
              visible={visible.currentPassword}
              onToggleVisible={() =>
                setVisible((v) => ({
                  ...v,
                  currentPassword: !v.currentPassword,
                }))
              }
            />
            <PasswordField
              id="newPassword"
              label="New Password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              placeholder="Enter your new password"
              autoComplete="new-password"
              visible={visible.newPassword}
              onToggleVisible={() =>
                setVisible((v) => ({ ...v, newPassword: !v.newPassword }))
              }
            />
            <div>
              <PasswordField
                id="confirmNewPassword"
                label="Confirm New Password"
                name="confirmNewPassword"
                value={formData.confirmNewPassword}
                onChange={handleChange}
                placeholder="Re-enter your new password"
                autoComplete="new-password"
                visible={visible.confirmNewPassword}
                onToggleVisible={() =>
                  setVisible((v) => ({
                    ...v,
                    confirmNewPassword: !v.confirmNewPassword,
                  }))
                }
                tone={confirmMismatched ? "mismatch" : undefined}
              />
              {confirmMismatched ? (
                <p className="mt-1.5 flex items-center gap-1.5 text-sm text-red-600">
                  <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Passwords do not match
                </p>
              ) : null}
            </div>

            <div className="rounded-xl border border-[#11999e]/25 bg-[#e7f6f7] p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <ShieldCheck
                  className="h-4 w-4 text-[#11999e]"
                  aria-hidden="true"
                />
                Password Requirements
              </div>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {requirements.map((requirement) => (
                  <li
                    key={requirement.id}
                    className="flex items-center gap-2 text-sm text-gray-700"
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
            <p className="flex items-center gap-2 text-sm text-gray-500">
              <ShieldCheck
                className="h-4 w-4 shrink-0 text-[#11999e]"
                aria-hidden="true"
              />
              <span>
                We recommend a password you do not use for any other service —
                reused passwords are the most common way accounts are
                compromised.
              </span>
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-gray-200 pt-6">
            <AccountActionButton
              icon={Lock}
              disabled={submitting}
              type="submit"
              className="h-11 shrink-0 whitespace-nowrap"
            >
              {submitting ? "Updating…" : "Update Password"}
            </AccountActionButton>
            <button
              type="button"
              onClick={() => router.push(accountHref)}
              className="inline-flex h-11 shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50"
            >
              Back to My Account
            </button>
          </div>
        </form>
      </div>
    </HubShell>
  );
}
