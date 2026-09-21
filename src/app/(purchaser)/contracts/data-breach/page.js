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

const REQUEST_DRAFT_TYPE = "personalDataBreach";
const PAGE_PATH = "/contracts/data-breach";
const DRAFT_EMPTY_TEXT = "No saved Personal Data Breach drafts found.";

const SUPPORT_OPTIONS = [
  {
    value:
      "Legal support with creating for the Client an internal process and relevant document templates for reacting to personal data breaches",
    title:
      "Legal support with creating an internal process and relevant document templates for reacting to personal data breaches",
  },
  {
    value:
      "Legal guidance for the Client on how to react to a personal data breach that has already occurred",
    title:
      "Legal guidance on how to react to a personal data breach that has already occurred",
  },
  {
    value:
      "Legal support for the Client with authority communications related to a personal data breach",
    title:
      "Legal support with authority communications related to a personal data breach",
  },
  {
    value:
      "Legal support for the Client with court proceedings related to a personal data breach",
    title:
      "Legal support with court proceedings related to a personal data breach",
  },
];

const INCIDENT_SUPPORT = SUPPORT_OPTIONS.slice(1).map((option) => option.value);

function supportDisplayLabel(value) {
  return (
    SUPPORT_OPTIONS.find((option) => option.value === value)?.title || value
  );
}

const WIZARD_STEPS = [
  {
    id: "support",
    label: "Support needed",
    title: "What kind of support do you need?",
    tooltip:
      "A personal data breach is any incident where personal data is accidentally or unlawfully accessed, disclosed, lost, altered, or destroyed - whether by unauthorized individuals, system failures, or human error. ",
  },
  {
    id: "incident",
    label: "Incident details",
    title: "Incident details",
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

const PERSONAL_DATA_TOOLTIP =
  "Please do not include any personal data in the description. This information will be visible to all legal service providers qualified to submit an offer in response to your LEXIFY Request.";

export default function DataBreach() {
  const router = useRouter();

  const initialFormState = {
    areaboxes: [],
    confboxes: [],
    breachStatus: "",
    involvedParties: "",
    breachCompany: "",
    description: "",
    companyRevenue: "",
    employeeCount: "",
    customerCount: "",
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
    next.retainerFee = normalizeRetainerFee(next.retainerFee, false);
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
  const retainerFeeOptions = retainerFeeOptionsForNeed(false);
  const areaboxes = formData.areaboxes || [];
  const confboxes = formData.confboxes || [];
  const isIncidentSupport = INCIDENT_SUPPORT.some((option) =>
    areaboxes.includes(option),
  );
  const isOtherCompanyInvolved =
    formData.involvedParties === "Yes, another identified company is involved";
  const disclosedOnly = confboxes.includes("Disclosed to Winning Bidder Only");
  const processOnly =
    areaboxes.length === 0 ||
    (areaboxes.length === 1 && areaboxes[0] === SUPPORT_OPTIONS[0].value);
  const wizardSteps = isIncidentSupport
    ? WIZARD_STEPS
    : WIZARD_STEPS.filter((step) => step.id !== "incident");

  const validateStep = (step) => {
    const stepId = wizardSteps[step]?.id;
    if (stepId === "support") {
      if (areaboxes.length === 0) {
        return {
          error: "Choose at least one support item.",
          field: "areaboxes",
        };
      }
      return null;
    }
    if (stepId === "incident") {
      if (!formData.breachStatus) {
        return {
          error: "Please describe the personal data breach.",
          field: "breachStatus",
        };
      }
      if (!formData.involvedParties) {
        return {
          error: "Please indicate whether another company is involved.",
          field: "involvedParties",
        };
      }
      if (isOtherCompanyInvolved && !formData.breachCompany) {
        return {
          error: "Please specify the other involved company/companies.",
          field: "breachCompany",
        };
      }
      return null;
    }
    if (stepId === "company") {
      if (!formData.description) {
        return {
          error:
            "Please provide a brief description of your company's line of business.",
          field: "description",
        };
      }
      return null;
    }
    if (stepId === "background") return null;
    if (stepId === "providers") {
      return validateProviderOffers(formData, {
        usingLegalPanel,
        selectedLegalPanel,
        selectedLanguages,
      });
    }
    if (stepId === "review") return validateReviewSubmit(formData);
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
  } = useRequestWizardNav({ steps: wizardSteps, validateStep });

  drafts.onDraftLoadedRef.current = (skipReset) => {
    if (!skipReset) setCurrentStep(0);
    setStepError(null);
  };

  useEffect(() => {
    window.__LEXIFY_REQUEST_CONTEXT__ = {
      requestType: "Personal Data Breach",
      legalArea: areaboxes,
      description: formData.description,
      additionalBackgroundInfo: formData.background,
      breachDetails: {
        breachStatus: formData.breachStatus,
        involvedParties: formData.involvedParties,
        breachCompany: formData.breachCompany,
      },
      organizationProfile: {
        companyRevenue: formData.companyRevenue,
        employeeCount: formData.employeeCount,
        customerCount: formData.customerCount,
      },
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
  }, [formData, selectedLanguages, selectedLegalPanel, areaboxes]);

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
      } else if (name === "areaboxes") {
        setFormData({
          ...formData,
          areaboxes: checked
            ? [...areaboxes, value]
            : areaboxes.filter((item) => item !== value),
        });
      } else if (name === "confboxes") {
        setFormData({
          ...formData,
          confboxes: checked
            ? [...confboxes, value]
            : confboxes.filter((item) => item !== value),
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

  const toggleSupport = (value) => {
    setStepError(null);
    setFormData((prev) => ({
      ...prev,
      areaboxes: (prev.areaboxes || []).includes(value)
        ? prev.areaboxes.filter((item) => item !== value)
        : [...(prev.areaboxes || []), value],
    }));
  };

  const handleCancel = () => {
    if (!drafts.confirmLeave()) return;
    router.push("/main");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (currentStep < wizardSteps.length - 1) {
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
      const scope = areaboxes.join(", ");
      const panelFields = legalPanelSubmitFields({
        usingLegalPanel,
        selectedLegalPanel,
        formData,
      });

      const details = {
        breachStatus: isIncidentSupport ? formData.breachStatus || "" : "",
        involvedParties: isIncidentSupport
          ? formData.involvedParties || ""
          : "",
        confidential:
          isIncidentSupport && isOtherCompanyInvolved && disclosedOnly
            ? "Yes"
            : "No",
        winnerBidderOnlyStatus:
          isIncidentSupport && isOtherCompanyInvolved
            ? (formData.breachCompany || "").trim()
            : "",
      };

      const payload = {
        requestState: "PENDING",
        requestCategory: "Help with Personal Data Protection",
        requestSubcategory: "Support with Data Breach",
        scopeOfWork: scope,
        description: formData.description || "",
        additionalBackgroundInfo: formData.background || "",
        backgroundInfoFiles: [],
        supplierCodeOfConductFiles: [],
        ...panelFields,
        currency: formData.currency,
        paymentRate:
          "Blended Hourly Rate. The total price of the service will be calculated by multiplying the hourly rate with the number of hours of legal support provided by the Legal Service Provider. The offered hourly rate will be valid for 12 calendar months from the date of the LEXIFY Contract between the Client and the Legal Service Provider.",
        advanceRetainerFee: formData.retainerFee,
        invoiceType: formData.paymentTerms,
        language: languageCSV,
        offersDeadline: formData.date,
        title: formData.requestTitle,
        dateExpired: formData.date,
        details,
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

  const stepId = wizardSteps[currentStep]?.id;

  return (
    <>
      <form ref={formRef} onSubmit={handleSubmit} noValidate>
        <RequestWizard
          categoryLabel="Help with Personal Data Breach related Matters"
          steps={wizardSteps}
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
            currentStep === wizardSteps.length - 1
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
          {stepId === "support" && (
            <div className="space-y-4">
              <CheckboxOptionCards
                options={SUPPORT_OPTIONS}
                selected={areaboxes}
                onToggle={toggleSupport}
                field="areaboxes"
              />
              <div className="rounded-xl bg-[#e8f4f6] p-4 text-sm text-gray-700">
                <p>
                  <strong>NOTE:</strong> Any offers you receive will provide an
                  applicable hourly rate only. The total price of the service
                  will be calculated by multiplying the hourly rate with the
                  number of hours of legal support provided by the legal service
                  provider submitting the winning offer. The offered hourly rate
                  will be valid for 12 calendar months from the date of the
                  LEXIFY Contract between you as the legal service purchaser and
                  the legal service provider submitting the winning offer.
                </p>
              </div>
            </div>
          )}

          {stepId === "incident" && (
            <div className="space-y-6">
              {isIncidentSupport ? (
                <>
                  <div data-field="breachStatus">
                    <h4 className="mb-2 text-sm font-semibold text-gray-900">
                      Please describe briefly the personal data breach (for
                      example, what data was impacted, when did the breach occur
                      and what actions have you taken so far related to the
                      breach)
                      <QuestionMarkTooltip
                        tooltipText={PERSONAL_DATA_TOOLTIP}
                      />
                    </h4>
                    <AutoGrowTextarea
                      name="breachStatus"
                      className={FIELD_CLASS}
                      onChange={handleChange}
                      value={formData.breachStatus}
                    />
                  </div>
                  <div data-field="involvedParties">
                    <h4 className="mb-2 text-sm font-semibold text-gray-900">
                      Is there any other identified company involved in the
                      personal data breach (for example, a supplier of your
                      company)? If yes but if you do not want your name and the
                      name of the other involved company to be visible to all
                      legal service providers qualified to make you an offer,
                      please also check the box “Disclosed to Winning Bidder
                      Only”.{" "}
                      <QuestionMarkTooltip tooltipText="If 'Disclosed to Winning Bidder Only' is checked, your identity and the identity of the other involved company will be disclosed solely to the legal service provider that submitted the winning offer, to enable that provider to conduct mandatory conflict checks. If the legal service provider notifies LEXIFY of an existing conflict, the winning offer will automatically be disqualified, and you will have the option to select an alternative winning offer." />
                    </h4>
                    <select
                      name="involvedParties"
                      className={FIELD_CLASS}
                      onChange={handleChange}
                      value={formData.involvedParties}
                    >
                      <option value="">Select</option>
                      <option value="Yes, another identified company is involved">
                        Yes, another identified company is involved
                      </option>
                      <option value="No other company is involved">
                        No other company is involved
                      </option>
                    </select>
                    {isOtherCompanyInvolved ? (
                      <div className="mt-3" data-field="breachCompany">
                        <AutoGrowTextarea
                          name="breachCompany"
                          placeholder="Please specify the name, business identity code and country of domicile of the other involved company/companies."
                          className={FIELD_CLASS}
                          value={formData.breachCompany}
                          onChange={handleChange}
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
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          )}

          {stepId === "company" && (
            <div className="space-y-6">
              <div data-field="description">
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  Please provide a brief description of your company&apos;s line
                  of business (including whether the business is B2B, B2C or
                  both){" "}
                  <QuestionMarkTooltip tooltipText={PERSONAL_DATA_TOOLTIP} />
                </h4>
                <AutoGrowTextarea
                  name="description"
                  className={FIELD_CLASS}
                  onChange={handleChange}
                  value={formData.description}
                />
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  What is the annual revenue of your company?{" "}
                  <QuestionMarkTooltip tooltipText={PERSONAL_DATA_TOOLTIP} />
                </h4>
                <AutoGrowTextarea
                  name="companyRevenue"
                  className={FIELD_CLASS}
                  onChange={handleChange}
                  value={formData.companyRevenue}
                />
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  How many employees does your company have?{" "}
                  <QuestionMarkTooltip tooltipText={PERSONAL_DATA_TOOLTIP} />
                </h4>
                <AutoGrowTextarea
                  name="employeeCount"
                  className={FIELD_CLASS}
                  onChange={handleChange}
                  value={formData.employeeCount}
                />
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  How many customers does your company have?{" "}
                  <QuestionMarkTooltip tooltipText={PERSONAL_DATA_TOOLTIP} />
                </h4>
                <AutoGrowTextarea
                  name="customerCount"
                  className={FIELD_CLASS}
                  onChange={handleChange}
                  value={formData.customerCount}
                />
                <p className="mt-2 text-xs text-gray-500">
                  <strong>NOTE:</strong> Information on the approximate number
                  of your customers enables legal service providers to prepare
                  more accurate offers in response to your LEXIFY Request.
                </p>
              </div>
            </div>
          )}

          {stepId === "background" && (
            <BackgroundFields
              formData={formData}
              onChange={handleChange}
              onFileChange={handleBackgroundFileChange}
              onDeleteFile={handleDeleteBackgroundFile}
            />
          )}

          {stepId === "providers" && (
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
              isFixedFee={false}
            />
          )}

          {stepId === "review" && (
            <div className="space-y-6">
              <dl className="rounded-xl border border-gray-200 px-4">
                <SummaryRow
                  label="Legal support needed"
                  value={areaboxes.map(supportDisplayLabel)}
                />
                {isIncidentSupport ? (
                  <>
                    <SummaryRow
                      label="Description of incident"
                      value={formData.breachStatus}
                    />
                    <SummaryRow
                      label="Other company involved"
                      value={
                        isOtherCompanyInvolved && disclosedOnly
                          ? "Disclosed to Winning Bidder Only"
                          : isOtherCompanyInvolved
                            ? `${formData.involvedParties}${
                                formData.breachCompany
                                  ? `: ${formData.breachCompany}`
                                  : ""
                              }`
                            : formData.involvedParties
                      }
                    />
                  </>
                ) : null}
                <SummaryRow
                  label="Annual revenue"
                  value={formData.companyRevenue}
                />
                <SummaryRow
                  label="Number of employees"
                  value={formData.employeeCount}
                />
                <SummaryRow
                  label="Number of customers"
                  value={formData.customerCount}
                />
                <SummaryRow
                  label="Company's line of business"
                  value={formData.description}
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
                <SummaryRow label="Pricing model" value="Blended hourly rate" />
              </dl>
              <ReviewSubmitFields
                formData={formData}
                handleChange={handleChange}
                onFileChange={handleSupplierFileChange}
                onDeleteFile={handleDeleteSupplierFile}
                onPreview={() => setShowPreview(true)}
                winningBidderNote={
                  isIncidentSupport && isOtherCompanyInvolved && disclosedOnly
                }
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
          {areaboxes.length === 0 ? (
            "-"
          ) : (
            <ul className="list-disc pl-6">
              {areaboxes.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Contract Price (Lump Sum Fixed Fee or Blended Hourly Rate) and Currency">
          {`Blended hourly rate. The total price of the service will be calculated by multiplying the hourly rate with the number of hours of legal support provided by the Legal Service Provider. The offered hourly rate will be valid for 12 calendar months from the date of the LEXIFY Contract between the Client and the Legal Service Provider.${
            formData.currency ? `(${formData.currency})` : ""
          }`}
          <p className="mt-2 text-md">
            The Legal Service Provider shall submit all invoices to the Client
            in the contract price currency, unless otherwise instructed in
            writing by the Client.
          </p>
        </Section>
        <Section title="Description of the Personal Data Breach (if applicable)">
          {processOnly ? "Not Applicable" : formData.breachStatus || "-"}
        </Section>
        <Section title="Details of Other Companies Involved in the Personal Data Breach (if applicable)">
          {processOnly
            ? "Not Applicable"
            : formData.involvedParties === "" ||
                formData.involvedParties === "No other company is involved"
              ? formData.involvedParties || "-"
              : `${formData.involvedParties}${
                  formData.breachCompany
                    ? disclosedOnly
                      ? `: Disclosed to Winning Bidder Only`
                      : `: ${formData.breachCompany}`
                    : ""
                }`}
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
        <Section title="Description of Client's Line of Business">
          {formData.description || "-"}
        </Section>
        <Section title="Client's Annual Revenue">
          {formData.companyRevenue || "-"}
        </Section>
        <Section title="Number of Client's Employees">
          {formData.employeeCount || "-"}
        </Section>
        <Section title="Number of Client's Customers">
          {formData.customerCount || "-"}
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
