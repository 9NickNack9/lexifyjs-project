"use client";
// src/app/(purchaser)/archive/components/PreviewModal.js

export default function PreviewModal({ open, onClose, row, companyName }) {
  if (!open || !row) return null;

  const Section = ({ title, children }) => (
    <div>
      <div className="bg-[#11999e] p-2">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-[#11999e] bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white w-11/12 max-w-4xl shadow-lg overflow-y-auto max-h-[90vh] relative">
        {/* Header */}
        <div className="w-full p-4 flex flex-col items-center bg-[#11999e]">
          <img src="/lexify.png" alt="LEXIFY Logo" className="h-16 mb-2" />
          <h2 className="text-2xl font-bold text-white">
            LEXIFY Request Preview
          </h2>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white bg-[#3a3a3c] rounded-full w-8 h-8 flex items-center justify-center text-xl hover:bg-red-600 transition cursor-pointer"
        >
          &times;
        </button>

        {/* Content */}
        <div id="lexify-preview" className="space-y-6 text-black p-8">
          <Section title="Client Name, Business ID and Country of Domicile">
            <p className="text-md mt-2">
              {companyName
                ? `${companyName}, (Business ID: —), (Country: —)`
                : "—"}
            </p>
          </Section>

          <Section title="Scope of Work">
            <p className="text-md mt-2">{row.scopeOfWork || "—"}</p>
          </Section>

          <Section title="Contract Price (Lump Sum Fixed Fee or Flat Hourly Rate) and Currency">
            <p className="text-md mt-2">{row.paymentRate || "—"}</p>
            <p className="text-md mt-2">Currency: {row.currency || "—"}</p>
          </Section>

          <Section title="Description of Client's Line of Business">
            <p className="text-md mt-2">{row.description || "—"}</p>
          </Section>

          <Section title="Additional Background Information Provided by Client">
            <p className="text-md mt-2">
              {row.additionalBackgroundInfo || "—"}
            </p>
            {Array.isArray(row.supplierCodeOfConductFiles) &&
              row.supplierCodeOfConductFiles.length > 0 && (
                <ul className="list-disc pl-6 mt-2">
                  {row.supplierCodeOfConductFiles.map((f, i) => (
                    <li key={i}>{f?.name || "Attachment"}</li>
                  ))}
                </ul>
              )}
          </Section>

          <Section title="Is an Advance Retainer Fee Paid to the Legal Service Provider?">
            <p className="text-md mt-2">{row.advanceRetainerFee || "—"}</p>
          </Section>

          <Section title="Invoicing">
            <p className="text-md mt-2">
              The Legal Service Provider shall invoice the Client as follows:
            </p>
            <p className="text-md mt-2">{row.invoiceType || "—"}</p>
          </Section>

          <Section title="Languages Required for the Performance of the Work">
            <p className="text-md mt-2">{row.language || "—"}</p>
          </Section>
        </div>

        <button
          onClick={onClose}
          className="m-4 text-white bg-[#3a3a3c] rounded px-4 py-2 hover:bg-red-600 transition cursor-pointer"
        >
          Close Preview
        </button>
      </div>
    </div>
  );
}
