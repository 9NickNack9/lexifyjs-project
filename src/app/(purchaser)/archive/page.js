"use client";

import { useEffect, useState } from "react";
import PendingRequestsTable from "./components/PendingRequestsTable";
import AwaitingSelectionTable from "./components/AwaitingSelectionTable";
import OverMaxTable from "./components/OverMaxTable";
import ExpiredRequestsTable from "./components/ExpiredRequestsTable";
import ContractsTable from "./components/ContractsTable";
import PreviewModal from "./components/PreviewModal";
import ContractModal from "./components/ContractModal";

export default function ArchivePage() {
  const [loading, setLoading] = useState(true);

  // Pending
  const [pending, setPending] = useState([]);
  const [winningOfferSelection, setWinningOfferSelection] =
    useState("Automatic");
  const [companyName, setCompanyName] = useState(null);

  // Awaiting selection
  const [awaiting, setAwaiting] = useState([]);

  // Over max
  const [overMax, setOverMax] = useState([]);

  // Expired
  const [expired, setExpired] = useState([]);

  // Contracts
  const [contracts, setContracts] = useState([]);

  // Modals
  const [openPreview, setOpenPreview] = useState(false);
  const [previewRow, setPreviewRow] = useState(null);

  const [openContract, setOpenContract] = useState(false);
  const [contractRow, setContractRow] = useState(null);

  // Busy ids (for pending cancel)
  const [busyIds, setBusyIds] = useState(new Set());

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        // Fetch all sections in parallel
        const [pRes, aRes, oRes, eRes, cRes] = await Promise.all([
          fetch("/api/me/requests/pending", { cache: "no-store" }),
          fetch("/api/me/requests/awaiting", { cache: "no-store" }),
          fetch("/api/me/requests/overmax", { cache: "no-store" }),
          fetch("/api/me/requests/expired", { cache: "no-store" }),
          fetch("/api/me/contracts", { cache: "no-store" }),
        ]);

        const read = async (res) => {
          const ct = res.headers.get("content-type") || "";
          return ct.includes("application/json")
            ? await res.json()
            : { error: await res.text() };
        };

        const [p, a, o, e, c] = await Promise.all([
          read(pRes),
          read(aRes),
          read(oRes),
          read(eRes),
          read(cRes),
        ]);

        if (!pRes.ok) throw new Error(p.error || "Failed to load pending");
        if (!aRes.ok) throw new Error(a.error || "Failed to load awaiting");
        if (!oRes.ok) throw new Error(o.error || "Failed to load over max");
        if (!eRes.ok) throw new Error(e.error || "Failed to load expired");
        if (!cRes.ok) throw new Error(c.error || "Failed to load contracts");

        setPending(p.requests || []);
        setWinningOfferSelection(p.winningOfferSelection || "Automatic");
        setCompanyName(p.companyName || null);

        setAwaiting(a.requests || []);
        setOverMax(o.requests || []);
        setExpired(e.requests || []);

        setContracts(c.contracts || []);
        if (!companyName && c.companyName) setCompanyName(c.companyName);
      } catch (e) {
        alert(e.message);
        setPending([]);
        setAwaiting([]);
        setOverMax([]);
        setExpired([]);
        setContracts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handlePreview = (row) => {
    setPreviewRow(row);
    setOpenPreview(true);
  };
  const handleShowContract = (row) => {
    setContractRow(row);
    setOpenContract(true);
  };

  const handleCancelPending = async (requestId) => {
    if (
      !window.confirm(
        "Are you sure? This will delete your LEXIFY Request and it will no longer be visible to legal service providers."
      )
    )
      return;
    setBusyIds((s) => new Set([...s, requestId]));
    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to cancel");
      setPending((xs) => xs.filter((r) => r.requestId !== requestId));
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyIds((s) => {
        const n = new Set(s);
        n.delete(requestId);
        return n;
      });
    }
  };

  const handleCancelAwaiting = async (requestId) => {
    if (
      !window.confirm(
        "Are you sure? This will delete your LEXIFY Request and it will no longer be visible to legal service providers."
      )
    )
      return;
    setBusyIds((s) => new Set([...s, requestId]));
    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to cancel");
      setAwaiting((xs) => xs.filter((r) => r.requestId !== requestId));
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyIds((s) => {
        const n = new Set(s);
        n.delete(requestId);
        return n;
      });
    }
  };

  const handleCancelOverMax = async (requestId) => {
    if (
      !window.confirm(
        "Are you sure? This will delete your LEXIFY Request and it will no longer be visible to legal service providers."
      )
    )
      return;
    setBusyIds((s) => new Set([...s, requestId]));
    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to cancel");
      setOverMax((xs) => xs.filter((r) => r.requestId !== requestId));
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyIds((s) => {
        const n = new Set(s);
        n.delete(requestId);
        return n;
      });
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-6">My Dashboard</h1>

      {loading ? (
        <div className="p-4 bg-white rounded border">Loading…</div>
      ) : (
        <>
          <PendingRequestsTable
            rows={pending}
            winningOfferSelection={winningOfferSelection}
            onPreview={handlePreview}
            onCancel={handleCancelPending}
            busyIds={busyIds}
          />

          <AwaitingSelectionTable
            rows={awaiting}
            onPreview={handlePreview}
            onCancel={handleCancelAwaiting}
          />

          <OverMaxTable
            rows={overMax}
            onPreview={handlePreview}
            onCancel={handleCancelAwaiting}
          />

          <ExpiredRequestsTable rows={expired} onPreview={handlePreview} />

          <ContractsTable
            rows={contracts}
            onShowContract={handleShowContract}
          />

          {/* Modals */}
          <PreviewModal
            open={openPreview}
            onClose={() => setOpenPreview(false)}
            row={previewRow}
            companyName={companyName}
          />
          <ContractModal
            open={openContract}
            onClose={() => setOpenContract(false)}
            contract={contractRow}
            companyName={companyName}
          />
        </>
      )}
    </div>
  );
}
