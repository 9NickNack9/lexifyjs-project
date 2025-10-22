"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatTimeUntil } from "@/app/(purchaser)/archive/utils/format";
import { FaFileAlt } from "react-icons/fa";
import NarrowTooltip from "../../components/NarrowTooltip";

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
};

const assignmentTypesBySubcategory = {
  "Real Estate and Construction": [
    "Sale and Purchase of Real Estate",
    "Sale and Leaseback of Real Estate",
    "Lease of Business Premises, Residential Premises or Land",
    "Easement Agreement",
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
  return (
    <div className="p-4 bg-white text-black border border-black rounded text-center mt-8">
      {children}
    </div>
  );
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
          { cache: "no-store" }
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
    <div className="flex flex-col items-center min-h-screen p-6">
      <h1 className="text-3xl font-bold text-center mb-8">
        Available LEXIFY Requests
      </h1>

      {/* Filters */}
      <div className="w-full max-w-7xl p-6 rounded text-black">
        <div className="flex flex-col gap-4">
          <select
            value={descriptionFilter}
            onChange={(e) => {
              setDescriptionFilter(e.target.value);
              setSubcategoryFilter("All");
              setAssignmentTypeFilter("All");
            }}
            className="w-full p-2 border rounded bg-white text-black text-center"
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
              className="w-full p-2 border rounded bg-white text-black text-center"
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
              className="w-full p-2 border rounded bg-white text-black text-center"
            >
              <option value="All">
                Filter LEXIFY Requests by Assignment Type
              </option>
              {assignmentTypesBySubcategory[subcategoryFilter].map(
                (assignment) => (
                  <option key={assignment} value={assignment}>
                    {assignment}
                  </option>
                )
              )}
            </select>
          )}
        </div>

        {/* Table */}
        <div className="mt-8">
          {loading ? (
            <EmptyBox>Loading…</EmptyBox>
          ) : rows.length === 0 ? (
            <EmptyBox>
              No matching LEXIFY Requests available at the moment.
            </EmptyBox>
          ) : (
            <table className="w-full border-collapse border border-gray-300 bg-white text-black">
              <thead>
                <tr className="bg-[#3a3a3c] text-white">
                  <th className="border p-2 text-center">Category</th>
                  <th className="border p-2 text-center">Subcategory</th>
                  <th className="border p-2 text-center">Assignment type</th>
                  <th className="border p-2 text-center">Client Name</th>
                  <th className="border p-2 text-center">
                    Time until Deadline
                  </th>
                  <th className="border p-2 text-center">
                    Review LEXIFY Request and Submit Offer{" "}
                    <NarrowTooltip tooltipText="Only one offer can be submitted for each LEXIFY Request." />
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const timeLeft = formatTimeUntil(r.offersDeadline);
                  return (
                    <tr key={r.requestId}>
                      <td className="border p-2 text-center">{r.category}</td>
                      <td className="border p-2 text-center">
                        {r.subcategory}
                      </td>
                      <td className="border p-2 text-center">
                        {r.assignmentType}
                      </td>
                      <td className="border p-2 text-center">
                        {r.clientCompanyName}
                      </td>
                      <td
                        className="border p-2 text-center"
                        title={
                          r.offersDeadline
                            ? new Date(r.offersDeadline).toString()
                            : ""
                        }
                      >
                        {timeLeft || "—"}
                      </td>
                      <td className="border p-2 text-center">
                        <Link
                          href={`/make-offer?requestId=${r.requestId}`}
                          className="bg-[#11999e] text-white px-3 py-1 rounded inline-block"
                        >
                          <FaFileAlt className="inline-block w-5 h-5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
