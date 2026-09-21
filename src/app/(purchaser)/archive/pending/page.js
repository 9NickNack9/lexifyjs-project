"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import DashboardPage from "../components/DashboardPage";
import PendingRequestsTable from "../components/PendingRequestsTable";
import PreviewModal from "../components/PreviewModal";
import { loadingCard } from "../components/tableUi";

export default function PendingRequestsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState([]);
  const [busyIds, setBusyIds] = useState(new Set());
  const [openPreview, setOpenPreview] = useState(false);
  const [previewRow, setPreviewRow] = useState(null);

  const fetchPending = async () => {
    const res = await fetch("/api/me/requests/pending", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Failed to load pending");
    setPending(data.requests || []);
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await fetchPending();
      } catch (e) {
        alert(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleCancelPending = async (requestId) => {
    if (
      !window.confirm(
        "Are you sure? This will delete your LEXIFY Request and it will no longer be visible to legal service providers.",
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

  return (
    <DashboardPage
      title="My Pending LEXIFY Requests"
      description="Requests that are still open for offers from legal service providers."
    >
      {loading ? (
        <div className={loadingCard}>Loading pending requests…</div>
      ) : (
        <PendingRequestsTable
          rows={pending}
          winningOfferSelection="Automatic"
          onPreview={(row) => {
            setPreviewRow(row);
            setOpenPreview(true);
          }}
          onCancel={handleCancelPending}
          busyIds={busyIds}
          refreshAllRequests={fetchPending}
          hideHeading
        />
      )}

      <PreviewModal
        open={openPreview}
        onClose={() => setOpenPreview(false)}
        row={previewRow}
        companyName={session?.companyName ?? null}
      />
    </DashboardPage>
  );
}
