"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Pencil, Save, CheckCircle } from "lucide-react";
import NarrowTooltip from "../../components/NarrowTooltip";
import Link from "next/link";

export default function Account() {
  const router = useRouter();
  const dropdownRef = useRef(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isAutomatic, setIsAutomatic] = useState(true);

  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");

  const [contacts, setContacts] = useState([]);
  const [busy, setBusy] = useState(false); // network guard

  // Notifications
  const [notificationPrefs, setNotificationPrefs] = useState([]);

  // Search UI state
  const [bpQuery, setBpQuery] = useState("");
  const [bpResults, setBpResults] = useState([]);
  const [bpSelected, setBpSelected] = useState(null);
  const [bpLoading, setBpLoading] = useState(false);

  // Blocked list state
  const [blockedProviders, setBlockedProviders] = useState([]);

  // Preferred Providers
  const [ppQuery, setPpQuery] = useState("");
  const [ppResults, setPpResults] = useState([]);
  const [ppSelected, setPpSelected] = useState(null);
  const [ppLoading, setPpLoading] = useState(false);

  // Preferred state
  const [preferredProviders, setPreferredProviders] = useState([]);
  const [editingProvider, setEditingProvider] = useState(null);
  const [editAreas, setEditAreas] = useState([]);
  const [ppBusy, setPpBusy] = useState(false); // network guard for edit ops

  // Legal Panel
  const [lpQuery, setLpQuery] = useState("");
  const [lpResults, setLpResults] = useState([]);
  const [lpSelected, setLpSelected] = useState(null);
  const [lpLoading, setLpLoading] = useState(false);
  const [legalPanelProviders, setLegalPanelProviders] = useState([]);

  // MFA
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaQr, setMfaQr] = useState("");
  const [mfaOtpAuth, setMfaOtpAuth] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);
  const [mfaMsg, setMfaMsg] = useState("");
  const [mfaErr, setMfaErr] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState([]);

  // tickbox selection
  const AREAS_OF_LAW = [
    "Help with Contracts",
    "Day-to-day Legal Advice",
    "Help with Employment related Documents",
    "Help with Dispute Resolution or Debt Collection",
    "Help with Mergers & Acquisitions",
    "Help with Corporate Governance",
    "Help with Personal Data Protection",
    "Help with KYC (Know Your Customer) or Compliance related Questionnaire",
    "Legal Training for Management and/or Personnel",
  ];
  const [selectedAreas, setSelectedAreas] = useState([]);

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

  // Notification helpers
  const hasPref = (key) => notificationPrefs.includes(key);

  const setPref = async (key, enabled) => {
    // optimistic UI
    setNotificationPrefs((xs) => {
      const has = xs.includes(key);
      if (enabled && !has) return [...xs, key];
      if (!enabled && has) return xs.filter((k) => k !== key);
      return xs;
    });

    // server call
    const res = await fetch("/api/me/notification-preferences/purchaser", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, enabled }),
    });

    if (!res.ok) {
      // revert on error
      setNotificationPrefs((xs) => {
        if (enabled) return xs.filter((k) => k !== key);
        return Array.from(new Set([...xs, key]));
      });
      return;
    }

    const json = await res.json();
    setNotificationPrefs(
      Array.isArray(json.notificationPreferences)
        ? json.notificationPreferences
        : [],
    );
  };

  useEffect(() => {
    const onDocClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setDropdownOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

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
        setIsAutomatic(
          (data.winningOfferSelection || "automatic") === "automatic",
        );
        const blocked = Array.isArray(data.blockedServiceProviders)
          ? data.blockedServiceProviders
          : [];
        setBlockedProviders(blocked);
        setPreferredProviders(
          Array.isArray(data.preferredLegalServiceProviders)
            ? data.preferredLegalServiceProviders
            : [],
        );
        setLegalPanelProviders(
          Array.isArray(data.legalPanelServiceProviders)
            ? data.legalPanelServiceProviders
            : [],
        );

        // fetch notification preferences
        try {
          const pr = await fetch("/api/me/notification-preferences/purchaser", {
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
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // --- helpers (replace your current helpers with these) ---

  const updateContact = (id, field, value) =>
    setContacts((xs) =>
      xs.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    );

  const toggleAllNotifications = async (id, checked) => {
    // Optimistic UI
    const next = contacts.map((c) =>
      c.id === id ? { ...c, allNotifications: checked } : c,
    );
    setContacts(next);

    // Persist immediately
    try {
      await saveContacts(next);
    } catch (e) {
      // Revert on error
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

  // Search Function
  const searchProviders = async (q) => {
    setBpQuery(q);
    setBpSelected(null);
    if (!q.trim()) {
      setBpResults([]);
      return;
    }
    setBpLoading(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`, {
        cache: "no-store",
      });
      const rows = await res.json();
      setBpResults(Array.isArray(rows) ? rows : []);
    } catch {
      setBpResults([]);
    } finally {
      setBpLoading(false);
    }
  };

  // Search Handlers
  const blockSelectedProvider = async () => {
    if (!bpSelected?.companyName)
      return alert("Please select a provider to block.");
    if (blockedProviders.includes(bpSelected.companyName))
      return alert("Provider is already blocked.");

    try {
      const res = await fetch("/api/me/blocked-providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: bpSelected.companyName }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to block provider");
      setBlockedProviders(json.blockedServiceProviders || []);
      setBpSelected(null);
      setBpQuery("");
      setBpResults([]);
    } catch (e) {
      alert(e.message);
    }
  };

  const unblockProvider = async (name) => {
    try {
      const res = await fetch(
        `/api/me/blocked-providers?companyName=${encodeURIComponent(name)}`,
        {
          method: "DELETE",
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to unblock provider");
      setBlockedProviders(json.blockedServiceProviders || []);
    } catch (e) {
      alert(e.message);
    }
  };

  const searchPreferredProviders = async (q) => {
    setPpQuery(q);
    setPpSelected(null);
    if (!q.trim()) {
      setPpResults([]);
      return;
    }
    setPpLoading(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`, {
        cache: "no-store",
      });
      const rows = await res.json();
      setPpResults(Array.isArray(rows) ? rows : []);
    } catch {
      setPpResults([]);
    } finally {
      setPpLoading(false);
    }
  };

  const assignPreferredProvider = async () => {
    if (!ppSelected?.companyName) return alert("Select a provider.");
    if (selectedAreas.length === 0)
      return alert("Choose at least one area of law.");

    try {
      const res = await fetch("/api/me/preferred-providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: ppSelected.companyName,
          areasOfLaw: selectedAreas,
        }),
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json?.error || "Failed to assign preferred provider");
      setPreferredProviders(json.preferredLegalServiceProviders || []);
      setPpSelected(null);
      setPpQuery("");
      setPpResults([]);
      setSelectedAreas([]);
    } catch (e) {
      alert(e.message);
    }
  };

  const unassignPreferredProvider = async (name) => {
    try {
      const res = await fetch(
        `/api/me/preferred-providers?companyName=${encodeURIComponent(name)}`,
        { method: "DELETE" },
      );
      const json = await res.json();
      if (!res.ok)
        throw new Error(json?.error || "Failed to unassign provider");
      setPreferredProviders(json.preferredLegalServiceProviders || []);
    } catch (e) {
      alert(e.message);
    }
  };

  // Preferred Provider area editing
  const startEdit = (provider) => {
    setEditingProvider(provider.companyName);
    setEditAreas(provider.areasOfLaw ?? []);
  };

  const cancelEdit = () => {
    setEditingProvider(null);
    setEditAreas([]);
  };

  const toggleEditArea = (area, checked) => {
    setEditAreas((xs) =>
      checked ? [...xs, area] : xs.filter((a) => a !== area),
    );
  };

  const saveEditedAreas = async (companyName) => {
    if (!editAreas.length) {
      alert("Choose at least one area of law.");
      return;
    }
    setPpBusy(true);
    try {
      const res = await fetch("/api/me/preferred-providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, areasOfLaw: editAreas }),
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json?.error || "Failed to update preferred areas.");

      // Update list from server response and exit edit mode
      setPreferredProviders(json.preferredLegalServiceProviders || []);
      cancelEdit();
    } catch (e) {
      alert(e.message);
    } finally {
      setPpBusy(false);
    }
  };

  // Legal Panel Search
  const searchLegalPanel = async (q) => {
    setLpQuery(q);
    setLpSelected(null);
    if (!q.trim()) {
      setLpResults([]);
      return;
    }
    setLpLoading(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`, {
        cache: "no-store",
      });
      const rows = await res.json();
      setLpResults(Array.isArray(rows) ? rows : []);
    } catch {
      setLpResults([]);
    } finally {
      setLpLoading(false);
    }
  };

  // Legal Panel Handlers
  const addToLegalPanel = async () => {
    if (!lpSelected?.companyName) return alert("Please select a provider.");
    if (legalPanelProviders.includes(lpSelected.companyName))
      return alert("Provider is already in your panel.");

    try {
      const res = await fetch("/api/me/legal-panel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: lpSelected.companyName }),
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json?.error || "Failed to add provider to panel");
      setLegalPanelProviders(json.legalPanelServiceProviders || []);
      setLpSelected(null);
      setLpQuery("");
      setLpResults([]);
    } catch (e) {
      alert(e.message);
    }
  };

  const removeFromLegalPanel = async (name) => {
    try {
      const res = await fetch(
        `/api/me/legal-panel?companyName=${encodeURIComponent(name)}`,
        { method: "DELETE" },
      );
      const json = await res.json();
      if (!res.ok)
        throw new Error(json?.error || "Failed to remove provider from panel");
      setLegalPanelProviders(json.legalPanelServiceProviders || []);
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) {
    return <div className="p-6">Loading your account…</div>;
  }

  // Result row with hover + selected visuals and keyboard support
  const ResultRow = ({ item, isSelected, onSelect }) => (
    <div
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      onClick={() => onSelect(item)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect(item);
      }}
      className={[
        "group relative p-2 text-sm cursor-pointer select-none",
        "transition-all duration-150 ease-out",
        "hover:bg-[#f3f8f8] hover:pl-3 active:scale-[.99]",
        isSelected
          ? "bg-[#e6f7f7] ring-2 ring-[#11999e] ring-offset-1 border-l-4 border-[#11999e]"
          : "border-l-4 border-transparent",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <div className={`font-medium ${isSelected ? "text-[#0b6d70]" : ""}`}>
          {item.companyName || "(no company name)"}
        </div>
        {isSelected && <CheckCircle size={16} className="text-[#11999e]" />}
      </div>
    </div>
  );

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
        body: JSON.stringify({ code: mfaCode }),
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
        body: JSON.stringify({ code: mfaCode }),
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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <h1 className="text-3xl font-bold mb-6">My LEXIFY Account</h1>

      {/* My Contact Information */}
      <div className="w-full max-w-6xl p-6 rounded bg-white text-black">
        {/* My Contact Information */}
        <div className="w-full max-w-6xl p-6 rounded bg-white text-black">
          <h2 className="text-2xl font-semibold mb-4">
            My Contact Information
          </h2>

          {/* Company information */}
          <div className="grid grid-cols-2 gap-4">
            <h4 className="text-md font-semibold col-span-2">
              My Company Information
            </h4>

            <div className="w-full text-sm border p-2">
              Company Name: {me?.company?.companyName || me?.companyName || "-"}
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

          <div className="mt-4">
            <button
              type="button"
              onClick={openMembersModal}
              className="bg-[#11999e] text-white px-4 py-2 rounded cursor-pointer"
            >
              Show a List of All Company LEXIFY Members
            </button>
          </div>

          <br />

          {/* UserAccount information */}
          <div className="grid grid-cols-2 gap-4">
            <h4 className="text-md font-semibold col-span-2">
              My Account Information
            </h4>

            <div className="w-full text-sm border p-2 flex items-center gap-2">
              <span className="whitespace-nowrap">First Name:</span>
              {uaEditing ? (
                <input
                  className="border p-1 flex-1"
                  value={uaDraft.firstName}
                  onChange={(e) =>
                    setUaDraft((d) => ({ ...d, firstName: e.target.value }))
                  }
                />
              ) : (
                <span>{me?.userAccount?.firstName || "-"}</span>
              )}
            </div>

            <div className="w-full text-sm border p-2 flex items-center gap-2">
              <span className="whitespace-nowrap">Last Name:</span>
              {uaEditing ? (
                <input
                  className="border p-1 flex-1"
                  value={uaDraft.lastName}
                  onChange={(e) =>
                    setUaDraft((d) => ({ ...d, lastName: e.target.value }))
                  }
                />
              ) : (
                <span>{me?.userAccount?.lastName || "-"}</span>
              )}
            </div>

            <div className="w-full text-sm border p-2 flex items-center gap-2">
              <span className="whitespace-nowrap">E-mail:</span>
              {uaEditing ? (
                <input
                  className="border p-1 flex-1"
                  value={uaDraft.email}
                  onChange={(e) =>
                    setUaDraft((d) => ({ ...d, email: e.target.value }))
                  }
                />
              ) : (
                <span>{me?.userAccount?.email || "-"}</span>
              )}
            </div>

            <div className="w-full text-sm border p-2 flex items-center gap-2">
              <span className="whitespace-nowrap">Telephone:</span>
              {uaEditing ? (
                <input
                  className="border p-1 flex-1"
                  value={uaDraft.telephone}
                  onChange={(e) =>
                    setUaDraft((d) => ({ ...d, telephone: e.target.value }))
                  }
                />
              ) : (
                <span>{me?.userAccount?.telephone || "-"}</span>
              )}
            </div>

            <div className="mt-4">
              {!uaEditing ? (
                <button
                  type="button"
                  onClick={startEditUa}
                  className="bg-[#11999e] text-white px-4 py-2 rounded cursor-pointer"
                >
                  Edit My Account Information
                </button>
              ) : (
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={uaBusy}
                    onClick={saveUa}
                    className="bg-green-600 text-white px-4 py-2 rounded cursor-pointer disabled:opacity-50"
                  >
                    Save Account Information
                  </button>
                  <button
                    type="button"
                    disabled={uaBusy}
                    onClick={cancelEditUa}
                    className="bg-gray-500 text-white px-4 py-2 rounded cursor-pointer disabled:opacity-50"
                  >
                    Cancel Without Saving
                  </button>
                </div>
              )}
            </div>
          </div>

          <br />

          <br />

          {/* Username & Password (keep, but read username from userAccount/aliases) */}
          <div className="grid grid-cols-2 gap-4">
            <h4 className="text-md font-semibold col-span-2">
              Username & Password
            </h4>

            <div className="col-span-2">
              <div className="w-1/3 text-sm border p-2">
                Username: {me?.userAccount?.username || me?.username || "-"}
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
            <br />
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

            {mfaErr && (
              <div className="mb-3 text-sm text-red-700">{mfaErr}</div>
            )}
            {mfaMsg && (
              <div className="mb-3 text-sm text-green-700">{mfaMsg}</div>
            )}
            <br />
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
                  <div className="mt-4 grid grid-cols-2 gap-6 items-start">
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
                        If you can&apos;t scan, your authenticator can also
                        accept an otpauth URI.
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
                  className="mt-3 bg-[#11999e] text-white px-4 py-2 rounded"
                  onClick={async () => {
                    await navigator.clipboard.writeText(
                      recoveryCodes.join("\n"),
                    );
                    alert("Copied recovery codes to clipboard.");
                  }}
                >
                  Copy recovery codes
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <br />
      {/* Notifications */}
      <div className="w-full max-w-6xl p-6 rounded shadow-2xl bg-white text-black">
        <h2 className="text-2xl font-semibold mb-4">
          Notification Preferences
        </h2>
        <h4 className="text-md">
          LEXIFY can send you email notifications of important developments
          related to your LEXIFY Requests. Please select the notifications you
          want to receive:
        </h4>
        <br />
        <div className="flex flex-col gap-4">
          {/* 0) all-notifications */}
          <label
            htmlFor="pref-all-notifications"
            className="inline-flex items-center cursor-pointer"
          >
            <input
              id="pref-all-notifications"
              type="checkbox"
              className="sr-only"
              checked={hasPref("all-notifications")}
              onChange={(e) => setPref("all-notifications", e.target.checked)}
            />
            <div
              className={`relative w-11 h-6 rounded-full transition-colors ${
                hasPref("all-notifications") ? "bg-green-600" : "bg-gray-700"
              }`}
            >
              <div
                className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-transform ${
                  hasPref("all-notifications") ? "translate-x-full" : ""
                }`}
              />
            </div>
            <span className="ms-3 text-sm text-black dark:text-black">
              Receive Notifications for All Company Members
            </span>
          </label>
          {/* 1) No qualifying offers */}
          <label
            htmlFor="pref-no_offers"
            className="inline-flex items-center cursor-pointer"
          >
            <input
              id="pref-no_offers"
              type="checkbox"
              className="sr-only"
              checked={hasPref("no_offers")}
              onChange={(e) => setPref("no_offers", e.target.checked)}
            />
            <div
              className={`relative w-11 h-6 rounded-full transition-colors ${
                hasPref("no_offers") ? "bg-green-600" : "bg-gray-700"
              }`}
            >
              <div
                className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-transform ${
                  hasPref("no_offers") ? "translate-x-full" : ""
                }`}
              />
            </div>
            <span className="ms-3 text-sm text-black dark:text-black">
              My LEXIFY Request expires and I have received no qualifying offers
            </span>
          </label>
          {/* 2) Best offer over max price */}
          <label
            htmlFor="pref-over_max_price"
            className="inline-flex items-center cursor-pointer"
          >
            <input
              id="pref-over_max_price"
              type="checkbox"
              className="sr-only"
              checked={hasPref("over_max_price")}
              onChange={(e) => setPref("over_max_price", e.target.checked)}
            />
            <div
              className={`relative w-11 h-6 rounded-full transition-colors ${
                hasPref("over_max_price") ? "bg-green-600" : "bg-gray-700"
              }`}
            >
              <div
                className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-transform ${
                  hasPref("over_max_price") ? "translate-x-full" : ""
                }`}
              />
            </div>
            <span className="ms-3 text-sm text-black dark:text-black">
              My LEXIFY Request expires and qualifying offers have been
              received, but the best offer exceeds the maximum price in my
              LEXIFY Request{" "}
              <NarrowTooltip tooltipText="Whenever your LEXIFY Request expires and you receive at least one qualifying offer but the offer exceeds the maximum price you have set in the LEXIFY Request, you will still have 72 hours from the expiration of your LEXIFY Request to accept this best offer if you wish to do so. If not accepted within 72 hours, the best offer exceeding your maximum price will automatically be rejected." />
            </span>
          </label>
          {/* 3) Pending offer selection (manual) */}
          <label
            htmlFor="pref-pending_offer_selection"
            className="inline-flex items-center cursor-pointer"
          >
            <input
              id="pref-pending_offer_selection"
              type="checkbox"
              className="sr-only"
              checked={hasPref("pending_offer_selection")}
              onChange={(e) =>
                setPref("pending_offer_selection", e.target.checked)
              }
            />
            <div
              className={`relative w-11 h-6 rounded-full transition-colors ${
                hasPref("pending_offer_selection")
                  ? "bg-green-600"
                  : "bg-gray-700"
              }`}
            >
              <div
                className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-transform ${
                  hasPref("pending_offer_selection") ? "translate-x-full" : ""
                }`}
              />
            </div>
            <span className="ms-3 text-sm text-black dark:text-black">
              My LEXIFY Request expires, qualifying offers have been received
              and I need to select the winning service provider{" "}
            </span>
          </label>
        </div>
      </div>
      <br />
      {/* Blocked Lexify Service Providers */}
      <div className="w-full max-w-6xl p-6 rounded shadow-2xl bg-white text-black">
        <h2 className="text-2xl font-semibold mb-4">
          Legal Service Provider Management
        </h2>
        <h4 className="text-md font-semibold">
          Blocked Legal Service Providers
        </h4>
        <h4 className="text-md">
          Have you had a negative experience with a specific legal service
          provider? Don&apos;t worry - you can block that service provider from
          seeing any LEXIFY Requests you submit. Simply enter the name of the
          legal service provider in the search field below, click the name of
          the service provider and then click &quot;Block Service
          Provider&quot;. If you later want to unblock any previously blocked
          legal service provider, just click the “Unblock Service Provider”
          button next to the name of the service provider to remove it from the
          list of blocked legal service providers.{" "}
          <NarrowTooltip tooltipText="If you do not find a specific legal service provider when entering its name below, that legal service provider is not yet a registered user of LEXIFY. " />
        </h4>
        <br />
        <input
          type="text"
          className="border border-lg rounded bg-[#11999e] p-2 w-full"
          placeholder="Search by legal service provider name..."
          value={bpQuery}
          onChange={(e) => searchProviders(e.target.value)}
        />
        {/* Results dropdown */}
        {bpQuery && (
          <div className="border mt-2 max-h-56 overflow-auto bg-white">
            {bpLoading ? (
              <div className="p-2 text-sm text-gray-500">Searching…</div>
            ) : bpResults.length === 0 ? (
              <div className="p-2 text-sm text-gray-500">
                No matching provider found.
              </div>
            ) : (
              bpResults.map((r) => (
                <ResultRow
                  key={String(r.userId)}
                  item={r}
                  isSelected={bpSelected?.userId === r.userId}
                  onSelect={setBpSelected}
                />
              ))
            )}
          </div>
        )}
        <br />
        <button
          className="mt-3 bg-[#11999e] text-white px-4 py-2 rounded cursor-pointer disabled:opacity-50"
          onClick={blockSelectedProvider}
          disabled={!bpSelected}
        >
          Block Service Provider
        </button>

        {/* Blocked list table */}
        <div className="mt-6">
          <h3 className="text-md font-semibold mb-2">
            Currently Blocked Legal Service Providers
          </h3>
          {blockedProviders.length === 0 ? (
            <div className="text-sm text-gray-500">
              You have not blocked any legal service providers.
            </div>
          ) : (
            <table className="w-full border border-gray-300 text-sm">
              <thead className="bg-gray-200">
                <tr className="bg-[#3a3a3c] text-white">
                  <th className="border p-2 text-left">
                    Legal Service Provider Company Name
                  </th>
                  <th className="border p-2">Unblock Service Provider</th>
                </tr>
              </thead>
              <tbody>
                {blockedProviders.map((name) => (
                  <tr key={name}>
                    <td className="border p-2">{name}</td>
                    <td className="border p-2 text-center">
                      <button
                        className="bg-green-600 text-white px-3 py-1 rounded cursor-pointer"
                        onClick={() => unblockProvider(name)}
                      >
                        Unblock Service Provider
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <br />
        <hr />
        <br />
        <h4 className="text-md font-semibold">
          Preferred Legal Service Providers
        </h4>
        <h4 className="text-md">
          Do you have one or more legal service providers that you would like to
          be able to see your LEXIFY Requests even when they don&apos;t meet the
          criteria of a specific request (for example, if they are a smaller law
          firm than what you normally require)? Not a problem! You can designate
          any legal service provider as a preferred provider, allowing them to
          review all your LEXIFY Requests in the selected areas of law. Simply
          enter the provider&apos;s name in the search field below, click their
          name, select the areas of law you want them to have preferred provider
          status in, and then click &quot;Assign Preferred Status.&quot; You can
          edit a provider&apos;s preferred status using the &quot;Select Areas
          of Law&quot; button (remember to click &quot;Save&quot; afterward). If
          you later want to remove the preferred provider status entirely, just
          click the &quot;Unassign Preferred Status&quot; button next to the
          provider&apos;s name.{" "}
          <NarrowTooltip tooltipText="If you do not find a specific legal service provider when entering its name below, that legal service provider is not yet a registered user of LEXIFY. " />
        </h4>
        <br />
        <input
          type="text"
          className="border border-lg rounded bg-[#11999e] p-2 w-full"
          placeholder="Search by legal service provider name..."
          value={ppQuery}
          onChange={(e) => searchPreferredProviders(e.target.value)}
        />
        {/* Results dropdown */}
        {ppQuery && (
          <div className="border mt-2 max-h-56 overflow-auto bg-white">
            {ppLoading ? (
              <div className="p-2 text-sm text-gray-500">Searching…</div>
            ) : ppResults.length === 0 ? (
              <div className="p-2 text-sm text-gray-500">
                No matching provider found.
              </div>
            ) : (
              ppResults.map((r) => (
                <ResultRow
                  key={String(r.userId)}
                  item={r}
                  isSelected={ppSelected?.userId === r.userId}
                  onSelect={setPpSelected}
                />
              ))
            )}
          </div>
        )}
        <br />
        {/* Tickbox area selection */}
        {ppSelected && (
          <div className="mt-3 p-2 border bg-gray-50">
            <h4 className="font-semibold mb-2">Select areas of law:</h4>
            <div className="grid grid-cols-2 gap-2">
              {AREAS_OF_LAW.map((area) => (
                <label key={area} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedAreas.includes(area)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedAreas((xs) => [...xs, area]);
                      } else {
                        setSelectedAreas((xs) => xs.filter((a) => a !== area));
                      }
                    }}
                  />
                  <span>{area}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <button
          className="mt-3 bg-[#11999e] text-white px-4 py-2 rounded cursor-pointer disabled:opacity-50"
          onClick={assignPreferredProvider}
          disabled={!ppSelected || selectedAreas.length === 0}
        >
          Assign Preferred Status
        </button>

        <div className="mt-6">
          <h3 className="text-md font-semibold mb-2">
            Currently Preferred Legal Service Providers
          </h3>
          {preferredProviders.length === 0 ? (
            <div className="text-sm text-gray-500">
              You have not assigned any preferred legal service providers.
            </div>
          ) : (
            <table className="w-full border border-gray-300 text-sm">
              <thead className="bg-gray-200">
                <tr className="bg-[#3a3a3c] text-white">
                  <th className="border p-2 text-center">
                    Provider Company Name
                  </th>
                  <th className="border p-2 text-center">
                    Preferred Areas of Law
                  </th>
                  <th className="border p-2">Select Areas of Law</th>
                  <th className="border p-2">Unassign Preferred Status</th>
                </tr>
              </thead>
              <tbody>
                {preferredProviders.map((p) => {
                  const isEditing = editingProvider === p.companyName;
                  return (
                    <tr key={p.companyName}>
                      <td className="border p-2">{p.companyName}</td>

                      <td className="border p-2">
                        {isEditing ? (
                          <div className="grid grid-cols-2 gap-2">
                            {AREAS_OF_LAW.map((area) => (
                              <label
                                key={area}
                                className="flex items-center space-x-2"
                              >
                                <input
                                  type="checkbox"
                                  checked={editAreas.includes(area)}
                                  onChange={(e) =>
                                    toggleEditArea(area, e.target.checked)
                                  }
                                />
                                <span>{area}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          (p.areasOfLaw || []).join(", ")
                        )}
                      </td>

                      <td className="border p-2 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              disabled={ppBusy}
                              className="bg-green-600 text-white px-3 py-1 rounded disabled:opacity-50 cursor-pointer"
                              onClick={() => saveEditedAreas(p.companyName)}
                            >
                              Save
                            </button>
                            <button
                              disabled={ppBusy}
                              className="bg-gray-400 text-white px-3 py-1 rounded disabled:opacity-50 cursor-pointer"
                              onClick={cancelEdit}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              className="bg-blue-600 text-white px-3 py-1 rounded cursor-pointer"
                              onClick={() => startEdit(p)}
                            >
                              Select Areas of Law
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="border p-2 text-center">
                        <button
                          className="bg-red-600 text-white px-3 py-1 rounded cursor-pointer"
                          onClick={() =>
                            unassignPreferredProvider(p.companyName)
                          }
                        >
                          Unassign Preferred Status
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <br />
        <hr />
        <br />
        {/* Legal Panel Service Providers */}
        <h2 className="text-md font-semibold">Legal Panel Service Providers</h2>
        <h4 className="text-md">
          Do you prefer to buy all your legal services on LEXIFY from a fixed
          group of specific legal service providers? This is easy to do: you can
          designate such legal service providers to be legal panel service
          providers. Thereafter, only these service providers will be able to
          review your LEXIFY Requests. To assign legal panel service provider
          status to a specific service provider, enter the name of the relevant
          legal service provider in the search field below, click the name of
          the service provider and then click &quot;Assign Legal Panel
          Status&quot;. If you later want to remove the legal panel service
          provider status from a legal service provider, just click the
          &quot;Unassign Legal Panel Status&quot; button next to the name of
          that legal service provider. Note that as long as even one service
          provider has the legal panel service provider status active, no
          service provider without the legal panel service provider status will
          be able to review any of your pending LEXIFY Requests.{" "}
          <NarrowTooltip tooltipText="If you do not find a specific legal service provider when entering its name below, that legal service provider is not yet a registered user of LEXIFY. " />
        </h4>
        <br />
        <input
          type="text"
          className="border border-lg rounded bg-[#11999e] p-2 w-full"
          placeholder="Search by legal service provider name..."
          value={lpQuery}
          onChange={(e) => searchLegalPanel(e.target.value)}
        />

        {lpQuery && (
          <div className="border mt-2 max-h-56 overflow-auto bg-white">
            {lpLoading ? (
              <div className="p-2 text-sm text-gray-500">Searching…</div>
            ) : lpResults.length === 0 ? (
              <div className="p-2 text-sm text-gray-500">
                No matching provider found.
              </div>
            ) : (
              lpResults.map((r) => (
                <ResultRow
                  key={String(r.userId)}
                  item={r}
                  isSelected={lpSelected?.userId === r.userId}
                  onSelect={setLpSelected}
                />
              ))
            )}
          </div>
        )}

        <button
          className="mt-3 bg-[#11999e] text-white px-4 py-2 rounded cursor-pointer disabled:opacity-50"
          onClick={addToLegalPanel}
          disabled={!lpSelected}
        >
          Assign Legal Panel Status
        </button>

        <div className="mt-6">
          <h3 className="text-md font-semibold mb-2">Current Panel</h3>
          {legalPanelProviders.length === 0 ? (
            <div className="text-sm text-gray-500">
              You have not assigned any legal panel service providers.
            </div>
          ) : (
            <table className="w-full border border-gray-300 text-sm">
              <thead className="bg-gray-200">
                <tr className="bg-[#3a3a3c] text-white">
                  <th className="border p-2 text-left">
                    Provider Company Name
                  </th>
                  <th className="border p-2">Unassign Legal Panel Status</th>
                </tr>
              </thead>
              <tbody>
                {legalPanelProviders.map((name) => (
                  <tr key={name}>
                    <td className="border p-2">{name}</td>
                    <td className="border p-2 text-center">
                      <button
                        className="bg-red-600 text-white px-3 py-1 rounded cursor-pointer"
                        onClick={() => removeFromLegalPanel(name)}
                      >
                        Unassign Legal Panel Status
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <br />
      <div className="w-full max-w-6xl p-6 rounded shadow-2xl bg-white text-black">
        <h2 className="text-2xl font-semibold mb-4">
          LEXIFY Legal Terms and Conditions
        </h2>
        <h4 className="text-md">
          By using LEXIFY to purchase legal services, you confirm you
          understand, accept and comply with the following terms and conditions
          governing the use of the LEXIFY platform and individual LEXIFY
          Contracts entered into by legal service purchasers and legal service
          providers on the LEXIFY platform, as applicable and as such terms and
          conditions may be amended from time to time:
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
      {membersOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            // close if backdrop clicked
            if (e.target === e.currentTarget) closeMembersModal();
          }}
        >
          <div className="w-full max-w-3xl rounded bg-white text-black shadow-2xl">
            <div className="flex items-center justify-between border-b p-4">
              <h3 className="text-lg font-semibold">Company LEXIFY Members</h3>
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
                    <tr className="bg-[#3a3a3c] text-white">
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
    </div>
  );
}
