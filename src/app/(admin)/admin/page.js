"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  // --- USERS state ---
  const [searchInput, setSearchInput] = useState(""); // typing here
  const [search, setSearch] = useState(""); // committed query
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

  const TAKE = 10;

  const initTable = { items: [], skip: 0, hasMore: true, loading: false };

  const [userTables, setUserTables] = useState({
    ADMIN: { ...initTable },
    PURCHASER: { ...initTable },
    PROVIDER: { ...initTable },
  });

  const [companyTables, setCompanyTables] = useState({
    PURCHASER: { ...initTable },
    PROVIDER: { ...initTable },
  });

  const [accountTables, setAccountTables] = useState({
    ADMIN: { ...initTable },
    PURCHASER: { ...initTable },
    PROVIDER: { ...initTable },
  });

  // --- COMPANIES state ---
  const [companySearchInput, setCompanySearchInput] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const companyTake = 10;

  // --- USERACCOUNTS state ---
  const [accountSearchInput, setAccountSearchInput] = useState("");
  const [accountSearch, setAccountSearch] = useState("");
  const accountTake = 10;

  // --- COMPANY details modal ---
  const [selectedCompany, setSelectedCompany] = useState(null);

  const showCompanyDetails = async (id) => {
    const res = await fetch(`/api/admin/companies/${id}`, {
      cache: "no-store",
    });
    if (res.ok) setSelectedCompany(await res.json());
  };

  // --- USERACCOUNT details modal ---
  const [selectedAccount, setSelectedAccount] = useState(null);

  const showAccountDetails = async (id) => {
    const res = await fetch(`/api/admin/useraccounts/${id}`, {
      cache: "no-store",
    });
    if (res.ok) setSelectedAccount(await res.json());
  };

  async function fetchUsersByRole(role, reset = false) {
    setUserTables((prev) => {
      if (prev[role].loading) return prev;
      return { ...prev, [role]: { ...prev[role], loading: true } };
    });

    const nextSkip = reset ? 0 : userTables[role].skip;

    try {
      const res = await fetch(
        `/api/admin/users?role=${role}&search=${encodeURIComponent(search)}&skip=${nextSkip}&take=${TAKE}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();

      setUserTables((prev) => {
        const nextItems = reset
          ? data.users
          : [...prev[role].items, ...data.users];
        return {
          ...prev,
          [role]: {
            ...prev[role],
            items: nextItems,
            skip: nextSkip + data.users.length,
            hasMore: data.hasMore,
            loading: false,
          },
        };
      });
    } catch (e) {
      console.error(e);
      setUserTables((prev) => ({
        ...prev,
        [role]: { ...prev[role], loading: false },
      }));
    }
  }

  async function fetchCompaniesByRole(role, reset = false) {
    setCompanyTables((prev) => {
      if (prev[role].loading) return prev;
      return { ...prev, [role]: { ...prev[role], loading: true } };
    });

    const nextSkip = reset ? 0 : companyTables[role].skip;

    try {
      const res = await fetch(
        `/api/admin/companies?role=${role}&search=${encodeURIComponent(companySearch)}&skip=${nextSkip}&take=${TAKE}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("Failed to load companies");
      const data = await res.json();

      setCompanyTables((prev) => {
        const nextItems = reset
          ? data.companies
          : [...prev[role].items, ...data.companies];
        return {
          ...prev,
          [role]: {
            ...prev[role],
            items: nextItems,
            skip: nextSkip + data.companies.length,
            hasMore: data.hasMore,
            loading: false,
          },
        };
      });
    } catch (e) {
      console.error(e);
      setCompanyTables((prev) => ({
        ...prev,
        [role]: { ...prev[role], loading: false },
      }));
    }
  }

  const updateCompanyBusinessId = async (companyPkId, newBusinessId, role) => {
    const res = await fetch(`/api/admin/companies/${companyPkId}/businessId`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId: newBusinessId }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data?.error || "Failed to update Business ID.");
      // reload table state so the input doesn't lie
      fetchCompaniesByRole(role, true);
      return;
    }

    // refresh the table so you see the persisted value
    fetchCompaniesByRole(role, true);
  };

  async function fetchAccountsByRole(role, reset = false) {
    setAccountTables((prev) => {
      if (prev[role].loading) return prev;
      return { ...prev, [role]: { ...prev[role], loading: true } };
    });

    const nextSkip = reset ? 0 : accountTables[role].skip;

    try {
      const res = await fetch(
        `/api/admin/useraccounts?role=${role}&search=${encodeURIComponent(accountSearch)}&skip=${nextSkip}&take=${TAKE}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("Failed to load user accounts");
      const data = await res.json();

      setAccountTables((prev) => {
        const nextItems = reset
          ? data.accounts
          : [...prev[role].items, ...data.accounts];
        return {
          ...prev,
          [role]: {
            ...prev[role],
            items: nextItems,
            skip: nextSkip + data.accounts.length,
            hasMore: data.hasMore,
            loading: false,
          },
        };
      });
    } catch (e) {
      console.error(e);
      setAccountTables((prev) => ({
        ...prev,
        [role]: { ...prev[role], loading: false },
      }));
    }
  }

  /*
  const runBackfill = async () => {
    const ok = confirm("Run data backfill now? This may take a while.");
    if (!ok) return;

    const res = await fetch("/api/admin/backfill", { method: "POST" });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(`Backfill failed: ${data?.error || "Unknown error"}`);
      return;
    }

    alert("Backfill completed.");
    // Optional: refresh the new tables
    fetchCompanies(true);
    fetchAccounts(true);
  };*/

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
          offerSearch,
        )}&skip=${nextSkip}&take=${offerTake}`,
        { cache: "no-store" },
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

  const fetchContracts = async (reset = false) => {
    if (contractLoading) return;
    setContractLoading(true);
    const nextSkip = reset ? 0 : contractSkip;
    try {
      const res = await fetch(
        `/api/admin/contracts?search=${encodeURIComponent(
          contractSearch,
        )}&skip=${nextSkip}&take=${contractTake}`,
        { cache: "no-store" },
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

  const fetchRequests = async (reset = false) => {
    if (reqLoading) return;
    setReqLoading(true);
    setReqError("");

    const nextSkip = reset ? 0 : reqSkip;

    try {
      const res = await fetch(
        `/api/admin/requests?search=${encodeURIComponent(
          reqSearch,
        )}&skip=${nextSkip}&take=${reqTake}`,
        { cache: "no-store" },
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

    // reset all role tables
    setUserTables({
      ADMIN: { ...initTable },
      PURCHASER: { ...initTable },
      PROVIDER: { ...initTable },
    });
    setCompanyTables({
      PURCHASER: { ...initTable },
      PROVIDER: { ...initTable },
    });
    setAccountTables({
      ADMIN: { ...initTable },
      PURCHASER: { ...initTable },
      PROVIDER: { ...initTable },
    });

    // fetch first page for each table
    fetchUsersByRole("ADMIN", true);
    fetchUsersByRole("PURCHASER", true);
    fetchUsersByRole("PROVIDER", true);

    fetchCompaniesByRole("PURCHASER", true);
    fetchCompaniesByRole("PROVIDER", true);

    fetchAccountsByRole("ADMIN", true);
    fetchAccountsByRole("PURCHASER", true);
    fetchAccountsByRole("PROVIDER", true);

    // reset state before new fetch
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
  }, [search, companySearch, accountSearch, session, status]);

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

  const updateRegisterStatus = async (id, newStatus, role) => {
    await fetch(`/api/admin/users/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registerStatus: newStatus }),
    });
    fetchUsersByRole(role, true);
  };

  const updateCompanyRegisterStatus = async (companyPkId, newStatus, role) => {
    await fetch(`/api/admin/companies/${companyPkId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registerStatus: newStatus }),
    });
    fetchCompaniesByRole(role, true);
  };

  const updateAccountRegisterStatus = async (userPkId, newStatus, role) => {
    await fetch(`/api/admin/useraccounts/${userPkId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registerStatus: newStatus }),
    });
    fetchAccountsByRole(role, true);
  };

  const updateInvoiceFee = async (id, newFee, role) => {
    await fetch(`/api/admin/users/${id}/invoiceFee`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceFee: Number(newFee) }),
    });
    fetchUsersByRole(role, true);
  };

  const updateProviderType = async (id, value, role) => {
    await fetch(`/api/admin/users/${id}/providerType`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerType: value }),
    });
    fetchUsersByRole(role, true);
  };

  const updateCompanyAge = async (id, value, role) => {
    await fetch(`/api/admin/users/${id}/companyAge`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyAge: Number(value) }),
    });
    fetchUsersByRole(role, true);
  };

  const deleteUser = async (id, role) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    fetchUsersByRole(role, true);
  };

  const deleteCompany = async (companyPkId) => {
    const ok = confirm(
      "Are you sure you want to delete this company? This will also delete related user accounts due to cascade rules.",
    );
    if (!ok) return;

    const res = await fetch(`/api/admin/companies/${companyPkId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      alert("Failed to delete company.");
      return;
    }

    // refresh both company role tables (we don't know the company's role here)
    fetchCompaniesByRole("PURCHASER", true);
    fetchCompaniesByRole("PROVIDER", true);

    // refresh all account tables (company delete can cascade accounts)
    fetchAccountsByRole("ADMIN", true);
    fetchAccountsByRole("PURCHASER", true);
    fetchAccountsByRole("PROVIDER", true);
  };

  const deleteAccount = async (userPkId, role) => {
    if (!confirm("Are you sure you want to delete this user account?")) return;

    const res = await fetch(`/api/admin/useraccounts/${userPkId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      alert("Failed to delete user account.");
      return;
    }

    fetchAccountsByRole(role, true);
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
      {/* === USERS / COMPANIES / USERACCOUNTS (VISIBLE IMMEDIATELY) === */}
      <div className="flex flex-col gap-6">
        {/* ===================== USERS ===================== */}
        <section className="rounded bg-black/20 p-4">
          <h2 className="text-xl font-bold mb-3 text-white">
            Registered Users
          </h2>

          <div className="flex items-center gap-2 mb-4">
            <input
              type="text"
              placeholder="Search by company name"
              className="border p-2 w-full"
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
              onClick={() => {
                setSearchInput("");
                setSearch(""); // triggers role table reset+fetch via useEffect
              }}
            >
              Clear
            </button>
          </div>

          {/* --- Admin Users --- */}
          <h3 className="text-lg font-semibold mt-2 mb-2 text-white">
            Admin Users
          </h3>
          <div className="max-h-[28vh] overflow-y-auto border rounded bg-white text-black">
            <table className="w-full border-collapse">
              <thead className="bg-gray-200 sticky top-0">
                <tr>
                  <th className="border p-2">User ID</th>
                  <th className="border p-2">Role</th>
                  <th className="border p-2">Status</th>
                  <th className="border p-2">Company</th>
                  <th className="border p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {userTables.ADMIN.items.map((u) => (
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
                          updateRegisterStatus(u.userId, e.target.value, u.role)
                        }
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                      </select>
                    </td>
                    <td className="border p-2">{u.companyName}</td>
                    <td className="border p-2">
                      <button
                        onClick={() => deleteUser(u.userId, u.role)}
                        className="bg-red-500 text-white px-2 py-1 rounded cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}

                {!userTables.ADMIN.loading &&
                  userTables.ADMIN.items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center p-4 text-gray-500">
                        No admin users found.
                      </td>
                    </tr>
                  )}

                {userTables.ADMIN.loading && (
                  <tr>
                    <td colSpan={5} className="text-center p-4">
                      Loading…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {userTables.ADMIN.hasMore && !userTables.ADMIN.loading && (
            <button
              onClick={() => fetchUsersByRole("ADMIN", false)}
              className="w-full bg-gray-100 p-2 mt-2 rounded text-black"
            >
              Load more
            </button>
          )}

          {/* --- Purchasers --- */}
          <h3 className="text-lg font-semibold mt-6 mb-2 text-white">
            Registered Purchasers
          </h3>
          <div className="max-h-[28vh] overflow-y-auto border rounded bg-white text-black">
            <table className="w-full border-collapse">
              <thead className="bg-gray-200 sticky top-0">
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
                {userTables.PURCHASER.items.map((u) => (
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
                          updateRegisterStatus(u.userId, e.target.value, u.role)
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

                {!userTables.PURCHASER.loading &&
                  userTables.PURCHASER.items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center p-4 text-gray-500">
                        No purchasers found.
                      </td>
                    </tr>
                  )}

                {userTables.PURCHASER.loading && (
                  <tr>
                    <td colSpan={7} className="text-center p-4">
                      Loading…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {userTables.PURCHASER.hasMore && !userTables.PURCHASER.loading && (
            <button
              onClick={() => fetchUsersByRole("PURCHASER", false)}
              className="w-full bg-gray-100 p-2 mt-2 rounded text-black"
            >
              Load more
            </button>
          )}

          {/* --- Providers --- */}
          <h3 className="text-lg font-semibold mt-6 mb-2 text-white">
            Registered Providers
          </h3>
          <div className="max-h-[28vh] overflow-y-auto border rounded bg-white text-black">
            <table className="w-full border-collapse">
              <thead className="bg-gray-200 sticky top-0">
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
                {userTables.PROVIDER.items.map((u) => (
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
                          updateRegisterStatus(u.userId, e.target.value, u.role)
                        }
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                      </select>
                    </td>
                    <td className="border p-2">{u.companyName}</td>
                    <td className="border p-2">
                      {u.providerTotalRating ?? "N/A"}
                    </td>
                    <td className="border p-2">
                      <input
                        type="number"
                        defaultValue={u.invoiceFee}
                        onBlur={(e) =>
                          updateInvoiceFee(u.userId, e.target.value, u.role)
                        }
                        className="w-20 border p-1 text-center"
                      />
                    </td>
                    <td className="border p-2">
                      <input
                        type="number"
                        min={0}
                        defaultValue={u.companyAge ?? 0}
                        onBlur={(e) =>
                          updateCompanyAge(u.userId, e.target.value, u.role)
                        }
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
                          updateProviderType(u.userId, e.target.value, u.role)
                        }
                      >
                        <option value="N/A">N/A</option>
                        <option value="Attorneys-at-law">
                          Attorneys-at-law
                        </option>
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

                {!userTables.PROVIDER.loading &&
                  userTables.PROVIDER.items.length === 0 && (
                    <tr>
                      <td
                        colSpan={11}
                        className="text-center p-4 text-gray-500"
                      >
                        No providers found.
                      </td>
                    </tr>
                  )}

                {userTables.PROVIDER.loading && (
                  <tr>
                    <td colSpan={11} className="text-center p-4">
                      Loading…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {userTables.PROVIDER.hasMore && !userTables.PROVIDER.loading && (
            <button
              onClick={() => fetchUsersByRole("PROVIDER", false)}
              className="w-full bg-gray-100 p-2 mt-2 rounded text-black"
            >
              Load more
            </button>
          )}
        </section>

        {/* ===================== COMPANIES ===================== */}
        <section className="rounded bg-black/20 p-4">
          <h2 className="text-xl font-bold mb-3 text-white">Companies</h2>

          <div className="mb-3 flex items-center gap-2">
            <input
              type="text"
              value={companySearchInput}
              onChange={(e) => {
                const val = e.target.value;
                setCompanySearchInput(val);
                setCompanySearch(val.trim());
              }}
              placeholder="Search companies by name…"
              className="border rounded p-2 w-full"
            />
            <button
              className="bg-[#11999e] text-white px-3 py-2 rounded border cursor-pointer"
              onClick={() => setCompanySearch(companySearchInput.trim())}
            >
              Search
            </button>
            <button
              className="bg-red-500 text-white px-3 py-2 rounded cursor-pointer"
              onClick={() => {
                setCompanySearchInput("");
                setCompanySearch(""); // triggers reset+fetch via useEffect
              }}
            >
              Clear
            </button>
          </div>

          {/* Purchaser Companies */}
          <h3 className="text-lg font-semibold mt-2 mb-2 text-white">
            Purchaser Companies
          </h3>
          <div className="max-h-[40vh] overflow-y-auto border rounded bg-white text-black">
            <table className="w-full border-collapse">
              <thead className="bg-gray-200 sticky top-0">
                <tr>
                  <th className="border p-2">Company ID</th>
                  <th className="border p-2">Role</th>
                  <th className="border p-2">Register Status</th>
                  <th className="border p-2">Company</th>
                  <th className="border p-2">Business Id</th>
                  <th className="border p-2">Members</th>
                  <th className="border p-2">Requests</th>
                  <th className="border p-2">Contracts</th>
                  <th className="border p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {companyTables.PURCHASER.items.map((c) => (
                  <tr key={c.companyPkId} className="text-center">
                    <td
                      className="border p-2 text-blue-600 cursor-pointer underline"
                      onClick={() => showCompanyDetails(c.companyPkId)}
                    >
                      {c.companyPkId}
                    </td>
                    <td className="border p-2">{c.role}</td>
                    <td className="border p-2">
                      <select
                        className="border rounded"
                        value={c.registerStatus}
                        onChange={(e) =>
                          updateCompanyRegisterStatus(
                            c.companyPkId,
                            e.target.value,
                            c.role,
                          )
                        }
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                      </select>
                    </td>
                    <td className="border p-2">{c.companyName}</td>

                    <td className="border p-2">
                      <input
                        type="text"
                        defaultValue={c.businessId || ""}
                        onBlur={(e) =>
                          updateCompanyBusinessId(
                            c.companyPkId,
                            e.target.value,
                            c.role,
                          )
                        }
                        className="w-48 border p-1 text-center"
                      />
                    </td>
                    <td className="border p-2">{c.membersCount ?? 0}</td>
                    <td className="border p-2">{c.requestsCount ?? 0}</td>
                    <td className="border p-2">{c.contractsCount ?? 0}</td>
                    <td className="border p-2">
                      <button
                        onClick={() => deleteCompany(c.companyPkId, c.role)}
                        className="bg-red-500 text-white px-2 py-1 rounded cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}

                {!companyTables.PURCHASER.loading &&
                  companyTables.PURCHASER.items.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center p-4 text-gray-500">
                        No purchaser companies found.
                      </td>
                    </tr>
                  )}

                {companyTables.PURCHASER.loading && (
                  <tr>
                    <td colSpan={9} className="text-center p-4">
                      Loading…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {companyTables.PURCHASER.hasMore &&
            !companyTables.PURCHASER.loading && (
              <button
                onClick={() => fetchCompaniesByRole("PURCHASER", false)}
                className="w-full bg-gray-100 p-2 mt-2 rounded text-black"
              >
                Load more
              </button>
            )}

          {/* Provider Companies */}
          <h3 className="text-lg font-semibold mt-6 mb-2 text-white">
            Provider Companies
          </h3>
          <div className="max-h-[40vh] overflow-y-auto border rounded bg-white text-black">
            <table className="w-full border-collapse">
              <thead className="bg-gray-200 sticky top-0">
                <tr>
                  <th className="border p-2">Company ID</th>
                  <th className="border p-2">Role</th>
                  <th className="border p-2">Register Status</th>
                  <th className="border p-2">Company</th>
                  <th className="border p-2">Business Id</th>
                  <th className="border p-2">Invoice Fee</th>
                  <th className="border p-2">Company Age</th>
                  <th className="border p-2">Provider Type</th>
                  <th className="border p-2">Members</th>
                  <th className="border p-2">Offers</th>
                  <th className="border p-2">Rating</th>
                  <th className="border p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {companyTables.PROVIDER.items.map((c) => (
                  <tr key={c.companyPkId} className="text-center">
                    <td
                      className="border p-2 text-blue-600 cursor-pointer underline"
                      onClick={() => showCompanyDetails(c.companyPkId)}
                    >
                      {c.companyPkId}
                    </td>
                    <td className="border p-2">{c.role}</td>
                    <td className="border p-2">
                      <select
                        className="border rounded"
                        value={c.registerStatus}
                        onChange={(e) =>
                          updateCompanyRegisterStatus(
                            c.companyPkId,
                            e.target.value,
                            c.role,
                          )
                        }
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                      </select>
                    </td>
                    <td className="border p-2">{c.companyName}</td>
                    <td className="border p-2">
                      <input
                        type="text"
                        defaultValue={c.businessId || ""}
                        onBlur={(e) =>
                          updateCompanyBusinessId(
                            c.companyPkId,
                            e.target.value,
                            c.role,
                          )
                        }
                        className="w-48 border p-1 text-center"
                      />
                    </td>
                    <td className="border p-2">{c.invoiceFee ?? "—"}</td>
                    <td className="border p-2">{c.companyAge ?? "—"}</td>
                    <td className="border p-2">{c.providerType ?? "—"}</td>
                    <td className="border p-2">{c.membersCount ?? 0}</td>
                    <td className="border p-2">{c.offersCount ?? 0}</td>
                    <td className="border p-2">
                      {c.providerTotalRating ?? "—"}
                    </td>
                    <td className="border p-2">
                      <button
                        onClick={() => deleteCompany(c.companyPkId)}
                        className="bg-red-500 text-white px-2 py-1 rounded cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}

                {!companyTables.PROVIDER.loading &&
                  companyTables.PROVIDER.items.length === 0 && (
                    <tr>
                      <td
                        colSpan={12}
                        className="text-center p-4 text-gray-500"
                      >
                        No provider companies found.
                      </td>
                    </tr>
                  )}

                {companyTables.PROVIDER.loading && (
                  <tr>
                    <td colSpan={12} className="text-center p-4">
                      Loading…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {companyTables.PROVIDER.hasMore &&
            !companyTables.PROVIDER.loading && (
              <button
                onClick={() => fetchCompaniesByRole("PROVIDER", false)}
                className="w-full bg-gray-100 p-2 mt-2 rounded text-black"
              >
                Load more
              </button>
            )}
        </section>

        {/* ===================== USER ACCOUNTS ===================== */}
        <section className="rounded bg-black/20 p-4">
          <h2 className="text-xl font-bold mb-3 text-white">User Accounts</h2>

          <div className="mb-3 flex items-center gap-2">
            <input
              type="text"
              value={accountSearchInput}
              onChange={(e) => {
                const val = e.target.value;
                setAccountSearchInput(val);
                setAccountSearch(val.trim());
              }}
              placeholder="Search by last name, email, or company…"
              className="border rounded p-2 w-full"
            />
            <button
              className="bg-[#11999e] text-white px-3 py-2 rounded border cursor-pointer"
              onClick={() => setAccountSearch(accountSearchInput.trim())}
            >
              Search
            </button>
            <button
              className="bg-red-500 text-white px-3 py-2 rounded cursor-pointer"
              onClick={() => {
                setAccountSearchInput("");
                setAccountSearch(""); // triggers reset+fetch via useEffect
              }}
            >
              Clear
            </button>
          </div>

          {/* Admin User Accounts */}
          <h3 className="text-lg font-semibold mt-2 mb-2 text-white">
            Admin User Accounts
          </h3>
          <div className="max-h-[24vh] overflow-y-auto border rounded bg-white text-black">
            <table className="w-full border-collapse">
              <thead className="bg-gray-200 sticky top-0">
                <tr>
                  <th className="border p-2">User ID</th>
                  <th className="border p-2">Role</th>
                  <th className="border p-2">Register Status</th>
                  <th className="border p-2">Company</th>
                  <th className="border p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {accountTables.ADMIN.items.map((a) => (
                  <tr key={a.userPkId} className="text-center">
                    <td
                      className="border p-2 text-blue-600 cursor-pointer underline"
                      onClick={() => showAccountDetails(a.userPkId)}
                    >
                      {a.userPkId}
                    </td>
                    <td className="border p-2">{a.role}</td>
                    <td className="border p-2">
                      <select
                        className="border rounded"
                        value={a.registerStatus}
                        onChange={(e) =>
                          updateAccountRegisterStatus(
                            a.userPkId,
                            e.target.value,
                            a.role,
                          )
                        }
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                      </select>
                    </td>
                    <td className="border p-2">{a.companyName}</td>
                    <td className="border p-2">
                      <button
                        onClick={() => deleteAccount(a.userPkId, a.role)}
                        className="bg-red-500 text-white px-2 py-1 rounded cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}

                {!accountTables.ADMIN.loading &&
                  accountTables.ADMIN.items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center p-4 text-gray-500">
                        No admin user accounts found.
                      </td>
                    </tr>
                  )}

                {accountTables.ADMIN.loading && (
                  <tr>
                    <td colSpan={5} className="text-center p-4">
                      Loading…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {accountTables.ADMIN.hasMore && !accountTables.ADMIN.loading && (
            <button
              onClick={() => fetchAccountsByRole("ADMIN", false)}
              className="w-full bg-gray-100 p-2 mt-2 rounded text-black"
            >
              Load more
            </button>
          )}

          {/* Purchaser User Accounts */}
          <h3 className="text-lg font-semibold mt-6 mb-2 text-white">
            Purchaser User Accounts
          </h3>
          <div className="max-h-[24vh] overflow-y-auto border rounded bg-white text-black">
            <table className="w-full border-collapse">
              <thead className="bg-gray-200 sticky top-0">
                <tr>
                  <th className="border p-2">User ID</th>
                  <th className="border p-2">User's Name</th>
                  <th className="border p-2">Role</th>
                  <th className="border p-2">Register Status</th>
                  <th className="border p-2">Company</th>
                  <th className="border p-2">Requests</th>
                  <th className="border p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {accountTables.PURCHASER.items.map((a) => (
                  <tr key={a.userPkId} className="text-center">
                    <td
                      className="border p-2 text-blue-600 cursor-pointer underline"
                      onClick={() => showAccountDetails(a.userPkId)}
                    >
                      {a.userPkId}
                    </td>
                    <td className="border p-2">
                      {a.firstName} {a.lastName}
                    </td>
                    <td className="border p-2">{a.role}</td>
                    <td className="border p-2">
                      <select
                        className="border rounded"
                        value={a.registerStatus}
                        onChange={(e) =>
                          updateAccountRegisterStatus(
                            a.userPkId,
                            e.target.value,
                            a.role,
                          )
                        }
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                      </select>
                    </td>
                    <td className="border p-2">{a.companyName}</td>
                    <td className="border p-2">{a.requestsCount ?? 0}</td>
                    <td className="border p-2">
                      <button
                        onClick={() => deleteAccount(a.userPkId)}
                        className="bg-red-500 text-white px-2 py-1 rounded cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}

                {!accountTables.PURCHASER.loading &&
                  accountTables.PURCHASER.items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center p-4 text-gray-500">
                        No purchaser user accounts found.
                      </td>
                    </tr>
                  )}

                {accountTables.PURCHASER.loading && (
                  <tr>
                    <td colSpan={7} className="text-center p-4">
                      Loading…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {accountTables.PURCHASER.hasMore &&
            !accountTables.PURCHASER.loading && (
              <button
                onClick={() => fetchAccountsByRole("PURCHASER", false)}
                className="w-full bg-gray-100 p-2 mt-2 rounded text-black"
              >
                Load more
              </button>
            )}

          {/* Provider User Accounts */}
          <h3 className="text-lg font-semibold mt-6 mb-2 text-white">
            Provider User Accounts
          </h3>
          <div className="max-h-[24vh] overflow-y-auto border rounded bg-white text-black">
            <table className="w-full border-collapse">
              <thead className="bg-gray-200 sticky top-0">
                <tr>
                  <th className="border p-2">User ID</th>
                  <th className="border p-2">User's Name</th>
                  <th className="border p-2">Role</th>
                  <th className="border p-2">Register Status</th>
                  <th className="border p-2">Company</th>
                  <th className="border p-2">Offers</th>
                  <th className="border p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {accountTables.PROVIDER.items.map((a) => (
                  <tr key={a.userPkId} className="text-center">
                    <td
                      className="border p-2 text-blue-600 cursor-pointer underline"
                      onClick={() => showAccountDetails(a.userPkId)}
                    >
                      {a.userPkId}
                    </td>
                    <td className="border p-2">
                      {a.firstName} {a.lastName}
                    </td>
                    <td className="border p-2">{a.role}</td>
                    <td className="border p-2">
                      <select
                        className="border rounded"
                        value={a.registerStatus}
                        onChange={(e) =>
                          updateAccountRegisterStatus(
                            a.userPkId,
                            e.target.value,
                            a.role,
                          )
                        }
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                      </select>
                    </td>
                    <td className="border p-2">{a.companyName}</td>
                    <td className="border p-2">{a.offersCount ?? 0}</td>
                    <td className="border p-2">
                      <button
                        onClick={() => deleteAccount(a.userPkId)}
                        className="bg-red-500 text-white px-2 py-1 rounded cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}

                {!accountTables.PROVIDER.loading &&
                  accountTables.PROVIDER.items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center p-4 text-gray-500">
                        No provider user accounts found.
                      </td>
                    </tr>
                  )}

                {accountTables.PROVIDER.loading && (
                  <tr>
                    <td colSpan={7} className="text-center p-4">
                      Loading…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {accountTables.PROVIDER.hasMore &&
            !accountTables.PROVIDER.loading && (
              <button
                onClick={() => fetchAccountsByRole("PROVIDER", false)}
                className="w-full bg-gray-100 p-2 mt-2 rounded text-black"
              >
                Load more
              </button>
            )}
        </section>

        {/* === Requests search bar belongs OUTSIDE these 3 columns in your layout.
      If you want it under this grid (full width), keep it AFTER this grid. === */}
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
      {selectedCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded max-w-3xl max-h-[80vh] overflow-y-auto text-black">
            <h2 className="text-xl font-bold mb-4">Company Details</h2>
            <div className="space-y-2">
              <p>
                <strong>Company ID:</strong> {selectedCompany.companyPkId}
              </p>
              <p>
                <strong>Role:</strong> {selectedCompany.role}
              </p>
              <p>
                <strong>Status:</strong> {selectedCompany.registerStatus}
              </p>
              <p>
                <strong>Company:</strong> {selectedCompany.companyName}
              </p>
              <p>
                <strong>Company Age:</strong> {selectedCompany.companyAge ?? 0}
              </p>
              <p>
                <strong>Founding Year:</strong>{" "}
                {selectedCompany.companyFoundingYear ?? "—"}
              </p>
              <p>
                <strong>Provider Type:</strong>{" "}
                {selectedCompany.providerType &&
                selectedCompany.providerType.trim()
                  ? selectedCompany.providerType
                  : "N/A"}
              </p>
              {selectedCompany.role === "PROVIDER" && (
                <p>
                  <strong>Total Rating:</strong>{" "}
                  {selectedCompany.providerTotalRating ?? "N/A"}
                </p>
              )}
              <p>
                <strong>Invoice Fee:</strong> {selectedCompany.invoiceFee}
              </p>
            </div>

            <details className="mt-2">
              <summary className="cursor-pointer text-blue-600">
                Show full JSON
              </summary>
              <pre className="text-xs bg-gray-100 p-4 rounded overflow-x-auto">
                {JSON.stringify(selectedCompany, null, 2)}
              </pre>
            </details>

            <button
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
              onClick={() => setSelectedCompany(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
      {selectedAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded max-w-3xl max-h-[80vh] overflow-y-auto text-black">
            <h2 className="text-xl font-bold mb-4">User Account Details</h2>
            <div className="space-y-2">
              <p>
                <strong>User ID:</strong> {selectedAccount.userPkId}
              </p>
              <p>
                <strong>Role:</strong> {selectedAccount.role}
              </p>
              <p>
                <strong>Status:</strong> {selectedAccount.registerStatus}
              </p>
              <p>
                <strong>Company:</strong> {selectedAccount.company.companyName}
              </p>
              <p>
                <strong>Company Age:</strong>{" "}
                {selectedAccount.company.companyAge ?? 0}
              </p>
              <p>
                <strong>Founding Year:</strong>{" "}
                {selectedAccount.company.companyFoundingYear ?? "—"}
              </p>
              <p>
                <strong>Provider Type:</strong>{" "}
                {selectedAccount.company.providerType &&
                selectedAccount.company.providerType.trim()
                  ? selectedAccount.company.providerType
                  : "N/A"}
              </p>
              {selectedAccount.role === "PROVIDER" && (
                <p>
                  <strong>Total Rating:</strong>{" "}
                  {selectedAccount.company.providerTotalRating ?? "N/A"}
                </p>
              )}
              <p>
                <strong>Invoice Fee:</strong>{" "}
                {selectedAccount.company.invoiceFee}
              </p>
            </div>

            <details className="mt-2">
              <summary className="cursor-pointer text-blue-600">
                Show full JSON
              </summary>
              <pre className="text-xs bg-gray-100 p-4 rounded overflow-x-auto">
                {JSON.stringify(selectedAccount, null, 2)}
              </pre>
            </details>

            <button
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
              onClick={() => setSelectedAccount(null)}
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
                                  "Are you sure you want to APPROVE this conflict check?",
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
                                  },
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
                                  "Are you sure you want to DENY this offer and replace it?",
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
                                  },
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
                    className="w-full bg-gray-100 p-2 text-black"
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
                    className="w-full bg-gray-100 p-2 text-black"
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
                    className="w-full bg-gray-100 p-2 text-black"
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
