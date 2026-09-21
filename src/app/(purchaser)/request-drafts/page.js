"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppPage } from "@/app/components/HubPage";

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
    <AppPage
      eyebrow="LEXIFY Request"
      title="Your Saved Drafts"
      description="Select a saved draft to resume your LEXIFY Request and submit when ready."
    >
      <div className="flex justify-start">
        <Link
          href="/request-start"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#0f7c80] transition-colors hover:text-[#11999e]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Link>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white px-6 py-12 text-center text-sm text-gray-500 shadow-[0_16px_44px_rgba(17,153,158,0.22)] ring-1 ring-black/10">
          Loading drafts…
        </div>
      ) : totalDraftCount === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-[0_16px_44px_rgba(17,153,158,0.22)] ring-1 ring-black/10">
          <p className="text-gray-600">You currently have no saved drafts.</p>
          <button
            type="button"
            onClick={() => router.push("/create-request")}
            className="mt-4 cursor-pointer rounded-lg bg-[#11999e] px-4 py-2 text-white transition-colors hover:bg-[#0e8488]"
          >
            Create a New LEXIFY Request
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(groupedDrafts).map(([category, drafts]) => (
            <section
              key={category}
              className="overflow-hidden rounded-2xl bg-white shadow-[0_16px_44px_rgba(17,153,158,0.22)] ring-1 ring-black/10"
            >
              <div className="border-b border-gray-100 bg-gray-50 px-5 py-3">
                <h2 className="text-lg font-semibold text-gray-900">
                  {category}
                </h2>
              </div>

              <div className="divide-y divide-gray-100">
                {drafts.map((draft) => (
                  <button
                    key={`${draft.requestType}-${draft.id}`}
                    type="button"
                    onClick={() => handleOpenDraft(draft)}
                    className="w-full cursor-pointer p-5 text-left transition-colors hover:bg-[#11999e]/[0.04]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="break-words font-semibold text-gray-900">
                          {draft.title || "Untitled draft"}
                        </p>

                        <p className="mt-1 text-sm text-gray-600">
                          {draft.requestTypeLabel}
                        </p>

                        <p className="mt-1 text-xs text-gray-400">
                          {formatDraftSavedDate(draft)}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-lg bg-[#11999e] px-3 py-1.5 text-sm font-medium text-white">
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
    </AppPage>
  );
}
