"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useLexiDraftPrefill from "@/hooks/useLexiDraftPrefill";
import useRequestDrafts from "@/hooks/useRequestDrafts";
import useRequestWizardNav from "@/hooks/useRequestWizardNav";
import RequestWizard from "@/app/components/RequestWizard";
import AutoGrowTextarea from "@/app/components/AutoGrowTextarea";
import QuestionMarkTooltip from "@/app/components/QuestionmarkTooltip";
import NeedOptionCards from "@/app/components/request-wizard/NeedOptionCards";
import SummaryRow from "@/app/components/request-wizard/SummaryRow";
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
import {
  FIELD_CLASS,
  REVIEW_STEP_TOOLTIP,
  eligibleFirmsSummary,
  fileNames,
  formatDeadlineDate,
  getSelectableLegalPanels,
  getSelectedLegalPanel,
  legalPanelSubmitFields,
  normalizeRetainerFee,
  optionLabel,
  retainerFeeOptionsForNeed,
  selectedLanguagesFromForm,
  validateProviderOffers,
  validateReviewSubmit,
  PROVIDER_REFERENCE_OPTIONS,
} from "@/lib/requestWizard";

const REQUEST_DRAFT_TYPE = "complianceQuestionnaire";
const PAGE_PATH = "/requests/kyc";
const DRAFT_EMPTY_TEXT =
  "No saved KYC or Compliance Questionnaire drafts found.";

const NEED_KYC =
  "Legal support with responding to a KYC (Know Your Customer) questionnaire sent to the Client by a financial institution or other supplier of products or services.";
const NEED_INTERNAL =
  "Responding to a compliance related questionnaire prepared by the Client and intended for the Client's internal use.";

const NEED_OPTIONS = [
  {
    value: NEED_KYC,
    title:
      "I need help with responding to a KYC (Know Your Customer) questionnaire sent to my company by a financial institution or other supplier of products or services",
    pricing: "Lump sum fixed price",
    icon: "kyc",
    note: "Any offers you receive will be for a lump sum fixed price and cover the completion of the uploaded questionnaire only.",
  },
  {
    value: NEED_INTERNAL,
    title:
      "I need responses to a compliance related questionnaire prepared by my company and intended for my company's internal use",
    pricing: "Lump sum fixed price",
    icon: "template",
    note: "Any offers you receive will be for a lump sum fixed price and cover the completion of the uploaded questionnaire only.",
  },
];

const WIZARD_STEPS = [
  {
    id: "need",
    label: "Support needed",
    title: "What kind of support do you need?",
  },
  { id: "company", label: "Who is involved", title: "Who is involved?" },
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

const LAWYER_COUNT_ALIASES = {
  "Atleast 5 lawyers": "5",
  "Atleast 15 lawyers": "15",
  "Atleast 50 lawyers": "40",
};

const initialFormState = {
  need: "",
  description: "",
  confidential: "",
  confboxes: [],
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

export default function Kyc() {
  const router = useRouter();
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

  const selectedNeed = NEED_OPTIONS.find(
    (option) => option.value === formData.need,
  );
  const retainerFeeOptions = retainerFeeOptionsForNeed(true);
  const selectedLanguages = selectedLanguagesFromForm(formData);
  const selectableLegalPanels = getSelectableLegalPanels(legalPanelGroups);
  const selectedLegalPanel = getSelectedLegalPanel(
    legalPanelGroups,
    formData.legalPanelGroupId,
  );
  const usingLegalPanel = formData.providerSource === "panel";

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

  useEffect(() => {
    setFormData((prev) => {
      const nextRetainerFee = normalizeRetainerFee(prev.retainerFee, true);
      if (nextRetainerFee === prev.retainerFee) return prev;
      return { ...prev, retainerFee: nextRetainerFee };
    });
  }, []);

  useEffect(() => {
    window.__LEXIFY_REQUEST_CONTEXT__ = {
      requestType: "KYC or Compliance Questionnaire",
      scopeOfWork: formData.need,
      description: formData.description,
      additionalBackgroundInfo: formData.background,
      confidentialCounterpartyInfo: formData.confidential,
      providerRequirements: usingLegalPanel
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
  }, [formData, selectedLanguages, selectedLegalPanel, usingLegalPanel]);

  const validateStep = (step) => {
    if (step === 0) {
      if (!formData.need) {
        return {
          error: "Please select what kind of support you need.",
          field: "need",
        };
      }
      return null;
    }

    if (step === 1) {
      if (!formData.description) {
        return {
          error:
            "Please provide a brief description of your company's line of business.",
          field: "description",
        };
      }
      return null;
    }

    if (step === 2) return null;

    if (step === 3) {
      return validateProviderOffers(formData, {
        usingLegalPanel,
        selectedLegalPanel,
        selectedLanguages,
      });
    }

    if (step === 4) return validateReviewSubmit(formData);
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

  const drafts = useRequestDrafts({
    requestType: REQUEST_DRAFT_TYPE,
    pagePath: PAGE_PATH,
    formData,
    setFormData,
    emptyText: DRAFT_EMPTY_TEXT,
    applyDraftData: (prev, draft) => {
      const next = {
        ...prev,
        ...(draft.data || {}),
        requestTitle: draft.data?.requestTitle || draft.title || "",
        providerSource: draft.data?.providerSource || "criteria",
        legalPanelGroupId: draft.data?.legalPanelGroupId || "",
        confboxes: Array.isArray(draft.data?.confboxes)
          ? draft.data.confboxes
          : [],
        backgroundFiles: [],
        supplierFiles: [],
        agree: false,
      };
      next.lawyerCount =
        LAWYER_COUNT_ALIASES[next.lawyerCount] || next.lawyerCount;
      next.retainerFee = normalizeRetainerFee(next.retainerFee, true);
      return next;
    },
  });

  useEffect(() => {
    drafts.onDraftLoadedRef.current = (skipReset) => {
      if (!skipReset) setCurrentStep(0);
      setStepError(null);
    };
  }, [drafts.onDraftLoadedRef, setCurrentStep, setStepError]);

  const handleBackgroundFileChange = (e) => {
    const newFiles = Array.from(e.target.files || []);
    setFormData((prev) => ({
      ...prev,
      backgroundFiles: [...prev.backgroundFiles, ...newFiles],
    }));
    e.target.value = "";
  };

  const handleSupplierFileChange = (e) => {
    const newFiles = Array.from(e.target.files || []);
    setFormData((prev) => ({
      ...prev,
      supplierFiles: [...prev.supplierFiles, ...newFiles],
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
            ? [...formData.confboxes, value]
            : formData.confboxes.filter((item) => item !== value),
        });
      } else {
        setFormData({
          ...formData,
          checkboxes: checked
            ? [...formData.checkboxes, value]
            : formData.checkboxes.filter((item) => item !== value),
        });
      }
    } else if (type === "radio") {
      if (name === "providerSource") {
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
        setFormData({ ...formData, need: value });
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const submitRequest = async () => {
    const err = showFirstInvalidStep();
    if (err) {
      alert(err);
      return;
    }

    setSubmitting(true);
    try {
      const languageCSV = selectedLanguages.join(", ");
      const payload = {
        requestState: "PENDING",
        requestCategory:
          "Help with KYC (Know Your Customer) or Compliance related Questionnaire",
        scopeOfWork: formData.need,
        description: formData.description || "",
        additionalBackgroundInfo: formData.background || "",
        backgroundInfoFiles: [],
        supplierCodeOfConductFiles: [],
        ...legalPanelSubmitFields({
          usingLegalPanel,
          selectedLegalPanel,
          formData,
        }),
        currency: formData.currency,
        paymentRate: "Lump sum fixed price.",
        advanceRetainerFee: formData.retainerFee,
        invoiceType: formData.paymentTerms,
        language: languageCSV,
        offersDeadline: formData.date,
        title: formData.requestTitle,
        dateExpired: formData.date,
        details: {
          confidential:
            !!formData.confidential ||
            formData.confboxes.includes("Disclosed to Winning Bidder Only"),
          winnerBidderOnlyStatus: formData.confboxes.includes(
            "Disclosed to Winning Bidder Only",
          )
            ? "Disclosed to Winning Bidder Only"
            : formData.confidential || "",
          maximumPrice: null,
        },
      };

      const form = new FormData();
      form.append(
        "data",
        new Blob([JSON.stringify(payload)], { type: "application/json" }),
      );
      for (const file of formData.backgroundFiles) {
        form.append("backgroundFiles", file, file.name);
      }
      for (const file of formData.supplierFiles) {
        form.append("supplierFiles", file, file.name);
      }

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
          (json && (json.error || json.message)) ||
            text ||
            "Failed to create request.",
        );
      }

      alert("LEXIFY Request submitted successfully.");
      drafts.clearDraftGuard();
      router.push("/main");
    } catch (error) {
      alert(error.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (currentStep < WIZARD_STEPS.length - 1) {
      goNext();
      return;
    }
    void submitRequest();
  };

  return (
    <>
      <form ref={formRef} onSubmit={handleSubmit} noValidate>
        <RequestWizard
          categoryLabel="Help with KYC or Compliance related Questionnaire"
          steps={WIZARD_STEPS}
          currentStep={currentStep}
          onStepClick={goToStep}
          onNext={() => goNext({ onLastStep: submitRequest })}
          onBack={goBack}
          onCancel={() => {
            if (!drafts.confirmLeave()) return;
            router.push("/main");
          }}
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
          {currentStep === 0 ? (
            <NeedOptionCards
              options={NEED_OPTIONS}
              value={formData.need}
              onChange={handleChange}
            />
          ) : null}

          {currentStep === 1 ? (
            <div data-field="description">
              <h4 className="mb-2 text-sm font-semibold text-gray-900">
                Please provide a brief description of your company&apos;s line
                of business{" "}
                <QuestionMarkTooltip tooltipText="Please do not include any personal data in the description. This information will be visible to all legal service providers qualified to submit an offer in response to your LEXIFY Request." />
              </h4>
              <AutoGrowTextarea
                name="description"
                className={FIELD_CLASS}
                onChange={handleChange}
                value={formData.description}
              />
            </div>
          ) : null}

          {currentStep === 2 ? (
            <div className="space-y-6">
              <div className="space-y-4" data-field="backgroundFiles">
                <h4 className="text-sm font-semibold text-gray-900">
                  Please upload the questionnaire with which you need support by
                  clicking &quot;Upload Questionnaire&quot;{" "}
                  <QuestionMarkTooltip tooltipText="Please do not include any personal data in the description. Any background information provided will be visible to all legal service providers qualified to submit an offer in response to your LEXIFY Request." />
                </h4>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200">
                    Upload Questionnaire
                    <input
                      type="file"
                      name="backgroundFiles"
                      multiple
                      className="hidden"
                      onChange={handleBackgroundFileChange}
                    />
                  </label>
                  <span className="text-sm text-gray-500">
                    {formData.backgroundFiles?.length
                      ? `${formData.backgroundFiles.length} file(s) selected`
                      : "No files selected"}
                  </span>
                </div>
                {formData.backgroundFiles?.length > 0 ? (
                  <ul className="space-y-2">
                    {formData.backgroundFiles.map((file, index) => (
                      <li
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      >
                        <span className="truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteBackgroundFile(index)}
                          className="ml-2 cursor-pointer rounded bg-red-500 px-2 py-1 text-xs text-white"
                        >
                          Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div data-field="background">
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  If you wish, you can also share additional background
                  information with legal service providers{" "}
                  <QuestionMarkTooltip tooltipText="Please do not include any personal data in the description. Any background information provided will be visible to all legal service providers qualified to submit an offer in response to your LEXIFY Request." />
                </h4>
                <AutoGrowTextarea
                  name="background"
                  placeholder="Additional background information (Optional)"
                  className={FIELD_CLASS}
                  onChange={handleChange}
                  value={formData.background}
                />
              </div>
            </div>
          ) : null}

          {currentStep === 3 ? (
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
          ) : null}

          {currentStep === 4 ? (
            <div className="space-y-6">
              <dl className="rounded-xl border border-gray-200 px-4">
                <SummaryRow
                  label="Legal support needed"
                  value={selectedNeed?.title}
                />
                <SummaryRow
                  label="Company's line of business"
                  value={formData.description}
                />
                <SummaryRow
                  label="Uploaded questionnaire"
                  value={fileNames(formData.backgroundFiles)}
                />
                <SummaryRow label="Background" value={formData.background} />
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
                  value={selectedNeed?.pricing}
                />
              </dl>
              <ReviewSubmitFields
                formData={formData}
                handleChange={handleChange}
                onFileChange={handleSupplierFileChange}
                onDeleteFile={handleDeleteSupplierFile}
                onPreview={() => setShowPreview(true)}
              />
            </div>
          ) : null}
        </RequestWizard>
      </form>

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

      <RequestPreviewModal
        open={showPreview}
        onClose={() => setShowPreview(false)}
      >
        <Section title="Client Name, Business Identity Code and Country of Domicile">
          {[company.name, company.businessId, company.country]
            .filter(Boolean)
            .join(", ") || "-"}
        </Section>
        <Section title="Scope of Work">
          {formData.need ? formData.need : "-"}
        </Section>
        <Section title="Contract Price (Lump Sum Fixed Fee or Blended Hourly Rate) and Currency">
          {`Lump Sum Fixed Fee. The lump sum fixed fee covers the completion of the questionnaire(s) included below under section “Questionnaire(s) and Additional Background Information Provided by Client”. ${
            formData.currency ? `(${formData.currency})` : ""
          }`}
          <p className="mt-2 text-md">
            The Legal Service Provider shall submit all invoices to the Client
            in the contract price currency, unless otherwise instructed in
            writing by the Client.
          </p>
        </Section>
        <Section title="Description of Client's Line of Business">
          <p>{formData.description || "-"}</p>
        </Section>
        <Section title="Questionnaire(s) and Additional Background Information Provided by Client">
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
    </>
  );
}
