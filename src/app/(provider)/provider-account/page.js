"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Pencil, Save } from "lucide-react";
import NarrowTooltip from "../../components/NarrowTooltip";
import Link from "next/link";

export default function ProviderAccount() {
  const router = useRouter();

  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [contacts, setContacts] = useState([]);
  const [busy, setBusy] = useState(false); // network guard

  // invoice contacts state
  const [invoiceContacts, setInvoiceContacts] = useState([]);
  const [busyInvoice, setBusyInvoice] = useState(false);

  // MFA
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaQr, setMfaQr] = useState("");
  const [mfaOtpAuth, setMfaOtpAuth] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);
  const [mfaMsg, setMfaMsg] = useState("");
  const [mfaErr, setMfaErr] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState([]);

  // Notifications (Provider)
  const [notificationPrefs, setNotificationPrefs] = useState([]);
  const hasPref = (key) => notificationPrefs.includes(key);

  // Practical notification categories (Provider)
  const CATEGORY_OPTIONS = [
    { key: "contracts", label: "Contracts" },
    { key: "day_to_day", label: "Day-to-Day Legal Advice" },
    { key: "employment", label: "Employment Related Documents" },
    { key: "dispute_resolution", label: "Dispute Resolution" },
    { key: "m_and_a", label: "Mergers & Acquisitions" },
    { key: "corporate_advisory", label: "Corporate Advisory" },
    { key: "data_protection", label: "Data Protection" },
    { key: "compliance", label: "Compliance" },
    { key: "legal_training", label: "Legal Training" },
    { key: "banking_and_finance", label: "Banking & Finance" },
  ];

  const [categoryPrefs, setCategoryPrefs] = useState([]);
  const categoryHas = (k) => categoryPrefs.includes(k);

  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef(null);

  const setPref = async (key, enabled) => {
    // optimistic UI
    setNotificationPrefs((xs) => {
      const has = xs.includes(key);
      if (enabled && !has) return [...xs, key];
      if (!enabled && has) return xs.filter((k) => k !== key);
      return xs;
    });

    try {
      const res = await fetch("/api/me/notification-preferences/provider", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, enabled }),
      });
      if (!res.ok) {
        // revert on error
        setNotificationPrefs((xs) =>
          enabled
            ? xs.filter((k) => k !== key)
            : Array.from(new Set([...xs, key])),
        );
        const err = await res.json().catch(() => ({}));
        alert(err?.error || "Failed to update notification preference.");
        return;
      }
      const json = await res.json();
      setNotificationPrefs(
        Array.isArray(json.notificationPreferences)
          ? json.notificationPreferences
          : [],
      );
    } catch {
      setNotificationPrefs((xs) =>
        enabled
          ? xs.filter((k) => k !== key)
          : Array.from(new Set([...xs, key])),
      );
      alert("Network error while updating notification preference.");
    }
    if (key === "new-available-request" && !enabled)
      setCategoryDropdownOpen(false);
  };

  const setCategoryPref = async (key, enabled) => {
    // optimistic UI
    setCategoryPrefs((xs) => {
      const has = xs.includes(key);
      if (enabled && !has) return [...xs, key];
      if (!enabled && has) return xs.filter((k) => k !== key);
      return xs;
    });

    try {
      const res = await fetch(
        "/api/me/practical-notification-preferences/provider",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, enabled }),
        },
      );

      if (!res.ok) {
        // revert on error
        setCategoryPrefs((xs) =>
          enabled
            ? xs.filter((k) => k !== key)
            : Array.from(new Set([...xs, key])),
        );
        const err = await res.json().catch(() => ({}));
        alert(err?.error || "Failed to update request category preferences.");
        return;
      }

      const json = await res.json().catch(() => ({}));
      setCategoryPrefs(
        Array.isArray(json.practicalNotificationPreferences)
          ? json.practicalNotificationPreferences
          : [],
      );
    } catch {
      // revert on network error
      setCategoryPrefs((xs) =>
        enabled
          ? xs.filter((k) => k !== key)
          : Array.from(new Set([...xs, key])),
      );
      alert("Network error while updating request category preferences.");
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load profile");
        const data = await res.json();
        setMe(data);
        setMfaEnabled(
          !!(data?.userAccount?.twoFactorEnabled ?? data?.twoFactorEnabled),
        );
        setUsername(data.username || "");
        const arr = Array.isArray(data.companyContactPersons)
          ? data.companyContactPersons
          : [];
        setContacts(
          arr.map((c, i) => ({
            id: i + 1,
            firstName: c.firstName || "",
            lastName: c.lastName || "",
            position: c.title || c.position || "",
            telephone: c.telephone || "",
            email: c.email || "",
            allNotifications: !!c.allNotifications,
            isEditing: false,
          })),
        );
        const inv = Array.isArray(data?.company?.companyInvoiceContactPersons)
          ? data.company.companyInvoiceContactPersons
          : Array.isArray(data?.companyInvoiceContactPersons)
            ? data.companyInvoiceContactPersons
            : [];
        setInvoiceContacts(
          inv.map((c, i) => ({
            id: i + 1,
            firstName: c.firstName || "",
            lastName: c.lastName || "",
            position: c.title || c.position || "",
            telephone: c.telephone || "",
            email: c.email || "",
            isEditing: false,
          })),
        );

        try {
          const pr = await fetch("/api/me/notification-preferences/provider", {
            cache: "no-store",
          });
          const pj = await pr.json();
          setNotificationPrefs(
            Array.isArray(pj.notificationPreferences)
              ? pj.notificationPreferences
              : [],
          );
        } catch {
          setNotificationPrefs([]);
        }

        // fetch practical notification categories (provider)
        try {
          const cr = await fetch(
            "/api/me/practical-notification-preferences/provider",
            { cache: "no-store" },
          );
          const cj = await cr.json();
          setCategoryPrefs(
            Array.isArray(cj.practicalNotificationPreferences)
              ? cj.practicalNotificationPreferences
              : [],
          );
        } catch {
          setCategoryPrefs([]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const onDocClick = (e) => {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(e.target)
      ) {
        setCategoryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // --- helpers ---

  const updateContact = (id, field, value) =>
    setContacts((xs) =>
      xs.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    );

  const toggleAllNotifications = async (id, checked) => {
    const next = contacts.map((c) =>
      c.id === id ? { ...c, allNotifications: checked } : c,
    );
    setContacts(next);
    try {
      await saveContacts(next);
    } catch (e) {
      setContacts(contacts);
      alert("Failed to update notification flag for this contact.");
    }
  };

  const addContact = () =>
    setContacts((xs) => [
      ...xs,
      {
        id: xs.length + 1,
        firstName: "",
        lastName: "",
        position: "",
        telephone: "",
        email: "",
        isEditing: true,
      },
    ]);

  const normalizeForApi = (xs) =>
    xs.map((c) => ({
      firstName: (c.firstName || "").trim(),
      lastName: (c.lastName || "").trim(),
      title: (c.position || "").trim(),
      telephone: (c.telephone || "").trim(),
      email: (c.email || "").trim(),
      allNotifications: !!c.allNotifications,
    }));

  // Save the current list to the server (no flag changes here)
  const saveContacts = async (listToSave) => {
    setBusy(true);
    try {
      const payload = normalizeForApi(listToSave);
      const res = await fetch("/api/me/contacts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts: payload }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to save contacts");
    } finally {
      setBusy(false);
    }
  };

  // Edit/Save button behavior:
  // - If NOT editing → turn this row into editing mode
  // - If editing → persist, then set ONLY this row's isEditing=false
  const toggleEdit = async (id) => {
    const row = contacts.find((c) => c.id === id);
    if (!row) return;

    if (!row.isEditing) {
      // enter edit mode
      setContacts((xs) =>
        xs.map((c) => (c.id === id ? { ...c, isEditing: true } : c)),
      );
      return;
    }

    // was editing → save everything, then exit edit mode for this row
    const next = [...contacts];
    await saveContacts(next);

    setContacts((xs) =>
      xs.map((c) => (c.id === id ? { ...c, isEditing: false } : c)),
    );
  };

  // Delete: enforce at least one, persist after removing
  const removeContact = async (id) => {
    if (contacts.length === 1) {
      alert("At least one contact must remain.");
      return;
    }
    if (!confirm("Delete this contact?")) return;

    const next = contacts
      .filter((c) => c.id !== id)
      .map((c, i) => ({ ...c, id: i + 1, isEditing: false }));
    try {
      await saveContacts(next);
      setContacts(next);
    } catch {
      // keep UI unchanged on failure
    }
  };

  const updateInvoiceContact = (id, field, value) =>
    setInvoiceContacts((xs) =>
      xs.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    );

  const addInvoiceContact = () =>
    setInvoiceContacts((xs) => [
      ...xs,
      {
        id: xs.length + 1,
        firstName: "",
        lastName: "",
        position: "",
        telephone: "",
        email: "",
        isEditing: true,
      },
    ]);

  const normalizeForApiInv = (xs) =>
    xs.map((c) => ({
      firstName: (c.firstName || "").trim(),
      lastName: (c.lastName || "").trim(),
      title: (c.position || "").trim(),
      telephone: (c.telephone || "").trim(),
      email: (c.email || "").trim(),
    }));

  const saveInvoiceContacts = async (listToSave) => {
    setBusyInvoice(true);
    try {
      const payload = normalizeForApiInv(listToSave);
      const res = await fetch("/api/me/invoice-contacts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts: payload }),
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json?.error || "Failed to save invoice contacts");
    } finally {
      setBusyInvoice(false);
    }
  };

  const toggleEditInvoice = async (id) => {
    const row = invoiceContacts.find((c) => c.id === id);
    if (!row) return;

    if (!row.isEditing) {
      setInvoiceContacts((xs) =>
        xs.map((c) => (c.id === id ? { ...c, isEditing: true } : c)),
      );
      return;
    }

    const next = [...invoiceContacts];
    await saveInvoiceContacts(next);
    setInvoiceContacts((xs) =>
      xs.map((c) => (c.id === id ? { ...c, isEditing: false } : c)),
    );
  };

  const removeInvoiceContact = async (id) => {
    if (invoiceContacts.length === 1) {
      alert("At least one invoicing contact must remain.");
      return;
    }
    if (!confirm("Delete this invoicing contact?")) return;

    const next = invoiceContacts
      .filter((c) => c.id !== id)
      .map((c, i) => ({ ...c, id: i + 1, isEditing: false }));
    try {
      await saveInvoiceContacts(next);
      setInvoiceContacts(next);
    } catch {
      // keep UI unchanged on failure
    }
  };

  const startMfaSetup = async () => {
    setMfaBusy(true);
    setMfaErr("");
    setMfaMsg("");
    setMfaCode("");
    try {
      const res = await fetch("/api/me/mfa/setup", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to start MFA setup");
      setMfaQr(json.qrDataUrl || "");
      setMfaOtpAuth(json.otpauth || "");
      setMfaMsg(
        "Scan the QR code with your authenticator app, then enter the 6-digit code to enable MFA.",
      );
    } catch (e) {
      setMfaErr(e.message);
    } finally {
      setMfaBusy(false);
    }
  };

  const enableMfa = async () => {
    setMfaBusy(true);
    setMfaErr("");
    setMfaMsg("");
    try {
      const res = await fetch("/api/me/mfa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: mfaCode.replace(/\D/g, "").slice(0, 6) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to enable MFA");
      setMfaEnabled(true);
      if (Array.isArray(json.recoveryCodes))
        setRecoveryCodes(json.recoveryCodes);
      setMfaQr("");
      setMfaOtpAuth("");
      setMfaCode("");
      setMfaMsg("MFA enabled.");
    } catch (e) {
      setMfaErr(e.message);
    } finally {
      setMfaBusy(false);
    }
  };

  const disableMfa = async () => {
    if (!confirm("Disable MFA for your account?")) return;
    setMfaBusy(true);
    setMfaErr("");
    setMfaMsg("");
    try {
      const res = await fetch("/api/me/mfa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: mfaCode.replace(/\D/g, "").slice(0, 6) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to disable MFA");
      setMfaEnabled(false);
      setMfaQr("");
      setMfaOtpAuth("");
      setMfaCode("");
      setMfaMsg("MFA disabled.");
    } catch (e) {
      setMfaErr(e.message);
    } finally {
      setMfaBusy(false);
    }
  };

  if (loading) return <div className="p-6">Loading your account…</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <h1 className="text-3xl font-bold mb-6">My LEXIFY Account</h1>

      {/* My Contact Information */}
      <div className="w-full max-w-6xl p-6 rounded shadow-2xl bg-white text-black">
        <h2 className="text-2xl font-semibold mb-4">My Contact Information</h2>

        {/* Company information */}
        <div className="grid grid-cols-2 gap-4">
          <h4 className="text-md font-semibold col-span-2">My Company</h4>

          <div className="w-full text-sm border p-2">
            Name: {me?.company?.companyName || me?.companyName || "-"}
          </div>
          <div className="w-full text-sm border p-2">
            Business ID (in country of domicile):{" "}
            {me?.company?.businessId || me?.companyId || "-"}
          </div>
          <div className="w-full text-sm border p-2">
            Street Address:{" "}
            {me?.company?.companyAddress || me?.companyAddress || "-"}
          </div>
          <div className="w-full text-sm border p-2">
            Postal Code:{" "}
            {me?.company?.companyPostalCode || me?.companyPostalCode || "-"}
          </div>
          <div className="w-full text-sm border p-2">
            City: {me?.company?.companyCity || me?.companyCity || "-"}
          </div>
          <div className="w-full text-sm border p-2">
            Country of Domicile:{" "}
            {me?.company?.companyCountry || me?.companyCountry || "-"}
          </div>
        </div>

        <br />

        {/* UserAccount information */}
        <div className="grid grid-cols-2 gap-4">
          <h4 className="text-md font-semibold col-span-2">My User Account</h4>

          <div className="w-full text-sm border p-2">
            Username:{" "}
            {me?.userAccount?.username || me?.username || username || "-"}
          </div>
          <div className="w-full text-sm border p-2">
            Role: {me?.userAccount?.role || me?.role || "-"}
          </div>
          <div className="w-full text-sm border p-2">
            First Name: {me?.userAccount?.firstName || "-"}
          </div>
          <div className="w-full text-sm border p-2">
            Last Name: {me?.userAccount?.lastName || "-"}
          </div>
          <div className="w-full text-sm border p-2">
            E-mail: {me?.userAccount?.email || "-"}
          </div>
          <div className="w-full text-sm border p-2">
            Telephone: {me?.userAccount?.telephone || "-"}
          </div>
        </div>

        <br />

        {/* Username & Password */}
        <div className="grid grid-cols-2 gap-4">
          <h4 className="text-md font-semibold col-span-2">
            Username & Password
          </h4>

          <div className="col-span-2">
            <div className="w-1/3 text-sm border p-2">
              Username:{" "}
              {me?.userAccount?.username || me?.username || username || "-"}
            </div>
            <button
              onClick={() => router.push("/change-password")}
              className="mt-4 bg-[#11999e] text-white px-11 py-2 rounded cursor-pointer"
            >
              Change Password
            </button>
          </div>
        </div>
        <br />
        <div className="w-full max-w-6xl rounded bg-white text-black mt-8">
          <h2 className="text-md font-semibold mb-2">
            Multi-Factor Authentication
          </h2>
          <div className="text-sm mb-4">
            Status:{" "}
            <span
              className={
                mfaEnabled
                  ? "text-green-700 font-semibold"
                  : "text-red-700 font-semibold"
              }
            >
              {mfaEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>

          {mfaErr && <div className="mb-3 text-sm text-red-700">{mfaErr}</div>}
          {mfaMsg && (
            <div className="mb-3 text-sm text-green-700">{mfaMsg}</div>
          )}

          {!mfaEnabled && (
            <>
              <button
                disabled={mfaBusy}
                onClick={startMfaSetup}
                className="bg-[#11999e] text-white px-4 py-2 rounded cursor-pointer disabled:opacity-50"
              >
                Set up MFA (Authenticator App)
              </button>

              {mfaQr && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  <div>
                    <div className="text-sm font-semibold mb-2">
                      Scan this QR code
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mfaQr}
                      alt="MFA QR code"
                      className="border p-2 bg-white w-64 h-64"
                    />
                    <div className="text-xs text-gray-600 mt-2">
                      If you can’t scan, your authenticator can also accept an
                      otpauth URI.
                    </div>
                    <div className="text-xs break-all text-gray-600">
                      {mfaOtpAuth}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold mb-2">
                      Enter the 6-digit code
                    </div>
                    <input
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value)}
                      placeholder="123456"
                      className="border p-2 w-full"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                    />
                    <button
                      disabled={mfaBusy || !mfaCode.trim()}
                      onClick={enableMfa}
                      className="mt-3 bg-green-600 text-white px-4 py-2 rounded cursor-pointer disabled:opacity-50"
                    >
                      Enable MFA
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {mfaEnabled && (
            <div className="max-w-md">
              <div className="text-sm mb-2">
                To disable MFA, confirm with a current 6-digit authenticator
                code:
              </div>
              <input
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                placeholder="123456"
                className="border p-2 w-full"
                inputMode="numeric"
                autoComplete="one-time-code"
              />
              <button
                disabled={mfaBusy || !mfaCode.trim()}
                onClick={disableMfa}
                className="mt-3 bg-red-600 text-white px-4 py-2 rounded cursor-pointer disabled:opacity-50"
              >
                Disable MFA
              </button>
            </div>
          )}
          {recoveryCodes.length > 0 && (
            <div className="mt-4 p-4 border rounded bg-gray-50">
              <div className="font-semibold mb-2">
                Recovery codes (save these now)
              </div>
              <div className="text-sm text-gray-700 mb-2">
                Each code can be used once if you can’t access your
                authenticator app. They won’t be shown again.
              </div>
              <pre className="text-sm whitespace-pre-wrap">
                {recoveryCodes.join("\n")}
              </pre>
              <button
                className="mt-3 bg-[#11999e] text-white px-4 py-2 rounded cursor-pointer"
                onClick={async () => {
                  await navigator.clipboard.writeText(recoveryCodes.join("\n"));
                  alert("Copied recovery codes to clipboard.");
                }}
              >
                Copy recovery codes
              </button>
            </div>
          )}
        </div>
      </div>
      <br />
      {/* Notification Preferences */}
      <div className="w-full max-w-6xl p-6 rounded shadow-2xl bg-white text-black">
        <h2 className="text-2xl font-semibold mb-4">
          Notification Preferences
        </h2>
        <h4 className="text-md">
          LEXIFY can send you email notifications of important developments
          related to the offers you have submitted in response to LEXIFY
          Requests. Please select the notifications you want to receive:
        </h4>
        <br />
        {/* 1) no-winning-offer */}
        <label
          htmlFor="prov-no-winning-offer"
          className="inline-flex items-center cursor-pointer"
        >
          <input
            id="prov-no-winning-offer"
            type="checkbox"
            className="sr-only"
            checked={hasPref("no-winning-offer")}
            onChange={(e) => setPref("no-winning-offer", e.target.checked)}
          />
          <div
            className={`relative w-11 h-6 rounded-full transition-colors ${
              hasPref("no-winning-offer") ? "bg-green-600" : "bg-gray-700"
            }`}
          >
            <div
              className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-transform ${
                hasPref("no-winning-offer") ? "translate-x-full" : ""
              }`}
            />
          </div>
          <span className="ms-3 text-sm text-black dark:text-black">
            A pending LEXIFY Request expires and the offer I have submitted is
            not the winning offer
          </span>
        </label>
        <br />
        {/* 2) winner-conflict-check */}
        <label
          htmlFor="prov-winner-conflict-check"
          className="inline-flex items-center cursor-pointer pt-2"
        >
          <input
            id="prov-winner-conflict-check"
            type="checkbox"
            className="sr-only"
            checked={hasPref("winner-conflict-check")}
            onChange={(e) => setPref("winner-conflict-check", e.target.checked)}
          />
          <div
            className={`relative w-11 h-6 rounded-full transition-colors ${
              hasPref("winner-conflict-check") ? "bg-green-600" : "bg-gray-700"
            }`}
          >
            <div
              className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-transform ${
                hasPref("winner-conflict-check") ? "translate-x-full" : ""
              }`}
            />
          </div>
          <span className="ms-3 text-sm text-black dark:text-black">
            A pending LEXIFY Request expires and the offer I have submitted is
            the winning offer subject to clearance of remaining conflict checks{" "}
            <NarrowTooltip tooltipText="If the LEXIFY Request does not disclose the identities of all relevant parties in the matter, the corresponding remaining conflict checks will be performed only with the legal service provider submitting the winning offer. If an existing conflict is then notified by the legal service provider to LEXIFY, the winning offer will automatically be disqualified and the second-best offer (if any) will replace it as the winning offer." />
          </span>
        </label>
        <br />
        {/* 3) request-cancelled */}
        <label
          htmlFor="prov-request-cancelled"
          className="inline-flex items-center cursor-pointer pt-2"
        >
          <input
            id="prov-request-cancelled"
            type="checkbox"
            className="sr-only"
            checked={hasPref("request-cancelled")}
            onChange={(e) => setPref("request-cancelled", e.target.checked)}
          />
          <div
            className={`relative w-11 h-6 rounded-full transition-colors ${
              hasPref("request-cancelled") ? "bg-green-600" : "bg-gray-700"
            }`}
          >
            <div
              className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-transform ${
                hasPref("request-cancelled") ? "translate-x-full" : ""
              }`}
            />
          </div>
          <span className="ms-3 text-sm text-black dark:text-black">
            A pending LEXIFY Request is cancelled by the client after I have
            submitted an offer
          </span>
        </label>
        {/* 4) new-available-request */}
        <label
          htmlFor="prov-new-available-request"
          className="inline-flex items-center cursor-pointer pt-2"
        >
          <input
            id="prov-new-available-request"
            type="checkbox"
            className="sr-only"
            checked={hasPref("new-available-request")}
            onChange={(e) => setPref("new-available-request", e.target.checked)}
          />
          <div
            className={`relative w-11 h-6 rounded-full transition-colors ${
              hasPref("new-available-request") ? "bg-green-600" : "bg-gray-700"
            }`}
          >
            <div
              className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-transform ${
                hasPref("new-available-request") ? "translate-x-full" : ""
              }`}
            />
          </div>
          <span className="ms-3 text-sm text-black dark:text-black">
            A new LEXIFY Request has been published and is awaiting offers
          </span>
        </label>
        {/* Categories dropdown: only visible when "new-available-request" is ON */}
        {hasPref("new-available-request") && (
          <div className="mt-4" ref={categoryDropdownRef}>
            <div className="text-sm font-semibold mb-2">
              Select which categories of new requests you would like to receive
              notifications for:
            </div>

            <button
              type="button"
              onClick={() => setCategoryDropdownOpen((v) => !v)}
              className="w-full border rounded px-3 py-2 text-sm text-left bg-white"
            >
              {categoryPrefs.length === 0
                ? "No categories selected"
                : `${categoryPrefs.length} Categories Selected`}
            </button>

            {categoryDropdownOpen && (
              <div className="mt-2 border rounded bg-white max-h-64 overflow-auto">
                {CATEGORY_OPTIONS.map(({ key, label }) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={categoryHas(key)}
                      onChange={(e) => setCategoryPref(key, e.target.checked)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <br />
      {/* Invoicing and Payment Methods */}
      <div className="w-full max-w-6xl p-6 rounded shadow-2xl bg-white text-black">
        <h2 className="text-2xl font-semibold mb-4">Fees and Invoicing</h2>
        <h4 className="text-md">
          LEXIFY charges a monthly service fee for the use of the LEXIFY
          platform. The amount of the service fee is zero percent (0%) of the
          total legal service sales (VAT 0%) by your company on the LEXIFY
          platform during a calendar month. The service fee for an individual
          calendar month is invoiced by LEXIFY during the following calendar
          month.
        </h4>
        <br />
        <div className="grid grid-cols-2 gap-4">
          <h4 className="text-md font-semibold col-span-2">
            My Company&apos;s Contact Persons for Invoicing
          </h4>
          <div className="col-span-2">
            <table className="w-full border border-gray-300 text-sm">
              <thead className="bg-gray-200">
                <tr className="bg-[#3a3a3c] text-white">
                  <th className="border p-2">First Name</th>
                  <th className="border p-2">Last Name</th>
                  <th className="border p-2">Title/Position in Company</th>
                  <th className="border p-2">Telephone (with country code)</th>
                  <th className="border p-2">Email</th>
                  <th className="border p-2">Edit/Save</th>
                  <th className="border p-2">Delete</th>
                </tr>
              </thead>
              <tbody>
                {invoiceContacts.map((c) => (
                  <tr key={c.id}>
                    <td className="border p-2 text-center">
                      {c.isEditing ? (
                        <input
                          className="border p-1 w-full"
                          value={c.firstName}
                          onChange={(e) =>
                            updateInvoiceContact(
                              c.id,
                              "firstName",
                              e.target.value,
                            )
                          }
                        />
                      ) : (
                        c.firstName
                      )}
                    </td>
                    <td className="border p-2 text-center">
                      {c.isEditing ? (
                        <input
                          className="border p-1 w-full"
                          value={c.lastName}
                          onChange={(e) =>
                            updateInvoiceContact(
                              c.id,
                              "lastName",
                              e.target.value,
                            )
                          }
                        />
                      ) : (
                        c.lastName
                      )}
                    </td>
                    <td className="border p-2 text-center">
                      {c.isEditing ? (
                        <input
                          className="border p-1 w-full"
                          value={c.position}
                          onChange={(e) =>
                            updateInvoiceContact(
                              c.id,
                              "position",
                              e.target.value,
                            )
                          }
                        />
                      ) : (
                        c.position
                      )}
                    </td>
                    <td className="border p-2 text-center">
                      {c.isEditing ? (
                        <input
                          className="border p-1 w-full"
                          value={c.telephone}
                          onChange={(e) =>
                            updateInvoiceContact(
                              c.id,
                              "telephone",
                              e.target.value,
                            )
                          }
                        />
                      ) : (
                        c.telephone
                      )}
                    </td>
                    <td className="border p-2 text-center">
                      {c.isEditing ? (
                        <input
                          className="border p-1 w-full"
                          value={c.email}
                          onChange={(e) =>
                            updateInvoiceContact(c.id, "email", e.target.value)
                          }
                        />
                      ) : (
                        c.email
                      )}
                    </td>
                    <td className="border p-2 text-center">
                      <button
                        disabled={busyInvoice}
                        onClick={() => toggleEditInvoice(c.id)}
                        className="text-blue-500 hover:text-blue-700 disabled:opacity-50 cursor-pointer"
                      >
                        {c.isEditing ? (
                          <Save size={16} />
                        ) : (
                          <Pencil size={16} />
                        )}
                      </button>
                    </td>
                    <td className="border p-2 text-center">
                      <button
                        disabled={busyInvoice}
                        onClick={() => removeInvoiceContact(c.id)}
                        className="text-red-500 hover:text-red-700 disabled:opacity-50 cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button
              disabled={busyInvoice}
              onClick={addInvoiceContact}
              className="mt-4 bg-[#11999e] text-white px-4 py-2 rounded cursor-pointer disabled:opacity-50"
            >
              Add New Invoicing Contact
            </button>
          </div>
        </div>

        <br />
      </div>
      <br />
      {/* LEXIFY Legal Terms and Conditions */}
      <div className="w-full max-w-6xl p-6 rounded shadow-2xl bg-white text-black">
        <h2 className="text-2xl font-semibold mb-4">
          LEXIFY Legal Terms and Conditions
        </h2>
        <h4 className="text-md">
          By using LEXIFY to sell legal services, you confirm you understand,
          accept and comply with the following terms and conditions governing
          the use of the LEXIFY platform and individual LEXIFY Contracts entered
          into by legal service purchasers and legal service providers on the
          LEXIFY platform, as applicable and as such terms and conditions may be
          amended from time to time:
        </h4>
        <br />
        <ul className="max-w-md space-y-1 text-black list-disc list-inside dark:text-black">
          <li>
            <Link
              href="/docs/lexify-tos-2025.pdf"
              target="_blank"
              rel="noopener"
              className="text-blue-600 dark:text-blue-500 hover:underline"
            >
              LEXIFY Terms of Service
            </Link>
          </li>
          <li>
            <Link
              href="/docs/lexify-privacy-statement-2025.pdf"
              target="_blank"
              rel="noopener"
              className="text-blue-600 dark:text-blue-500 hover:underline"
            >
              Privacy Statement for LEXIFY Platform
            </Link>
          </li>
          <li>
            <Link
              href="/docs/lexify-gtcs-2025-v2.pdf"
              target="_blank"
              rel="noopener"
              className="text-blue-600 dark:text-blue-500 hover:underline"
            >
              General Terms and Conditions for LEXIFY Contracts
            </Link>
          </li>
        </ul>
        <br />
        <h4 className="text-md">
          In the event LEXIFY implements any material change to the above legal
          terms and conditions, you will be notified of the change in advance
          and provided an option to end your use of all LEXIFY services if such
          change is not acceptable to you.
        </h4>
      </div>
    </div>
  );
}
