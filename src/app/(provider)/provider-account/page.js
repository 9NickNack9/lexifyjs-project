"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { Pencil, Save, Building2, User, Lock, Users, Shield } from "lucide-react";
import NarrowTooltip from "../../components/NarrowTooltip";
import { AppPage } from "@/app/components/HubPage";
import {
  AccountActionButton,
  AccountHeading,
  AccountNestedCard,
  OutlinedField,
} from "@/app/components/AccountContactUi";

function PrefSwitch({ id, checked, onChange, children }) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-3 touch-manipulation select-none"
    >
      <input
        id={id}
        type="checkbox"
        role="switch"
        className="peer sr-only"
        checked={checked}
        onChange={onChange}
      />
      <span
        aria-hidden="true"
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full shadow-[inset_0_1px_3px_rgba(0,0,0,0.35)] transition-colors duration-200 ease-out peer-focus-visible:ring-2 peer-focus-visible:ring-[#11999e] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-white ${
          checked ? "bg-green-600" : "bg-gray-700"
        }`}
      >
        <span
          className={`pointer-events-none absolute top-[2px] left-[2px] h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.28),0_0_0_1px_rgba(0,0,0,0.04)] transition-transform duration-200 ease-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
      <span className="min-w-0 flex-1 text-sm leading-6 text-black">
        {children}
      </span>
    </label>
  );
}

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

  const { data: session, status } = useSession();

  const forceLogout = () =>
    signOut({ callbackUrl: "/login?reason=session-mismatch" });

  const isAuthMismatch = (session, data) => {
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

    if (!sUserId || !dUserId) return false;
    if (sUserId !== dUserId) return true;
    if (sCompanyId && dCompanyId && sCompanyId !== dCompanyId) return true;
    if (sRole && dRole && sRole !== dRole) return true;

    return false;
  };

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

  // Company members modal
  const [membersOpen, setMembersOpen] = useState(false);
  const [companyMembers, setCompanyMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersErr, setMembersErr] = useState("");

  const openMembersModal = async () => {
    setMembersOpen(true);
    setMembersErr("");
    setMembersLoading(true);
    try {
      const res = await fetch("/api/me/company-members", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to load members.");
      setCompanyMembers(Array.isArray(json.members) ? json.members : []);
    } catch (e) {
      setMembersErr(e.message || "Failed to load members.");
      setCompanyMembers([]);
    } finally {
      setMembersLoading(false);
    }
  };

  const closeMembersModal = () => setMembersOpen(false);

  // Edit UserAccount (my contact info)
  const [uaEditing, setUaEditing] = useState(false);
  const [uaBusy, setUaBusy] = useState(false);
  const [uaDraft, setUaDraft] = useState({
    firstName: "",
    lastName: "",
    email: "",
    telephone: "",
  });

  const startEditUa = () => {
    const ua = me?.userAccount || {};
    setUaDraft({
      firstName: ua.firstName || "",
      lastName: ua.lastName || "",
      email: ua.email || "",
      telephone: ua.telephone || "",
    });
    setUaEditing(true);
  };

  const cancelEditUa = () => {
    const ua = me?.userAccount || {};
    setUaDraft({
      firstName: ua.firstName || "",
      lastName: ua.lastName || "",
      email: ua.email || "",
      telephone: ua.telephone || "",
    });
    setUaEditing(false);
  };

  const saveUa = async () => {
    setUaBusy(true);
    try {
      const res = await fetch("/api/me/useraccount", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(uaDraft),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(json?.error || "Failed to save information.");

      setMe((prev) => ({
        ...(prev || {}),
        userAccount: {
          ...(prev?.userAccount || {}),
          ...(json.userAccount || {}),
        },
      }));
      setUaEditing(false);
    } catch (e) {
      alert(e.message || "Failed to save information.");
    } finally {
      setUaBusy(false);
    }
  };

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
    if (status === "loading") return;

    if (status === "unauthenticated") {
      forceLogout();
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/me?_ts=${Date.now()}`, {
          cache: "no-store",
          credentials: "include",
        });

        if (res.status === 401) {
          forceLogout();
          return;
        }

        if (!res.ok) throw new Error("Failed to load profile");

        const data = await res.json();

        if (isAuthMismatch(session, data)) {
          forceLogout();
          return;
        }

        if (cancelled) return;

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
          const pr = await fetch(
            `/api/me/notification-preferences/provider?_ts=${Date.now()}`,
            {
              cache: "no-store",
              credentials: "include",
            },
          );

          if (pr.status === 401) {
            forceLogout();
            return;
          }

          const pj = await pr.json().catch(() => ({}));
          if (!cancelled) {
            setNotificationPrefs(
              Array.isArray(pj.notificationPreferences)
                ? pj.notificationPreferences
                : [],
            );
          }
        } catch {
          if (!cancelled) setNotificationPrefs([]);
        }

        try {
          const cr = await fetch(
            `/api/me/practical-notification-preferences/provider?_ts=${Date.now()}`,
            {
              cache: "no-store",
              credentials: "include",
            },
          );

          if (cr.status === 401) {
            forceLogout();
            return;
          }

          const cj = await cr.json().catch(() => ({}));
          if (!cancelled) {
            setCategoryPrefs(
              Array.isArray(cj.practicalNotificationPreferences)
                ? cj.practicalNotificationPreferences
                : [],
            );
          }
        } catch {
          if (!cancelled) setCategoryPrefs([]);
        }
      } catch (e) {
        console.error(e);
        forceLogout();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, session?.userId, session?.companyId, session?.role]);

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
      if (!res.ok) throw new Error(json?.error || "Failed to start 2FA setup");
      setMfaQr(json.qrDataUrl || "");
      setMfaOtpAuth(json.otpauth || "");
      setMfaMsg(
        "Scan the QR code with your authenticator app, then enter the 6-digit code to enable 2FA.",
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
      if (!res.ok) throw new Error(json?.error || "Failed to enable 2FA");
      setMfaEnabled(true);
      if (Array.isArray(json.recoveryCodes))
        setRecoveryCodes(json.recoveryCodes);
      setMfaQr("");
      setMfaOtpAuth("");
      setMfaCode("");
      setMfaMsg("2FA enabled.");
    } catch (e) {
      setMfaErr(e.message);
    } finally {
      setMfaBusy(false);
    }
  };

  const disableMfa = async () => {
    if (!confirm("Disable 2FA for your account?")) return;
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
      if (!res.ok) throw new Error(json?.error || "Failed to disable 2FA");
      setMfaEnabled(false);
      setMfaQr("");
      setMfaOtpAuth("");
      setMfaCode("");
      setMfaMsg("2FA disabled.");
    } catch (e) {
      setMfaErr(e.message);
    } finally {
      setMfaBusy(false);
    }
  };

  if (loading)
    return (
      <AppPage eyebrow="Account" title="My LEXIFY Account">
        <div className="rounded-2xl bg-white px-6 py-12 text-center text-sm text-gray-500 shadow-[0_16px_44px_rgba(17,153,158,0.22)] ring-1 ring-black/10">
          Loading your account…
        </div>
      </AppPage>
    );

  return (
    <AppPage eyebrow="Account" title="My LEXIFY Account">
      {/* My Contact Information */}
      <div className="w-full rounded-2xl bg-white p-6 text-black shadow-[0_16px_44px_rgba(17,153,158,0.22)] ring-1 ring-black/10">
        <AccountHeading icon={Building2} title="My Contact Information" />

        <div className="space-y-5">
          <AccountNestedCard>
            <AccountHeading as="h3" title="My Law Firm" />
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
              <OutlinedField
                label="Law Firm Name"
                value={me?.company?.companyName || me?.companyName}
              />
              <OutlinedField
                label="Business ID (in country of domicile)"
                value={me?.company?.businessId || me?.companyId}
              />
              <OutlinedField
                label="Street Address"
                value={me?.company?.companyAddress || me?.companyAddress}
              />
              <OutlinedField
                label="Postal Code"
                value={me?.company?.companyPostalCode || me?.companyPostalCode}
              />
              <OutlinedField
                label="City"
                value={me?.company?.companyCity || me?.companyCity}
              />
              <OutlinedField
                label="Country of Domicile"
                value={me?.company?.companyCountry || me?.companyCountry}
              />
            </div>
            <div className="mt-5">
              <AccountActionButton icon={Users} onClick={openMembersModal}>
                View All Users
              </AccountActionButton>
            </div>
          </AccountNestedCard>

          <AccountNestedCard>
            <AccountHeading
              as="h3"
              icon={User}
              title="My Account Information"
            />

            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
              <OutlinedField
                label="First Name"
                value={me?.userAccount?.firstName}
                editing={uaEditing}
                inputProps={{
                  value: uaDraft.firstName,
                  onChange: (e) =>
                    setUaDraft((d) => ({ ...d, firstName: e.target.value })),
                }}
              />
              <OutlinedField
                label="Last Name"
                value={me?.userAccount?.lastName}
                editing={uaEditing}
                inputProps={{
                  value: uaDraft.lastName,
                  onChange: (e) =>
                    setUaDraft((d) => ({ ...d, lastName: e.target.value })),
                }}
              />
              <OutlinedField
                label="E-mail"
                value={me?.userAccount?.email}
                editing={uaEditing}
                inputProps={{
                  value: uaDraft.email,
                  onChange: (e) =>
                    setUaDraft((d) => ({ ...d, email: e.target.value })),
                }}
              />
              <OutlinedField
                label="Telephone"
                value={me?.userAccount?.telephone}
                editing={uaEditing}
                inputProps={{
                  value: uaDraft.telephone,
                  onChange: (e) =>
                    setUaDraft((d) => ({ ...d, telephone: e.target.value })),
                }}
              />
            </div>
            <div className="mt-5">
              {!uaEditing ? (
                <AccountActionButton icon={Pencil} onClick={startEditUa}>
                  Edit My Account Information
                </AccountActionButton>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={uaBusy}
                    onClick={saveUa}
                    className="cursor-pointer rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                  >
                    Save Account Information
                  </button>
                  <button
                    type="button"
                    disabled={uaBusy}
                    onClick={cancelEditUa}
                    className="cursor-pointer rounded-lg bg-gray-500 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                  >
                    Cancel Without Saving
                  </button>
                </div>
              )}
            </div>
          </AccountNestedCard>

          <AccountNestedCard>
            <AccountHeading as="h3" icon={Lock} title="Username & Password" />
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
              <OutlinedField
                label="Username"
                value={me?.userAccount?.username || me?.username || username}
              />
            </div>
            <div className="mt-5">
              <AccountActionButton
                icon={Lock}
                onClick={() => router.push("/change-password")}
              >
                Change Password
              </AccountActionButton>
            </div>
          </AccountNestedCard>

          <AccountNestedCard>
            <AccountHeading
              as="h3"
              icon={Shield}
              title="Two-Factor Authentication"
            />
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
              <OutlinedField
                label="Status"
                value={mfaEnabled ? "Enabled" : "Disabled"}
              />
            </div>

            {mfaErr && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {mfaErr}
              </div>
            )}
            {mfaMsg && (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                {mfaMsg}
              </div>
            )}

            {!mfaEnabled && (
              <div className="mt-5">
                <AccountActionButton
                  icon={Shield}
                  disabled={mfaBusy}
                  onClick={startMfaSetup}
                >
                  Set up 2FA (Authenticator App Required)
                </AccountActionButton>

                {mfaQr && (
                  <div className="mt-5 grid grid-cols-1 items-start gap-6 md:grid-cols-2">
                    <div>
                      <p className="mb-3 text-sm font-medium text-gray-800">
                        Scan this QR code
                      </p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={mfaQr}
                        alt="MFA QR code"
                        className="h-64 w-64 rounded-md border border-gray-300 bg-white p-2"
                      />
                      <p className="mt-2 text-xs text-gray-500">
                        If you can&apos;t scan, your authenticator can also
                        accept an otpauth URI.
                      </p>
                      <p className="mt-1 break-all text-xs text-gray-500">
                        {mfaOtpAuth}
                      </p>
                    </div>

                    <div>
                      <OutlinedField
                        label="6-digit code"
                        editing
                        inputProps={{
                          value: mfaCode,
                          onChange: (e) => setMfaCode(e.target.value),
                          placeholder: "123456",
                          inputMode: "numeric",
                          autoComplete: "one-time-code",
                        }}
                      />
                      <div className="mt-4">
                        <AccountActionButton
                          tone="success"
                          showChevron={false}
                          disabled={mfaBusy || !mfaCode.trim()}
                          onClick={enableMfa}
                        >
                          Enable 2FA
                        </AccountActionButton>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {mfaEnabled && (
              <div className="mt-5 max-w-md">
                <p className="mb-4 text-sm text-gray-600">
                  To disable 2FA, confirm with a current 6-digit authenticator
                  code:
                </p>
                <OutlinedField
                  label="6-digit code"
                  editing
                  inputProps={{
                    value: mfaCode,
                    onChange: (e) => setMfaCode(e.target.value),
                    placeholder: "123456",
                    inputMode: "numeric",
                    autoComplete: "one-time-code",
                  }}
                />
                <div className="mt-4">
                  <AccountActionButton
                    tone="danger"
                    showChevron={false}
                    disabled={mfaBusy || !mfaCode.trim()}
                    onClick={disableMfa}
                  >
                    Disable 2FA
                  </AccountActionButton>
                </div>
              </div>
            )}

            {recoveryCodes.length > 0 && (
              <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="mb-2 font-semibold text-gray-800">
                  Recovery codes (save these now)
                </p>
                <p className="mb-3 text-sm text-gray-600">
                  Each code can be used once if you can&apos;t access your
                  authenticator app. They won&apos;t be shown again.
                </p>
                <pre className="whitespace-pre-wrap text-sm text-gray-800">
                  {recoveryCodes.join("\n")}
                </pre>
                <div className="mt-4">
                  <AccountActionButton
                    onClick={async () => {
                      await navigator.clipboard.writeText(
                        recoveryCodes.join("\n"),
                      );
                      alert("Copied recovery codes to clipboard.");
                    }}
                  >
                    Copy recovery codes
                  </AccountActionButton>
                </div>
              </div>
            )}
          </AccountNestedCard>
        </div>
      </div>
      {/* Notification Preferences */}
      <div className="w-full rounded-2xl bg-white p-6 text-black shadow-[0_16px_44px_rgba(17,153,158,0.22)] ring-1 ring-black/10">
        <h2 className="text-2xl font-semibold mb-4">
          Notification Preferences
        </h2>
        <h4 className="text-md">
          LEXIFY can send you email notifications of important developments
          related to the offers you have submitted in response to LEXIFY
          Requests. Please select the notifications you want to receive:
        </h4>
        <br />
        <div className="flex flex-col gap-4">
          <PrefSwitch
            id="prov-all-notifications"
            checked={hasPref("all-notifications")}
            onChange={(e) => setPref("all-notifications", e.target.checked)}
          >
            Firm-wide notifications{" "}
            <NarrowTooltip tooltipText="When enabled, you will receive automatic notifications for all pending offers across your firm, including those of other users and your own." />
          </PrefSwitch>
          <PrefSwitch
            id="prov-no-winning-offer"
            checked={hasPref("no-winning-offer")}
            onChange={(e) => setPref("no-winning-offer", e.target.checked)}
          >
            A pending LEXIFY Request expires and the offer I have submitted is
            not the winning offer
          </PrefSwitch>
          <PrefSwitch
            id="prov-winner-conflict-check"
            checked={hasPref("winner-conflict-check")}
            onChange={(e) =>
              setPref("winner-conflict-check", e.target.checked)
            }
          >
            A pending LEXIFY Request expires and the offer I have submitted is
            the winning offer subject to clearance of remaining conflict
            checks{" "}
            <NarrowTooltip tooltipText="If the LEXIFY Request does not disclose the identities of all relevant parties in the matter, the remaining conflict checks will be performed only with the legal service provider submitting the winning offer. If the legal service provider notifies LEXIFY of an existing conflict, the provider's offer will automatically be disqualified and the client company may select another provider's offer as the winning offer." />
          </PrefSwitch>
          <PrefSwitch
            id="prov-request-cancelled"
            checked={hasPref("request-cancelled")}
            onChange={(e) => setPref("request-cancelled", e.target.checked)}
          >
            A pending LEXIFY Request is cancelled by the client after I have
            submitted an offer
          </PrefSwitch>
          <PrefSwitch
            id="prov-new-available-request"
            checked={hasPref("new-available-request")}
            onChange={(e) =>
              setPref("new-available-request", e.target.checked)
            }
          >
            A new LEXIFY Request has been published and is awaiting offers
          </PrefSwitch>
          {/* Categories dropdown: only visible when "new-available-request" is ON */}
          {hasPref("new-available-request") && (
            <div className="mt-4" ref={categoryDropdownRef}>
              <div className="text-md mb-2">
                Select the areas of law for which you wish to receive
                notifications when new LEXIFY Requests are posted:
              </div>

              <button
                type="button"
                onClick={() => setCategoryDropdownOpen((v) => !v)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm"
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
      </div>
      {/* Invoicing and Payment Methods */}
      <div className="w-full rounded-2xl bg-white p-6 text-black shadow-[0_16px_44px_rgba(17,153,158,0.22)] ring-1 ring-black/10">
        <h2 className="text-2xl font-semibold mb-4">Fees and Invoicing</h2>
        <h4 className="text-md">
          LEXIFY charges a monthly service fee for the use of the LEXIFY
          platform. The amount of the service fee is{" "}
          {me?.company?.invoiceFee ?? me?.invoiceFee ?? 0}% of the total legal
          service sales (VAT 0%) by your law firm via the LEXIFY platform during
          a calendar month. The service fee for an individual calendar month is
          invoiced by LEXIFY during the following calendar month.
        </h4>
        <br />
        <div className="grid grid-cols-2 gap-4">
          <h4 className="text-md font-semibold col-span-2">
            My Law Firm&apos;s Contact Persons for Invoicing
          </h4>
          <div className="col-span-2">
            <table className="w-full border border-gray-300 text-sm">
              <thead className="bg-gray-200">
                <tr className="bg-gray-200 text-gray-700">
                  <th className="border p-2">First Name</th>
                  <th className="border p-2">Last Name</th>
                  <th className="border p-2">Title/Position in Law Firm</th>
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
              className="mt-4 cursor-pointer rounded-lg bg-[#11999e] px-4 py-2 text-white transition-colors hover:bg-[#0e8488] disabled:opacity-50"
            >
              Add New Invoicing Contact
            </button>
          </div>
        </div>

        <br />
      </div>
      <br />
      {membersOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            // close if backdrop clicked
            if (e.target === e.currentTarget) closeMembersModal();
          }}
        >
          <div className="w-full max-w-3xl rounded bg-white text-black shadow-2xl">
            <div className="flex items-center justify-between border-b p-4">
              <h3 className="text-lg font-semibold">Company LEXIFY Users</h3>
              <button
                type="button"
                onClick={closeMembersModal}
                className="px-3 py-1 rounded border cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="p-4">
              {membersLoading ? (
                <div className="text-sm">Loading members…</div>
              ) : membersErr ? (
                <div className="text-sm text-red-700">{membersErr}</div>
              ) : companyMembers.length === 0 ? (
                <div className="text-sm text-gray-600">
                  No members found for your company.
                </div>
              ) : (
                <table className="w-full border border-gray-300 text-sm">
                  <thead className="bg-gray-200">
                    <tr className="bg-gray-200 text-gray-700">
                      <th className="border p-2 text-left">Name</th>
                      <th className="border p-2 text-left">Position</th>
                      <th className="border p-2 text-left">Telephone</th>
                      <th className="border p-2 text-left">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companyMembers.map((m) => (
                      <tr key={String(m.userPkId)}>
                        <td className="border p-2">
                          {`${m.firstName || ""} ${m.lastName || ""}`.trim() ||
                            "-"}
                        </td>
                        <td className="border p-2">{m.position || "-"}</td>
                        <td className="border p-2">{m.telephone || "-"}</td>
                        <td className="border p-2">{m.email || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </AppPage>
  );
}
