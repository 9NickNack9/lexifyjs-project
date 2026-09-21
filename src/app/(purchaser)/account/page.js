"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import {
  Pencil,
  Save,
  Building2,
  User,
  Lock,
  Users,
  Shield,
  Info,
  Trash2,
} from "lucide-react";
import NarrowTooltip from "../../components/NarrowTooltip";
import Link from "next/link";
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
  const [bpPickerOpen, setBpPickerOpen] = useState(false);
  const [bpAllProviders, setBpAllProviders] = useState([]);
  const [bpPickedNames, setBpPickedNames] = useState([]);
  const [bpProvidersLoading, setBpProvidersLoading] = useState(false);
  const [bpPickerFilter, setBpPickerFilter] = useState("");
  const [bpBusy, setBpBusy] = useState(false);

  // Blocked list state
  const [blockedProviders, setBlockedProviders] = useState([]);

  // Preferred Providers
  const [ppPickerOpen, setPpPickerOpen] = useState(false);
  const [ppAllProviders, setPpAllProviders] = useState([]);
  const [ppSelectedName, setPpSelectedName] = useState("");
  const [ppProvidersLoading, setPpProvidersLoading] = useState(false);
  const [ppPickerFilter, setPpPickerFilter] = useState("");

  // Preferred state
  const [preferredProviders, setPreferredProviders] = useState([]);
  const [editingProvider, setEditingProvider] = useState(null);
  const [editAreas, setEditAreas] = useState([]);
  const [ppBusy, setPpBusy] = useState(false); // network guard for edit ops

  // Legal Panel Groups
  const [legalPanelGroups, setLegalPanelGroups] = useState([]);
  const [newPanelName, setNewPanelName] = useState("");
  const [renamingGroupId, setRenamingGroupId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [lpBusy, setLpBusy] = useState(false);
  const [lpPickerGroupId, setLpPickerGroupId] = useState(null);
  const [lpAllProviders, setLpAllProviders] = useState([]);
  const [lpPickedNames, setLpPickedNames] = useState([]);
  const [lpProvidersLoading, setLpProvidersLoading] = useState(false);
  const [lpPickerFilter, setLpPickerFilter] = useState("");

  // MFA
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaQr, setMfaQr] = useState("");
  const [mfaOtpAuth, setMfaOtpAuth] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaBusy, setMfaBusy] = useState(false);
  const [mfaMsg, setMfaMsg] = useState("");
  const [mfaErr, setMfaErr] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState([]);

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

  // tickbox selection
  const AREAS_OF_LAW = [
    "Help with Contracts",
    "Day-to-day Legal Advice",
    "Help with Employment related Documents",
    "Help with Dispute Resolution or Debt Collection",
    "Help with Mergers & Acquisitions",
    "Help with Corporate Governance",
    "Help with Personal Data Protection",
    "Help with Banking & Finance Matters",
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
        const nextGroups = Array.isArray(data.legalPanelGroups)
          ? data.legalPanelGroups
          : [];
        setLegalPanelGroups(nextGroups);

        try {
          const pr = await fetch(
            `/api/me/notification-preferences/purchaser?_ts=${Date.now()}`,
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

  const parseProviderRows = (rows) =>
    Array.isArray(rows)
      ? rows
          .map((row) => ({
            companyId: row.companyId || row.userId || row.companyName,
            companyName: (row.companyName || "").trim(),
          }))
          .filter((row) => row.companyName)
      : [];

  const loadAllProviders = async (setProviders, setLoading) => {
    setLoading(true);
    try {
      const res = await fetch("/api/providers/search?all=1", {
        cache: "no-store",
      });
      const rows = await res.json().catch(() => []);
      setProviders(parseProviderRows(rows));
    } catch {
      setProviders([]);
    } finally {
      setLoading(false);
    }
  };

  const openBlockedPicker = async () => {
    setBpPickerOpen(true);
    setBpPickedNames([]);
    setBpPickerFilter("");
    await loadAllProviders(setBpAllProviders, setBpProvidersLoading);
  };

  const closeBlockedPicker = () => {
    setBpPickerOpen(false);
    setBpPickedNames([]);
    setBpPickerFilter("");
  };

  const toggleBlockedPick = (companyName, checked) => {
    setBpPickedNames((current) => {
      if (checked) {
        if (
          current.some(
            (name) => name.toLowerCase() === companyName.toLowerCase(),
          )
        ) {
          return current;
        }
        return [...current, companyName];
      }
      return current.filter(
        (name) => name.toLowerCase() !== companyName.toLowerCase(),
      );
    });
  };

  const blockSelectedProviders = async () => {
    if (bpPickedNames.length === 0)
      return alert("Please select at least one provider.");

    setBpBusy(true);
    try {
      const res = await fetch("/api/me/blocked-providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyNames: bpPickedNames }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to block providers");
      setBlockedProviders(json.blockedServiceProviders || []);
      closeBlockedPicker();
    } catch (e) {
      alert(e.message);
    } finally {
      setBpBusy(false);
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

  const openPreferredPicker = async () => {
    setPpPickerOpen(true);
    setPpSelectedName("");
    setSelectedAreas([]);
    setPpPickerFilter("");
    await loadAllProviders(setPpAllProviders, setPpProvidersLoading);
  };

  const closePreferredPicker = () => {
    setPpPickerOpen(false);
    setPpSelectedName("");
    setSelectedAreas([]);
    setPpPickerFilter("");
  };

  const assignPreferredProvider = async () => {
    if (!ppSelectedName) return alert("Select a provider.");
    if (selectedAreas.length === 0)
      return alert("Choose at least one area of law.");

    setPpBusy(true);
    try {
      const res = await fetch("/api/me/preferred-providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: ppSelectedName,
          areasOfLaw: selectedAreas,
        }),
      });
      const json = await res.json();
      if (!res.ok)
        throw new Error(json?.error || "Failed to assign preferred provider");
      setPreferredProviders(json.preferredLegalServiceProviders || []);
      closePreferredPicker();
    } catch (e) {
      alert(e.message);
    } finally {
      setPpBusy(false);
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

  const applyLegalPanelGroups = (groups) => {
    setLegalPanelGroups(Array.isArray(groups) ? groups : []);
  };

  const closeLegalPanelPicker = () => {
    setLpPickerGroupId(null);
    setLpPickedNames([]);
    setLpPickerFilter("");
  };

  const openLegalPanelPicker = async (group) => {
    setLpPickerGroupId(group.id);
    setLpPickedNames([]);
    setLpPickerFilter("");
    await loadAllProviders(setLpAllProviders, setLpProvidersLoading);
  };

  const togglePickedProvider = (companyName, checked) => {
    setLpPickedNames((current) => {
      if (checked) {
        if (
          current.some(
            (name) => name.toLowerCase() === companyName.toLowerCase(),
          )
        ) {
          return current;
        }
        return [...current, companyName];
      }
      return current.filter(
        (name) => name.toLowerCase() !== companyName.toLowerCase(),
      );
    });
  };

  const createLegalPanelGroup = async () => {
    const name = newPanelName.trim();
    if (!name) return alert("Please enter a name for the legal panel group.");
    setLpBusy(true);
    try {
      const res = await fetch("/api/me/legal-panel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(json?.error || "Failed to create legal panel group");
      applyLegalPanelGroups(json.legalPanelGroups || []);
      setNewPanelName("");
    } catch (e) {
      alert(e.message);
    } finally {
      setLpBusy(false);
    }
  };

  const addSelectedProvidersToGroup = async () => {
    if (!lpPickerGroupId) return;
    if (lpPickedNames.length === 0) {
      return alert("Please select at least one provider.");
    }

    setLpBusy(true);
    try {
      const res = await fetch("/api/me/legal-panel", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: lpPickerGroupId,
          companyNames: lpPickedNames,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(json?.error || "Failed to add providers to group");
      applyLegalPanelGroups(json.legalPanelGroups || []);
      closeLegalPanelPicker();
    } catch (e) {
      alert(e.message);
    } finally {
      setLpBusy(false);
    }
  };

  const removeFromLegalPanelGroup = async (groupId, companyName) => {
    setLpBusy(true);
    try {
      const res = await fetch(
        `/api/me/legal-panel?id=${encodeURIComponent(groupId)}&companyName=${encodeURIComponent(companyName)}`,
        { method: "DELETE" },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(json?.error || "Failed to remove provider from group");
      applyLegalPanelGroups(json.legalPanelGroups || []);
    } catch (e) {
      alert(e.message);
    } finally {
      setLpBusy(false);
    }
  };

  const startRenameGroup = (group) => {
    setRenamingGroupId(group.id);
    setRenameValue(group.name);
  };

  const saveRenameGroup = async (groupId) => {
    const name = renameValue.trim();
    if (!name) return alert("Please enter a name for the legal panel group.");
    setLpBusy(true);
    try {
      const res = await fetch("/api/me/legal-panel", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: groupId, name }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(json?.error || "Failed to rename legal panel group");
      applyLegalPanelGroups(json.legalPanelGroups || []);
      setRenamingGroupId(null);
      setRenameValue("");
    } catch (e) {
      alert(e.message);
    } finally {
      setLpBusy(false);
    }
  };

  const deleteLegalPanelGroup = async (group) => {
    const confirmed = confirm(
      `Delete the legal panel group "${group.name}"? This will not affect already submitted LEXIFY Requests.`,
    );
    if (!confirmed) return;
    setLpBusy(true);
    try {
      const res = await fetch(
        `/api/me/legal-panel?id=${encodeURIComponent(group.id)}`,
        { method: "DELETE" },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(json?.error || "Failed to delete legal panel group");
      applyLegalPanelGroups(json.legalPanelGroups || []);
    } catch (e) {
      alert(e.message);
    } finally {
      setLpBusy(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading your account…</div>;
  }

  const lpPickerGroup = legalPanelGroups.find(
    (group) => group.id === lpPickerGroupId,
  );
  const lpPickerExisting = new Set(
    (lpPickerGroup?.providers || []).map((name) => name.toLowerCase()),
  );
  const lpFilter = lpPickerFilter.trim().toLowerCase();
  const lpAvailableProviders = lpAllProviders.filter((provider) => {
    if (lpPickerExisting.has(provider.companyName.toLowerCase())) return false;
    if (!lpFilter) return true;
    return provider.companyName.toLowerCase().includes(lpFilter);
  });

  const bpBlockedSet = new Set(
    blockedProviders.map((name) => String(name).toLowerCase()),
  );
  const bpFilter = bpPickerFilter.trim().toLowerCase();
  const bpAvailableProviders = bpAllProviders.filter((provider) => {
    if (bpBlockedSet.has(provider.companyName.toLowerCase())) return false;
    if (!bpFilter) return true;
    return provider.companyName.toLowerCase().includes(bpFilter);
  });

  const ppPreferredSet = new Set(
    preferredProviders.map((p) => String(p.companyName || "").toLowerCase()),
  );
  const ppFilter = ppPickerFilter.trim().toLowerCase();
  const ppAvailableProviders = ppAllProviders.filter((provider) => {
    if (ppPreferredSet.has(provider.companyName.toLowerCase())) return false;
    if (!ppFilter) return true;
    return provider.companyName.toLowerCase().includes(ppFilter);
  });

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
        body: JSON.stringify({ code: mfaCode }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to enable 2FA");
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
    if (!confirm("Disable 2FA for your account?")) return;
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
      if (!res.ok) throw new Error(json?.error || "Failed to disable 2FA");
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
    <AppPage eyebrow="Account" title="My LEXIFY Account">
      {/* My Contact Information */}
      <div className="w-full rounded-2xl bg-white p-6 text-black shadow-[0_16px_44px_rgba(17,153,158,0.22)] ring-1 ring-black/10">
        <AccountHeading icon={Building2} title="My Contact Information" />

        <div className="space-y-5">
          <AccountNestedCard>
            <AccountHeading as="h3" title="My Company Information" />
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
              <OutlinedField
                label="Company Name"
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
                Show List of All Company Users
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
                value={me?.userAccount?.username || me?.username}
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

      {/* Notifications */}
      <div className="w-full rounded-2xl bg-white p-6 text-black shadow-[0_16px_44px_rgba(17,153,158,0.22)] ring-1 ring-black/10">
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
          <PrefSwitch
            id="pref-all-notifications"
            checked={hasPref("all-notifications")}
            onChange={(e) => setPref("all-notifications", e.target.checked)}
          >
            Company-wide notifications{" "}
            <NarrowTooltip tooltipText="When enabled, you will receive automatic notifications for all pending LEXIFY Requests across your company, including those of other users and your own." />
          </PrefSwitch>
          <PrefSwitch
            id="pref-no_offers"
            checked={hasPref("no_offers")}
            onChange={(e) => setPref("no_offers", e.target.checked)}
          >
            My LEXIFY Request expires and I have not received any offers
          </PrefSwitch>
          <PrefSwitch
            id="pref-pending_offer_selection"
            checked={hasPref("pending_offer_selection")}
            onChange={(e) =>
              setPref("pending_offer_selection", e.target.checked)
            }
          >
            My LEXIFY Request expires and I need to select the winning service
            provider from the received offers.
          </PrefSwitch>
        </div>
      </div>
      {/* Blocked Lexify Service Providers */}
      <div className="w-full rounded-2xl bg-white p-6 text-black shadow-[0_16px_44px_rgba(17,153,158,0.22)] ring-1 ring-black/10">
        <h2 className="text-2xl font-semibold mb-4">
          Legal Service Provider Management
        </h2>
        <h4 className="text-md font-semibold">
          Blocked Legal Service Providers
        </h4>
        <h4 className="text-md">
          If there is a firm you do not want to work with, for any reason, you
          can block it from seeing your LEXIFY Requests. Blocked firms will not
          see any Request you submit and cannot submit offers. <br />
          <br />
          To block a firm, click &quot;Block Service Providers&quot; and select
          one or more firms from the list. Blocking can be removed at any
          time.{" "}
        </h4>
        <br />
        <button
          className="bg-[#11999e] text-white px-4 py-2 rounded-xl cursor-pointer disabled:opacity-50"
          onClick={openBlockedPicker}
          disabled={bpBusy}
        >
          Block Service Providers
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
                <tr className="bg-gray-200 text-gray-700">
                  <th className="border p-2 text-center">
                    Service Provider Name
                  </th>
                  <th className="border p-2">Unblock Service Provider</th>
                </tr>
              </thead>
              <tbody>
                {blockedProviders.map((name) => (
                  <tr key={name}>
                    <td className="border p-2 text-center">{name}</td>
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
          If you want a specific firm to see your LEXIFY Requests even when it
          does not meet the criteria you have set — a smaller firm than you
          normally require, for example — you can give it preferred status. A
          preferred firm will see all your Requests in the practice areas you
          select, regardless of your other criteria. <br /> <br /> To give a
          firm preferred status, click &quot;Assign Preferred Provider&quot;,
          select the firm, choose the relevant practice areas and click
          &quot;Assign Preferred Status&quot;. You can change the practice areas
          or remove the preferred status at any time.{" "}
        </h4>
        <br />
        <button
          className="bg-[#11999e] text-white px-4 py-2 rounded-xl cursor-pointer disabled:opacity-50"
          onClick={openPreferredPicker}
          disabled={ppBusy}
        >
          Assign Preferred Provider
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
                <tr className="bg-gray-200 text-gray-700">
                  <th className="border p-2 text-center">
                    Service Provider Name
                  </th>
                  <th className="border p-2 text-center">
                    Preferred Provider in
                  </th>
                  <th className="border p-2">Select Practice Areas</th>
                  <th className="border p-2">Unassign Preferred Status</th>
                </tr>
              </thead>
              <tbody>
                {preferredProviders.map((p) => {
                  const isEditing = editingProvider === p.companyName;
                  return (
                    <tr key={p.companyName}>
                      <td className="border p-2 text-center">
                        {p.companyName}
                      </td>

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
                              Select
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
                          Unassign
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
        {/* Legal Panel Groups */}
        <h2 className="text-md font-semibold">Legal Panels</h2>
        <h4 className="text-md">
          If you prefer to buy legal services only from a fixed group of firms,
          you can save them as a legal panel. Panels are practice-specific, so
          you can keep separate panels for different practice areas — M&A,
          banking, employment, or whatever fits how you buy.
        </h4>
        <div className="mt-4 flex gap-3 rounded-2xl border border-[#11999e]/35 bg-[#e7f6f7] p-4">
          <Info
            className="mt-0.5 h-5 w-5 shrink-0 text-[#11999e]"
            strokeWidth={2}
            aria-hidden="true"
          />
          <p className="text-sm leading-relaxed text-gray-700">
            Saving a panel does not apply it to individual LEXIFY Requests. You
            choose for each LEXIFY Request whether to restrict it to one of your
            saved panels or to leave it open to other qualifying firms. If you
            apply a panel when preparing a LEXIFY Request, only the firms on the
            selected panel will see that Request and be able to submit offers.
            Note that a panel overrides all your other settings, including any
            blocked and preferred status of individual firms.
          </p>
        </div>
        <h4 className="mt-4 text-md">
          To build a panel, name it and add the firms you would like to include.
          Panels can be edited or deleted at any time.
        </h4>
        <br />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              New legal panel name
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-200 bg-white p-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#11999e]/30"
              placeholder="e.g. M&A Panel"
              value={newPanelName}
              onChange={(e) => setNewPanelName(e.target.value)}
            />
          </div>
          <button
            className="bg-[#11999e] text-white px-4 py-2 rounded-xl cursor-pointer disabled:opacity-50"
            onClick={createLegalPanelGroup}
            disabled={lpBusy || !newPanelName.trim()}
          >
            Create Legal Panel
          </button>
        </div>
        <br />
        <div className="mt-6 space-y-6">
          <h3 className="text-md font-semibold">Your Legal Panels</h3>
          {legalPanelGroups.length === 0 ? (
            <div className="text-sm text-gray-500">
              You have not created any legal panels yet.
            </div>
          ) : (
            legalPanelGroups.map((group) => (
              <div
                key={group.id}
                className="rounded-lg border-2 border-gray-300 p-4"
              >
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {renamingGroupId === group.id ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-200 bg-white p-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#11999e]/30"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                      />
                      <button
                        className="inline-flex items-center gap-1 rounded bg-[#11999e] px-3 py-1 text-white cursor-pointer disabled:opacity-50"
                        onClick={() => saveRenameGroup(group.id)}
                        disabled={lpBusy}
                      >
                        <Save size={14} />
                        Save
                      </button>
                      <button
                        className="rounded border px-3 py-1 cursor-pointer"
                        onClick={() => {
                          setRenamingGroupId(null);
                          setRenameValue("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <h3 className="text-md font-semibold">{group.name}</h3>
                  )}
                  {renamingGroupId !== group.id ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-[#11999e] px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-[#0e8488] disabled:opacity-50"
                        onClick={() => openLegalPanelPicker(group)}
                        disabled={lpBusy}
                      >
                        Add Service Providers
                      </button>
                      <button
                        className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border-2 border-[#11999e] bg-white px-4 py-2 text-sm font-medium text-[#11999e] transition-colors duration-200 hover:bg-[#11999e] hover:text-white"
                        onClick={() => startRenameGroup(group)}
                      >
                        <Pencil size={14} />
                        Rename
                      </button>
                      <button
                        className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border-2 border-red-300 bg-red-100 px-4 py-2 text-sm font-medium text-red-500 transition-colors duration-200 hover:bg-red-500 hover:text-white disabled:opacity-50"
                        onClick={() => deleteLegalPanelGroup(group)}
                        disabled={lpBusy}
                      >
                        <Trash2 size={14} />
                        Delete Panel
                      </button>
                    </div>
                  ) : null}
                </div>
                {(group.providers || []).length === 0 ? (
                  <div className="text-sm text-gray-500">
                    This panel does not have any providers yet.
                  </div>
                ) : (
                  <table className="w-full border border-gray-300 text-sm">
                    <thead className="bg-gray-200">
                      <tr className="bg-gray-200 text-gray-700">
                        <th className="border p-2 text-left">
                          Service Provider Name
                        </th>
                        <th className="border p-2">Remove from Legal Panel</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.providers.map((name) => (
                        <tr key={`${group.id}-${name}`}>
                          <td className="border p-2">{name}</td>
                          <td className="border p-2 text-center">
                            <button
                              className="inline-flex cursor-pointer items-center justify-center rounded-xl border-2 border-red-400 bg-white px-4 py-1.5 text-sm font-medium text-red-500 transition-colors duration-200 hover:bg-red-500 hover:text-white disabled:opacity-50"
                              onClick={() =>
                                removeFromLegalPanelGroup(group.id, name)
                              }
                              disabled={lpBusy}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      {bpPickerOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeBlockedPicker();
          }}
        >
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded bg-white text-black shadow-2xl">
            <div className="flex items-center justify-between border-b p-4">
              <h3 className="text-lg font-semibold">
                Block legal service providers{" "}
              </h3>
              <button
                type="button"
                onClick={closeBlockedPicker}
                className="px-3 py-1 rounded border cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col p-4">
              <input
                type="text"
                className="mb-3 w-full rounded-lg border border-gray-200 bg-white p-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#11999e]/30"
                placeholder="Search providers by name..."
                value={bpPickerFilter}
                onChange={(e) => setBpPickerFilter(e.target.value)}
              />
              {bpProvidersLoading ? (
                <div className="text-sm text-gray-500">Loading providers…</div>
              ) : bpAvailableProviders.length === 0 ? (
                <div className="text-sm text-gray-600">
                  {bpAllProviders.length === 0
                    ? "No legal service providers are available."
                    : bpFilter
                      ? "No matching providers found."
                      : "All available providers are already blocked."}
                </div>
              ) : (
                <div className="max-h-[50vh] overflow-auto rounded border border-gray-300">
                  {bpAvailableProviders.map((provider) => {
                    const checked = bpPickedNames.some(
                      (name) =>
                        name.toLowerCase() ===
                        provider.companyName.toLowerCase(),
                    );
                    return (
                      <label
                        key={String(provider.companyId)}
                        className="flex cursor-pointer items-center gap-3 border-b border-gray-200 px-3 py-2 last:border-b-0 hover:bg-[#f3f8f8]"
                      >
                        <input
                          type="checkbox"
                          className="accent-[#11999e]"
                          checked={checked}
                          onChange={(e) =>
                            toggleBlockedPick(
                              provider.companyName,
                              e.target.checked,
                            )
                          }
                        />
                        <span className="text-sm">{provider.companyName}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t p-4">
              <span className="text-sm text-gray-600">
                {bpPickedNames.length} selected
              </span>
              <button
                type="button"
                className="bg-[#11999e] text-white px-4 py-2 rounded-xl cursor-pointer disabled:opacity-50"
                onClick={blockSelectedProviders}
                disabled={bpBusy || bpPickedNames.length === 0}
              >
                Block Selected Providers
              </button>
            </div>
          </div>
        </div>
      )}
      {ppPickerOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closePreferredPicker();
          }}
        >
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded bg-white text-black shadow-2xl">
            <div className="flex items-center justify-between border-b p-4">
              <h3 className="text-lg font-semibold">
                Assign preferred provider{" "}
                <NarrowTooltip tooltipText='If a specific firm you would like to add is not in the list, it has not yet joined LEXIFY. You can invite it to join using "Invite a Law Firm" in the main menu.' />
              </h3>
              <button
                type="button"
                onClick={closePreferredPicker}
                className="px-3 py-1 rounded border cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
              <input
                type="text"
                className="w-full rounded-lg border border-gray-200 bg-white p-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#11999e]/30"
                placeholder="Search providers by name..."
                value={ppPickerFilter}
                onChange={(e) => setPpPickerFilter(e.target.value)}
              />
              {ppProvidersLoading ? (
                <div className="text-sm text-gray-500">Loading providers…</div>
              ) : ppAvailableProviders.length === 0 ? (
                <div className="text-sm text-gray-600">
                  {ppAllProviders.length === 0
                    ? "No legal service providers are available."
                    : ppFilter
                      ? "No matching providers found."
                      : "All available providers already have preferred status."}
                </div>
              ) : (
                <div className="max-h-[32vh] overflow-auto rounded border border-gray-300">
                  {ppAvailableProviders.map((provider) => {
                    const selected =
                      ppSelectedName.toLowerCase() ===
                      provider.companyName.toLowerCase();
                    return (
                      <label
                        key={String(provider.companyId)}
                        className={`flex cursor-pointer items-center gap-3 border-b border-gray-200 px-3 py-2 last:border-b-0 hover:bg-[#f3f8f8] ${
                          selected ? "bg-[#e6f7f7]" : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="preferred-provider"
                          className="accent-[#11999e]"
                          checked={selected}
                          onChange={() => {
                            setPpSelectedName(provider.companyName);
                            setSelectedAreas([]);
                          }}
                        />
                        <span className="text-sm">{provider.companyName}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {ppSelectedName ? (
                <div className="rounded border border-gray-200 bg-gray-50 p-3">
                  <h4 className="mb-2 font-semibold">
                    Select areas of law for {ppSelectedName}
                  </h4>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {AREAS_OF_LAW.map((area) => (
                      <label
                        key={area}
                        className="flex items-center space-x-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          className="accent-[#11999e]"
                          checked={selectedAreas.includes(area)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAreas((xs) => [...xs, area]);
                            } else {
                              setSelectedAreas((xs) =>
                                xs.filter((a) => a !== area),
                              );
                            }
                          }}
                        />
                        <span>{area}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-3 border-t p-4">
              <button
                type="button"
                className="bg-[#11999e] text-white px-4 py-2 rounded-xl cursor-pointer disabled:opacity-50"
                onClick={assignPreferredProvider}
                disabled={
                  ppBusy || !ppSelectedName || selectedAreas.length === 0
                }
              >
                Assign Preferred Status
              </button>
            </div>
          </div>
        </div>
      )}
      {lpPickerGroupId && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeLegalPanelPicker();
          }}
        >
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded bg-white text-black shadow-2xl">
            <div className="flex items-center justify-between border-b p-4">
              <h3 className="text-lg font-semibold">
                {lpPickerGroup
                  ? `Add providers to "${lpPickerGroup.name}"`
                  : "Add providers to group"}{" "}
                <NarrowTooltip tooltipText='If a specific firm you would like to add is not in the list, it has not yet joined LEXIFY. You can invite it to join using "Invite a Law Firm" in the main menu.' />
              </h3>
              <button
                type="button"
                onClick={closeLegalPanelPicker}
                className="px-3 py-1 rounded border cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col p-4">
              <input
                type="text"
                className="mb-3 w-full rounded-lg border border-gray-200 bg-white p-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#11999e]/30"
                placeholder="Search providers by name..."
                value={lpPickerFilter}
                onChange={(e) => setLpPickerFilter(e.target.value)}
              />
              {lpProvidersLoading ? (
                <div className="text-sm text-gray-500">Loading providers…</div>
              ) : lpAvailableProviders.length === 0 ? (
                <div className="text-sm text-gray-600">
                  {lpAllProviders.length === 0
                    ? "No legal service providers are available."
                    : lpFilter
                      ? "No matching providers found."
                      : "All available providers are already in this group."}
                </div>
              ) : (
                <div className="max-h-[50vh] overflow-auto rounded border border-gray-300">
                  {lpAvailableProviders.map((provider) => {
                    const checked = lpPickedNames.some(
                      (name) =>
                        name.toLowerCase() ===
                        provider.companyName.toLowerCase(),
                    );
                    return (
                      <label
                        key={String(provider.companyId)}
                        className="flex cursor-pointer items-center gap-3 border-b border-gray-200 px-3 py-2 last:border-b-0 hover:bg-[#f3f8f8]"
                      >
                        <input
                          type="checkbox"
                          className="accent-[#11999e]"
                          checked={checked}
                          onChange={(e) =>
                            togglePickedProvider(
                              provider.companyName,
                              e.target.checked,
                            )
                          }
                        />
                        <span className="text-sm">{provider.companyName}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t p-4">
              <span className="text-sm text-gray-600">
                {lpPickedNames.length} selected
              </span>
              <button
                type="button"
                className="bg-[#11999e] text-white px-4 py-2 rounded cursor-pointer disabled:opacity-50"
                onClick={addSelectedProvidersToGroup}
                disabled={lpBusy || lpPickedNames.length === 0}
              >
                Add Selected Providers to Panel
              </button>
            </div>
          </div>
        </div>
      )}
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
