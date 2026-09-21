"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatTimeUntil } from "@/app/(purchaser)/archive/utils/format";
import { FaFileAlt } from "react-icons/fa";
import NarrowTooltip from "../../components/NarrowTooltip";
import { AppPage } from "@/app/components/HubPage";
import {
  btnPrimary,
  emptyCard,
  loadingCard,
  table,
  tableCard,
  tableScroll,
  td,
  th,
  theadRow,
  tr,
} from "@/app/(purchaser)/archive/components/tableUi";

const subcategoriesByCategory = {
  "Help with Contracts": [
    "B2B Sales",
    "B2C Sales",
    "Real Estate and Construction",
    "Sourcing",
    "ICT and IT",
  ],
  "Help with Employment related Documents": [
    "Employment Contract Template",
    "Employment related Document Templates",
    "Negotiation Support",
  ],
  "Help with Dispute Resolution or Debt Collection": [
    "Support with Court Proceedings",
    "Support with Arbitration Proceedings",
    "Settlement Negotiation Support",
    "Debt Collection Support",
  ],
  "Help with Personal Data Protection": [
    "GDPR Compliance Analysis",
    "Data Privacy Documentation",
    "Support with Data Breach",
    "Specific Privacy related Question",
  ],
  "Help with Banking & Finance Matters": [
    "Refinancing of Existing Debt",
    "Amendment of Existing Debt Terms",
    "Breach Waiver",
  ],
};

const assignmentTypesBySubcategory = {
  "Real Estate and Construction": [
    "Sale and Purchase of Real Estate",
    "Sale and Leaseback of Real Estate",
    "Lease of Business Premises, Residential Premises or Land",
    "Easement Agreement",
    "Land Use Agreement",
    "Construction Contract",
  ],
  Sourcing: [
    "Prepare agreement template",
    "Legal review of sourcing agreement",
    "Support with sourcing agreement negotiations",
  ],
  "ICT and IT": [
    "Prepare contract template",
    "Legal review of ICT/IT contract",
    "Support with ICT/IT contract negotiations",
  ],
};

function EmptyBox({ children }) {
  return <div className={emptyCard}>{children}</div>;
}

export default function ProviderRequest() {
  const [descriptionFilter, setDescriptionFilter] = useState("All");
  const [subcategoryFilter, setSubcategoryFilter] = useState("All");
  const [assignmentTypeFilter, setAssignmentTypeFilter] = useState("All");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // Build query params based on current filters
  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (descriptionFilter !== "All") p.set("category", descriptionFilter);
    if (subcategoryFilter !== "All") p.set("subcategory", subcategoryFilter);
    if (assignmentTypeFilter !== "All")
      p.set("assignment", assignmentTypeFilter);
    return p.toString();
  }, [descriptionFilter, subcategoryFilter, assignmentTypeFilter]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/provider/requests/available${
            queryString ? `?${queryString}` : ""
          }`,
          { cache: "no-store" },
        );
        const data = res.ok ? await res.json() : { requests: [] };
        if (active) setRows(data.requests || []);
      } catch {
        if (active) setRows([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [queryString]);

  return (
    <AppPage
      eyebrow=""
      title="Available LEXIFY Requests"
      contentClassName="max-w-[90rem]"
    >
      {/* Filters */}
      <div className="w-full rounded-2xl text-black bg-[#11999e] p-1 shadow-[0_16px_44px_rgba(17,153,158,0.22)] ring-1 ring-black/10">
        <div className="flex flex-col gap-1">
          <select
            value={descriptionFilter}
            onChange={(e) => {
              setDescriptionFilter(e.target.value);
              setSubcategoryFilter("All");
              setAssignmentTypeFilter("All");
            }}
            className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-center text-black focus:outline-none focus:ring-2 focus:ring-[#11999e]/30"
          >
            <option value="All">Filter LEXIFY Requests by Category</option>
            <option value="Help with Contracts">Help with Contracts</option>
            <option value="Day-to-day Legal Advice">
              Day-to-day Legal Advice
            </option>
            <option value="Help with Employment related Documents">
              Help with Employment related Documents
            </option>
            <option value="Help with Dispute Resolution or Debt Collection">
              Help with Dispute Resolution or Debt Collection
            </option>
            <option value="Help with Mergers & Acquisitions">
              Help with Mergers & Acquisitions
            </option>
            <option value="Help with Corporate Governance">
              Help with Corporate Governance
            </option>
            <option value="Help with Personal Data Protection">
              Help with Personal Data Protection
            </option>
            <option value="Help with Personal Data Protection">
              Help with Banking & Finance Matters
            </option>
            <option value="Help with KYC (Know Your Customer) or Compliance related Questionnaire">
              Help with KYC (Know Your Customer) or Compliance related
              Questionnaire
            </option>
            <option value="Legal Training for Management and/or Personnel">
              Legal Training for Management and/or Personnel
            </option>
          </select>

          {subcategoriesByCategory[descriptionFilter] && (
            <select
              value={subcategoryFilter}
              onChange={(e) => {
                setSubcategoryFilter(e.target.value);
                setAssignmentTypeFilter("All");
              }}
              className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-center text-black focus:outline-none focus:ring-2 focus:ring-[#11999e]/30"
            >
              <option value="All">Filter LEXIFY Requests by Subcategory</option>
              {subcategoriesByCategory[descriptionFilter].map((subcat) => (
                <option key={subcat} value={subcat}>
                  {subcat}
                </option>
              ))}
            </select>
          )}

          {assignmentTypesBySubcategory[subcategoryFilter] && (
            <select
              value={assignmentTypeFilter}
              onChange={(e) => setAssignmentTypeFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-center text-black focus:outline-none focus:ring-2 focus:ring-[#11999e]/30"
            >
              <option value="All">
                Filter LEXIFY Requests by Assignment Type
              </option>
              {assignmentTypesBySubcategory[subcategoryFilter].map(
                (assignment) => (
                  <option key={assignment} value={assignment}>
                    {assignment}
                  </option>
                ),
              )}
            </select>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className={loadingCard}>Loading…</div>
      ) : rows.length === 0 ? (
        <EmptyBox>
          No matching LEXIFY Requests available at the moment.
        </EmptyBox>
      ) : (
        <div className={tableCard}>
          <div className={tableScroll}>
            <table className={table}>
              <thead>
                <tr className={theadRow}>
                  <th className={th}>Category</th>
                  <th className={th}>Subcategory</th>
                  <th className={th}>Assignment type</th>
                  <th className={th}>Client Name</th>
                  <th className={th}>Time until Deadline for Offers</th>
                  <th className={th}>
                    Review LEXIFY Request and Submit Offer{" "}
                    <NarrowTooltip tooltipText="Only one offer can be submitted for each LEXIFY Request. If you cannot see a certain Request, a colleague at your firm has already submitted an offer for it." />
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const timeLeft = formatTimeUntil(r.offersDeadline);
                  return (
                    <tr key={r.requestId} className={tr}>
                      <td className={td}>{r.category}</td>
                      <td className={td}>{r.subcategory}</td>
                      <td className={td}>{r.assignmentType}</td>
                      <td className={td}>
                        {(r.confidential ?? r.details?.confidential)
                          ?.toString()
                          .trim()
                          .toLowerCase() === "yes"
                          ? "Disclosed to Winning Bidder Only"
                          : r.clientCompanyName || "—"}
                      </td>
                      <td
                        className={td}
                        title={
                          r.offersDeadline
                            ? new Date(r.offersDeadline).toString()
                            : ""
                        }
                      >
                        {timeLeft || "—"}
                      </td>
                      <td className={td}>
                        <Link
                          href={`/make-offer?requestId=${r.requestId}`}
                          className={btnPrimary}
                        >
                          <FaFileAlt className="inline-block h-5 w-5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppPage>
  );
}
