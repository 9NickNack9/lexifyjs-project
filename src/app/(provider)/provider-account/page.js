"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load profile");
        const data = await res.json();
        setMe(data);
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
          }))
        );
        const inv = Array.isArray(data.companyInvoiceContactPersons)
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
          }))
        );
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
    const next = contacts.map((c) =>
      c.id === id ? { ...c, allNotifications: checked } : c
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

  const updateInvoiceContact = (id, field, value) =>
    setInvoiceContacts((xs) =>
      xs.map((c) => (c.id === id ? { ...c, [field]: value } : c))
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
        xs.map((c) => (c.id === id ? { ...c, isEditing: true } : c))
      );
      return;
    }

    const next = [...invoiceContacts];
    await saveInvoiceContacts(next);
    setInvoiceContacts((xs) =>
      xs.map((c) => (c.id === id ? { ...c, isEditing: false } : c))
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

  if (loading) return <div className="p-6">Loading your account…</div>;

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
            <NarrowTooltip tooltipText="Please add all current users of LEXIFY at your company as contact persons." />
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
                  <th className="border p-2">Receive all notifications</th>
                  <th className="border p-2">Edit/Save</th>
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
              disabled={busy}
              onClick={addContact}
              className="mt-4 bg-[#11999e] text-white px-4 py-2 rounded cursor-pointer disabled:opacity-50"
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
              onClick={() => router.push("/requests/change-password")}
              className="mt-4 bg-[#11999e] text-white px-11 py-2 rounded cursor-pointer"
            >
              Change Password
            </button>
          </div>
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
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            value=""
            className="sr-only peer"
            defaultChecked
          />
          <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600 dark:peer-checked:bg-green-600"></div>
          <span className="ms-3 text-sm text-black dark:text-black">
            A pending LEXIFY Request expires and the offer I have submitted is
            not the winning offer
          </span>
        </label>
        <br />
        <label className="inline-flex items-center cursor-pointer pt-2">
          <input
            type="checkbox"
            value=""
            className="sr-only peer"
            defaultChecked
          />
          <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600 dark:peer-checked:bg-green-600"></div>
          <span className="ms-3 text-sm text-black dark:text-black">
            A pending LEXIFY Request expires and the offer I have submitted is
            the winning offer subject to clearance of remaining conflict checks{" "}
            <NarrowTooltip tooltipText="If the LEXIFY Request does not disclose the identities of all relevant parties in the matter, the corresponding remaining conflict checks will be performed only with the legal service provider submitting the winning offer. If an existing conflict is then notified by the legal service provider to LEXIFY, the winning offer will automatically be disqualified and the second-best offer (if any) will replace it as the winning offer." />
          </span>
        </label>
        <br />
        <label className="inline-flex items-center cursor-pointer pt-2">
          <input
            type="checkbox"
            value=""
            className="sr-only peer"
            defaultChecked
          />
          <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600 dark:peer-checked:bg-green-600"></div>
          <span className="ms-3 text-sm text-black dark:text-black">
            A pending LEXIFY Request is cancelled by the client after I have
            submitted an offer
          </span>
        </label>
        <label className="inline-flex items-center cursor-pointer pt-2">
          <input
            type="checkbox"
            value=""
            className="sr-only peer"
            defaultChecked
          />
          <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600 dark:peer-checked:bg-green-600"></div>
          <span className="ms-3 text-sm text-black dark:text-black">
            A new LEXIFY Request has been published and is awaiting offers
          </span>
        </label>
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
                              e.target.value
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
                              e.target.value
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
                              e.target.value
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
                              e.target.value
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
