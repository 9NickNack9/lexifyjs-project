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
        : []
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
        setUsername(data.username || "");
        setIsAutomatic(
          (data.winningOfferSelection || "automatic") === "automatic"
        );
        const blocked = Array.isArray(data.blockedServiceProviders)
          ? data.blockedServiceProviders
          : [];
        setBlockedProviders(blocked);
        setPreferredProviders(
          Array.isArray(data.preferredLegalServiceProviders)
            ? data.preferredLegalServiceProviders
            : []
        );
        setLegalPanelProviders(
          Array.isArray(data.legalPanelServiceProviders)
            ? data.legalPanelServiceProviders
            : []
        );

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
          }))
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
              : []
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
      xs.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );

  const toggleAllNotifications = async (id, checked) => {
    // Optimistic UI
    const next = contacts.map((c) =>
      c.id === id ? { ...c, allNotifications: checked } : c
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
        xs.map((c) => (c.id === id ? { ...c, isEditing: true } : c))
      );
      return;
    }

    // was editing → save everything, then exit edit mode for this row
    const next = [...contacts];
    await saveContacts(next);

    setContacts((xs) =>
      xs.map((c) => (c.id === id ? { ...c, isEditing: false } : c))
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
        }
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
        { method: "DELETE" }
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
      checked ? [...xs, area] : xs.filter((a) => a !== area)
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
        { method: "DELETE" }
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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <h1 className="text-3xl font-bold mb-6">My LEXIFY Account</h1>

      {/* My Contact Information */}
      <div className="w-full max-w-6xl p-6 rounded shadow-2xl bg-white text-black">
        <h2 className="text-2xl font-semibold mb-4">My Contact Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <h4 className="text-md font-semibold">My Company</h4>
          <br />
          <div className="w-full text-sm border p-2">
            Name: {me?.companyName || "-"}
          </div>
          <div className="w-full text-sm border p-2">
            Business ID (in country of domicile): {me?.companyId || "-"}
          </div>
          <div className="w-full text-sm border p-2">
            Street Address: {me?.companyAddress || "-"}
          </div>
          <div className="w-full text-sm border p-2">
            Postal Code: {me?.companyPostalCode || "-"}
          </div>
          <div className="w-full text-sm border p-2">
            City: {me?.companyCity || "-"}
          </div>
          <div className="w-full text-sm border p-2">
            Country of Domicile: {me?.companyCountry || "-"}
          </div>
        </div>

        <br />
        <div className="grid grid-cols-2 gap-4">
          <h4 className="text-md font-semibold col-span-2">
            My Company&apos;s Contact Persons{" "}
            <NarrowTooltip tooltipText="Please add all current users of LEXIFY at your company as contact persons. This will help you designate the correct LEXIFY Request owner whenever a new LEXIFY Request is created for your company." />
          </h4>
          <div className="col-span-2">
            <table className="w-full border border-gray-300 text-sm">
              <thead className="bg-gray-200">
                <tr className="bg-[#3a3a3c] text-white">
                  <th className="border p-2">First Name</th>
                  <th className="border p-2">Last Name</th>
                  <th className="border p-2">Title / Position in Company</th>
                  <th className="border p-2">Telephone (with country code)</th>
                  <th className="border p-2">Email</th>
                  <th className="border p-2">
                    Receive All Notifications{" "}
                    <NarrowTooltip tooltipText="If 'Receive All Notifications' is checked, the user will receive all automatic notifications related to all LEXIFY Requests made by any representative of your company. If 'Receive All Notifications' is unchecked, the user will receive only automatic notifications related to his/her own LEXIFY Requests." />
                  </th>
                  <th className="border p-2">Edit</th>
                  <th className="border p-2">Delete</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id}>
                    <td className="border p-2 text-center">
                      {c.isEditing ? (
                        <input
                          className="border p-1 w-full"
                          value={c.firstName}
                          onChange={(e) =>
                            updateContact(c.id, "firstName", e.target.value)
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
                            updateContact(c.id, "lastName", e.target.value)
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
                            updateContact(c.id, "position", e.target.value)
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
                            updateContact(c.id, "telephone", e.target.value)
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
                            updateContact(c.id, "email", e.target.value)
                          }
                        />
                      ) : (
                        c.email
                      )}
                    </td>
                    <td className="border p-2 text-center">
                      <input
                        type="checkbox"
                        checked={!!c.allNotifications}
                        onChange={(e) =>
                          toggleAllNotifications(c.id, e.target.checked)
                        }
                      />
                    </td>
                    <td className="border p-2 text-center">
                      <button
                        disabled={busy}
                        onClick={() => toggleEdit(c.id)}
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
                        disabled={busy}
                        onClick={() => removeContact(c.id)}
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
              onClick={addContact}
              className="mt-4 bg-[#11999e] text-white px-4 py-2 rounded cursor-pointer"
            >
              Add New Contact Person
            </button>
          </div>
        </div>

        <br />
        {/* Username & Password */}
        <div className="grid grid-cols-2 gap-4">
          <h4 className="text-md font-semibold">Username & Password</h4>
          <br />
          <div className="col-span-2">
            <div className="w-1/3 text-sm border p-2">
              Username: {username || "-"}
            </div>
            <button
              onClick={() => router.push("/change-password")}
              className="mt-4 bg-[#11999e] text-white px-11 py-2 rounded cursor-pointer"
            >
              Change Password
            </button>
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
        {/* 1) No qualifying offers */}
        <label
          htmlFor="pref-no_offers"
          className="inline-flex items-center cursor-pointer"
        >
          <input
            id="pref-no_offers"
            // IMPORTANT: keep it a checkbox and avoid shared "name"
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
        <br />
        {/* 2) Best offer over max price */}
        <label
          htmlFor="pref-over_max_price"
          className="inline-flex items-center cursor-pointer pt-2"
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
            My LEXIFY Request expires and qualifying offers have been received,
            but the best offer exceeds the maximum price in my LEXIFY Request{" "}
            <NarrowTooltip tooltipText="Whenever your LEXIFY Request expires and you receive at least one qualifying offer but the offer exceeds the maximum price you have set in the LEXIFY Request, you will still have 72 hours from the expiration of your LEXIFY Request to accept this best offer if you wish to do so. If not accepted within 72 hours, the best offer exceeding your maximum price will automatically be rejected." />
          </span>
        </label>
        <br />
        {/* 3) Pending offer selection (manual) */}
        <label
          htmlFor="pref-pending_offer_selection"
          className="inline-flex items-center cursor-pointer pt-2"
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
            My LEXIFY Request expires, qualifying offers have been received and
            I need to select the winning service provider{" "}
            <NarrowTooltip tooltipText="Applicable only if Winning Offer Selection Method is set to 'Manual'" />
          </span>
        </label>
      </div>
      <br />
      {/* Winning Offer Selection Method */}
      <div className="w-full max-w-6xl p-6 rounded shadow-2xl bg-white text-black">
        <h2 className="text-2xl font-semibold mb-4">
          Winning Offer Selection Method
        </h2>
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isAutomatic}
            onChange={async () => {
              const next = !isAutomatic;

              // Optimistic UI
              setIsAutomatic(next);

              // Persist to DB: off => 'manual', on => 'automatic'
              try {
                const res = await fetch("/api/me", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    winningOfferSelection: next ? "automatic" : "manual",
                  }),
                });
                if (!res.ok) {
                  // revert on failure
                  setIsAutomatic(!next);
                  const err = await res.json().catch(() => ({}));
                  alert(
                    err?.error || "Failed to update winning offer selection."
                  );
                }
              } catch (e) {
                setIsAutomatic(!next);
                alert("Network error while updating selection.");
              }
            }}
            className="sr-only"
          />
          <div
            className={`relative w-11 h-6 rounded-full transition-colors ${
              isAutomatic ? "bg-green-600" : "bg-gray-700"
            }`}
          >
            <div
              className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-transform ${
                isAutomatic ? "translate-x-full" : ""
              }`}
            />
          </div>
          <span className="ms-3 text-md text-black font-semibold">
            {isAutomatic ? "Automatic" : "Manual"}
          </span>
        </label>

        <br />
        <h4 className="text-md">
          When this option is set to &quot;Automatic&quot;, LEXIFY will
          automatically select the best offer received by the expiration of each
          LEXIFY Request, and designate the legal service provider submitting
          that best offer as your legal service provider for the corresponding
          LEXIFY Contract. When this option is set to &quot;Manual&quot;, LEXIFY
          will show the three best offers received by the expiration of each
          LEXIFY Request on the &quot;My Dashboard&quot; page, and you will have
          7 days from the expiration of each LEXIFY Request to manually select
          the winning offer from the best offers which are shown. If you do not
          select any of the best offers to be the winning offer within 7 days,
          LEXIFY will automatically reject all offers and no LEXIFY Contract
          will be generated.{" "}
        </h4>
        <br />
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
          criteria of a specific LEXIFY Request (for example, if they are a
          smaller law firm than what you require in the LEXIFY Request)? Not a
          problem! You can designate a legal service provider to be a preferred
          provider who is able to review every LEXIFY Request you submit. Simply
          enter the name of the relevant legal service provider in the search
          field below, click the name of the service provider, select the areas
          of law you want the service provider to be preferred in and then click
          &quot;Assign Preferred Status&quot;. You can edit a service
          provider&apos;s preferred areas of law anytime with the &quot;Select
          Areas of Law&quot; button (remember to click &quot;Save&quot; after
          changing the areas of law). If you later want to remove the preferred
          provider status from a legal service provider, just click the
          “Unassign Preferred Status” button next to the name of that legal
          service provider.{" "}
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
                        Remove
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
    </div>
  );
}
