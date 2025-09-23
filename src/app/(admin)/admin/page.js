"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState([]);
  const [searchInput, setSearchInput] = useState(""); // typing here
  const [search, setSearch] = useState(""); // committed query
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const scrollRef = useRef(null);

  // Fetch users
  const fetchUsers = async (reset = false) => {
    if (loading) return;
    setLoading(true);

    const res = await fetch(
      `/api/admin/users?search=${encodeURIComponent(search)}&skip=${
        reset ? 0 : skip
      }&take=10`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      console.error("Failed to fetch users");
      setLoading(false);
      return;
    }

    const data = await res.json();

    if (reset) {
      setUsers(data.users);
      setSkip(10);
      // scroll to top on reset
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    } else {
      setUsers((prev) => [...prev, ...data.users]);
      setSkip((prev) => prev + 10);
    }

    setHasMore(data.hasMore);
    setLoading(false);
  };

  // Reset & fetch whenever committed search changes (and when session is ready)
  useEffect(() => {
    if (status === "loading") return;

    if (!session || session.role !== "ADMIN") {
      router.replace("/");
      return;
    }

    // reset state before new fetch
    setSkip(0);
    setUsers([]);
    setHasMore(true);
    fetchUsers(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, session, status]);

  const updateRegisterStatus = async (id, newStatus) => {
    await fetch(`/api/admin/users/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registerStatus: newStatus }),
    });
    // Refresh current view (preserves search & pagination state)
    fetchUsers(true);
  };

  const updateInvoiceFee = async (id, newFee) => {
    await fetch(`/api/admin/users/${id}/invoiceFee`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceFee: Number(newFee) }),
    });
    fetchUsers(true);
  };

  const deleteUser = async (id) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    fetchUsers(true);
  };

  const showUserDetails = async (id) => {
    const res = await fetch(`/api/admin/users/${id}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setSelectedUser(data);
    }
  };

  const onSearch = () => {
    // commit the query → triggers effect above to reset/fetch
    setSearch(searchInput.trim());
  };

  const onClear = () => {
    // clear both input and committed search, and hard-reset list + scroll
    setSearchInput("");
    setSearch(""); // triggers reset + fetch via effect
    setSkip(0);
    setUsers([]);
    setHasMore(true);
    // make sure we’re scrolled to top instantly
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSearch();
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">LEXIFY Admin Control</h1>

      <div className="flex items-center gap-2 mb-4">
        <input
          type="text"
          placeholder="Search by company name"
          className="border p-2 w-64"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button
          className="bg-[#11999e] text-white px-3 py-2 rounded border cursor-pointer"
          onClick={onSearch}
        >
          Search
        </button>
        <button
          className="bg-red-500 text-white px-3 py-2 rounded cursor-pointer"
          onClick={onClear}
        >
          Clear
        </button>
      </div>

      <div
        ref={scrollRef}
        className="overflow-y-auto max-h-[70vh] border rounded bg-white text-black"
      >
        <table className="w-full border-collapse">
          <thead className="bg-gray-200">
            <tr>
              <th className="border p-2">User ID</th>
              <th className="border p-2">Role</th>
              <th className="border p-2">Status</th>
              <th className="border p-2">Company</th>
              <th className="border p-2">Total Rating</th>
              <th className="border p-2">Invoice Fee</th>
              <th className="border p-2">Requests</th>
              <th className="border p-2">Offers</th>
              <th className="border p-2">Contracts</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.userId} className="text-center">
                <td
                  className="border p-2 text-blue-600 cursor-pointer underline"
                  onClick={() => showUserDetails(u.userId)}
                >
                  {u.userId}
                </td>
                <td className="border p-2">{u.role}</td>
                <td className="border p-2">
                  <select
                    className="border rounded"
                    value={u.registerStatus}
                    onChange={(e) =>
                      updateRegisterStatus(u.userId, e.target.value)
                    }
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                  </select>
                </td>
                <td className="border p-2">{u.companyName}</td>
                <td className="border p-2">
                  {u.role === "PROVIDER"
                    ? u.providerTotalRating ?? "N/A"
                    : "N/A"}
                </td>
                <td className="border p-2">
                  <input
                    type="number"
                    defaultValue={u.invoiceFee}
                    onBlur={(e) => updateInvoiceFee(u.userId, e.target.value)}
                    className="w-20 border p-1"
                  />
                </td>
                <td className="border p-2">{u.requestsCount}</td>
                <td className="border p-2">{u.offersCount}</td>
                <td className="border p-2">{u.contractsCount}</td>
                <td className="border p-2">
                  <button
                    onClick={() => deleteUser(u.userId)}
                    className="bg-red-500 text-white px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!users.length && !loading && (
              <tr>
                <td colSpan={10} className="text-center p-4 text-gray-500">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {hasMore && !loading && users.length > 0 && (
          <button
            onClick={() => fetchUsers(false)}
            className="w-full bg-gray-100 p-2"
          >
            Load more
          </button>
        )}
        {loading && <p className="text-center p-4">Loading...</p>}
      </div>

      {/* User details modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded max-w-2xl max-h-[80vh] overflow-y-auto text-black">
            <h2 className="text-xl font-bold mb-4">User Details</h2>
            <div className="space-y-2">
              <p>
                <strong>User ID:</strong> {selectedUser.userId}
              </p>
              <p>
                <strong>Role:</strong> {selectedUser.role}
              </p>
              <p>
                <strong>Status:</strong> {selectedUser.registerStatus}
              </p>
              <p>
                <strong>Company:</strong> {selectedUser.companyName}
              </p>
              {selectedUser.role === "PROVIDER" && (
                <p>
                  <strong>Total Rating:</strong>{" "}
                  {selectedUser.providerTotalRating ?? "N/A"}
                </p>
              )}
              <p>
                <strong>Invoice Fee:</strong> {selectedUser.invoiceFee}
              </p>
            </div>
            <details className="mt-4">
              <summary className="cursor-pointer text-blue-600">
                Show full JSON
              </summary>
              <pre className="text-xs bg-gray-100 p-4 rounded overflow-x-auto">
                {JSON.stringify(selectedUser, null, 2)}
              </pre>
            </details>
            <button
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
              onClick={() => setSelectedUser(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
