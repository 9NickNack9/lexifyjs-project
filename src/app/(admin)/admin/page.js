"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

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
  const [reqs, setReqs] = useState([]);
  const [reqLoading, setReqLoading] = useState(false);
  const [reqError, setReqError] = useState("");
  const [reqSelected, setReqSelected] = useState(null); // details modal
  const [reqSearch, setReqSearch] = useState("");
  const [reqSkip, setReqSkip] = useState(0);
  const reqTake = 10;
  const [reqHasMore, setReqHasMore] = useState(true);
  const reqBoxId = "admin-requests-scroll-box";
  const scrollRef = useRef(null);
  // --- OFFERS state ---
  const [offers, setOffers] = useState([]);
  const [offerSearchInput, setOfferSearchInput] = useState("");
  const [offerSearch, setOfferSearch] = useState("");
  const [offerSkip, setOfferSkip] = useState(0);
  const offerTake = 10;
  const [offerHasMore, setOfferHasMore] = useState(true);
  const [offerLoading, setOfferLoading] = useState(false);
  const [offerSelected, setOfferSelected] = useState(null);

  const fetchOffers = async (reset = false) => {
    if (offerLoading) return;
    setOfferLoading(true);
    const nextSkip = reset ? 0 : offerSkip;
    try {
      const res = await fetch(
        `/api/admin/offers?search=${encodeURIComponent(
          offerSearch
        )}&skip=${nextSkip}&take=${offerTake}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("Failed to load offers");
      const data = await res.json();
      const nextList = reset ? data.offers : [...offers, ...data.offers];
      setOffers(nextList);
      setOfferSkip(nextSkip + data.offers.length);
      setOfferHasMore(nextList.length < data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setOfferLoading(false);
    }
  };

  const showOfferDetails = async (offerId) => {
    const res = await fetch(`/api/admin/offers/${offerId}`, {
      cache: "no-store",
    });
    if (res.ok) setOfferSelected(await res.json());
  };

  const deleteOffer = async (offerId) => {
    if (!confirm("Delete this offer?")) return;
    const res = await fetch(`/api/admin/offers/${offerId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      alert("Failed to delete offer.");
      return;
    }
    fetchOffers(true);
  };

  // --- CONTRACTS state ---
  const [contracts, setContracts] = useState([]);
  const [contractSearchInput, setContractSearchInput] = useState("");
  const [contractSearch, setContractSearch] = useState("");
  const [contractSkip, setContractSkip] = useState(0);
  const contractTake = 10;
  const [contractHasMore, setContractHasMore] = useState(true);
  const [contractLoading, setContractLoading] = useState(false);
  const [contractSelected, setContractSelected] = useState(null);

  const adminUsers = useMemo(
    () => users.filter((u) => u.role === "ADMIN"),
    [users]
  );

  const purchaserUsers = useMemo(
    () => users.filter((u) => u.role === "PURCHASER"),
    [users]
  );

  const providerUsers = useMemo(
    () => users.filter((u) => u.role === "PROVIDER"),
    [users]
  );

  const fetchContracts = async (reset = false) => {
    if (contractLoading) return;
    setContractLoading(true);
    const nextSkip = reset ? 0 : contractSkip;
    try {
      const res = await fetch(
        `/api/admin/contracts?search=${encodeURIComponent(
          contractSearch
        )}&skip=${nextSkip}&take=${contractTake}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("Failed to load contracts");
      const data = await res.json();
      const nextList = reset
        ? data.contracts
        : [...contracts, ...data.contracts];
      setContracts(nextList);
      setContractSkip(nextSkip + data.contracts.length);
      setContractHasMore(nextList.length < data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setContractLoading(false);
    }
  };

  const showContractDetails = async (contractId) => {
    const res = await fetch(`/api/admin/contracts/${contractId}`, {
      cache: "no-store",
    });
    if (res.ok) setContractSelected(await res.json());
  };

  const deleteContract = async (contractId) => {
    if (!confirm("Delete this contract?")) return;
    const res = await fetch(`/api/admin/contracts/${contractId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      alert("Failed to delete contract.");
      return;
    }
    fetchContracts(true);
  };

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

  const fetchRequests = async (reset = false) => {
    if (reqLoading) return;
    setReqLoading(true);
    setReqError("");

    const nextSkip = reset ? 0 : reqSkip;

    try {
      const res = await fetch(
        `/api/admin/requests?search=${encodeURIComponent(
          reqSearch
        )}&skip=${nextSkip}&take=${reqTake}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("Failed to load requests");
      const data = await res.json();

      const nextList = reset ? data.requests : [...reqs, ...data.requests];
      setReqs(nextList);
      setReqSkip(nextSkip + data.requests.length);
      setReqHasMore(nextList.length < data.total);
    } catch (e) {
      setReqError(e.message || "Error loading requests");
    } finally {
      setReqLoading(false);
    }
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
    fetchRequests(true);
    setOfferSkip(0);
    setOffers([]);
    setOfferHasMore(true);
    fetchOffers(true);

    setContractSkip(0);
    setContracts([]);
    setContractHasMore(true);
    fetchContracts(true);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, session, status]);

  useEffect(() => {
    // debounce search a little
    const t = setTimeout(() => {
      fetchRequests(true);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reqSearch]);

  useEffect(() => {
    const t = setTimeout(() => fetchOffers(true), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offerSearch]);

  useEffect(() => {
    const t = setTimeout(() => fetchContracts(true), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractSearch]);

  function formatTimeUntil(iso) {
    if (!iso) return "Expired";
    const now = Date.now();
    const end = new Date(iso).getTime();
    let diff = end - now;
    if (diff <= 0) return "Expired";

    const msecPerMinute = 60 * 1000;
    const msecPerHour = 60 * msecPerMinute;
    const msecPerDay = 24 * msecPerHour;
    const msecPerMonth = 30 * msecPerDay; // coarse

    const months = Math.floor(diff / msecPerMonth);
    diff -= months * msecPerMonth;
    const days = Math.floor(diff / msecPerDay);
    diff -= days * msecPerDay;
    const hours = Math.floor(diff / msecPerHour);
    diff -= hours * msecPerHour;
    const minutes = Math.floor(diff / msecPerMinute);

    const parts = [];
    if (months) parts.push(`${months} mo`);
    if (days) parts.push(`${days} d`);
    if (hours) parts.push(`${hours} h`);
    if (minutes && parts.length < 2) parts.push(`${minutes} min`);
    return parts.length ? parts.join(" ") : "Expired";
  }

  const ADMIN_REQUEST_STATES = [
    { value: "PENDING", label: "Pending" },
    { value: "EXPIRED", label: "Expired" },
    { value: "ON HOLD", label: "On Hold" },
    { value: "CONFLICT_CHECK", label: "Conflict Check" },
  ];

  const showRequestDetails = async (id) => {
    const res = await fetch(`/api/admin/requests/${id}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setReqSelected(data);
    }
  };

  const updateRequestState = async (id, newState) => {
    await fetch(`/api/admin/requests/${id}/state`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestState: newState }),
    });
    // refresh
    fetchRequests();
  };

  const deleteRequest = async (id) => {
    if (!confirm("Are you sure you want to delete this request?")) return;
    const res = await fetch(`/api/admin/requests/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Failed to delete request.");
      return;
    }
    fetchRequests();
  };

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

  const updateProviderType = async (id, value) => {
    await fetch(`/api/admin/users/${id}/providerType`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerType: value }),
    });
    fetchUsers(true);
  };

  const updateCompanyAge = async (id, value) => {
    await fetch(`/api/admin/users/${id}/companyAge`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyAge: Number(value) }),
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
      <br />
      <h2 className="text-xl font-bold mb-6">Registered Users</h2>

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
        className="overflow-y-auto max-h-[70vh] text-black p-2"
      >
        {/* --- Admin Users --- */}
        <h3 className="text-lg font-semibold mt-2 mb-2 text-white">
          Admin Users
        </h3>
        <table className="w-full border-collapse mb-6 bg-white">
          <thead className="bg-gray-200">
            <tr>
              <th className="border p-2">User ID</th>
              <th className="border p-2">Role</th>
              <th className="border p-2">Status</th>
              <th className="border p-2">Company</th>
              <th className="border p-2">Requests</th>
              <th className="border p-2">Offers</th>
              <th className="border p-2">Contracts</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {adminUsers.map((u) => (
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
                <td className="border p-2">{u.requestsCount}</td>
                <td className="border p-2">{u.offersCount}</td>
                <td className="border p-2">{u.contractsCount}</td>
                <td className="border p-2">
                  <button
                    onClick={() => deleteUser(u.userId)}
                    className="bg-red-500 text-white px-2 py-1 rounded cursor-pointer"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!adminUsers.length && !loading && (
              <tr>
                <td colSpan={8} className="text-center p-4 text-gray-500">
                  No admin users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* --- Registered Purchasers --- */}
        <h3 className="text-lg font-semibold mt-2 mb-2 text-white">
          Registered Purchasers
        </h3>
        <table className="w-full border-collapse mb-6 bg-white">
          <thead className="bg-gray-200">
            <tr>
              <th className="border p-2">User ID</th>
              <th className="border p-2">Role</th>
              <th className="border p-2">Status</th>
              <th className="border p-2">Company</th>
              <th className="border p-2">Requests</th>
              <th className="border p-2">Contracts</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {purchaserUsers.map((u) => (
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
                <td className="border p-2">{u.requestsCount}</td>
                <td className="border p-2">{u.contractsCount}</td>
                <td className="border p-2">
                  <button
                    onClick={() => deleteUser(u.userId)}
                    className="bg-red-500 text-white px-2 py-1 rounded cursor-pointer"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!purchaserUsers.length && !loading && (
              <tr>
                <td colSpan={7} className="text-center p-4 text-gray-500">
                  No purchasers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* --- Registered Providers --- */}
        <h3 className="text-lg font-semibold mt-2 mb-2 text-white">
          Registered Providers
        </h3>
        <table className="w-full border-collapse mb-2 bg-white">
          <thead className="bg-gray-200">
            <tr>
              <th className="border p-2">User ID</th>
              <th className="border p-2">Role</th>
              <th className="border p-2">Status</th>
              <th className="border p-2">Company</th>
              <th className="border p-2">Total Rating</th>
              <th className="border p-2">Invoice Fee</th>
              <th className="border p-2">Company Age</th>
              <th className="border p-2">Provider Type</th>
              <th className="border p-2">Offers</th>
              <th className="border p-2">Contracts</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {providerUsers.map((u) => (
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
                    className="w-20 border p-1 text-center"
                  />
                </td>
                <td className="border p-2">
                  <input
                    type="number"
                    min={0}
                    defaultValue={u.companyAge ?? 0}
                    onBlur={(e) => updateCompanyAge(u.userId, e.target.value)}
                    className="w-24 border p-1 text-center"
                  />
                </td>
                <td className="border p-2">
                  <select
                    className="border rounded text-center"
                    value={
                      u.providerType && u.providerType.trim()
                        ? u.providerType
                        : "N/A"
                    }
                    onChange={(e) =>
                      updateProviderType(u.userId, e.target.value)
                    }
                  >
                    <option value="N/A">N/A</option>
                    <option value="Attorneys-at-law">Attorneys-at-law</option>
                    <option value="Law Firm">Law Firm</option>
                  </select>
                </td>
                <td className="border p-2">{u.offersCount}</td>
                <td className="border p-2">{u.contractsCount}</td>
                <td className="border p-2">
                  <button
                    onClick={() => deleteUser(u.userId)}
                    className="bg-red-500 text-white px-2 py-1 rounded cursor-pointer"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!providerUsers.length && !loading && (
              <tr>
                <td colSpan={11} className="text-center p-4 text-gray-500">
                  No providers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {hasMore && !loading && users.length > 0 && (
          <button
            onClick={() => fetchUsers(false)}
            className="w-full bg-gray-100 p-2 mt-2"
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
              +
              <p>
                <strong>Company Age:</strong> {selectedUser.companyAge ?? 0}
              </p>
              <p>
                <strong>Founding Year:</strong>{" "}
                {selectedUser.companyFoundingYear ?? "—"}
              </p>
              <p>
                <strong>Provider Type:</strong>{" "}
                {selectedUser.providerType && selectedUser.providerType.trim()
                  ? selectedUser.providerType
                  : "N/A"}
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
      <br />
      <div className="mb-3 flex items-center gap-2">
        <input
          type="text"
          value={reqSearch}
          onChange={(e) => setReqSearch(e.target.value)}
          placeholder="Search by company name or request title…"
          className="border rounded p-2 w-full max-w-md"
        />
        <button
          className="px-3 py-2 rounded bg-gray-200 text-black"
          onClick={() => {
            setReqSearch("");
            fetchRequests(true);
          }}
        >
          Clear
        </button>
      </div>

      <h2 className="text-xl font-bold mb-6">All Purchaser Requests</h2>

      <div
        id={reqBoxId}
        className="overflow-y-auto max-h-[70vh] border rounded bg-white text-black"
      >
        <table className="w-full border-collapse">
          <thead className="bg-gray-200">
            <tr>
              <th className="border p-2">Request ID</th>
              <th className="border p-2">Company</th>
              <th className="border p-2">Title</th>
              <th className="border p-2">Request State</th>
              <th className="border p-2">Offers</th>
              <th className="border p-2">Time Until Expiration</th>
              <th className="border p-2">Time Until Rejection of All Offers</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reqLoading && (
              <tr>
                <td colSpan={8} className="text-center p-4">
                  Loading…
                </td>
              </tr>
            )}
            {!reqLoading && reqError && (
              <tr>
                <td colSpan={8} className="text-center p-4 text-red-600">
                  {reqError}
                </td>
              </tr>
            )}
            {!reqLoading && !reqError && reqs.length === 0 && (
              <>
                <tr>
                  <td colSpan={8} className="text-center p-4 text-gray-500">
                    There are no requests made yet.
                  </td>
                </tr>
              </>
            )}
            {!reqLoading &&
              !reqError &&
              reqs.map((r) => {
                const timeLabel =
                  r.requestState === "EXPIRED"
                    ? "Expired"
                    : formatTimeUntil(r.offersDeadline);
                let rejectLabel;
                if (!r.acceptDeadline) {
                  rejectLabel = "N/A"; // no deadline set
                } else {
                  const end = new Date(r.acceptDeadline).getTime();
                  if (Number.isNaN(end) || end <= Date.now()) {
                    rejectLabel = "Expired";
                  } else {
                    rejectLabel = formatTimeUntil(r.acceptDeadline);
                  }
                }
                return (
                  <tr key={r.requestId} className="text-center">
                    <td
                      className="border p-2 text-blue-600 cursor-pointer underline"
                      onClick={() => showRequestDetails(r.requestId)}
                    >
                      {r.requestId}
                    </td>
                    <td className="border p-2">{r.clientCompanyName || "—"}</td>
                    <td className="border p-2">{r.title || "—"}</td>
                    <td className="border p-2">
                      <select
                        className="border rounded"
                        value={r.requestState}
                        onChange={(e) =>
                          updateRequestState(r.requestId, e.target.value)
                        }
                      >
                        {ADMIN_REQUEST_STATES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="border p-2">{r.offersCount ?? 0}</td>
                    <td className="border p-2">{timeLabel}</td>
                    <td className="border p-2">{rejectLabel}</td>
                    <td className="border p-2">
                      {r.requestState === "CONFLICT_CHECK" ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="text-sm text-left">
                            <div>
                              <strong>Selected Provider:</strong>{" "}
                              {r.selectedOfferCompanyName || "—"}
                            </div>
                            <div>
                              <strong>Offer Lawyer:</strong>{" "}
                              {r.selectedOfferLawyer || "—"}
                            </div>
                          </div>
                          <div className="flex gap-2 justify-center">
                            <button
                              className="bg-green-600 text-white px-2 py-1 rounded cursor-pointer"
                              onClick={async () => {
                                const ok = confirm(
                                  "Are you sure you want to APPROVE this conflict check?"
                                );
                                if (!ok) return;

                                await fetch(
                                  `/api/admin/requests/${r.requestId}/conflict`,
                                  {
                                    method: "PUT",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                      decision: "accept",
                                    }),
                                  }
                                );

                                window.location.reload();
                              }}
                            >
                              Approve Conflict Check
                            </button>

                            <button
                              className="bg-red-600 text-white px-2 py-1 rounded cursor-pointer"
                              onClick={async () => {
                                const ok = confirm(
                                  "Are you sure you want to DENY this offer and replace it?"
                                );
                                if (!ok) return;

                                await fetch(
                                  `/api/admin/requests/${r.requestId}/conflict`,
                                  {
                                    method: "PUT",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({ decision: "deny" }),
                                  }
                                );

                                window.location.reload();
                              }}
                            >
                              Deny & Replace Offer
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => deleteRequest(r.requestId)}
                          className="bg-red-500 text-white px-2 py-1 rounded"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            {!reqLoading &&
              !reqError &&
              reqs.map((r) => {
                // ...row rendering stays exactly the same...
              })}

            {/* Load more button, like in the other tables */}
            {reqHasMore && !reqLoading && reqs.length > 0 && (
              <tr>
                <td colSpan={8} className="p-2">
                  <button
                    onClick={() => fetchRequests(false)}
                    className="w-full bg-gray-100 p-2"
                  >
                    Load more
                  </button>
                </td>
              </tr>
            )}

            {reqLoading && reqHasMore && (
              <tr>
                <td colSpan={8} className="text-center p-3 text-gray-500">
                  Loading more…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Request details modal */}
      {reqSelected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded max-w-3xl max-h-[80vh] overflow-y-auto text-black">
            <h2 className="text-xl font-bold mb-4">Request Details</h2>
            <div className="space-y-2">
              <p>
                <strong>Request ID:</strong> {reqSelected.requestId}
              </p>
              <p>
                <strong>Company:</strong> {reqSelected.clientCompanyName}
              </p>
              <p>
                <strong>State:</strong> {reqSelected.requestState}
              </p>
              <p>
                <strong>Title:</strong> {reqSelected.title || "—"}
              </p>
              <p>
                <strong>Primary Contact:</strong>{" "}
                {reqSelected.primaryContactPerson || "—"}
              </p>
              <p>
                <strong>Offers Deadline:</strong>{" "}
                {reqSelected.offersDeadline
                  ? new Date(reqSelected.offersDeadline).toLocaleString()
                  : "—"}
              </p>
              <p>
                <strong>Accept Deadline:</strong>{" "}
                {reqSelected.acceptDeadline
                  ? new Date(reqSelected.acceptDeadline).toLocaleString()
                  : "—"}
              </p>
              <p>
                <strong>Offers Count:</strong> {reqSelected.offersCount ?? 0}
              </p>
            </div>
            <details className="mt-4">
              <summary className="cursor-pointer text-blue-600">
                Show full JSON
              </summary>
              <pre className="text-xs bg-gray-100 p-4 rounded overflow-x-auto">
                {JSON.stringify(reqSelected, null, 2)}
              </pre>
            </details>
            <button
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
              onClick={() => setReqSelected(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* --- All Offers --- */}
      <br />
      <h2 className="text-xl font-bold mb-2">All Offers</h2>
      <div className="mb-3 flex items-center gap-2">
        <input
          type="text"
          value={offerSearchInput}
          onChange={(e) => {
            const val = e.target.value;
            setOfferSearchInput(val);
            setOfferSearch(val.trim()); // triggers debounced fetchOffers via useEffect
          }}
          placeholder="Search by provider company, offer title or request title…"
          className="border rounded p-2 w-full max-w-md"
        />
        <button
          className="bg-[#11999e] text-white px-3 py-2 rounded border cursor-pointer"
          onClick={() => setOfferSearch(offerSearchInput.trim())}
        >
          Search
        </button>
        <button
          className="bg-red-500 text-white px-3 py-2 rounded cursor-pointer"
          onClick={() => {
            setOfferSearchInput("");
            setOfferSearch("");
          }}
        >
          Clear
        </button>
      </div>

      <div className="overflow-y-auto max-h-[60vh] border rounded bg-white text-black">
        <table className="w-full border-collapse">
          <thead className="bg-gray-200">
            <tr>
              <th className="border p-2">Offer Id</th>
              <th className="border p-2">Company</th>
              <th className="border p-2">Offer Title</th>
              <th className="border p-2">Request Title</th>
              <th className="border p-2">Offer Status</th>
              <th className="border p-2">Offer Price</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!offerLoading && offers.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center p-4 text-gray-500">
                  No offers found.
                </td>
              </tr>
            )}
            {offers.map((o) => (
              <tr key={o.offerId} className="text-center">
                <td
                  className="border p-2 text-blue-600 cursor-pointer underline"
                  onClick={() => showOfferDetails(o.offerId)}
                >
                  {o.offerId}
                </td>
                <td className="border p-2">{o.companyName || "—"}</td>
                <td className="border p-2">{o.offerTitle || "—"}</td>
                <td className="border p-2">{o.requestTitle || "—"}</td>
                <td className="border p-2">{o.offerStatus || "—"}</td>
                <td className="border p-2">{o.offerPrice ?? "—"}</td>
                <td className="border p-2">
                  <button
                    onClick={() => deleteOffer(o.offerId)}
                    className="bg-red-500 text-white px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}

            {offerLoading && (
              <tr>
                <td colSpan={7} className="text-center p-4">
                  Loading…
                </td>
              </tr>
            )}
            {offerHasMore && !offerLoading && offers.length > 0 && (
              <tr>
                <td colSpan={7} className="p-2">
                  <button
                    onClick={() => fetchOffers(false)}
                    className="w-full bg-gray-100 p-2"
                  >
                    Load more
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Offer details modal */}
      {offerSelected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded max-w-3xl max-h-[80vh] overflow-y-auto text-black">
            <h2 className="text-xl font-bold mb-4">Offer Details</h2>
            <pre className="text-xs bg-gray-100 p-4 rounded overflow-x-auto">
              {JSON.stringify(offerSelected, null, 2)}
            </pre>
            <button
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
              onClick={() => setOfferSelected(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* --- All Contracts --- */}
      <br />
      <h2 className="text-xl font-bold mb-2">All Contracts</h2>
      <div className="mb-3 flex items-center gap-2">
        <input
          type="text"
          value={contractSearchInput}
          onChange={(e) => setContractSearchInput(e.target.value)}
          placeholder="Search by client or provider company…"
          className="border rounded p-2 w-full max-w-md"
        />
        <button
          className="bg-[#11999e] text-white px-3 py-2 rounded border cursor-pointer"
          onClick={() => setContractSearch(contractSearchInput.trim())}
        >
          Search
        </button>
        <button
          className="bg-red-500 text-white px-3 py-2 rounded cursor-pointer"
          onClick={() => {
            setContractSearchInput("");
            setContractSearch("");
          }}
        >
          Clear
        </button>
      </div>

      <div className="overflow-y-auto max-h-[60vh] border rounded bg-white text-black">
        <table className="w-full border-collapse">
          <thead className="bg-gray-200">
            <tr>
              <th className="border p-2">Contract Id</th>
              <th className="border p-2">Client Company</th>
              <th className="border p-2">Provider Company</th>
              <th className="border p-2">Contract Date</th>
              <th className="border p-2">Contract Price</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!contractLoading && contracts.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center p-4 text-gray-500">
                  No contracts found.
                </td>
              </tr>
            )}
            {contracts.map((c) => (
              <tr key={c.contractId} className="text-center">
                <td
                  className="border p-2 text-blue-600 cursor-pointer underline"
                  onClick={() => showContractDetails(c.contractId)}
                >
                  {c.contractId}
                </td>
                <td className="border p-2">{c.clientCompanyName || "—"}</td>
                <td className="border p-2">{c.providerCompanyName || "—"}</td>
                <td className="border p-2">
                  {c.contractDate
                    ? new Date(c.contractDate).toLocaleDateString()
                    : "—"}
                </td>
                <td className="border p-2">{c.contractPrice ?? "—"}</td>
                <td className="border p-2">
                  <button
                    onClick={() => deleteContract(c.contractId)}
                    className="bg-red-500 text-white px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {contractLoading && (
              <tr>
                <td colSpan={6} className="text-center p-4">
                  Loading…
                </td>
              </tr>
            )}
            {contractHasMore && !contractLoading && contracts.length > 0 && (
              <tr>
                <td colSpan={6} className="p-2">
                  <button
                    onClick={() => fetchContracts(false)}
                    className="w-full bg-gray-100 p-2"
                  >
                    Load more
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Contract details modal */}
      {contractSelected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded max-w-3xl max-h-[80vh] overflow-y-auto text-black">
            <h2 className="text-xl font-bold mb-4">Contract Details</h2>
            <pre className="text-xs bg-gray-100 p-4 rounded overflow-x-auto">
              {JSON.stringify(contractSelected, null, 2)}
            </pre>
            <button
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
              onClick={() => setContractSelected(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
