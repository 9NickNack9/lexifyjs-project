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

const REQUEST_DRAFT_TYPE = "dataProtectionAnalysis";
const PAGE_PATH = "/contracts/gdpr-compliance";
const DRAFT_EMPTY_TEXT = "No saved GDPR Compliance Analysis drafts found.";

const WIZARD_STEPS = [
  {
    id: "org",
    label: "Organisation details",
    title: "Organisation details",
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

function yesNoValue(value, extra) {
  if (!(value || "").includes("Yes")) return "-";
  return extra ? `${value}: ${extra}` : value;
}

export default function GdprCompliance() {
  const router = useRouter();

  const initialFormState = {
    description: "",
    companyRevenue: "",
    employeeCount: "",
    customerCount: "",
    applicationCount: "",
    productCount: "",
    domainCount: "",
    appDocumentation: "",
    documentDescription: "",
    existingData: "",
    dataDescription: "",
    dedicatedOwners: "",
    aiUsage: "",
    aiDescription: "",
    profiling: "",
    profilingDescription: "",
    interviewLocation: "",
    locationDescription: "",
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
  const inPersonInterview = [
    "In person at a specific location",
    "Both in person and remotely",
  ].includes(formData.interviewLocation);

  const validateStep = (step) => {
    if (step === 0) return null;
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

  drafts.onDraftLoadedRef.current = (skipReset) => {
    if (!skipReset) setCurrentStep(0);
    setStepError(null);
  };

  useEffect(() => {
    window.__LEXIFY_REQUEST_CONTEXT__ = {
      requestType: "GDPR Compliance Analysis",
      description: formData.description,
      additionalBackgroundInfo: formData.background,
      organizationProfile: {
        companyRevenue: formData.companyRevenue,
        employeeCount: formData.employeeCount,
        customerCount: formData.customerCount,
        applicationCount: formData.applicationCount,
        productCount: formData.productCount,
        domainCount: formData.domainCount,
      },
      dataProtectionAnalysis: {
        appDocumentation: formData.appDocumentation,
        documentDescription: formData.documentDescription,
        existingData: formData.existingData,
        dataDescription: formData.dataDescription,
        dedicatedOwners: formData.dedicatedOwners,
        aiUsage: formData.aiUsage,
        aiDescription: formData.aiDescription,
        profiling: formData.profiling,
        profilingDescription: formData.profilingDescription,
        interviewLocation: formData.interviewLocation,
        locationDescription: formData.locationDescription,
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
      uploadedBackgroundFiles: formData.backgroundFiles?.map((file) => file.name),
      uploadedSupplierFiles: formData.supplierFiles?.map((file) => file.name),
    };
  }, [formData, selectedLanguages, selectedLegalPanel]);

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
            ? [...(formData.areaboxes || []), value]
            : (formData.areaboxes || []).filter((item) => item !== value),
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
      const panelFields = legalPanelSubmitFields({
        usingLegalPanel,
        selectedLegalPanel,
        formData,
      });

      const details = {
        companyRevenue: formData.companyRevenue || "",
        employeeCount: formData.employeeCount || "",
        customerCount: formData.customerCount || "",
        applicationCount: formData.applicationCount || "",
        productCount: formData.productCount || "",
        domainCount: formData.domainCount || "",
        appDocumentation: formData.appDocumentation || "",
        documentDescription: formData.documentDescription || "",
        existingData: formData.existingData || "",
        dataDescription: formData.dataDescription || "",
        dedicatedOwners: formData.dedicatedOwners || "",
        aiUsage: formData.aiUsage || "",
        aiDescription: formData.aiDescription || "",
        profiling: formData.profiling || "",
        profilingDescription: formData.profilingDescription || "",
        interviewLocation: formData.interviewLocation || "",
        locationDescription: formData.locationDescription || "",
        maximumPrice: null,
      };

      const payload = {
        requestState: "PENDING",
        requestCategory: "Help with Personal Data Protection",
        requestSubcategory: "GDPR Compliance Analysis",
        scopeOfWork:
          "Legal assessment of the Client's current level of compliance with GDPR requirements.",
        description: formData.description || "",
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

  return (
    <>
      <form ref={formRef} onSubmit={handleSubmit} noValidate>
        <RequestWizard
          categoryLabel="Help with Assessing Your Company's GDPR Compliance"
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
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  How many IT applications containing personal data does your
                  company currently have in use?{" "}
                  <QuestionMarkTooltip tooltipText={PERSONAL_DATA_TOOLTIP} />
                </h4>
                <AutoGrowTextarea
                  name="applicationCount"
                  className={FIELD_CLASS}
                  onChange={handleChange}
                  value={formData.applicationCount}
                />
                <p className="mt-2 text-xs text-gray-500">
                  <strong>NOTE:</strong> &quot;Personal data&quot; refers to any
                  information that identifies a living person, directly (like
                  name or email) or indirectly (like job title or location when
                  combined with other data). Information that cannot identify
                  someone, even when combined, is not personal data.
                </p>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  How many products containing personal data or personal data
                  processing activities does your company offer?{" "}
                  <QuestionMarkTooltip tooltipText={PERSONAL_DATA_TOOLTIP} />
                </h4>
                <AutoGrowTextarea
                  name="productCount"
                  className={FIELD_CLASS}
                  onChange={handleChange}
                  value={formData.productCount}
                />
                <p className="mt-2 text-xs text-gray-500">
                  <strong>NOTE:</strong> &quot;Personal data processing&quot;
                  refers to any action performed on personal data automatically
                  or manually. This includes collecting, storing, using,
                  sharing, analyzing, or deleting data related to an
                  identifiable person.
                </p>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  How many web domains does you company possess? You can count a
                  domain and its sub-pages as one web domain{" "}
                  <QuestionMarkTooltip tooltipText={PERSONAL_DATA_TOOLTIP} />
                </h4>
                <AutoGrowTextarea
                  name="domainCount"
                  className={FIELD_CLASS}
                  onChange={handleChange}
                  value={formData.domainCount}
                />
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  Do you have any existing documentation in place describing
                  your company&apos;s IT applications and business processes
                  (for example, an IT ERP system or other IT application
                  registry) which use personal data?
                </h4>
                <select
                  name="appDocumentation"
                  className={FIELD_CLASS}
                  onChange={handleChange}
                  value={formData.appDocumentation}
                >
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
                {formData.appDocumentation === "Yes" ? (
                  <AutoGrowTextarea
                    name="documentDescription"
                    placeholder=" Please provide a short description"
                    className={`${FIELD_CLASS} mt-3`}
                    onChange={handleChange}
                    value={formData.documentDescription}
                  />
                ) : null}
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  Do you have any existing data architecture and/or data flow
                  documentation available?
                </h4>
                <select
                  name="existingData"
                  className={FIELD_CLASS}
                  onChange={handleChange}
                  value={formData.existingData}
                >
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
                {formData.existingData === "Yes" ? (
                  <AutoGrowTextarea
                    name="dataDescription"
                    placeholder=" Please provide a short description"
                    className={`${FIELD_CLASS} mt-3`}
                    onChange={handleChange}
                    value={formData.dataDescription}
                  />
                ) : null}
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  Do you have dedicated owners designated in your company for
                  key IT applications, business processes and products/services?
                </h4>
                <select
                  name="dedicatedOwners"
                  className={FIELD_CLASS}
                  onChange={handleChange}
                  value={formData.dedicatedOwners}
                >
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  Does your company use AI for processing personal data?
                </h4>
                <select
                  name="aiUsage"
                  className={FIELD_CLASS}
                  onChange={handleChange}
                  value={formData.aiUsage}
                >
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
                {formData.aiUsage === "Yes" ? (
                  <AutoGrowTextarea
                    name="aiDescription"
                    placeholder=" Please provide a short description"
                    className={`${FIELD_CLASS} mt-3`}
                    onChange={handleChange}
                    value={formData.aiDescription}
                  />
                ) : null}
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  Does your company conduct any profiling of individual
                  persons?
                </h4>
                <select
                  name="profiling"
                  className={FIELD_CLASS}
                  onChange={handleChange}
                  value={formData.profiling}
                >
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
                {formData.profiling === "Yes" ? (
                  <AutoGrowTextarea
                    name="profilingDescription"
                    placeholder=" Please provide a short description"
                    className={`${FIELD_CLASS} mt-3`}
                    onChange={handleChange}
                    value={formData.profilingDescription}
                  />
                ) : null}
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  The analysis of your company&apos;s GDPR compliance will
                  include interviews with key personnel. How would you like
                  these interviews to be conducted?
                </h4>
                <select
                  name="interviewLocation"
                  className={FIELD_CLASS}
                  onChange={handleChange}
                  value={formData.interviewLocation}
                >
                  <option value="">Select</option>
                  <option value="In person at a specific location">
                    In person at a specific location
                  </option>
                  <option value="Remotely (for example, over Microsoft Teams)">
                    Remotely (for example, over Microsoft Teams)
                  </option>
                  <option value="Both in person and remotely">
                    Both in person and remotely
                  </option>
                </select>
                {inPersonInterview ? (
                  <AutoGrowTextarea
                    name="locationDescription"
                    placeholder=" Please specify location"
                    className={`${FIELD_CLASS} mt-3`}
                    onChange={handleChange}
                    value={formData.locationDescription}
                  />
                ) : null}
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div data-field="description">
              <h4 className="mb-2 text-sm font-semibold text-gray-900">
                Please provide a brief description of your company&apos;s line
                of business (including whether the business is B2B, B2C or both){" "}
                <QuestionMarkTooltip tooltipText={PERSONAL_DATA_TOOLTIP} />
              </h4>
              <AutoGrowTextarea
                name="description"
                className={FIELD_CLASS}
                onChange={handleChange}
                value={formData.description}
              />
            </div>
          )}

          {currentStep === 2 && (
            <BackgroundFields
              formData={formData}
              onChange={handleChange}
              onFileChange={handleBackgroundFileChange}
              onDeleteFile={handleDeleteBackgroundFile}
            />
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl bg-[#e8f4f6] p-4 text-sm text-gray-700">
                <p>
                  <strong>NOTE: </strong>
                  Any offers you receive will be for a lump sum fixed price.
                </p>
              </div>
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
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <dl className="rounded-xl border border-gray-200 px-4">
                <SummaryRow
                  label="Legal support needed"
                  value="Legal assessment of our current level of compliance with GDPR requirements."
                />
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
                  label="IT applications with personal data"
                  value={formData.applicationCount}
                />
                <SummaryRow
                  label="Products / processing activities"
                  value={formData.productCount}
                />
                <SummaryRow
                  label="Web domains"
                  value={formData.domainCount}
                />
                <SummaryRow
                  label="Existing IT documentation"
                  value={formData.appDocumentation}
                />
                {formData.appDocumentation === "Yes" ? (
                  <SummaryRow
                    label="IT documentation description"
                    value={formData.documentDescription}
                  />
                ) : null}
                <SummaryRow
                  label="Data architecture documentation"
                  value={formData.existingData}
                />
                {formData.existingData === "Yes" ? (
                  <SummaryRow
                    label="Data architecture description"
                    value={formData.dataDescription}
                  />
                ) : null}
                <SummaryRow
                  label="Dedicated owners"
                  value={formData.dedicatedOwners}
                />
                <SummaryRow
                  label="AI for personal data"
                  value={formData.aiUsage}
                />
                {formData.aiUsage === "Yes" ? (
                  <SummaryRow
                    label="AI description"
                    value={formData.aiDescription}
                  />
                ) : null}
                <SummaryRow label="Profiling" value={formData.profiling} />
                {formData.profiling === "Yes" ? (
                  <SummaryRow
                    label="Profiling description"
                    value={formData.profilingDescription}
                  />
                ) : null}
                <SummaryRow
                  label="Interview method"
                  value={formData.interviewLocation}
                />
                {inPersonInterview ? (
                  <SummaryRow
                    label="Interview location"
                    value={formData.locationDescription}
                  />
                ) : null}
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
                {[company.name, company.businessId, company.country]
                  .filter(Boolean)
                  .join(", ") || "-"}
              </Section>
              <Section title="Scope of Work">
                <p className="mt-2 text-md">
                  Legal assessment of the Client&apos;s current level of
                  compliance with GDPR requirements.
                </p>
              </Section>
              <Section title="Contract Price (Lump Sum Fixed Fee or Blended Hourly Rate) and Currency">
                {`Lump Sum Fixed Fee. ${
                  formData.currency ? `(${formData.currency})` : ""
                }`}
                <p className="mt-2 text-md">
                  The Legal Service Provider shall submit all invoices to the
                  Client in the contract price currency, unless otherwise
                  instructed in writing by the Client.
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
              <Section title="Number of IT Applications Currently Used by Client and Containing Personal Data">
                {formData.applicationCount || "-"}
              </Section>
              <Section title="Number of Products Containing Personal Data (or Data Processing Activities) Offered by Client">
                {formData.productCount || "-"}
              </Section>
              <Section title="Number of Web Domains Possessed by Client">
                {formData.domainCount || "-"}
              </Section>
              <Section title="Number of Web Domains Possessed by Client">
                {formData.domainCount || "-"}
              </Section>
              <Section title="Does Client Have Existing Documentation in Place Describing its IT Applications and Business Processes Which Use Personal Data?">
                {yesNoValue(
                  formData.appDocumentation,
                  formData.documentDescription,
                )}
              </Section>
              <Section title="Does Client Have Existing Data Architecture and/or Data Flow Documentation Available?">
                {yesNoValue(formData.existingData, formData.dataDescription)}
              </Section>
              <Section title="Does Client Have Dedicated Owners Designated for Key IT Applications, Business Processes and/or Products/Services?">
                {formData.dedicatedOwners || "-"}
              </Section>
              <Section title="Does Client Use AI for Processing Personal Data?">
                {yesNoValue(formData.aiUsage, formData.aiDescription)}
              </Section>
              <Section title="Does Client Conduct any Profiling of Individual Persons?">
                {yesNoValue(formData.profiling, formData.profilingDescription)}
              </Section>
              <Section title="How are Interviews (as Part of the Compliance Assessment) with Client's Key Personnel Conducted?">
                {!formData.interviewLocation
                  ? "-"
                  : formData.interviewLocation ===
                      "Remotely (for example, over Microsoft Teams)"
                    ? formData.interviewLocation
                    : `${formData.interviewLocation}${
                        formData.locationDescription
                          ? `: ${formData.locationDescription}`
                          : ""
                      }`}
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
                  <strong>NOTE:</strong> An advance retainer fee is an amount
                  payable by the Client to the Legal Service Provider submitting
                  the winning offer within 14 days of the date of the LEXIFY
                  Contract between the Client and the Legal Service Provider.
                  The advance retainer fee forms a part of the total price of
                  the legal service as offered by the Legal Service Provider.
                </p>
              </Section>
              <Section title="Invoicing">
                <p className="mt-2 text-md">
                  The Legal Service Provider shall invoice the Client in the
                  following manner:
                </p>
                {formData.paymentTerms || "-"}
                <p className="mt-2 text-md">
                  Further details, such as contact person for invoices and
                  method of invoicing (for example, email, e-invoicing or
                  other), related to invoicing shall be agreed separately
                  between the client and the legal service provider.
                </p>
              </Section>
              <Section title="Languages Required for the Performance of the Work">
                {selectedLanguages.join(", ") || "-"}
                <p className="mt-2 text-md">
                  The legal service provider confirms that its representatives
                  involved in the performance of the work have appropriate
                  advanced proficiency in all the languages listed above.
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
