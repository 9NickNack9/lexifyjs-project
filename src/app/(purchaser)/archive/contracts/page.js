"use client";

import { useEffect, useState } from "react";
import DashboardPage from "../components/DashboardPage";
import ContractsTable from "../components/ContractsTable";
import ContractModal from "../components/ContractModal";
import { loadingCard } from "../components/tableUi";

export default function ContractsDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState([]);
  const [companyName, setCompanyName] = useState(null);
  const [openContract, setOpenContract] = useState(false);
  const [contractRow, setContractRow] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/me/contracts", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed contracts");
        setContracts(data.contracts || []);
        if (data.companyName) setCompanyName(data.companyName);
      } catch (e) {
        alert(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <DashboardPage
      title="My LEXIFY Contracts"
      description="A record of every LEXIFY Contract you have entered into. You can view the key terms of each contract and open the contract document."
    >
      {loading ? (
        <div className={loadingCard}>Loading contracts…</div>
      ) : (
        <ContractsTable
          rows={contracts}
          onShowContract={(row) => {
            setContractRow(row);
            setOpenContract(true);
          }}
          hideHeading
        />
      )}

      <ContractModal
        open={openContract}
        onClose={() => setOpenContract(false)}
        contract={contractRow}
        companyName={companyName}
      />
    </DashboardPage>
  );
}
