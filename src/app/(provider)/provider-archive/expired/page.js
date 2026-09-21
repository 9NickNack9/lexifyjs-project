"use client";

import { useEffect, useState } from "react";
import DashboardPage from "@/app/(purchaser)/archive/components/DashboardPage";
import ExpiredOffersTable from "../components/ExpiredOffersTable";
import RequestPreviewModal from "../components/RequestPreviewModal";
import { loadingCard } from "@/app/(purchaser)/archive/components/tableUi";

export default function ExpiredOffersPage() {
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState([]);
  const [showReq, setShowReq] = useState(false);
  const [reqPreview, setReqPreview] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/me/offers/expired", {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok)
          throw new Error(data?.error || "Failed to load expired offers");
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
      title="My Past Offers"
      description="Offers the client has decided on, including whether the contract was won or lost."
      backHref="/provider-archive"
    >
      {loading ? (
        <div className={loadingCard}>Loading expired offers…</div>
      ) : (
        <ExpiredOffersTable rows={offers} onViewRequest={handleViewRequest} />
      )}

      <RequestPreviewModal
        open={showReq}
        onClose={() => setShowReq(false)}
        row={reqPreview}
      />
    </DashboardPage>
  );
}
