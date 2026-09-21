"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QuestionMarkTooltip from "@/app/components/QuestionmarkTooltip";
import AutoGrowTextarea from "@/app/components/AutoGrowTextarea";
import RequestWizard from "@/app/components/RequestWizard";
import useLexiDraftPrefill from "@/hooks/useLexiDraftPrefill";
import useRequestWizardNav from "@/hooks/useRequestWizardNav";
import useRequestDrafts from "@/hooks/useRequestDrafts";
import {
  FIELD_CLASS,
  REVIEW_STEP_TOOLTIP,
  validateProviderOffers,
  validateReviewSubmit,
  eligibleFirmsSummary,
  legalPanelSubmitFields,
  retainerFeeOptionsForNeed,
  normalizeRetainerFee,
  selectedLanguagesFromForm,
  formatDeadlineDate,
  optionLabel,
  PROVIDER_REFERENCE_OPTIONS,
  fileNames,
  getSelectableLegalPanels,
  getSelectedLegalPanel,
} from "@/lib/requestWizard";
import CheckboxOptionCards from "@/app/components/request-wizard/CheckboxOptionCards";
import SummaryRow from "@/app/components/request-wizard/SummaryRow";
import BackgroundFields from "@/app/components/request-wizard/BackgroundFields";
import ProviderOffersFields from "@/app/components/request-wizard/ProviderOffersFields";
import ReviewSubmitFields from "@/app/components/request-wizard/ReviewSubmitFields";
import {
  DraftHeaderActions,
  LoadDraftModal,
  SaveDraftModal,
} from "@/app/components/request-wizard/DraftControls";
import RequestPreviewModal, {
  PreviewSection as Section,
} from "@/app/components/request-wizard/RequestPreviewModal";

const REQUEST_DRAFT_TYPE = "ictReview";
const PAGE_PATH = "/contracts/ict-review";
const DRAFT_EMPTY_TEXT = "No saved ICT/IT Contract Review drafts found.";

const TEMPLATE_OPTIONS = [
  "SaaS",
  "Licensing",
  "Software Development",
  "Application Management Services",
  "Application Terms of Use or EULA",
  "Data Processing Agreement for Personal Data",
  "Data Sharing Agreement for Product Data",
  "Proof of Concept or Piloting",
  "Other:",
];

const PRICE_RANGE_OPTIONS = [
  "0-100 kEUR",
  "100-500 kEUR",
  "500 kEUR-1 mEUR",
  "1-5 mEUR",
  "5+ mEUR",
  "To be confirmed later",
];

const WIZARD_STEPS = [
  {
    id: "docs",
    label: "Document(s) to be reviewed",
    title:
      "What kind of contract document(s) requiring a legal review have you received from the supplier?",
  },
  { id: "company", label: "Who is involved", title: "Who is involved?" },
  {
    id: "extra",
    label: "Contract value",
    title: "What is the expected value of the contract?",
  },
  { id: "background", label: "Background", title: "Background" },
  {
    id: "providers",
    label: "Who can submit offers",
    title: "Who can submit offers?",
  },
  {
    id: "review",
    label: "Review",
    title: "Review and submit",
    tooltip: REVIEW_STEP_TOOLTIP,
  },
];

function scopeListFromForm(formData) {
  return [
    ...(formData.templateboxes || []).filter((item) => item !== "Other:"),
    (formData.templateboxes || []).includes("Other:")
      ? formData.otherTemplate
      : null,
  ].filter(Boolean);
}

export default function IctReview() {
  const router = useRouter();

  const initialFormState = {
    templateboxes: [],
    otherTemplate: "",
    confidential: "",
    confboxes: [],
    description: "",
    priceRange: "",
    background: "",
    backgroundFiles: [],
    providerSource: "",
    legalPanelGroupId: "",
    offerer: "",
    providerCountry: "",
    lawyerCount: "",
    firmAge: "",
    firmRating: "",
    providerReferences: "",
    currency: "",
    maxPrice: "",
    retainerFee: "",
    paymentTerms: "",
    checkboxes: [],
    otherLang: "",
    date: "",
    supplierFiles: [],
    requestTitle: "",
    agree: false,
  };

  const [formData, setFormData] = useState(initialFormState);
  useLexiDraftPrefill(setFormData);
  const [showPreview, setShowPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [company, setCompany] = useState({
    name: "",
    businessId: "",
    country: "",
  });
  const [legalPanelGroups, setLegalPanelGroups] = useState([]);
  const [panelDropdownOpen, setPanelDropdownOpen] = useState(false);
  const panelDropdownRef = useRef(null);

  const applyDraftData = (prev, draft) => {
    const next = {
      ...prev,
      ...(draft.data || {}),
      requestTitle: draft.data?.requestTitle || draft.title || "",
      providerSource: draft.data?.providerSource || "criteria",
      legalPanelGroupId: draft.data?.legalPanelGroupId || "",
      backgroundFiles: [],
      supplierFiles: [],
      agree: false,
    };
    next.retainerFee = normalizeRetainerFee(next.retainerFee, true);
    return next;
  };

  const drafts = useRequestDrafts({
    requestType: REQUEST_DRAFT_TYPE,
    pagePath: PAGE_PATH,
    formData,
    setFormData,
    emptyText: DRAFT_EMPTY_TEXT,
    applyDraftData,
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        if (!res.ok) return;
        const me = await res.json();
        setCompany({
          name: me?.company?.companyName || me?.companyName || "",
          businessId: me?.company?.businessId || "",
          country: me?.company?.companyCountry || me?.companyCountry || "",
        });
        setLegalPanelGroups(
          Array.isArray(me?.legalPanelGroups)
            ? me.legalPanelGroups
            : Array.isArray(me?.legalPanelServiceProviders)
              ? me.legalPanelServiceProviders
              : [],
        );
      } catch {
        /* no-op */
      }
    })();
  }, []);

  const selectedLanguages = selectedLanguagesFromForm(formData);
  const selectableLegalPanels = getSelectableLegalPanels(legalPanelGroups);
  const selectedLegalPanel = getSelectedLegalPanel(
    legalPanelGroups,
    formData.legalPanelGroupId,
  );
  const usingLegalPanel = formData.providerSource === "panel";
  const retainerFeeOptions = retainerFeeOptionsForNeed(true);
  const templateboxes = formData.templateboxes || [];
  const confboxes = formData.confboxes || [];
  const disclosedOnly = confboxes.includes("Disclosed to Winning Bidder Only");

  const validateStep = (step) => {
    if (step === 0) {
      if (templateboxes.length === 0) {
        return {
          error: "Choose at least one contract document type.",
          field: "templateboxes",
        };
      }
      if (templateboxes.includes("Other:") && !formData.otherTemplate) {
        return {
          error: "Please specify the 'Other' document.",
          field: "otherTemplate",
        };
      }
      if (!formData.description) {
        return {
          error: "Provide a brief description.",
          field: "description",
        };
      }
      return null;
    }
    if (step === 1) return null;
    if (step === 2) {
      if (!formData.priceRange) {
        return {
          error: "Please select the expected value of the contract.",
          field: "priceRange",
        };
      }
      return null;
    }
    if (step === 3) return null;
    if (step === 4) {
      return validateProviderOffers(formData, {
        usingLegalPanel,
        selectedLegalPanel,
        selectedLanguages,
      });
    }
    if (step === 5) return validateReviewSubmit(formData);
    return null;
  };

  const {
    currentStep,
    setCurrentStep,
    stepError,
    setStepError,
    formRef,
    goToStep,
    goNext,
    goBack,
    showFirstInvalidStep,
  } = useRequestWizardNav({ steps: WIZARD_STEPS, validateStep });

  drafts.onDraftLoadedRef.current = (skipReset) => {
    if (!skipReset) setCurrentStep(0);
    setStepError(null);
  };

  useEffect(() => {
    window.__LEXIFY_REQUEST_CONTEXT__ = {
      requestType: "ICT/IT Contract Review",
      legalArea: [
        ...templateboxes.filter((item) => item !== "Other:"),
        formData.otherTemplate || null,
      ].filter(Boolean),
      description: formData.description,
      additionalBackgroundInfo: formData.background,
      confidentialCounterpartyInfo: formData.confidential,
      priceRange: formData.priceRange,
      providerRequirements:
        formData.providerSource === "panel"
          ? {
              selection: "legalPanel",
              legalPanelGroupId: formData.legalPanelGroupId,
              legalPanelGroupName: selectedLegalPanel?.name || "",
              legalPanelProviders: selectedLegalPanel?.providers || [],
            }
          : {
              selection: "criteria",
              providerType: formData.offerer,
              providerCountry: formData.providerCountry,
              minimumLawyerCount: formData.lawyerCount,
              minimumFirmAge: formData.firmAge,
              minimumRating: formData.firmRating,
              requiredReferences: formData.providerReferences,
            },
      commercialTerms: {
        currency: formData.currency,
        maximumPrice: null,
        retainerFee: formData.retainerFee,
        paymentTerms: formData.paymentTerms,
      },
      languages: selectedLanguages,
      offersDeadline: formData.date,
      uploadedBackgroundFiles: formData.backgroundFiles?.map(
        (file) => file.name,
      ),
      uploadedSupplierFiles: formData.supplierFiles?.map((file) => file.name),
    };
  }, [formData, selectedLanguages, selectedLegalPanel, templateboxes]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        panelDropdownRef.current &&
        !panelDropdownRef.current.contains(event.target)
      ) {
        setPanelDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleBackgroundFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    setFormData((state) => ({
      ...state,
      backgroundFiles: [...state.backgroundFiles, ...files],
    }));
    e.target.value = "";
  };
  const handleSupplierFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    setFormData((state) => ({
      ...state,
      supplierFiles: [...state.supplierFiles, ...files],
    }));
    e.target.value = "";
  };
  const handleDeleteBackgroundFile = (index) => {
    const updated = [...formData.backgroundFiles];
    updated.splice(index, 1);
    setFormData({ ...formData, backgroundFiles: updated });
  };
  const handleDeleteSupplierFile = (index) => {
    const updated = [...formData.supplierFiles];
    updated.splice(index, 1);
    setFormData({ ...formData, supplierFiles: updated });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setStepError(null);
    if (type === "checkbox") {
      if (name === "agree") {
        setFormData({ ...formData, agree: checked });
      } else if (name === "confboxes") {
        setFormData({
          ...formData,
          confboxes: checked
            ? [...confboxes, value]
            : confboxes.filter((item) => item !== value),
        });
      } else if (name === "templateboxes") {
        setFormData({
          ...formData,
          templateboxes: checked
            ? [...templateboxes, value]
            : templateboxes.filter((item) => item !== value),
        });
      } else {
        setFormData({
          ...formData,
          checkboxes: checked
            ? [...formData.checkboxes, value]
            : formData.checkboxes.filter((item) => item !== value),
        });
      }
    } else if (name === "providerSource") {
      setFormData({
        ...formData,
        providerSource: value,
        legalPanelGroupId:
          value === "panel" && selectableLegalPanels.length === 1
            ? selectableLegalPanels[0].id
            : value === "panel"
              ? formData.legalPanelGroupId
              : "",
      });
      setPanelDropdownOpen(false);
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const toggleTemplate = (value) => {
    setStepError(null);
    setFormData((prev) => ({
      ...prev,
      templateboxes: (prev.templateboxes || []).includes(value)
        ? prev.templateboxes.filter((item) => item !== value)
        : [...(prev.templateboxes || []), value],
    }));
  };

  const handleCancel = () => {
    if (!drafts.confirmLeave()) return;
    router.push("/main");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (currentStep < WIZARD_STEPS.length - 1) {
      goNext();
      return;
    }

    const err = showFirstInvalidStep();
    if (err) {
      alert(err);
      return;
    }

    setSubmitting(true);
    try {
      const languageCSV = selectedLanguages.join(", ");
      const scopeList = scopeListFromForm(formData).join(", ");
      const panelFields = legalPanelSubmitFields({
        usingLegalPanel,
        selectedLegalPanel,
        formData,
      });

      const payload = {
        requestState: "PENDING",
        requestCategory: "Help with Contracts",
        requestSubcategory: "ICT and IT",
        assignmentType: "Legal review of ICT/IT contract",
        scopeOfWork:
          "Legal review of the following ICT/IT related contract documents provided by a supplier of the Client: " +
          scopeList +
          " The work includes a legal review of the document(s) listed above with proposed changes and legal observations provided to the Client in writing. Additional work (for example, legal advice during further negotiation rounds) is not included.",
        description: formData.description,
        additionalBackgroundInfo: formData.background || "",
        backgroundInfoFiles: [],
        supplierCodeOfConductFiles: [],
        ...panelFields,
        currency: formData.currency,
        paymentRate: "Lump sum fixed price.",
        advanceRetainerFee: formData.retainerFee,
        invoiceType: formData.paymentTerms,
        language: languageCSV,
        offersDeadline: formData.date,
        title: formData.requestTitle,
        dateExpired: formData.date,
        details: {
          documentTypes: scopeList,
          expectedValue: formData.priceRange || "",
          confidential: disclosedOnly ? "Yes" : "No",
          winnerBidderOnlyStatus: (formData.confidential || "").trim(),
          maximumPrice: null,
        },
      };

      const form = new FormData();
      form.append(
        "data",
        new Blob([JSON.stringify(payload)], { type: "application/json" }),
      );
      for (const file of formData.backgroundFiles)
        form.append("backgroundFiles", file, file.name);
      for (const file of formData.supplierFiles)
        form.append("supplierFiles", file, file.name);

      const res = await fetch("/api/requests", { method: "POST", body: form });
      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        /* keep json = null */
      }
      if (!res.ok) {
        throw new Error(
          (json && json.error) || text || "Failed to create request.",
        );
      }

      alert("LEXIFY Request submitted successfully.");
      drafts.clearDraftGuard();
      router.push("/main");
    } catch (error) {
      alert(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const scopeSummary = scopeListFromForm(formData);

  return (
    <>
      <form ref={formRef} onSubmit={handleSubmit} noValidate>
        <RequestWizard
          categoryLabel="Help with Reviewing an ICT/IT Contract Sent by a Supplier"
          steps={WIZARD_STEPS}
          currentStep={currentStep}
          onStepClick={goToStep}
          onNext={() =>
            goNext({
              onLastStep: () => formRef.current?.requestSubmit(),
            })
          }
          onBack={goBack}
          onCancel={handleCancel}
          nextLabel={
            currentStep === WIZARD_STEPS.length - 1
              ? submitting
                ? "Submitting…"
                : "Submit LEXIFY Request"
              : "Next"
          }
          nextDisabled={submitting}
          error={stepError}
          headerAction={
            <DraftHeaderActions
              loadedDraft={drafts.loadedDraft}
              draftActionLoading={drafts.draftActionLoading}
              onSaveChanges={drafts.handleSaveChanges}
              onSaveAsNew={drafts.openSaveDraftModal}
              onLoadDraft={drafts.openLoadDraftModal}
            />
          }
        >
          {currentStep === 0 && (
            <div className="space-y-6">
              <CheckboxOptionCards
                options={TEMPLATE_OPTIONS}
                selected={templateboxes}
                onToggle={toggleTemplate}
                field="templateboxes"
                otherValue={formData.otherTemplate}
                onOtherChange={handleChange}
                otherName="otherTemplate"
              />
              <div className="flex gap-3 rounded-xl bg-[#e8f4f6] p-4 text-sm text-gray-700">
                <p>
                  <strong>NOTE: </strong>
                  Any offers you receive will be for a lump sum fixed price and
                  provide for a legal review of the relevant document(s) sent by
                  the supplier with proposed changes and legal observations
                  included in writing. Additional work (for example, legal
                  advice during further negotiation rounds) is not included.
                </p>
              </div>
              <div data-field="description">
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  Please provide a brief description of the product or service
                  you are buying with the contract documentation sent by the
                  supplier. Please also confirm the total number of pages in the
                  documentation requiring legal review{" "}
                  <QuestionMarkTooltip tooltipText="Please do not include any personal data in the description. This information will be visible to all legal service providers qualified to submit an offer in response to your LEXIFY Request." />
                </h4>
                <AutoGrowTextarea
                  name="description"
                  className={FIELD_CLASS}
                  onChange={handleChange}
                  value={formData.description}
                />
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-6">
              <div data-field="confidential">
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  Please provide the name, business identity code and country of
                  domicile of the supplier with whom you are negotiating the
                  contract. If you do not want your name and the name of the
                  supplier to be visible to all legal service providers
                  qualified to make you an offer, please also check the box
                  &quot;Disclosed to Winning Bidder Only&quot;
                  <QuestionMarkTooltip tooltipText="If 'Disclosed to Winning Bidder Only' is checked, your identity and the identity of your supplier will be disclosed solely to the legal service provider that submitted the winning offer, to enable that provider to conduct mandatory conflict checks. If the legal service provider notifies LEXIFY of an existing conflict, the winning offer will automatically be disqualified, and you will have the option to select an alternative winning offer." />
                </h4>
                <AutoGrowTextarea
                  name="confidential"
                  className={FIELD_CLASS}
                  onChange={handleChange}
                  value={formData.confidential}
                />
                <label className="mt-3 flex items-center gap-2 text-sm text-gray-800">
                  <input
                    type="checkbox"
                    name="confboxes"
                    value="Disclosed to Winning Bidder Only"
                    checked={disclosedOnly}
                    onChange={handleChange}
                    className="accent-[#11999e]"
                  />
                  Disclosed to Winning Bidder Only{" "}
                  <QuestionMarkTooltip tooltipText="Please note that checking “Disclosed to Winning Bidder Only” may cause additional delay in the processing of your LEXIFY Request as statutory conflict checks are postponed until the winning offer has been verified." />
                </label>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div data-field="priceRange">
              <h4 className="mb-2 text-sm font-semibold text-gray-900">
                What is the the expected value of the contract?
                <QuestionMarkTooltip tooltipText="This information will be visible to all legal service providers qualified to submit an offer in response to your LEXIFY Request." />
              </h4>
              <select
                name="priceRange"
                className={FIELD_CLASS}
                onChange={handleChange}
                value={formData.priceRange}
              >
                <option value="">Select</option>
                {PRICE_RANGE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          )}

          {currentStep === 3 && (
            <BackgroundFields
              formData={formData}
              onChange={handleChange}
              onFileChange={handleBackgroundFileChange}
              onDeleteFile={handleDeleteBackgroundFile}
            />
          )}

          {currentStep === 4 && (
            <ProviderOffersFields
              formData={formData}
              setFormData={setFormData}
              handleChange={handleChange}
              setStepError={setStepError}
              selectableLegalPanels={selectableLegalPanels}
              selectedLegalPanel={selectedLegalPanel}
              usingLegalPanel={usingLegalPanel}
              panelDropdownRef={panelDropdownRef}
              panelDropdownOpen={panelDropdownOpen}
              setPanelDropdownOpen={setPanelDropdownOpen}
              retainerFeeOptions={retainerFeeOptions}
              isFixedFee
            />
          )}

          {currentStep === 5 && (
            <div className="space-y-6">
              <dl className="rounded-xl border border-gray-200 px-4">
                <SummaryRow
                  label="Document(s) requiring legal review"
                  value={scopeSummary}
                />
                <SummaryRow
                  label="Product or service; number of pages"
                  value={formData.description}
                />
                <SummaryRow
                  label="Supplier"
                  value={
                    disclosedOnly
                      ? "Disclosed to Winning Bidder Only"
                      : formData.confidential
                  }
                />
                <SummaryRow
                  label="Expected contract value"
                  value={formData.priceRange}
                />
                <SummaryRow label="Background" value={formData.background} />
                {formData.backgroundFiles?.length ? (
                  <SummaryRow
                    label="Background files"
                    value={fileNames(formData.backgroundFiles)}
                  />
                ) : null}
                <SummaryRow
                  label="Law firms eligible to submit offers"
                  value={eligibleFirmsSummary({
                    usingLegalPanel,
                    selectedLegalPanel,
                    formData,
                  })}
                />
                <SummaryRow
                  label="Written references required"
                  value={optionLabel(
                    PROVIDER_REFERENCE_OPTIONS,
                    formData.providerReferences,
                  )}
                />
                <SummaryRow label="Currency" value={formData.currency} />
                <SummaryRow
                  label="Advance retainer fee offered"
                  value={optionLabel(retainerFeeOptions, formData.retainerFee)}
                />
                <SummaryRow label="Invoicing" value={formData.paymentTerms} />
                <SummaryRow
                  label="Languages"
                  value={selectedLanguages}
                />
                <SummaryRow
                  label="Deadline for offers"
                  value={formatDeadlineDate(formData.date)}
                />
                <SummaryRow
                  label="Pricing model"
                  value="Lump sum fixed price"
                />
              </dl>
              <ReviewSubmitFields
                formData={formData}
                handleChange={handleChange}
                onFileChange={handleSupplierFileChange}
                onDeleteFile={handleDeleteSupplierFile}
                onPreview={() => setShowPreview(true)}
                winningBidderNote={disclosedOnly}
              />
            </div>
          )}
        </RequestWizard>
      </form>

      <RequestPreviewModal
        open={showPreview}
        onClose={() => setShowPreview(false)}
      >
        <Section title="Client Name, Business Identity Code and Country of Domicile">
          {disclosedOnly
            ? "Disclosed to Winning Bidder Only"
            : [company.name, company.businessId, company.country]
                .filter(Boolean)
                .join(", ") || "-"}
        </Section>
        <Section title="Scope of Work">
          <p>
            Legal review of the following ICT/IT related contract documents
            provided by a supplier of the Client:
          </p>
          {templateboxes.length > 0
            ? templateboxes
                .map((item) =>
                  item === "Other:" && formData.otherTemplate
                    ? formData.otherTemplate
                    : item,
                )
                .join(", ")
            : "-"}
          <p className="pt-4">
            The work includes a legal review of the document(s) listed above
            with proposed changes and legal observations provided to the Client
            in writing. Additional work (for example, legal advice during
            further negotiation rounds) is not included.
          </p>
        </Section>
        <Section title="Contract Price (Lump Sum Fixed Fee or Blended Hourly Rate) and Currency">
          {`Lump Sum Fixed Fee. ${
            formData.currency ? `(${formData.currency})` : ""
          }`}
          <p className="mt-2 text-md">
            The Legal Service Provider shall submit all invoices to the Client
            in the contract price currency, unless otherwise instructed in
            writing by the Client.
          </p>
        </Section>
        <Section title="Description of the Product or Service the Client is Buying with the Contract under Negotiation; Total Number of Pages of Documentation Requiring Legal Review">
          {formData.description || "-"}
        </Section>
        <Section title="Name, Business Identity Code and Country of Domicile of Client's Counterparty (Supplier) in the Matter">
          {disclosedOnly
            ? "Disclosed to Winning Bidder Only"
            : formData.confidential || "-"}
          <p className="mt-2 text-xs italic">
            <strong>NOTE:</strong> If the above states &quot;Disclosed to
            Winning Bidder Only&quot;, the relevant identity or identities will
            be disclosed only to the legal service provider submitting the
            winning offer to enable that service provider to complete its
            mandatory conflict checks. If an existing conflict is then notified
            by the legal service provider to LEXIFY, the winning offer will
            automatically be disqualified and you will have the option to select
            an alternative winning offer.
          </p>
        </Section>
        <Section title="Expected Value of the Contract Under Negotiation">
          {formData.priceRange || "-"}
        </Section>
        <Section title="Additional Background Information Provided by Client">
          <p>{formData.background || "-"}</p>
          {formData.backgroundFiles.length > 0 ? (
            <ul className="mt-2 list-disc pl-6">
              {formData.backgroundFiles.map((file, index) => (
                <li key={index}>
                  <a
                    href={URL.createObjectURL(file)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    {file.name}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </Section>
        <Section title="Is an Advance Retainer Fee Paid to the Legal Service Provider?">
          {formData.retainerFee || "-"}
          <p className="mt-2 text-xs italic">
            <strong>NOTE:</strong> An advance retainer fee is an amount payable
            by the client to the legal service provider submitting the winning
            offer within 14 days of the date of the LEXIFY Contract between the
            client and the legal service provider. The advance retainer fee
            forms a part of the total price of the legal service as offered by
            the legal service provider. For legal service based on an hourly
            rate, the legal service provider shall refund the client for any
            unused amount of the advance retainer fee if the total price of the
            legal service when completed amounts to less than the amount of the
            advance retainer fee. Such refund shall be paid within 14 days of
            the completion of the legal service.
          </p>
        </Section>
        <Section title="Invoicing">
          <p className="mt-2 text-md">
            The Legal Service Provider shall invoice the Client in the following
            manner:
          </p>
          {formData.paymentTerms || "-"}
          <p className="mt-2 text-md">
            Further details, such as contact person for invoices and method of
            invoicing (for example, email, e-invoicing or other), related to
            invoicing shall be agreed separately between the client and the
            legal service provider.
          </p>
        </Section>
        <Section title="Languages Required for the Performance of the Work">
          {selectedLanguages.join(", ") || "-"}
          <p className="mt-2 text-md">
            The legal service provider confirms that its representatives
            involved in the performance of the work have appropriate advanced
            proficiency in all the languages listed above.
          </p>
        </Section>
        <Section title="Is the Legal Service Provider Required to Comply with a Supplier Code of Conduct and/or Other Procurement related Requirements of the Client?">
          {formData.supplierFiles.length > 0 ? (
            <>
              <p className="mb-2">
                Yes, please see the Supplier Code of Conduct attached:
              </p>
              <ul className="list-disc pl-6">
                {formData.supplierFiles.map((file, index) => (
                  <li key={index}>
                    <a
                      href={URL.createObjectURL(file)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      {file.name}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            "No"
          )}
        </Section>
        <Section title="Is the Legal Service Provider Required to Provide Written References with the Offer?">
          {formData.providerReferences || "-"}
        </Section>
      </RequestPreviewModal>

      <LoadDraftModal
        open={drafts.showLoadDraftModal}
        drafts={drafts.drafts}
        loading={drafts.draftsLoading}
        actionLoading={drafts.draftActionLoading}
        emptyText={drafts.emptyText}
        onClose={() => drafts.setShowLoadDraftModal(false)}
        onLoad={drafts.handleLoadDraft}
        onDelete={drafts.handleDeleteDraft}
      />
      <SaveDraftModal
        open={drafts.showSaveDraftModal}
        title={drafts.draftTitleInput}
        error={drafts.draftSaveError}
        loading={drafts.draftActionLoading}
        onChangeTitle={drafts.setDraftTitleInput}
        onClose={drafts.closeSaveDraftModal}
        onSave={drafts.handleSaveDraft}
      />
    </>
  );
}
