"use client";

import { useEffect, useState } from "react";
import DashboardPage from "../components/DashboardPage";
import ExpiredRequestsTable from "../components/ExpiredRequestsTable";
import { loadingCard } from "../components/tableUi";

export default function ExpiredRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/me/requests/expired", {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed expired");
        setExpired(data.requests || []);
      } catch (e) {
        alert(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <DashboardPage
      title="My Expired LEXIFY Requests"
      description="These LEXIFY Requests have closed. For each one you can see the three lowest-priced offers received and the outcome."
    >
      {loading ? (
        <div className={loadingCard}>Loading expired requests…</div>
      ) : (
        <ExpiredRequestsTable rows={expired} hideHeading />
      )}
    </DashboardPage>
  );
}
