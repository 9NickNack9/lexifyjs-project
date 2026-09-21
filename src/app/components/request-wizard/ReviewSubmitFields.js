"use client";

import QuestionMarkTooltip from "@/app/components/QuestionmarkTooltip";
import { FIELD_CLASS } from "@/lib/requestWizard";

export default function ReviewSubmitFields({
  formData,
  handleChange,
  onFileChange,
  onDeleteFile,
  onPreview,
  winningBidderNote = false,
  extraBeforeTitle = null,
}) {
  return (
    <div className="space-y-6">
      {extraBeforeTitle}
      <div>
        <h4 className="mb-2 text-sm font-semibold text-gray-900">
          Do you want to include in the LEXIFY Request your Supplier Code of
          Conduct or other procurement related requirements which legal service
          providers are required to follow? If yes, please upload the relevant
          documents by clicking “Upload Procurement Appendices” below.{" "}
          <QuestionMarkTooltip tooltipText="Please upload only requirements mandatory to all suppliers of your company (such as your Supplier Code of Conduct or minimum standards for supplier information security). Please do not upload your general procurement contract terms and conditions. Any such general contract terms and conditions, even if uploaded, will not become a binding part of the LEXIFY Contract between you and the legal service provider submitting the winning offer. The terms and conditions applicable to all LEXIFY Contracts are set out in the General Terms and Conditions for LEXIFY Contracts." />
        </h4>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200">
            Upload Procurement Appendices
            <input
              type="file"
              name="supplierFiles"
              multiple
              className="hidden"
              onChange={onFileChange}
            />
          </label>
          <span className="text-sm text-gray-500">
            {formData.supplierFiles?.length
              ? `${formData.supplierFiles.length} file(s) selected`
              : "No files selected"}
          </span>
        </div>
        {formData.supplierFiles?.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {formData.supplierFiles.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <span className="truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => onDeleteFile(index)}
                  className="ml-2 cursor-pointer rounded bg-red-500 px-2 py-1 text-xs text-white"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {winningBidderNote ? (
          <p className="mt-3 text-xs text-gray-500">
            <strong>NOTE:</strong> If you have selected &quot;Disclosed to
            Winning Bidder Only&quot; earlier in the LEXIFY Request to ensure
            your name and the name of your counterparty are disclosed only to
            the legal service provider submitting the winning offer, please make
            sure that any procurement appendices you may upload do not disclose
            the name of your company.
          </p>
        ) : null}
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold text-gray-900">
          Give a title for your LEXIFY Request{" "}
          <QuestionMarkTooltip tooltipText="This title will not be shown to any legal service providers and will only be used in your personal LEXIFY Request archive (see My Dashboard in the LEXIFY main menu)." />
        </h4>
        <input
          type="text"
          name="requestTitle"
          className={FIELD_CLASS}
          value={formData.requestTitle}
          onChange={handleChange}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onPreview}
          className="cursor-pointer rounded-lg bg-gray-700 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
        >
          Preview
        </button>
      </div>

      <label className="flex items-start gap-2 text-sm text-gray-800">
        <input
          type="checkbox"
          name="agree"
          checked={formData.agree}
          onChange={handleChange}
          className="mt-0.5 accent-[#11999e]"
        />
        I have carefully reviewed my LEXIFY Request and I am ready to submit
        it.
      </label>
      <p className="text-xs leading-relaxed text-gray-500">
        By submitting this LEXIFY Request, I accept that LEXIFY will
        automatically generate a binding LEXIFY Contract between my company, as
        the legal service purchaser, and the legal service provider submitting
        the winning offer, subject to the parameters defined in my LEXIFY
        Request and my selection of the winning offer from the best offers
        received. The LEXIFY Contract will consist of (i) the service
        description, other specifications, and any Procurement Appendices (if
        applicable) designated in the LEXIFY Request, and (ii) the General Terms
        and Conditions for LEXIFY Contracts. The LEXIFY Contract will not be
        generated if (i) no qualifying offers have been received prior to the
        expiration of my LEXIFY Request, (ii) I, as representative of the legal
        service purchaser, cancel the LEXIFY Request, or (iii) I do not
        actively select any winning service provider within the period allocated
        for the selection of a winning offer after the expiration of the LEXIFY
        Request.
      </p>
    </div>
  );
}
