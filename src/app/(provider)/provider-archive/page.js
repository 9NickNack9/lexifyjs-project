"use client";

import { useEffect, useMemo, useState } from "react";

function EmptyBox({ children }) {
  return (
    <div className="p-4 bg-white text-black border border-black rounded">
      {children}
    </div>
  );
}

function formatTimeUntil(expiryISO) {
  const now = new Date();
  const expiry = new Date(expiryISO);
  const diffMs = expiry.getTime() - now.getTime();
  if (diffMs <= 0) return "00:00:00";

  const minutes = Math.floor(diffMs / (60 * 1000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  return `${String(days).padStart(2, "0")}:${String(hours).padStart(
    2,
    "0"
  )}:${String(mins).padStart(2, "0")}`;
}

function fmtMoney(num, suffix = "€") {
  if (typeof num !== "number") return "—";
  return `${num.toLocaleString("fi-FI").replace(/\s/g, " ")} ${suffix}`;
}

function Section({ title, children }) {
  return (
    <div>
      <div className="bg-[#11999e] p-2">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default function ProviderArchive() {
  const [loading, setLoading] = useState(true);

  // Filters
  const [contactFilterPending, setContactFilterPending] = useState("All");
  const [contactFilterContracts, setContactFilterContracts] = useState("All");
  const [contactOptions, setContactOptions] = useState(["All"]);

  // Pending offers data & sorting
  const [offers, setOffers] = useState([]);
  const [pendingSort, setPendingSort] = useState({
    key: "clientName",
    dir: "asc",
  });

  // Contracts data & sorting
  const [contracts, setContracts] = useState([]);
  const [contractSort, setContractSort] = useState({
    key: "clientName",
    dir: "asc",
  });

  // Modals
  const [showReq, setShowReq] = useState(false);
  const [reqPreview, setReqPreview] = useState(null);

  const [showContract, setShowContract] = useState(false);
  const [contractPreview, setContractPreview] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const [offRes, conRes] = await Promise.all([
          fetch("/api/me/offers/pending", { cache: "no-store" }),
          fetch("/api/me/contracts/provider", { cache: "no-store" }),
        ]);

        const read = async (r) => {
          const ct = r.headers.get("content-type") || "";
          return ct.includes("application/json")
            ? await r.json()
            : { error: await r.text() };
        };

        const [off, con] = await Promise.all([read(offRes), read(conRes)]);

        if (!offRes.ok)
          throw new Error(off?.error || "Failed to load pending offers");
        if (!conRes.ok)
          throw new Error(con?.error || "Failed to load contracts");

        setOffers(off.offers || []);
        setContracts(con.contracts || []);

        // Merge contact options from both endpoints
        const list = Array.from(
          new Set([...(off.contacts || []), ...(con.contacts || [])])
        );
        setContactOptions(["All", ...list]);
      } catch (e) {
        alert(e.message);
        setOffers([]);
        setContracts([]);
        setContactOptions(["All"]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Sorting helpers
  const sortGeneric = (arr, key, dir) => {
    const copy = [...arr];
    copy.sort((a, b) => {
      let va = a[key],
        vb = b[key];

      if (key === "offerSubmissionDate" || key === "contractDate") {
        va = va ? new Date(va).getTime() : 0;
        vb = vb ? new Date(vb).getTime() : 0;
      } else if (key === "offeredPrice" || key === "contractPrice") {
        va = typeof va === "number" ? va : -Infinity;
        vb = typeof vb === "number" ? vb : -Infinity;
      } else if (key === "deadline") {
        va = a.dateExpired
          ? new Date(a.dateExpired).getTime() - Date.now()
          : -Infinity;
        vb = b.dateExpired
          ? new Date(b.dateExpired).getTime() - Date.now()
          : -Infinity;
      } else {
        va = (va ?? "").toString().toLowerCase();
        vb = (vb ?? "").toString().toLowerCase();
      }

      if (va < vb) return dir === "asc" ? -1 : 1;
      if (va > vb) return dir === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  };

  const filteredOffers = useMemo(() => {
    const f =
      contactFilterPending === "All"
        ? offers
        : offers.filter((o) => o.offerSubmittedBy === contactFilterPending);
    return sortGeneric(f, pendingSort.key, pendingSort.dir);
  }, [offers, contactFilterPending, pendingSort]);

  const filteredContracts = useMemo(() => {
    const f =
      contactFilterContracts === "All"
        ? contracts
        : contracts.filter((c) => c.contractOwner === contactFilterContracts);
    return sortGeneric(f, contractSort.key, contractSort.dir);
  }, [contracts, contactFilterContracts, contractSort]);

  return (
    <div className="flex flex-col items-center min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-6">My Dashboard</h1>

      {loading ? (
        <div className="p-4 bg-white rounded border">Loading…</div>
      ) : (
        <>
          {/* Pending Offers */}
          <div className="w-full mb-8">
            <h2 className="text-2xl font-semibold mb-4">My Pending Offers</h2>

            <select
              value={contactFilterPending}
              onChange={(e) => setContactFilterPending(e.target.value)}
              className="mb-4 p-2 border rounded bg-white text-black"
            >
              {contactOptions.map((n) => (
                <option key={n} value={n}>
                  {n === "All" ? "Filter Pending Offers by Offer Owner" : n}
                </option>
              ))}
            </select>

            {filteredOffers.length === 0 ? (
              <EmptyBox>N/A</EmptyBox>
            ) : (
              <table className="w-full border-collapse border border-gray-300 bg-white text-black">
                <thead>
                  <tr className="bg-[#3a3a3c] text-white">
                    <th className="border p-2 text-center">Title</th>
                    <th
                      className="border p-2 text-center cursor-pointer"
                      onClick={() =>
                        setPendingSort((p) => ({
                          key: "clientName",
                          dir: p.dir === "asc" ? "desc" : "asc",
                        }))
                      }
                    >
                      Client Name{" "}
                      {pendingSort.key === "clientName"
                        ? pendingSort.dir === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </th>
                    <th className="border p-2 text-center">
                      Offer Submitted in Response to
                    </th>
                    <th className="border p-2 text-center">
                      Offer Submitted By
                    </th>
                    <th
                      className="border p-2 text-center cursor-pointer"
                      onClick={() =>
                        setPendingSort((p) => ({
                          key: "offerSubmissionDate",
                          dir: p.dir === "asc" ? "desc" : "asc",
                        }))
                      }
                    >
                      Offer Submission Date{" "}
                      {pendingSort.key === "offerSubmissionDate"
                        ? pendingSort.dir === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </th>
                    <th
                      className="border p-2 text-center cursor-pointer"
                      onClick={() =>
                        setPendingSort((p) => ({
                          key: "offeredPrice",
                          dir: p.dir === "asc" ? "desc" : "asc",
                        }))
                      }
                    >
                      Offered Price (VAT 0%){" "}
                      {pendingSort.key === "offeredPrice"
                        ? pendingSort.dir === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </th>
                    <th
                      className="border p-2 text-center cursor-pointer"
                      onClick={() =>
                        setPendingSort((p) => ({
                          key: "deadline",
                          dir: p.dir === "asc" ? "desc" : "asc",
                        }))
                      }
                    >
                      Time until Deadline (dd/hh/mm){" "}
                      {pendingSort.key === "deadline"
                        ? pendingSort.dir === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOffers.map((o) => (
                    <tr key={o.offerId}>
                      <td className="border p-2 text-center">{o.title}</td>
                      <td className="border p-2 text-center">{o.clientName}</td>
                      <td className="border p-2 text-center">
                        <button
                          className="bg-[#11999e] text-white px-3 py-1 rounded cursor-pointer"
                          onClick={() => {
                            setReqPreview(o.preview);
                            setShowReq(true);
                          }}
                        >
                          View LEXIFY Request
                        </button>
                      </td>
                      <td className="border p-2 text-center">
                        {o.offerSubmittedBy || "—"}
                      </td>
                      <td className="border p-2 text-center">
                        {o.offerSubmissionDate
                          ? new Date(o.offerSubmissionDate).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="border p-2 text-center">
                        {fmtMoney(o.offeredPrice)}
                      </td>
                      <td className="border p-2 text-center">
                        {formatTimeUntil(o.dateExpired)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Contracts */}
          <div className="w-full mb-8">
            <h2 className="text-2xl font-semibold mb-4">My LEXIFY Contracts</h2>

            <select
              value={contactFilterContracts}
              onChange={(e) => setContactFilterContracts(e.target.value)}
              className="mb-4 p-2 border rounded bg-white text-black"
            >
              {contactOptions.map((n) => (
                <option key={n} value={n}>
                  {n === "All" ? "Filter Contracts By Contract Owner" : n}
                </option>
              ))}
            </select>

            {filteredContracts.length === 0 ? (
              <EmptyBox>N/A</EmptyBox>
            ) : (
              <table className="w-full border-collapse border border-gray-300 bg-white text-black">
                <thead>
                  <tr className="bg-[#3a3a3c] text-white">
                    <th className="border p-2 text-center">Title</th>
                    <th
                      className="border p-2 text-center cursor-pointer"
                      onClick={() =>
                        setContractSort((p) => ({
                          key: "clientName",
                          dir: p.dir === "asc" ? "desc" : "asc",
                        }))
                      }
                    >
                      Client Name{" "}
                      {contractSort.key === "clientName"
                        ? contractSort.dir === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </th>
                    <th
                      className="border p-2 text-center cursor-pointer"
                      onClick={() =>
                        setContractSort((p) => ({
                          key: "contractDate",
                          dir: p.dir === "asc" ? "desc" : "asc",
                        }))
                      }
                    >
                      Date of Contract{" "}
                      {contractSort.key === "contractDate"
                        ? contractSort.dir === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </th>
                    <th
                      className="border p-2 text-center cursor-pointer"
                      onClick={() =>
                        setContractSort((p) => ({
                          key: "contractPrice",
                          dir: p.dir === "asc" ? "desc" : "asc",
                        }))
                      }
                    >
                      Contract Price (VAT 0%){" "}
                      {contractSort.key === "contractPrice"
                        ? contractSort.dir === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </th>
                    <th className="border p-2 text-center">Contract Owner</th>
                    <th className="border p-2 text-center">
                      View LEXIFY Contract
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContracts.map((c) => (
                    <tr key={c.contractId}>
                      <td className="border p-2 text-center">{c.title}</td>
                      <td className="border p-2 text-center">{c.clientName}</td>
                      <td className="border p-2 text-center">
                        {c.contractDate
                          ? new Date(c.contractDate).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="border p-2 text-center">
                        {fmtMoney(c.contractPrice)}
                      </td>
                      <td className="border p-2 text-center">
                        {c.contractOwner || "—"}
                      </td>
                      <td className="border p-2 text-center">
                        <button
                          className="bg-[#11999e] text-white px-3 py-1 rounded cursor-pointer"
                          onClick={() => {
                            setContractPreview(c.contract);
                            setShowContract(true);
                          }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Contract Modal */}
            {showContract && contractPreview && (
              <div className="fixed inset-0 bg-[#11999e] bg-opacity-50 flex justify-center items-center z-50 transition-opacity duration-300">
                <div className="bg-white w-11/12 max-w-3xl shadow-lg overflow-y-auto max-h-[90vh] relative border border-black">
                  <div className="bg-[#11999e] w-full p-2 flex flex-col items-center">
                    <img
                      src="/lexify.png"
                      alt="LEXIFY Logo"
                      className="h-16 mb-2 w-64 h-32"
                    />
                    <h2 className="text-2xl font-bold text-white">
                      LEXIFY Contract
                    </h2>
                  </div>

                  <button
                    onClick={() => setShowContract(false)}
                    className="absolute top-4 right-4 text-white bg-[#3a3a3c] rounded-full w-8 h-8 flex items-center justify-center text-xl hover:bg-red-600 transition cursor-pointer"
                  >
                    &times;
                  </button>

                  <div className="p-4 text-black space-y-3 text-md">
                    <p>
                      <strong>Contract Date:</strong>{" "}
                      <u>
                        {contractPreview.contractDate
                          ? new Date(
                              contractPreview.contractDate
                            ).toLocaleDateString()
                          : "—"}
                      </u>
                    </p>

                    <br />
                    <h3 className="font-semibold text-lg">
                      LEGAL SERVICE PROVIDER
                    </h3>
                    {/* Provider is current user — if you want to show your own company, you can fetch and render it here */}
                    <p>
                      <strong>Company Name:</strong> <u>—</u>
                    </p>
                    <p>
                      <strong>Business ID:</strong> <u>—</u>
                    </p>
                    <p>
                      <strong>Representative Name:</strong> <u>—</u>
                    </p>
                    <p>
                      <strong>Email:</strong> <u>—</u>
                    </p>
                    <p>
                      <strong>Telephone:</strong> <u>—</u>
                    </p>

                    <hr />

                    <h3 className="font-semibold text-lg">
                      LEGAL SERVICE PURCHASER
                    </h3>
                    <p>
                      <strong>Company Name:</strong>{" "}
                      <u>{contractPreview.client?.companyName || "—"}</u>
                    </p>
                    <p>
                      <strong>Business ID:</strong>{" "}
                      <u>{contractPreview.client?.businessId || "—"}</u>
                    </p>

                    <p className="italic text-sm">
                      The Legal Service Purchaser may also be referred to as
                      &quot;Client&quot; in this contract.
                    </p>

                    <hr />

                    <p>
                      <strong>Contract Price (VAT 0%):</strong>{" "}
                      <u>{fmtMoney(contractPreview.contractPrice)}</u>
                    </p>
                    <p>
                      <strong>Contract Price Currency:</strong>{" "}
                      <u>{contractPreview.contractPriceCurrency || "—"}</u>
                    </p>
                    <p>
                      <strong>Contract Price Type:</strong>{" "}
                      <u>{contractPreview.contractPriceType || "—"}</u>
                    </p>

                    <hr />
                  </div>

                  <h3 className="font-semibold text-lg text-black pt-8 pl-8">
                    2. The LEXIFY Request
                  </h3>
                  <div id="lexify-preview" className="space-y-6 text-black p-8">
                    <Section title="Scope of Work">
                      <p className="text-md mt-2">
                        {contractPreview.request?.scopeOfWork || "—"}
                      </p>
                    </Section>
                    <Section title="Contract Price Type and Currency">
                      <p className="text-md mt-2">
                        {contractPreview.contractPriceType || "—"}
                      </p>
                      <p className="text-md mt-2">
                        Currency: {contractPreview.contractPriceCurrency || "—"}
                      </p>
                    </Section>
                    <Section title="Description of Client's Line of Business">
                      <p className="text-md mt-2">
                        {contractPreview.request?.description || "—"}
                      </p>
                    </Section>
                    <Section title="Invoicing">
                      <p className="text-md mt-2">
                        The Legal Service Provider shall invoice the Client as
                        follows:
                      </p>
                      <p className="text-md mt-2">
                        {contractPreview.request?.invoiceType || "—"}
                      </p>
                    </Section>
                    <Section title="Languages Required for the Performance of the Work">
                      <p className="text-md mt-2">
                        {contractPreview.request?.language || "—"}
                      </p>
                    </Section>
                  </div>

                  <div className="m-4">
                    <button
                      onClick={() => setShowContract(false)}
                      className="text-white bg-[#3a3a3c] rounded px-4 py-2 hover:bg-red-600 transition cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Request Preview Modal */}
          {showReq && reqPreview && (
            <div className="fixed inset-0 bg-[#11999e] bg-opacity-50 flex justify-center items-center z-50 transition-opacity duration-300">
              <div className="bg-white w-11/12 max-w-4xl shadow-lg overflow-y-auto max-h-[90vh] relative">
                <div className="w-full p-4 flex flex-col items-center bg-[#11999e]">
                  <img
                    src="/lexify.png"
                    alt="LEXIFY Logo"
                    className="h-16 mb-2"
                  />
                  <h2 className="text-2xl font-bold text-white">
                    LEXIFY Request Preview
                  </h2>
                </div>

                <button
                  onClick={() => setShowReq(false)}
                  className="absolute top-4 right-4 text-white bg-[#3a3a3c] rounded-full w-8 h-8 flex items-center justify-center text-xl hover:bg-red-600 transition cursor-pointer"
                >
                  &times;
                </button>

                <div id="lexify-preview" className="space-y-6 text-black p-8">
                  <Section title="Client Name, Business ID and Country of Domicile">
                    <p className="text-md mt-2">
                      {reqPreview.clientName || "—"}, (Business ID: —),
                      (Country: —)
                    </p>
                  </Section>

                  <Section title="Scope of Work">
                    <p className="text-md mt-2">
                      {reqPreview.scopeOfWork || "—"}
                    </p>
                  </Section>

                  <Section title="Contract Price (Lump Sum Fixed Fee or Flat Hourly Rate) and Currency">
                    <p className="text-md mt-2">
                      {reqPreview.paymentRate || "—"}
                    </p>
                    <p className="text-md mt-2">
                      Currency: {reqPreview.currency || "—"}
                    </p>
                  </Section>

                  <Section title="Description of Client's Line of Business">
                    <p className="text-md mt-2">
                      {reqPreview.description || "—"}
                    </p>
                  </Section>

                  <Section title="Additional Background Information Provided by Client">
                    <p className="text-md mt-2">
                      {reqPreview.additionalBackgroundInfo || "—"}
                    </p>
                    {Array.isArray(reqPreview.supplierCodeOfConductFiles) &&
                      reqPreview.supplierCodeOfConductFiles.length > 0 && (
                        <ul className="list-disc pl-6 mt-2">
                          {reqPreview.supplierCodeOfConductFiles.map((f, i) => (
                            <li key={i}>{f?.name || "Attachment"}</li>
                          ))}
                        </ul>
                      )}
                  </Section>

                  <Section title="Is an Advance Retainer Fee Paid to the Legal Service Provider?">
                    <p className="text-md mt-2">
                      {reqPreview.advanceRetainerFee || "—"}
                    </p>
                  </Section>

                  <Section title="Invoicing">
                    <p className="text-md mt-2">
                      The Legal Service Provider shall invoice the Client as
                      follows:
                    </p>
                    <p className="text-md mt-2">
                      {reqPreview.invoiceType || "—"}
                    </p>
                  </Section>

                  <Section title="Languages Required for the Performance of the Work">
                    <p className="text-md mt-2">{reqPreview.language || "—"}</p>
                  </Section>
                </div>

                <button
                  onClick={() => setShowReq(false)}
                  className="m-4 text-white bg-[#3a3a3c] rounded px-4 py-2 hover:bg-red-600 transition cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
