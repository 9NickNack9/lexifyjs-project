"use client";

import { useEffect, useState } from "react";
import DashboardPage from "@/app/(purchaser)/archive/components/DashboardPage";
import PendingOffersTable from "../components/PendingOffersTable";
import RequestPreviewModal from "../components/RequestPreviewModal";
import { loadingCard } from "@/app/(purchaser)/archive/components/tableUi";

export default function PendingOffersPage() {
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState([]);
  const [showReq, setShowReq] = useState(false);
  const [reqPreview, setReqPreview] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/me/offers/pending", {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok)
          throw new Error(data?.error || "Failed to load pending offers");
        setOffers(data.offers || []);
      } catch (e) {
        alert(e.message);
        setOffers([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleViewRequest = async (requestId) => {
    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load request");
      setReqPreview(json);
      setShowReq(true);
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <DashboardPage
      title="My Pending Offers"
      description="Offers you have submitted that are still waiting for the client's decision."
      backHref="/provider-archive"
    >
      {loading ? (
        <div className={loadingCard}>Loading pending offers…</div>
      ) : (
        <PendingOffersTable rows={offers} onViewRequest={handleViewRequest} />
      )}

      <RequestPreviewModal
        open={showReq}
        onClose={() => setShowReq(false)}
        row={reqPreview}
      />
    </DashboardPage>
  );
}
