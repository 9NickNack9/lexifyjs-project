"use client";

import { useEffect, useState } from "react";
import DashboardPage from "../components/DashboardPage";
import AwaitingSelectionTable from "../components/AwaitingSelectionTable";
import { loadingCard } from "../components/tableUi";

export default function AwaitingSelectionPage() {
  const [loading, setLoading] = useState(true);
  const [awaiting, setAwaiting] = useState([]);

  const fetchAwaiting = async () => {
    const res = await fetch("/api/me/requests/awaiting", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Failed to load awaiting");
    setAwaiting(data.requests || []);
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await fetchAwaiting();
      } catch (e) {
        alert(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <DashboardPage
      title="Awaiting Offer Selection"
      description="The offer period has closed for these LEXIFY Requests and all offers are in. Compare them, select the winning offer, or extend your time to decide."
    >
      {loading ? (
        <div className={loadingCard}>Loading offers…</div>
      ) : (
        <AwaitingSelectionTable
          rows={awaiting}
          refreshAllRequests={fetchAwaiting}
          hideHeading
        />
      )}
    </DashboardPage>
  );
}
