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
import NeedOptionCards from "@/app/components/request-wizard/NeedOptionCards";
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

const REQUEST_DRAFT_TYPE = "dataProtectionDocumentation";
const PAGE_PATH = "/contracts/privacy-documentation";
const DRAFT_EMPTY_TEXT = "No saved Data Privacy Documentation drafts found.";

const DOCUMENT_OPTIONS = [
  {
    value: "Privacy Statement or Notice (informing of data subjects)",
    title: "Privacy Statement or Notice (informing of data subjects)",
    tooltip:
      "A Privacy Statement or Privacy Notice is a document that explains how an organization collects, uses, stores, and protects personal data. For example, a privacy statement made available on a company's website or attached to a company's marketing communications. ",
  },
  { value: "Data Subject Consent", title: "Data Subject Consent" },
  {
    value: "Record of Processing Activities (RoPa)",
    title: "Record of Processing Activities (RoPa)",
    tooltip:
      "A Record of Processing Activities (ROPA) is a documented overview of how an organization collects, uses, shares, and stores personal data. Maintaining a ROPA is a legal requirement under GDPR for most organizations. ",
  },
  {
    value: "Personal Data Protection Impact Assessment (DPIA)",
    title: "Personal Data Protection Impact Assessment (DPIA)",
    tooltip:
      "Personal Data Protection Impact Assessment (DPIA) is a process and related documentation used to identify and minimize the privacy risks of processing personal data. ",
  },
  {
    value: "Balancing Test",
    title: "Balancing Test",
    tooltip:
      "A Balancing Test is used to determine whether an organization's legitimate interest in processing personal data outweighs the individual's rights and freedoms. It's required under laws like the GDPR when relying on “legitimate interest” as the legal basis for processing. ",
  },
  { value: "Other", title: "Other" },
];

const DOCUMENT_TYPE_OPTIONS = [
  {
    value: "Empty template(s) only",
    title: "I need empty template(s) only",
    icon: "empty",
  },
  {
    value: "Fully finalized document(s)",
    title: "I need fully finalized document(s)",
    icon: "template",
  },
];

const INDIVIDUAL_OPTIONS = [
  "Employees",
  "Customers",
  "Suppliers or Other 3rd Parties",
  "Business Stakeholders",
  "Application Users",
  "Research Participants",
  "Other",
];

const COVERAGE_OPTIONS = [
  {
    value:
      "A single IT application, solution, product or activity (for example, online store, gaming application or employee survey)",
    title:
      "A single IT application, solution, product or activity (for example, online store, gaming application or employee survey)",
    icon: "template",
  },
  {
    value:
      "An entire process with various data usage activities and IT tools involved (for example, employee or customer data management or a product/service consisting of various individual solutions and data collection points)",
    title:
      "An entire process with various data usage activities and IT tools involved (for example, employee or customer data management or a product/service consisting of various individual solutions and data collection points)",
    icon: "review",
  },
  { value: "Other", title: "Other", icon: "comments" },
];

const WIZARD_STEPS = [
  {
    id: "docs",
    label: "Documents needed",
    title: "What kind of document(s) do you need?",
  },
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

function scopeListFromForm(formData) {
  return [
    ...(formData.areaboxes || []).filter((item) => item !== "Other"),
    (formData.areaboxes || []).includes("Other")
      ? formData.otherArea || null
      : null,
  ].filter(Boolean);
}

export default function PrivacyDocumentation() {
  const router = useRouter();

  const initialFormState = {
    areaboxes: [],
    otherArea: "",
    documentType: "",
    documentTemplate: "",
    documentCoverage: "",
    otherCoverage: "",
    individualBoxes: [],
    otherIndividiual: "",
    generalDescription: "",
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
  const areaboxes = formData.areaboxes || [];
  const individualBoxes = formData.individualBoxes || [];
  const isEmptyTemplate = formData.documentType === "Empty template(s) only";
  const isFinalized = formData.documentType === "Fully finalized document(s)";

  const validateStep = (step) => {
    if (step === 0) {
      if (areaboxes.length === 0) {
        return {
          error: "Select at least one needed document.",
          field: "areaboxes",
        };
      }
      if (areaboxes.includes("Other") && !formData.otherArea) {
        return {
          error: "Please specify the other document(s).",
          field: "otherArea",
        };
      }
      if (!formData.documentType) {
        return {
          error:
            "Choose whether you need templates or fully finalized documents.",
          field: "documentType",
        };
      }
      if (isEmptyTemplate && !formData.documentTemplate) {
        return {
          error:
            "Please describe the context where you will use the template(s).",
          field: "documentTemplate",
        };
      }
      if (isFinalized) {
        if (!individualBoxes.length) {
          return {
            error:
              "Please specify the group(s) of individuals whose personal data is concerned.",
            field: "individualBoxes",
          };
        }
        if (individualBoxes.includes("Other") && !formData.otherIndividiual) {
          return {
            error: "Please specify the other group(s) of individuals.",
            field: "otherIndividiual",
          };
        }
        if (!formData.documentCoverage) {
          return {
            error: "Please specify what the required document(s) will cover.",
            field: "documentCoverage",
          };
        }
        if (formData.documentCoverage === "Other" && !formData.otherCoverage) {
          return {
            error: "Please specify what the required document(s) will cover.",
            field: "otherCoverage",
          };
        }
        if (!formData.generalDescription) {
          return {
            error:
              "Please describe the application, solution, product or process to be covered.",
            field: "generalDescription",
          };
        }
      }
      return null;
    }
    if (step === 1) return null;
    if (step === 2) {
      if (!formData.description) {
        return {
          error:
            "Please provide a brief description of your company's line of business.",
          field: "description",
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
      requestType: "Data Privacy Documentation",
      legalArea: [
        ...areaboxes.filter((item) => item !== "Other"),
        formData.otherArea || null,
      ].filter(Boolean),
      description: formData.description,
      additionalBackgroundInfo: formData.background,
      documentDetails: {
        documentType: formData.documentType,
        documentTemplate: formData.documentTemplate,
        documentCoverage: formData.documentCoverage,
        otherCoverage: formData.otherCoverage,
        generalDescription: formData.generalDescription,
        individualSubjects: [
          ...individualBoxes.filter((item) => item !== "Other"),
          formData.otherIndividiual || null,
        ].filter(Boolean),
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
  }, [
    formData,
    selectedLanguages,
    selectedLegalPanel,
    areaboxes,
    individualBoxes,
  ]);

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
      } else if (name === "individualBoxes") {
        setFormData({
          ...formData,
          individualBoxes: checked
            ? [...individualBoxes, value]
            : individualBoxes.filter((item) => item !== value),
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

  const toggleArea = (value) => {
    setStepError(null);
    setFormData((prev) => ({
      ...prev,
      areaboxes: (prev.areaboxes || []).includes(value)
        ? prev.areaboxes.filter((item) => item !== value)
        : [...(prev.areaboxes || []), value],
    }));
  };

  const toggleIndividual = (value) => {
    setStepError(null);
    setFormData((prev) => ({
      ...prev,
      individualBoxes: (prev.individualBoxes || []).includes(value)
        ? prev.individualBoxes.filter((item) => item !== value)
        : [...(prev.individualBoxes || []), value],
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
      const languageCSV = [
        ...(formData.checkboxes || []).filter((lang) => lang !== "Other:"),
        formData.checkboxes.includes("Other:")
          ? formData.otherLang || null
          : null,
      ]
        .filter(Boolean)
        .join(", ");
      const scope = scopeListFromForm(formData).join(", ");
      const panelFields = legalPanelSubmitFields({
        usingLegalPanel,
        selectedLegalPanel,
        formData,
      });

      const details = {
        documentType: formData.documentType || "",
        documentTemplateContext: isEmptyTemplate
          ? formData.documentTemplate || ""
          : "",
        documentCoverage: isFinalized
          ? formData.documentCoverage === "Other"
            ? formData.otherCoverage
            : formData.documentCoverage || ""
          : "",
        individuals: isFinalized
          ? [
              ...individualBoxes.filter((item) => item !== "Other"),
              individualBoxes.includes("Other")
                ? formData.otherIndividiual || null
                : null,
            ]
              .filter(Boolean)
              .join(", ")
          : "",
        generalDescription: isFinalized
          ? formData.generalDescription || ""
          : "",
        companyRevenue: formData.companyRevenue || "",
        employeeCount: formData.employeeCount || "",
        customerCount: formData.customerCount || "",
        maximumPrice: null,
      };

      const payload = {
        requestState: "PENDING",
        requestCategory: "Help with Personal Data Protection",
        requestSubcategory: "Data Privacy Documentation",
        scopeOfWork:
          "Legal support with preparing the following data privacy related documents for the Client: " +
          scope,
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

  const individualsSummary = [
    ...individualBoxes.filter((item) => item !== "Other"),
    formData.otherIndividiual,
  ].filter(Boolean);

  return (
    <>
      <form ref={formRef} onSubmit={handleSubmit} noValidate>
        <RequestWizard
          categoryLabel="Help with Data Privacy related Documents"
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
              <div className="space-y-3" data-field="areaboxes">
                {DOCUMENT_OPTIONS.map((option) => {
                  const checked = areaboxes.includes(option.value);
                  return (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-start gap-4 rounded-xl border-2 p-4 transition ${
                        checked
                          ? "border-[#11999e] bg-[#f3fbfb]"
                          : "border-gray-200 hover:border-[#11999e]/40"
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="areaboxes"
                        value={option.value}
                        checked={checked}
                        onChange={() => toggleArea(option.value)}
                        className="mt-1 accent-[#11999e]"
                      />
                      <span className="flex-1 font-semibold text-gray-900">
                        {option.title}
                      </span>
                      {option.tooltip ? (
                        <QuestionMarkTooltip tooltipText={option.tooltip} />
                      ) : null}
                    </label>
                  );
                })}
                {areaboxes.includes("Other") ? (
                  <AutoGrowTextarea
                    name="otherArea"
                    placeholder="Please Specify Other Document(s)"
                    className={FIELD_CLASS}
                    value={formData.otherArea}
                    onChange={handleChange}
                  />
                ) : null}
              </div>
              <div className="rounded-xl bg-[#e8f4f6] p-4 text-sm text-gray-700">
                <p>
                  <strong>NOTE:</strong> Any offers you receive will be for a
                  lump sum fixed price and include the preparation of the
                  document(s) and necessary revisions on the basis of your
                  feedback to the legal service provider.
                </p>
              </div>
              <div data-field="documentType">
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  Do you need the above document(s) as empty template(s) only or
                  fully completed with required information related specifically
                  to your business (for example, a privacy statement for your
                  company&apos;s website)?
                </h4>
                <NeedOptionCards
                  options={DOCUMENT_TYPE_OPTIONS}
                  name="documentType"
                  value={formData.documentType}
                  onChange={handleChange}
                  field="documentType"
                />
              </div>
              {isEmptyTemplate ? (
                <div data-field="documentTemplate">
                  <h4 className="mb-2 text-sm font-semibold text-gray-900">
                    Please describe briefly the context where you will use the
                    requested template(s). For example, If you need a privacy
                    statement template, will it be used only internally to
                    inform your employees of their personal data processing or
                    more broadly (for instance, also on your company&apos;s
                    website)?
                    <QuestionMarkTooltip tooltipText={PERSONAL_DATA_TOOLTIP} />
                  </h4>
                  <AutoGrowTextarea
                    name="documentTemplate"
                    className={FIELD_CLASS}
                    onChange={handleChange}
                    value={formData.documentTemplate}
                  />
                </div>
              ) : null}
              {isFinalized ? (
                <div className="space-y-6">
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-gray-900">
                      Please specify the group(s) of individuals whose personal
                      data is concerned:
                    </h4>
                    <CheckboxOptionCards
                      options={INDIVIDUAL_OPTIONS}
                      selected={individualBoxes}
                      onToggle={toggleIndividual}
                      field="individualBoxes"
                      otherValue={formData.otherIndividiual}
                      onOtherChange={handleChange}
                      otherName="otherIndividiual"
                    />
                  </div>
                  <div data-field="documentCoverage">
                    <h4 className="mb-2 text-sm font-semibold text-gray-900">
                      Please specify what the required document(s) will cover:
                    </h4>
                    <NeedOptionCards
                      options={COVERAGE_OPTIONS}
                      name="documentCoverage"
                      value={formData.documentCoverage}
                      onChange={handleChange}
                      field="documentCoverage"
                    />
                    {formData.documentCoverage === "Other" ? (
                      <input
                        type="text"
                        name="otherCoverage"
                        placeholder="Please Specify"
                        className={`${FIELD_CLASS} mt-3`}
                        value={formData.otherCoverage}
                        onChange={handleChange}
                      />
                    ) : null}
                  </div>
                  <div data-field="generalDescription">
                    <h4 className="mb-2 text-sm font-semibold text-gray-900">
                      Please describe briefly the
                      application/solution/product/process to be covered by the
                      required document(s). Specify, for example, what kind of
                      data is collected and what kind of technology is used to
                      collect the data. You can also upload data mapping, data
                      flow or data architecture documentation for background by
                      clicking the &quot;Upload Background Info&quot; button
                      further below.
                    </h4>
                    <AutoGrowTextarea
                      name="generalDescription"
                      className={FIELD_CLASS}
                      onChange={handleChange}
                      value={formData.generalDescription}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {currentStep === 1 && (
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
            </div>
          )}

          {currentStep === 2 && (
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
                  label="Data privacy related documents needed"
                  value={scopeListFromForm(formData)}
                />
                <SummaryRow
                  label="Template or finalized"
                  value={formData.documentType}
                />
                {isEmptyTemplate ? (
                  <SummaryRow
                    label="Template context"
                    value={formData.documentTemplate}
                  />
                ) : null}
                {isFinalized ? (
                  <>
                    <SummaryRow
                      label="Individuals concerned"
                      value={individualsSummary}
                    />
                    <SummaryRow
                      label="Document coverage"
                      value={
                        formData.documentCoverage === "Other"
                          ? formData.otherCoverage
                          : formData.documentCoverage
                      }
                    />
                    <SummaryRow
                      label="Application / process covered"
                      value={formData.generalDescription}
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
            Legal support with preparing the following data privacy related
            documents for the Client:
          </p>
          <div className="mt-2 whitespace-pre-line">
            {areaboxes.length === 0
              ? "-"
              : areaboxes.map((item, index) => (
                  <div key={index}>
                    {item === "Other" && formData.otherArea
                      ? formData.otherArea
                      : item}
                  </div>
                ))}
          </div>
        </Section>
        <Section title="Contract Price (Lump Sum Fixed Fee or Blended Hourly Rate) and Currency">
          {`Lump Sum Fixed Fee. The work includes the preparation of the above-mentioned document(s) and necessary revisions on the basis of the Client's feedback to the Legal Service Provider.${
            formData.currency ? `(${formData.currency})` : ""
          }`}
          <p className="mt-2 text-md">
            The Legal Service Provider shall submit all invoices to the Client
            in the contract price currency, unless otherwise instructed in
            writing by the Client.
          </p>
        </Section>
        <Section title="Shall the Documents be Prepared as Empty Templates Only or Fully Completed with Required Information Related Specifically to the Client's Business?">
          {isEmptyTemplate ? (
            <>
              <p>{formData.documentType}</p>
              <p className="mt-2 whitespace-pre-line">
                {formData.documentTemplate || "-"}
              </p>
            </>
          ) : isFinalized ? (
            <>
              <p>{formData.documentType}</p>
              <div className="mt-2">
                <p>
                  Groups of Individuals Concerned:{" "}
                  {individualsSummary.join(", ") || "-"}
                </p>
                <p className="mt-2">
                  Document Coverage:{" "}
                  {formData.documentCoverage === "Other"
                    ? formData.otherCoverage || "-"
                    : formData.documentCoverage || "-"}
                </p>
                <p className="mt-2">
                  <span className="whitespace-pre-line">
                    {formData.generalDescription || "-"}
                  </span>
                </p>
              </div>
            </>
          ) : (
            "-"
          )}
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
