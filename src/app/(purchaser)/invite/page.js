"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  Filter,
  Plus,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import NarrowTooltip from "../../components/NarrowTooltip";
import InviteEmailPreviewModal from "./InviteEmailPreviewModal";
import { HubShell } from "@/app/components/HubPage";

const INITIAL_CONTACT = {
  id: "1",
  firstName: "",
  lastName: "",
  email: "",
};

const PAGE_SIZE = 5;
const MESSAGE_MAX = 1000;

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-[#11999e] focus:ring-1 focus:ring-[#11999e]/30";

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

function parseInviteDate(value) {
  const [day, month, year] = String(value || "")
    .split("/")
    .map(Number);
  if (!year || !month || !day) return 0;
  return new Date(year, month - 1, day).getTime();
}

export default function InvitePage() {
  const { data: session } = useSession();
  const nextContactIdRef = useRef(2);
  const filterRef = useRef(null);
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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [filterOpen, setFilterOpen] = useState(false);
  const [dateSort, setDateSort] = useState("desc");
  const [page, setPage] = useState(1);

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

  useEffect(() => {
    const onDocClick = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filteredInvites = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const rows = invites.filter((invite) => {
      if (statusFilter !== "All" && invite.status !== statusFilter) {
        return false;
      }
      if (!query) return true;
      return [
        invite.companyName,
        invite.contactPersons,
        invite.inviteDate,
        invite.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });

    rows.sort((a, b) => {
      const diff =
        parseInviteDate(a.inviteDate) - parseInviteDate(b.inviteDate);
      return dateSort === "asc" ? diff : -diff;
    });

    return rows;
  }, [invites, searchQuery, statusFilter, dateSort]);

  const totalPages = Math.max(1, Math.ceil(filteredInvites.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart =
    filteredInvites.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE;
  const pageRows = filteredInvites.slice(pageStart, pageStart + PAGE_SIZE);
  const pageEnd = pageStart + pageRows.length;

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, dateSort, invites.length]);

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
    <HubShell contentClassName="max-w-5xl">
      <header className="mb-8 flex items-start gap-3">
        <span className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#11999e] text-white">
          <Building2 className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Invite a Law Firm
          </h1>
          <p className="mt-1 text-sm text-gray-500 sm:text-base">
            Invite your trusted law firms to join LEXIFY and receive your LEXIFY
            Requests.
          </p>
        </div>
      </header>

      <div className="w-full rounded-2xl bg-white p-6 text-black shadow-[0_16px_44px_rgba(17,153,158,0.22)] ring-1 ring-black/10 sm:p-8">
        {submitted ? (
          <p className="text-center text-sm text-gray-700 sm:text-base">
            Thank you — your invitation has been sent. You can follow the status
            of your invitations anytime under &quot;My Invites&quot; below.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="firmName"
                className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-gray-800"
              >
                Law firm name
                <NarrowTooltip tooltipText='The commonly used name of the firm is sufficient; the full registered name is not required. For instance, you can use "Smith" instead of "Smith Attorneys Ltd".' />
              </label>
              <input
                id="firmName"
                name="firmName"
                type="text"
                required
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                placeholder="Enter the law firm name"
                className={inputClass}
              />
            </div>

            <div className="space-y-4">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                Contact persons at the law firm
                <NarrowTooltip tooltipText="You can send the invite to one or more contacts at the firm. When you invite several contacts, each recipient can see who else at the firm received the invitation, so they can discuss joining LEXIFY internally." />
              </h2>

              {contacts.map((contact, index) => (
                <div
                  key={contact.id}
                  className="relative space-y-4 rounded-xl border border-gray-200 p-4 pt-5"
                >
                  <button
                    type="button"
                    onClick={() => removeContact(contact.id)}
                    disabled={contacts.length === 1}
                    className="absolute top-3 right-3 rounded-lg p-1 text-gray-400 transition hover:bg-red-50 hover:text-red-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                    aria-label={`Remove contact person ${index + 1}`}
                  >
                    <Trash2 className="h-5 w-5" aria-hidden="true" />
                  </button>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor={`contactFirstName-${contact.id}`}
                        className="mb-1.5 block text-sm font-semibold text-gray-800"
                      >
                        First name
                      </label>
                      <input
                        id={`contactFirstName-${contact.id}`}
                        type="text"
                        required
                        value={contact.firstName}
                        onChange={(e) =>
                          updateContact(contact.id, "firstName", e.target.value)
                        }
                        placeholder="First name"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`contactLastName-${contact.id}`}
                        className="mb-1.5 block text-sm font-semibold text-gray-800"
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
                        placeholder="Last name"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor={`contactEmail-${contact.id}`}
                      className="mb-1.5 block text-sm font-semibold text-gray-800"
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
                      placeholder="Enter email address"
                      className={inputClass}
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addContact}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#11999e] bg-white px-4 py-2 text-sm font-medium text-[#11999e] transition-colors hover:bg-[#11999e]/10"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add another contact person
              </button>
            </div>

            <div>
              <label
                htmlFor="personalMessage"
                className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-gray-800"
              >
                Personal Message (optional)
              </label>
              <div className="relative">
                <textarea
                  id="personalMessage"
                  name="personalMessage"
                  rows={5}
                  maxLength={MESSAGE_MAX}
                  value={personalMessage}
                  onChange={(e) => setPersonalMessage(e.target.value)}
                  className={`${inputClass} resize-y pb-8`}
                  placeholder='Add a short note to the firm in your own words — for example,  "We are using LEXIFY to source legal services, and would like to see your firm on the platform, so that you are among the firms we can turn to when work comes up". You can write the note freely in the language you prefer. If you leave this blank, the invitation is sent without a personal message.'
                />
                <span className="pointer-events-none absolute right-3 bottom-2 text-xs text-gray-400">
                  {personalMessage.length} / {MESSAGE_MAX}
                </span>
              </div>
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#11999e] bg-white px-5 py-2.5 text-sm font-medium text-[#11999e] transition-colors hover:bg-[#11999e]/10"
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
                Preview Invite
              </button>

              <button
                type="submit"
                disabled={submitting}
                className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition ${
                  submitting
                    ? "cursor-not-allowed bg-[#11999e]/60"
                    : "cursor-pointer bg-[#11999e] hover:bg-[#0e8488]"
                }`}
              >
                <Send className="h-4 w-4" aria-hidden="true" />
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

      <div className="mt-6 w-full overflow-hidden rounded-2xl bg-white p-6 text-black shadow-[0_16px_44px_rgba(17,153,158,0.22)] ring-1 ring-black/10 sm:p-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-semibold text-gray-900">My Invites</h2>
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search invites..."
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pr-3 pl-9 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-[#11999e] focus:ring-1 focus:ring-[#11999e]/30"
              />
            </div>
            <div className="relative" ref={filterRef}>
              <button
                type="button"
                onClick={() => setFilterOpen((open) => !open)}
                className={`inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border transition-colors ${
                  statusFilter === "All"
                    ? "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                    : "border-[#11999e] bg-[#11999e]/10 text-[#11999e]"
                }`}
                aria-label="Filter invites"
              >
                <Filter className="h-4 w-4" aria-hidden="true" />
              </button>
              {filterOpen ? (
                <div className="absolute right-0 z-10 mt-2 w-40 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  {["All", "Pending", "Joined"].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setStatusFilter(option);
                        setFilterOpen(false);
                      }}
                      className={`block w-full cursor-pointer px-3 py-2 text-left text-sm ${
                        statusFilter === option
                          ? "bg-[#11999e]/10 font-medium text-[#11999e]"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] table-fixed border-collapse text-left text-sm text-gray-800">
            <colgroup>
              <col className="w-[28%]" />
              <col className="w-[32%]" />
              <col className="w-[22%]" />
              <col className="w-[18%]" />
            </colgroup>
            <thead>
              <tr className="bg-gray-200 text-gray-700">
                <th className="border-b border-gray-300 px-4 py-3 text-left align-middle text-xs font-semibold uppercase tracking-wide">
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-flex h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                    Law Firm
                  </span>
                </th>
                <th className="border-b border-gray-300 px-4 py-3 text-left align-middle text-xs font-semibold uppercase tracking-wide">
                  Recipients
                </th>
                <th
                  className="border-b border-gray-300 px-4 py-3 text-left align-middle text-xs font-semibold uppercase tracking-wide cursor-pointer select-none"
                  onClick={() =>
                    setDateSort((dir) => (dir === "asc" ? "desc" : "asc"))
                  }
                >
                  <span className="inline-flex items-center gap-1">
                    Date Sent
                    {dateSort === "asc" ? (
                      <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </span>
                </th>
                <th className="border-b border-gray-300 px-4 py-3 text-left align-middle text-xs font-semibold uppercase tracking-wide">
                  <span className="inline-flex items-center gap-1">
                    Status
                    <NarrowTooltip tooltipText='This section shows where each invitation stands. "Pending" means your invitation has been sent to the law firm, but the firm has not yet accepted it by registering on LEXIFY. "Joined" means the firm has completed its registration to become an active law firm on the platform. Note that the status remains "Pending" until the law firm registers, irrespective of how much time has passed since your invitation was sent.' />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {invitesLoading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="border-t border-gray-300 px-4 py-6 text-center text-sm text-gray-500"
                  >
                    Loading invites…
                  </td>
                </tr>
              ) : invitesError ? (
                <tr>
                  <td
                    colSpan={4}
                    className="border-t border-gray-300 px-4 py-6 text-center text-sm text-red-600"
                  >
                    {invitesError}
                  </td>
                </tr>
              ) : filteredInvites.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="border-t border-gray-300 px-4 py-6 text-center text-sm text-gray-500"
                  >
                    {invites.length === 0
                      ? "You have not sent any invites yet."
                      : "No invites match your search."}
                  </td>
                </tr>
              ) : (
                pageRows.map((invite) => (
                  <tr
                    key={invite.id}
                    className="transition-colors hover:bg-[#11999e]/[0.04]"
                  >
                    <td className="border-t border-gray-300 px-4 py-3 text-left align-middle text-sm">
                      <span className="flex items-center gap-2">
                        {invite.companyName}
                      </span>
                    </td>
                    <td className="border-t border-gray-300 px-4 py-3 text-left align-middle text-sm">
                      {invite.contactPersons}
                    </td>
                    <td className="border-t border-gray-300 px-4 py-3 text-left align-middle text-sm">
                      {invite.inviteDate}
                    </td>
                    <td className="border-t border-gray-300 px-4 py-3 text-left align-middle text-sm">
                      <InviteStatusBadge status={invite.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!invitesLoading && !invitesError && filteredInvites.length > 0 ? (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              Showing {pageStart + 1} to {pageEnd} of {filteredInvites.length}{" "}
              invites
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    className={`inline-flex h-9 min-w-9 cursor-pointer items-center justify-center rounded-lg px-2 text-sm font-medium ${
                      pageNumber === currentPage
                        ? "bg-[#11999e] text-white"
                        : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {pageNumber}
                  </button>
                ),
              )}
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </HubShell>
  );
}
