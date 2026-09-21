"use client";

import QuestionMarkTooltip from "@/app/components/QuestionmarkTooltip";
import {
  CURRENCY_OPTIONS,
  FIELD_CLASS,
  LANGUAGE_OPTIONS,
  PAYMENT_TERMS_OPTIONS,
} from "@/lib/requestWizard";

export default function ProviderOffersFields({
  formData,
  setFormData,
  handleChange,
  setStepError,
  selectableLegalPanels,
  selectedLegalPanel,
  usingLegalPanel,
  panelDropdownRef,
  panelDropdownOpen,
  setPanelDropdownOpen,
  retainerFeeOptions,
  isFixedFee = false,
  extraFields = null,
}) {
  return (
    <div className="space-y-6">
      <div data-field="providerSource">
        <h4 className="mb-2 text-sm font-semibold text-gray-900">
          Decide which firms will see this LEXIFY Request and be able to submit
          offers:
        </h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition ${
              formData.providerSource === "criteria"
                ? "border-[#11999e] bg-[#f3fbfb]"
                : "border-gray-200 hover:border-[#11999e]/40"
            }`}
          >
            <input
              type="radio"
              name="providerSource"
              value="criteria"
              checked={formData.providerSource === "criteria"}
              onChange={handleChange}
              className="mt-1 accent-[#11999e]"
            />
            <div>
              <p className="font-semibold text-gray-900">
                Set criteria for qualifying firms
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Open this LEXIFY Request to any firm meeting the requirements
                you set, such as firm size or LEXIFY rating.
              </p>
            </div>
          </label>
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition ${
              formData.providerSource === "panel"
                ? "border-[#11999e] bg-[#f3fbfb]"
                : "border-gray-200 hover:border-[#11999e]/40"
            } ${selectableLegalPanels.length === 0 ? "opacity-60" : ""}`}
          >
            <input
              type="radio"
              name="providerSource"
              value="panel"
              checked={formData.providerSource === "panel"}
              disabled={selectableLegalPanels.length === 0}
              onChange={handleChange}
              className="mt-1 accent-[#11999e]"
            />
            <div>
              <p className="font-semibold text-gray-900">
                Choose a saved legal panel
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Restrict this LEXIFY Request to the firms on one of your saved
                panels. Only those firms will see the Request and can submit
                offers, regardless of your other settings. You can create and
                save panels under &quot;My Account&quot; in the main menu.
              </p>
            </div>
          </label>
        </div>
        {selectableLegalPanels.length === 0 ? (
          <p className="mt-2 text-xs text-gray-500">
            You do not have any legal panels with providers yet. Create a group
            on your account page to use this option.
          </p>
        ) : null}
      </div>

      {usingLegalPanel ? (
        <div
          ref={panelDropdownRef}
          className="relative"
          data-field="legalPanelGroupId"
        >
          <h4 className="mb-2 text-sm font-semibold text-gray-900">
            Select a legal panel
          </h4>
          <button
            type="button"
            className={`${FIELD_CLASS} relative pr-10 text-left`}
            onClick={() => setPanelDropdownOpen((open) => !open)}
            aria-haspopup="listbox"
            aria-expanded={panelDropdownOpen}
          >
            {selectedLegalPanel ? (
              <span className="block">
                <span className="block font-medium text-gray-900">
                  {selectedLegalPanel.name}
                </span>
                <span className="block text-sm text-gray-500">
                  ({(selectedLegalPanel.providers || []).join(", ")})
                </span>
              </span>
            ) : (
              <span className="text-black">Select</span>
            )}
            <span
              className="pointer-events-none absolute inset-y-0 right-0.5 flex items-center text-black"
              aria-hidden="true"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="none"
                className="h-3 w-3"
              >
                <path
                  d="M3.5 6.25 8 10.75l4.5-4.5"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </button>
          {panelDropdownOpen ? (
            <div
              role="listbox"
              className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg"
            >
              {selectableLegalPanels.map((group) => (
                <button
                  type="button"
                  key={group.id}
                  role="option"
                  aria-selected={formData.legalPanelGroupId === group.id}
                  className={`w-full cursor-pointer px-3 py-2 text-left hover:bg-[#f3fbfb] ${
                    formData.legalPanelGroupId === group.id
                      ? "bg-[#e6f7f7]"
                      : ""
                  }`}
                  onClick={() => {
                    setFormData({
                      ...formData,
                      legalPanelGroupId: group.id,
                    });
                    setPanelDropdownOpen(false);
                    setStepError?.(null);
                  }}
                >
                  <span className="block font-medium text-gray-900">
                    {group.name}
                  </span>
                  <span className="block text-sm text-gray-400">
                    ({(group.providers || []).join(", ")})
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {formData.providerSource === "criteria" ? (
        <>
          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-900">
              Which legal service providers can make you an offer?
            </h4>
            <select
              name="offerer"
              className={FIELD_CLASS}
              onChange={handleChange}
              value={formData.offerer}
            >
              <option value="">Select</option>
              <option value="Attorneys-at-law">Attorneys-at-law</option>
              <option value="Law firms">Law firms</option>
              <option value="All">Both attorneys-at-law & law firms</option>
            </select>
            <p className="mt-2 text-xs text-gray-500">
              <strong>NOTE:</strong> Attorneys-at-law are legal service
              providers who are members of the local bar association in their
              country of domicile. Law firms are legal service providers who
              are not members of the local bar association in their country of
              domicile, but who may offer legal services according to the law of
              their country of domicile.
            </p>
          </div>
          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-900">
              Do you want offers only from legal service providers based in the
              same country as you?
            </h4>
            <select
              name="providerCountry"
              className={FIELD_CLASS}
              onChange={handleChange}
              value={formData.providerCountry}
            >
              <option value="">Select</option>
              <option value="Yes, I want offers from domestic legal service providers only.">
                Yes, I want offers from domestic legal service providers only.
              </option>
              <option value="No, I want offers from both domestic and foreign legal service providers.">
                No, I want offers from both domestic and foreign legal service
                providers.
              </option>
            </select>
          </div>
          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-900">
              Do you want offers only from legal service providers of a specific
              minimum size?
            </h4>
            <select
              name="lawyerCount"
              className={FIELD_CLASS}
              onChange={handleChange}
              value={formData.lawyerCount}
            >
              <option value="">Select</option>
              <option value="Any size">
                No, the legal service provider can be of any size
              </option>
              <option value="5">
                Yes, the legal service provider must employ at least 5 lawyers
              </option>
              <option value="15">
                Yes, the legal service provider must employ at least 15 lawyers
              </option>
              <option value="40">
                Yes, the legal service provider must employ at least 40 lawyers
              </option>
            </select>
          </div>
          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-900">
              Do you want offers only from legal service providers who have been
              in operation for a specific minimum period of time?
            </h4>
            <select
              name="firmAge"
              className={FIELD_CLASS}
              onChange={handleChange}
              value={formData.firmAge}
            >
              <option value="">Select</option>
              <option value="Any age">
                No, the legal service provider can be of any age
              </option>
              <option value="5">
                Yes, the legal service provider has been in operation for at
                least 5 years
              </option>
              <option value="10">
                Yes, the legal service provider has been in operation for at
                least 10 years
              </option>
              <option value="25">
                Yes, the legal service provider has been in operation for at
                least 25 years
              </option>
            </select>
          </div>
          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-900">
              Do tendering legal service providers need to have a minimum
              customer feedback rating?
            </h4>
            <select
              name="firmRating"
              className={FIELD_CLASS}
              onChange={handleChange}
              value={formData.firmRating}
            >
              <option value="">Select</option>
              <option value="Any rating">No</option>
              <option value="3">Yes, average rating of at least 3/5</option>
              <option value="4">Yes, average rating of at least 4/5</option>
            </select>
            <p className="mt-2 text-xs text-gray-500">
              This rating is based on aggregated feedback a legal service
              provider has received previously from other legal service
              purchasers on LEXIFY.
            </p>
          </div>
        </>
      ) : null}

      {formData.providerSource ? (
        <>
          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-900">
              Do tendering legal service providers need to provide a written
              reference with their offer?{" "}
              <QuestionMarkTooltip tooltipText="A written reference is a formal statement or endorsement that describes a legal service provider's performance for a past client on previous legal work of a similar nature to the legal services sought in your LEXIFY Request." />
            </h4>
            <select
              name="providerReferences"
              className={FIELD_CLASS}
              onChange={handleChange}
              value={formData.providerReferences}
            >
              <option value="">Select</option>
              <option value="No">No</option>
              <option value="Yes, 1 written reference must be provided">
                Yes, 1 written reference must be provided
              </option>
              <option value="Yes, 2 written references must be provided">
                Yes, 2 written references must be provided
              </option>
            </select>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-900">
              In what currency do you want to buy the legal service?
            </h4>
            <select
              name="currency"
              className={FIELD_CLASS}
              onChange={handleChange}
              value={formData.currency}
            >
              <option value="">Select</option>
              {CURRENCY_OPTIONS.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </div>

          {extraFields}

          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-900">
              Are you prepared to pay an advance retainer fee to the legal
              service provider submitting the winning offer?{" "}
              <QuestionMarkTooltip
                tooltipText={
                  isFixedFee
                    ? "An advance retainer fee is an amount payable by you to the legal service provider submitting the winning offer within 14 days of the date of the LEXIFY Contract between you and the legal service provider. The advance retainer fee forms a part of the total price of the legal service as offered by the legal service provider."
                    : "An advance retainer fee is an amount payable by you to the legal service provider submitting the winning offer within 14 days of the date of the LEXIFY Contract between you and the legal service provider. The advance retainer fee forms a part of the total price of the legal service as offered by the legal service provider. For legal work based on an hourly rate offer, the legal service provider will refund you for any unused amount of the advance retainer fee if the total price of the legal service when completed amounts to less than the amount of the advance retainer fee."
                }
              />
            </h4>
            <select
              name="retainerFee"
              className={FIELD_CLASS}
              onChange={handleChange}
              value={formData.retainerFee}
            >
              <option value="">Select</option>
              {retainerFeeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-900">
              How do you want to be invoiced?
            </h4>
            <select
              name="paymentTerms"
              className={FIELD_CLASS}
              onChange={handleChange}
              value={formData.paymentTerms}
            >
              <option value="">Select</option>
              {PAYMENT_TERMS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div data-field="languages">
            <h4 className="mb-2 text-sm font-semibold text-gray-900">
              What languages are needed for the performance of the work?
            </h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {LANGUAGE_OPTIONS.map((option) => (
                <label
                  key={option}
                  className="flex items-center gap-2 text-sm text-gray-800"
                >
                  <input
                    type="checkbox"
                    value={option}
                    checked={(formData.checkboxes || []).includes(option)}
                    onChange={handleChange}
                    className="accent-[#11999e]"
                  />
                  {option}
                </label>
              ))}
            </div>
            {(formData.checkboxes || []).includes("Other:") ? (
              <input
                type="text"
                name="otherLang"
                placeholder="Specify Other Language"
                className={`${FIELD_CLASS} mt-3`}
                value={formData.otherLang}
                onChange={handleChange}
              />
            ) : null}
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-900">
              By when do you need offers from interested legal service
              providers?{" "}
              <QuestionMarkTooltip tooltipText="Sets the deadline for offers at the end of the selected day." />
            </h4>
            <input
              type="date"
              name="date"
              className={`${FIELD_CLASS} max-w-xs`}
              value={formData.date}
              onChange={handleChange}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
