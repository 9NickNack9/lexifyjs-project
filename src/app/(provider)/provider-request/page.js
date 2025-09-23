"use client";

import { useState } from "react";

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

  return (
    <div className="flex flex-col items-center min-h-screen p-6">
      <h1 className="text-3xl font-bold text-center mb-8">
        Pending LEXIFY Requests
      </h1>

      {/* Filters */}
      <div className="w-full max-w-7xl p-6 rounded text-black">
        <div className="flex flex-col gap-4">
          <select
            value={descriptionFilter}
            onChange={(e) => {
              setDescriptionFilter(e.target.value);
              setSubcategoryFilter("All");
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

        {/* Empty State */}
        <EmptyBox>No available requests at the moment.</EmptyBox>
      </div>
    </div>
  );
}
