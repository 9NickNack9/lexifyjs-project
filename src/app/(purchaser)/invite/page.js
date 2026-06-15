"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Trash2 } from "lucide-react";
import NarrowTooltip from "../../components/NarrowTooltip";
import InviteEmailPreviewModal from "./InviteEmailPreviewModal";

const INITIAL_CONTACT = {
  id: "1",
  firstName: "",
  lastName: "",
  email: "",
};

function InviteStatusBadge({ status }) {
  const styles =
    status === "Joined"
      ? "text-green-700 bg-green-100"
      : "text-orange-700 bg-orange-100";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${styles}`}
    >
      {status}
    </span>
  );
}

export default function InvitePage() {
  const { data: session } = useSession();
  const nextContactIdRef = useRef(2);
  const [firmName, setFirmName] = useState("");
  const [contacts, setContacts] = useState([INITIAL_CONTACT]);
  const [personalMessage, setPersonalMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [invites, setInvites] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const [invitesError, setInvitesError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  const loadInvites = useCallback(async () => {
    setInvitesLoading(true);
    setInvitesError("");

    try {
      const res = await fetch("/api/invite");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load invites");
      }

      setInvites(Array.isArray(data.invites) ? data.invites : []);
    } catch (err) {
      setInvitesError(err.message || "Failed to load invites");
      setInvites([]);
    } finally {
      setInvitesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  const updateContact = (id, field, value) => {
    setContacts((prev) =>
      prev.map((contact) =>
        contact.id === id ? { ...contact, [field]: value } : contact,
      ),
    );
  };

  const addContact = () => {
    setContacts((prev) => [
      ...prev,
      {
        id: String(nextContactIdRef.current++),
        firstName: "",
        lastName: "",
        email: "",
      },
    ]);
  };

  const resetContacts = () => {
    nextContactIdRef.current = 2;
    setContacts([INITIAL_CONTACT]);
  };

  const removeContact = (id) => {
    setContacts((prev) =>
      prev.length === 1 ? prev : prev.filter((contact) => contact.id !== id),
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firmName,
          personalMessage,
          contacts: contacts.map(({ firstName, lastName, email }) => ({
            firstName,
            lastName,
            email,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to send invite");
      }

      setSubmitted(true);
      setFirmName("");
      setPersonalMessage("");
      resetContacts();
      await loadInvites();
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Invite a Law Firm to Join LEXIFY
      </h1>

      <div className="w-full max-w-4xl p-6 rounded shadow-2xl bg-white text-black">
        {submitted ? (
          <p className="text-md text-center">
            Thank you — your invitation has been sent. You can follow the status
            of your invitations anytime under "My Invites" below.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="firmName"
                className="block text-lg font-semibold mb-1"
              >
                Law firm name{" "}
                <NarrowTooltip tooltipText='The commonly used name of the firm is sufficient; the full registered name is not required. For instance, you can use "Smith" instead of "Smith Attorneys Ltd".' />
              </label>
              <input
                id="firmName"
                name="firmName"
                type="text"
                required
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                className="w-full rounded-lg border border-black/20 px-3 py-2"
              />
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold">
                Contact persons at the law firm{" "}
                <NarrowTooltip tooltipText="You can send the invite to one or more contacts at the firm. When you invite several contacts, each recipient can see who else at the firm received the invitation, so they can discuss joining LEXIFY internally." />
              </h2>

              {contacts.map((contact, index) => (
                <div
                  key={contact.id}
                  className="rounded-lg border border-black/10 p-4 space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <label
                        htmlFor={`contactFirstName-${contact.id}`}
                        className="text-sm font-semibold"
                      >
                        First name
                      </label>
                      {contacts.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeContact(contact.id)}
                          className="px-1 py-0.5 text-red-600 hover:bg-red-100 rounded-lg transition cursor-pointer shrink-0"
                          aria-label={`Remove contact person ${index + 1}`}
                        >
                          <Trash2 className="h-5 w-5" aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>
                    <input
                      id={`contactFirstName-${contact.id}`}
                      type="text"
                      required
                      value={contact.firstName}
                      onChange={(e) =>
                        updateContact(contact.id, "firstName", e.target.value)
                      }
                      className="w-full rounded-lg border border-black/20 px-3 py-2"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`contactLastName-${contact.id}`}
                      className="block text-sm font-semibold mb-1"
                    >
                      Last name
                    </label>
                    <input
                      id={`contactLastName-${contact.id}`}
                      type="text"
                      required
                      value={contact.lastName}
                      onChange={(e) =>
                        updateContact(contact.id, "lastName", e.target.value)
                      }
                      className="w-full rounded-lg border border-black/20 px-3 py-2"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`contactEmail-${contact.id}`}
                      className="block text-sm font-semibold mb-1"
                    >
                      Email
                    </label>
                    <input
                      id={`contactEmail-${contact.id}`}
                      type="email"
                      required
                      value={contact.email}
                      onChange={(e) =>
                        updateContact(contact.id, "email", e.target.value)
                      }
                      className="w-full rounded-lg border border-black/20 px-3 py-2"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addContact}
                className="text-sm font-semibold text-[#19999e] hover:opacity-80 cursor-pointer"
              >
                + Add another contact person
              </button>
            </div>

            <div>
              <label
                htmlFor="personalMessage"
                className="block text-sm font-semibold mb-1"
              >
                Personal Message (optional)
              </label>
              <textarea
                id="personalMessage"
                name="personalMessage"
                rows={4}
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                className="w-full rounded-lg border border-black/20 px-3 py-2 resize-y"
                placeholder="Add a short note to the firm in your own words — for example, an upcoming procurement on LEXIFY you'd like them to take part in. You can write the note freely in the language you prefer. If you leave this blank, the invitation is sent without a personal message."
              />
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="px-6 py-3 rounded-lg border border-[#19999e] text-[#19999e] font-medium hover:bg-[#19999e]/5 transition cursor-pointer"
              >
                Preview Invite
              </button>

              <button
                type="submit"
                disabled={submitting}
                className={`px-6 py-3 rounded-lg text-white transition ${
                  submitting
                    ? "bg-[#19999e]/60 cursor-not-allowed"
                    : "bg-[#19999e] hover:opacity-90 cursor-pointer"
                }`}
              >
                {submitting ? "Sending…" : "Send Invite"}
              </button>
            </div>
          </form>
        )}
      </div>

      <InviteEmailPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        firmName={firmName}
        personalMessage={personalMessage}
        inviterCompanyName={session?.companyName || ""}
        inviterFirstName={session?.firstName || ""}
        inviterLastName={session?.lastName || ""}
        inviterCompanyRole=""
      />

      <div className="w-full max-w-4xl mt-8 p-6 rounded shadow-2xl bg-white text-black">
        <h2 className="text-2xl font-semibold mb-4">My Invites</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-[#3a3a3c] text-white">
                <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold">
                  Law Firm
                </th>
                <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold">
                  Recipients
                </th>
                <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold">
                  Date Sent
                </th>
                <th className="border border-gray-300 px-4 py-3 text-center text-sm font-semibold">
                  Status{" "}
                  <NarrowTooltip tooltipText='This section shows where each invitation stands. "Pending" means your invitation has been sent to the law firm, but the firm has not yet accepted it by registering on LEXIFY. "Joined" means the firm has completed its registration to become an active law firm on the platform. Note that the status remains "Pending" until the law firm registers, irrespective of how much time has passed since your invitation was sent.' />
                </th>
              </tr>
            </thead>
            <tbody>
              {invitesLoading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="border border-gray-300 px-4 py-6 text-sm text-center text-black/60"
                  >
                    Loading invites…
                  </td>
                </tr>
              ) : invitesError ? (
                <tr>
                  <td
                    colSpan={4}
                    className="border border-gray-300 px-4 py-6 text-sm text-center text-red-600"
                  >
                    {invitesError}
                  </td>
                </tr>
              ) : invites.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="border border-gray-300 px-4 py-6 text-sm text-center text-black"
                  >
                    You have not sent any invites yet.
                  </td>
                </tr>
              ) : (
                invites.map((invite) => (
                  <tr key={invite.id}>
                    <td className="border border-gray-300 px-4 py-3 text-sm text-center">
                      {invite.companyName}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-sm text-center">
                      {invite.contactPersons}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-sm text-center">
                      {invite.inviteDate}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-sm text-center">
                      <InviteStatusBadge status={invite.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
