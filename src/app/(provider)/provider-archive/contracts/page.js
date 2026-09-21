"use client";

import { useEffect, useState } from "react";
import DashboardPage from "@/app/(purchaser)/archive/components/DashboardPage";
import ContractModal from "@/app/(purchaser)/archive/components/ContractModal";
import ContractsTable from "../components/ContractsTable";
import { loadingCard } from "@/app/(purchaser)/archive/components/tableUi";

export default function ProviderContractsPage() {
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState([]);
  const [showContract, setShowContract] = useState(false);
  const [contractPreview, setContractPreview] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/me/contracts/provider", {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load contracts");
        setContracts(data.contracts || []);
      } catch (e) {
        alert(e.message);
        setContracts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <DashboardPage
      title="My LEXIFY Contracts"
      description="A record of every LEXIFY Contract formed from your winning offers."
      backHref="/provider-archive"
    >
      {loading ? (
        <div className={loadingCard}>Loading contracts…</div>
      ) : (
        <ContractsTable
          rows={contracts}
          onShowContract={(contract) => {
            setContractPreview(contract);
            setShowContract(true);
          }}
        />
      )}

      {showContract && contractPreview && (
        <ContractModal
          open={showContract}
          onClose={() => setShowContract(false)}
          contract={contractPreview}
          companyName={contractPreview?.purchaser?.companyName}
        />
      )}
    </DashboardPage>
  );
}
