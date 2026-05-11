"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const DRAFT_TYPE_META = {
  salesB2b: {
    category: "Sales (B2B)",
    label: "Sales B2B",
    path: "/contracts/sales-b2b",
  },
  salesB2c: {
    category: "Sales (B2C)",
    label: "Sales B2C",
    path: "/contracts/sales-b2c",
  },
  sourcingAgreement: {
    category: "Sourcing",
    label: "Sourcing Agreement Template",
    path: "/contracts/sourcing-agreement",
  },
  sourcingComments: {
    category: "Sourcing",
    label: "Sourcing Agreement Review",
    path: "/contracts/sourcing-comments",
  },
  sourcingNegotiation: {
    category: "Sourcing",
    label: "Sourcing Agreement Negotiation",
    path: "/contracts/sourcing-negotiation",
  },
  reSale: {
    category: "Real Estate & Construction",
    label: "Sale and Purchase",
    path: "/contracts/re-sale",
  },
  reLeaseback: {
    category: "Real Estate & Construction",
    label: "Sale and Leaseback",
    path: "/contracts/re-leaseback",
  },
  reLease: {
    category: "Real Estate & Construction",
    label: "Lease Agreement",
    path: "/contracts/re-lease",
  },
  reEasement: {
    category: "Real Estate & Construction",
    label: "Easement Agreement",
    path: "/contracts/re-easement",
  },
  reLanduse: {
    category: "Real Estate & Construction",
    label: "Land Use Agreement",
    path: "/contracts/re-landuse",
  },
  reConstruction: {
    category: "Real Estate & Construction",
    label: "Construction Contract",
    path: "/contracts/re-construction",
  },
  ictTemplate: {
    category: "ICT & IT",
    label: "ICT/IT Contract Template",
    path: "/contracts/ict-template",
  },
  ictReview: {
    category: "ICT & IT",
    label: "ICT/IT Contract Review",
    path: "/contracts/ict-review",
  },
  ictNegotiation: {
    category: "ICT & IT",
    label: "ICT/IT Contract Negotiation",
    path: "/contracts/ict-negotiation",
  },
  dayToDay: {
    category: "Day-to-day Legal Advice",
    label: "Day-to-day Legal Advice",
    path: "/requests/legal-advice",
  },
  employmentContract: {
    category: "Employment",
    label: "Employment Contract Template",
    path: "/contracts/emp-contract",
  },
  employmentDocuments: {
    category: "Employment",
    label: "Employment Document Templates",
    path: "/contracts/emp-documents",
  },
  employmentNegotiation: {
    category: "Employment",
    label: "Employment Negotiation",
    path: "/contracts/emp-negotiation",
  },
  courtProceedings: {
    category: "Dispute Resolution",
    label: "Court Proceedings",
    path: "/contracts/dispute-court",
  },
  arbitrationProceedings: {
    category: "Dispute Resolution",
    label: "Arbitration Proceedings",
    path: "/contracts/dispute-arbitration",
  },
  settlementNegotiations: {
    category: "Dispute Resolution",
    label: "Settlement Negotiations",
    path: "/contracts/dispute-settlement",
  },
  debtCollection: {
    category: "Dispute Resolution",
    label: "Debt Collection",
    path: "/contracts/dispute-debt",
  },
  mAndA: {
    category: "Mergers & Acquisitions",
    label: "Mergers & Acquisitions",
    path: "/requests/mergers-acquisitions",
  },
  corporateGovernance: {
    category: "Corporate Governance",
    label: "Corporate Governance",
    path: "/requests/corporate-governance",
  },
  complianceQuestionnaire: {
    category: "KYC & Compliance",
    label: "KYC or Compliance Questionnaire",
    path: "/requests/kyc",
  },
  legalTraining: {
    category: "Legal Training",
    label: "Legal Training",
    path: "/requests/legal-training",
  },
  bankingRefinancing: {
    category: "Banking & Finance",
    label: "Refinancing of Existing Debt",
    path: "/contracts/finance-debt",
  },
  bankingAmendment: {
    category: "Banking & Finance",
    label: "Amendment of Existing Debt Terms",
    path: "/contracts/finance-debt-terms",
  },
  bankingWaiver: {
    category: "Banking & Finance",
    label: "Breach Waiver",
    path: "/contracts/finance-breach-waiver",
  },
  dataProtectionAnalysis: {
    category: "Data Protection",
    label: "GDPR Compliance Analysis",
    path: "/contracts/gdpr-compliance",
  },
  dataProtectionDocumentation: {
    category: "Data Protection",
    label: "Data Privacy Documentation",
    path: "/contracts/privacy-documentation",
  },
  personalDataBreach: {
    category: "Data Protection",
    label: "Personal Data Breach",
    path: "/contracts/data-breach",
  },
  dataPrivacyQuestion: {
    category: "Data Protection",
    label: "Specific Data Privacy Question",
    path: "/contracts/data-question",
  },
};

function formatDraftSavedDate(draft) {
  const rawDate = draft?.savedAt || draft?.updatedAt || draft?.createdAt;

  if (!rawDate) return "Draft saved date unavailable";

  const parsed = new Date(rawDate);

  if (Number.isNaN(parsed.getTime())) {
    return "Draft saved date unavailable";
  }

  return `Draft Saved ${parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })}`;
}

export default function RequestDraftsPage() {
  const router = useRouter();
  const [requestDrafts, setRequestDrafts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDrafts = async () => {
      setLoading(true);

      try {
        const res = await fetch("/api/request-drafts", {
          method: "GET",
          cache: "no-store",
        });

        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.error || "Failed to load drafts.");
        }

        setRequestDrafts(json?.requestDrafts || {});
      } catch (error) {
        alert(error.message || "Failed to load drafts.");
        setRequestDrafts({});
      } finally {
        setLoading(false);
      }
    };

    loadDrafts();
  }, []);

  const groupedDrafts = useMemo(() => {
    const groups = {};

    Object.entries(requestDrafts || {}).forEach(([requestType, drafts]) => {
      const meta = DRAFT_TYPE_META[requestType];

      if (!meta || !Array.isArray(drafts) || drafts.length === 0) {
        return;
      }

      if (!groups[meta.category]) {
        groups[meta.category] = [];
      }

      drafts.forEach((draft) => {
        groups[meta.category].push({
          ...draft,
          requestType,
          requestTypeLabel: meta.label,
          path: meta.path,
        });
      });
    });

    Object.keys(groups).forEach((category) => {
      groups[category].sort((a, b) => {
        const aDate = new Date(a.savedAt || a.updatedAt || a.createdAt || 0);
        const bDate = new Date(b.savedAt || b.updatedAt || b.createdAt || 0);
        return bDate.getTime() - aDate.getTime();
      });
    });

    return groups;
  }, [requestDrafts]);

  const totalDraftCount = Object.values(groupedDrafts).reduce(
    (sum, drafts) => sum + drafts.length,
    0,
  );

  const handleOpenDraft = (draft) => {
    router.push(`${draft.path}?draftId=${encodeURIComponent(draft.id)}`);
  };

  return (
    <div className="flex items-start justify-center min-h-screen p-8">
      <div className="w-full max-w-6xl">
        <div className="flex justify-between items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Your Saved Drafts</h1>
            <p className="text-sm text-white mt-2">
              Select a saved draft to resume your LEXIFY Request and submit when
              ready.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/request-start")}
            className="px-4 py-2 rounded bg-[#3a3a3c] hover:bg-gray-400 cursor-pointer"
          >
            Back
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-white">Loading drafts…</p>
        ) : totalDraftCount === 0 ? (
          <div className="bg-white border rounded p-6 shadow">
            <p className="text-gray-700">You currently have no saved drafts.</p>
            <button
              type="button"
              onClick={() => router.push("/create-request")}
              className="mt-4 px-4 py-2 bg-[#11999e] text-white rounded cursor-pointer hover:opacity-90"
            >
              Create a New LEXIFY Request
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {Object.entries(groupedDrafts).map(([category, drafts]) => (
              <section
                key={category}
                className="bg-white border border-gray-300 rounded-lg shadow-xl overflow-hidden"
              >
                <div className="bg-[#0b6063] p-3 rounded-t">
                  <h2 className="text-xl font-semibold text-white">
                    {category}
                  </h2>
                </div>

                <div className="divide-y">
                  {drafts.map((draft) => (
                    <button
                      key={`${draft.requestType}-${draft.id}`}
                      type="button"
                      onClick={() => handleOpenDraft(draft)}
                      className="w-full text-left p-4 hover:bg-gray-50 cursor-pointer border"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="min-w-0">
                          <p className="font-semibold break-words text-gray-700">
                            {draft.title || "Untitled draft"}
                          </p>

                          <p className="text-sm text-gray-600 mt-1">
                            {draft.requestTypeLabel}
                          </p>

                          <p className="text-xs text-gray-400 mt-1">
                            {formatDraftSavedDate(draft)}
                          </p>
                        </div>

                        <span className="shrink-0 px-3 py-1 rounded bg-[#11999e] text-white text-sm">
                          Load Draft
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
