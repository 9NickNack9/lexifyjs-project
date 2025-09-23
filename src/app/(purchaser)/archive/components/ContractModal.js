"use client";

export default function ContractModal({
  open,
  onClose,
  contract,
  companyName,
}) {
  if (!open || !contract) return null;

  const Section = ({ title, children }) => (
    <div>
      <div className="bg-[#11999e] p-2">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-[#11999e] bg-opacity-50 flex justify-center items-center z-50 transition-opacity duration-300">
      <div className="bg-white w-11/12 max-w-3xl shadow-lg overflow-y-auto max-h-[90vh] animate-fadeInScale relative border border-black">
        <div className="bg-[#11999e] w-full p-2 flex flex-col items-center">
          <img
            src="/lexify.png"
            alt="LEXIFY Logo"
            className="h-16 mb-2 w-64 h-32"
          />
          <h2 className="text-2xl font-bold text-white">LEXIFY Contract</h2>
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white bg-[#3a3a3c] rounded-full w-8 h-8 flex items-center justify-center text-xl hover:bg-red-600 transition cursor-pointer"
        >
          &times;
        </button>

        <div className="p-4 text-black space-y-3 text-md">
          <p>
            <strong>Contract Date:</strong>{" "}
            <u>{new Date(contract.contractDate).toLocaleDateString()}</u>
          </p>

          <br />
          <h3 className="font-semibold text-lg">LEGAL SERVICE PROVIDER</h3>
          <p>
            <strong>Company Name:</strong>{" "}
            <u>{contract.provider?.companyName || "—"}</u>
          </p>
          <p>
            <strong>Business ID:</strong>{" "}
            <u>{contract.provider?.businessId || "—"}</u>
          </p>
          <p>
            <strong>Representative Name:</strong>{" "}
            <u>{contract.provider?.contactName || "—"}</u>
          </p>
          <p>
            <strong>Email:</strong> <u>{contract.provider?.email || "—"}</u>
          </p>
          <p>
            <strong>Telephone:</strong> <u>{contract.provider?.phone || "—"}</u>
          </p>

          <hr />

          <h3 className="font-semibold text-lg">LEGAL SERVICE PURCHASER</h3>
          <p>
            <strong>Company Name:</strong> <u>{companyName || "—"}</u>
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

          <p className="italic text-sm">
            The Legal Service Purchaser may also be referred to as
            &quot;Client&quot; in this contract.
          </p>

          <hr />

          <p>
            <strong>Contract Price (VAT 0%):</strong>{" "}
            <u>
              {contract.contractPrice?.toLocaleString() || "—"}{" "}
              {contract.contractPriceCurrency || ""}
            </u>
          </p>
          <p>
            <strong>Contract Price Currency:</strong>{" "}
            <u>{contract.contractPriceCurrency || "—"}</u>
          </p>
          <p>
            <strong>Contract Price Type:</strong>{" "}
            <u>{contract.contractPriceType || "—"}</u>
          </p>

          <hr />

          <h3 className="font-semibold text-lg">PURPOSE OF THE AGREEMENT</h3>
          <p>
            This agreement for the provision of legal services (the &quot;LEXIFY
            Contract&quot;) is entered into on the date specified above between
            the Legal Service Provider and Legal Service Purchaser.
          </p>

          <hr />
          <h3 className="font-semibold text-lg">CONTRACT DOCUMENTS</h3>
          <ol className="list-decimal list-inside space-y-1 pl-6">
            <li>This LEXIFY Contract Cover Page</li>
            <li>
              The LEXIFY Request submitted by the Legal Service Purchaser on the
              LEXIFY platform (attached)
            </li>
            <li>
              General Terms and Conditions for LEXIFY Contracts (attached)
            </li>
            <li>
              Supplier Code of Conduct and/or other procurement requirements
              (attached, if applicable)
            </li>
          </ol>

          <p className="italic text-sm">
            This cover page forms an integral part of the LEXIFY Contract.
          </p>
          <hr className="text-[#3a3a3c]" />
        </div>

        {/* Section 2: The LEXIFY Request (from request fields we fetched into contract.request) */}
        <h3 className="font-semibold text-lg text-black pt-8 pl-8">
          2. The LEXIFY Request
        </h3>
        <div id="lexify-preview" className="space-y-6 text-black p-8">
          <Section title="Scope of Work">
            <p className="text-md mt-2">
              {contract.request?.scopeOfWork || "—"}
            </p>
          </Section>
          <Section title="Contract Price Type and Currency">
            <p className="text-md mt-2">{contract.contractPriceType || "—"}</p>
            <p className="text-md mt-2">
              Currency: {contract.contractPriceCurrency || "—"}
            </p>
          </Section>
          <Section title="Description of Client's Line of Business">
            <p className="text-md mt-2">
              {contract.request?.description || "—"}
            </p>
          </Section>
          <Section title="Invoicing">
            <p className="text-md mt-2">
              The Legal Service Provider shall invoice the Client as follows:
            </p>
            <p className="text-md mt-2">
              {contract.request?.invoiceType || "—"}
            </p>
          </Section>
          <Section title="Languages Required for the Performance of the Work">
            <p className="text-md mt-2">{contract.request?.language || "—"}</p>
          </Section>
        </div>

        <h3 className="font-semibold text-lg text-black pt-8 pl-4">
          3. General Terms and Conditions for LEXIFY Contracts
        </h3>
        <div className="p-4 text-black space-y-3 text-md">
          <hr className="text-[#11999e]" />
          <h3 className="text-lg">
            General Terms and Conditions for LEXIFY Contracts
          </h3>
          <p>Last Updated: January 2025</p>
          <hr className="text-[#11999e]" />
          <p>…(GTCs text as in your template)…</p>
          <hr className="text-[#3a3a3c]" />
        </div>

        <div className="m-4">
          <button
            onClick={onClose}
            className="text-white bg-[#3a3a3c] rounded px-4 py-2 hover:bg-red-600 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
