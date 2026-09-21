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
import {
  FIELD_CLASS,
  REVIEW_STEP_TOOLTIP,
  eligibleFirmsSummary,
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

const REQUEST_DRAFT_TYPE = "dayToDay";
const PAGE_PATH = "/requests/legal-advice";
const DRAFT_EMPTY_TEXT = "No saved Day-to-day Legal Advice drafts found.";

const OCCASIONAL_NEED =
  "Occasional day-to-day legal advice on specific areas of law, as needed from time to time.";
const MONTHLY_NEED =
  "A fixed monthly number of hours of day-to-day legal support on specific areas of law, as needed from time to time.";

const NEED_OPTIONS = [
  {
    value: OCCASIONAL_NEED,
    title:
      "I want a single hourly rate for occasional legal advice as needed from time to time",
    pricing: "Blended hourly rate",
    icon: "review",
    note: "Any offers you receive will provide an applicable hourly rate only. The total price of the service will be calculated by multiplying the hourly rate with the number of hours of legal support provided by the legal service provider submitting the winning offer. The offered hourly rate will be valid for 12 calendar months from the date of the LEXIFY Contract between you as the legal service purchaser and the legal service provider submitting the winning offer.",
  },
  {
    value: MONTHLY_NEED,
    title:
      "I want a lump sum monthly price for a fixed number of hours of legal support per month",
    pricing: "Lump sum fixed price per month",
    icon: "template",
    note: "Any offers you receive will be for a lump sum fixed price per month.",
  },
];

const TOPIC_OPTIONS = [
  "General Corporate Matters",
  "Sales (B2B)",
  "Sales (B2C)",
  "Employment and Labor",
  "Real Estate and Construction",
  "Sourcing",
  "Banking and Finance",
  "ICT and IT",
  "Intellectual Property Rights",
  "Data Privacy",
  "Competition/Antitrust",
  "Environment and Energy",
  "Tax and Structuring",
  "Other",
];

const WIZARD_STEPS = [
  {
    id: "need",
    label: "Support needed",
    title: "What kind of day-to-day legal advice arrangement do you want?",
  },
  {
    id: "topics",
    label: "Legal topics",
    title: "On which topics do you need advice?",
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

const initialFormState = {
  need: "",
  hourAmount: "",
  otherHour: "",
  monthAmount: "",
  areaboxes: [],
  otherTopic: "",
  description: "",
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

export default function LegalAdvice() {
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

  const isMonthly = formData.need === MONTHLY_NEED;
  const selectedNeed = NEED_OPTIONS.find(
    (option) => option.value === formData.need,
  );
  const retainerFeeOptions = retainerFeeOptionsForNeed(isMonthly);
  const selectedLanguages = selectedLanguagesFromForm(formData);
  const selectableLegalPanels = getSelectableLegalPanels(legalPanelGroups);
  const selectedLegalPanel = getSelectedLegalPanel(
    legalPanelGroups,
    formData.legalPanelGroupId,
  );
  const usingLegalPanel = formData.providerSource === "panel";
  const previewTopics = (() => {
    const selected = formData.areaboxes || [];
    const withoutOther = selected.filter((topic) => topic !== "Other");
    if (selected.includes("Other") && formData.otherTopic?.trim()) {
      return [...withoutOther, formData.otherTopic.trim()];
    }
    return withoutOther;
  })();
  const monthlyHours =
    formData.hourAmount === "Other" ? formData.otherHour : formData.hourAmount;

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
      const nextRetainerFee = normalizeRetainerFee(
        prev.retainerFee,
        prev.need === MONTHLY_NEED,
      );
      if (nextRetainerFee === prev.retainerFee) return prev;
      return { ...prev, retainerFee: nextRetainerFee };
    });
  }, [isMonthly]);

  useEffect(() => {
    window.__LEXIFY_REQUEST_CONTEXT__ = {
      requestType: "Day-to-day Legal Advice",
      scopeOfWork: formData.need,
      description: formData.description,
      additionalBackgroundInfo: formData.background,
      legalArea: [
        ...(formData.areaboxes || []).filter((topic) => topic !== "Other"),
        ...((formData.areaboxes || []).includes("Other") &&
        formData.otherTopic?.trim()
          ? [formData.otherTopic.trim()]
          : []),
      ].filter(Boolean),
      durationTerms: {
        legalHours: monthlyHours,
        helpMonths: formData.monthAmount,
      },
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
  }, [
    formData,
    monthlyHours,
    selectedLanguages,
    selectedLegalPanel,
    usingLegalPanel,
  ]);

  const validateStep = (step) => {
    if (step === 0) {
      if (!formData.need) {
        return {
          error:
            "Please select what kind of day-to-day legal advice arrangement you want.",
          field: "need",
        };
      }
      return null;
    }

    if (step === 1) {
      if (isMonthly) {
        if (!formData.hourAmount) {
          return {
            error: "Please select how many hours per month you need.",
            field: "hourAmount",
          };
        }
        if (formData.hourAmount === "Other" && !formData.otherHour) {
          return {
            error: "Please specify the number of hours.",
            field: "otherHour",
          };
        }
        if (!formData.monthAmount) {
          return {
            error: "Please select the duration of the arrangement.",
            field: "monthAmount",
          };
        }
      }
      if (!(formData.areaboxes || []).length) {
        return {
          error: "Please select at least one area of law.",
          field: "areaboxes",
        };
      }
      if (formData.areaboxes.includes("Other") && !formData.otherTopic) {
        return {
          error: "Please specify the other topic.",
          field: "otherTopic",
        };
      }
      return null;
    }

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
        backgroundFiles: [],
        supplierFiles: [],
        agree: false,
      };
      next.retainerFee = normalizeRetainerFee(
        next.retainerFee,
        next.need === MONTHLY_NEED,
      );
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
    const updatedFiles = [...formData.backgroundFiles];
    updatedFiles.splice(index, 1);
    setFormData({ ...formData, backgroundFiles: updatedFiles });
  };

  const handleDeleteSupplierFile = (index) => {
    const updatedFiles = [...formData.supplierFiles];
    updatedFiles.splice(index, 1);
    setFormData({ ...formData, supplierFiles: updatedFiles });
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
            ? [...formData.areaboxes, value]
            : formData.areaboxes.filter((item) => item !== value),
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
        const paymentTypeChanged =
          name === "need" && (value === MONTHLY_NEED) !== isMonthly;
        setFormData({
          ...formData,
          [name]: value,
          ...(paymentTypeChanged ? { retainerFee: "" } : {}),
        });
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const toggleAreabox = (value) => {
    setStepError(null);
    setFormData((prev) => ({
      ...prev,
      areaboxes: prev.areaboxes.includes(value)
        ? prev.areaboxes.filter((item) => item !== value)
        : [...prev.areaboxes, value],
    }));
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
      const topics = [
        ...(formData.areaboxes || []).filter((topic) => topic !== "Other"),
        formData.areaboxes.includes("Other")
          ? formData.otherTopic || null
          : null,
      ]
        .filter(Boolean)
        .join(", ");

      const scopePayload1 =
        " Number of hours of legal support needed per month: " +
        monthlyHours +
        ". Duration of the arrangement in months: " +
        formData.monthAmount +
        " The duration of the arrangement will be calculated from the date of the LEXIFY Contract between the Client and the Legal Service Provider. Any unused legal support hours remaining at the end of each month will carry over to the remaining duration of the arrangement. Any unused legal support hours remaining at the end of the arrangement will expire simultaneously with the arrangement. No refund will be issued by the Legal Service Provider for any such expiring legal support hours." +
        " The Legal Service Provider provides legal advice to the Client in the following areas of law: " +
        topics;

      const scopePayload2 =
        " The Legal Service Provider provides legal advice to the Client in the following areas of law: " +
        topics;

      const payload = {
        requestState: "PENDING",
        requestCategory: "Day-to-day Legal Advice",
        scopeOfWork: isMonthly
          ? formData.need + scopePayload1
          : formData.need + scopePayload2,
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
        paymentRate: isMonthly
          ? "Lump sum fixed price per month."
          : "Blended Hourly Rate. The total price of the service will be calculated by multiplying the hourly rate with the number of hours of legal support provided by the legal service provider submitting the winning offer. The offered hourly rate will be valid for 12 calendar months from the date of the LEXIFY Contract between the Client and the legal service provider.",
        advanceRetainerFee: formData.retainerFee,
        invoiceType: formData.paymentTerms,
        language: languageCSV,
        offersDeadline: formData.date,
        title: formData.requestTitle,
        dateExpired: formData.date,
        details: {
          monthlyHours: isMonthly && monthlyHours,
          monthlyDuration: isMonthly ? formData.monthAmount : "",
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
          categoryLabel="Help with Day-to-day Legal Advice"
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
            <div className="space-y-6">
              {isMonthly ? (
                <>
                  <div data-field="hourAmount">
                    <h4 className="mb-2 text-sm font-semibold text-gray-900">
                      How many hours of legal support do you need per month?
                    </h4>
                    <select
                      name="hourAmount"
                      className={FIELD_CLASS}
                      onChange={handleChange}
                      value={formData.hourAmount}
                    >
                      <option value="">Select</option>
                      <option value="5 hours">5 hours</option>
                      <option value="10 hours">10 hours</option>
                      <option value="15 hours">15 hours</option>
                      <option value="20 hours">20 hours</option>
                      <option value="Other">Other</option>
                    </select>
                    {formData.hourAmount === "Other" ? (
                      <input
                        type="text"
                        name="otherHour"
                        placeholder="Specify number of hours"
                        className={`${FIELD_CLASS} mt-3`}
                        value={formData.otherHour}
                        onChange={handleChange}
                      />
                    ) : null}
                  </div>
                  <div data-field="monthAmount">
                    <h4 className="mb-2 text-sm font-semibold text-gray-900">
                      How long do you want the arrangement for a fixed number of
                      hours of monthly legal support to continue?{" "}
                      <QuestionMarkTooltip tooltipText="The duration of the arrangement will be calculated from the date of the LEXIFY Contract between you as the legal service purchaser and the legal service provider submitting the winning offer." />
                    </h4>
                    <select
                      name="monthAmount"
                      className={FIELD_CLASS}
                      onChange={handleChange}
                      value={formData.monthAmount}
                    >
                      <option value="">Select</option>
                      <option value="One (1) calendar month">
                        One (1) calendar month
                      </option>
                      <option value="Three (3) calendar months">
                        Three (3) calendar months
                      </option>
                      <option value="Six (6) calendar months">
                        Six (6) calendar months
                      </option>
                      <option value="One (1) calendar year">
                        One (1) calendar year
                      </option>
                    </select>
                    <p className="mt-2 text-xs text-gray-500">
                      <strong>NOTE: </strong>
                      Any unused legal support hours at the end of each calendar
                      month will carry over to the remaining contract term of
                      the day-to-day legal advice arrangement. Any unused legal
                      support hours at the end of the contract term of the
                      day-to-day legal advice arrangement will expire
                      simultaneously with the end of the contract term. No
                      refund will be issued for any such expiring legal support
                      hours.
                    </p>
                  </div>
                </>
              ) : null}
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  On which topics do you need day-to-day legal advice?
                </h4>
                <CheckboxOptionCards
                  options={TOPIC_OPTIONS}
                  selected={formData.areaboxes}
                  onToggle={toggleAreabox}
                  otherValue={formData.otherTopic}
                  onOtherChange={handleChange}
                  otherName="otherTopic"
                />
              </div>
            </div>
          ) : null}

          {currentStep === 2 ? (
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

          {currentStep === 3 ? (
            <BackgroundFields
              formData={formData}
              onChange={handleChange}
              onFileChange={handleBackgroundFileChange}
              onDeleteFile={handleDeleteBackgroundFile}
              heading={
                <>
                  Please provide additional background information, if any, you
                  wish to share with legal service providers in your LEXIFY
                  Request. If you want, you can also upload a separate file with
                  additional background information by clicking “Upload
                  Background Info”
                  <QuestionMarkTooltip tooltipText="Please do not include any personal data in the description. Any background information provided will be visible to all legal service providers qualified to submit an offer in response to your LEXIFY Request." />
                </>
              }
            />
          ) : null}

          {currentStep === 4 ? (
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
              isFixedFee={isMonthly}
            />
          ) : null}

          {currentStep === 5 ? (
            <div className="space-y-6">
              <dl className="rounded-xl border border-gray-200 px-4">
                <SummaryRow
                  label="Engagement type"
                  value={selectedNeed?.title}
                />
                <SummaryRow
                  label="Day-to-day legal advice needed in"
                  value={previewTopics}
                />
                {isMonthly ? (
                  <>
                    <SummaryRow label="Hours per month" value={monthlyHours} />
                    <SummaryRow
                      label="Arrangement duration"
                      value={formData.monthAmount}
                    />
                  </>
                ) : null}
                <SummaryRow
                  label="Company's line of business"
                  value={formData.description}
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
          {formData.need === OCCASIONAL_NEED ? (
            <>
              <p>{formData.need}</p>
              <p>
                The Legal Service Provider provides legal advice to the Client
                in the following areas of law: {previewTopics.join(", ") || "-"}
              </p>
            </>
          ) : formData.need === MONTHLY_NEED ? (
            <>
              {formData.need}
              <p className="mt-2">
                Number of hours of legal support needed per month:{" "}
                {monthlyHours || "-"}
              </p>
              <p>
                Duration of the arrangement in months:{" "}
                {formData.monthAmount || "-"}
              </p>
              <p className="mt-2 text-sm italic">
                The duration of the arrangement will be calculated from the date
                of the LEXIFY Contract between the Client and the Legal Service
                Provider. Any unused legal support hours remaining at the end of
                each month will carry over to the remaining duration of the
                arrangement. Any unused legal support hours remaining at the end
                of the arrangement will expire simultaneously with the
                arrangement. No refund will be issued by the Legal Service
                Provider for any such expiring legal support hours.
              </p>
              <br />
              <p>
                The Legal Service Provider provides legal advice to the Client
                in the following areas of law: {previewTopics.join(", ") || "-"}
              </p>
            </>
          ) : (
            "-"
          )}
        </Section>
        <Section title="Contract Price (Lump Sum Fixed Fee or Blended Hourly Rate) and Currency">
          {isMonthly ? (
            `Lump Sum Fixed Fee ${
              formData.currency ? `(${formData.currency})` : ""
            }`
          ) : (
            <>
              {`Blended Hourly Rate ${
                formData.currency ? `(${formData.currency})` : ""
              }`}
              <p className="mt-2 text-md">
                The total price of the service will be calculated by multiplying
                the hourly rate with the number of hours of legal support
                provided by the legal service provider submitting the winning
                offer. The offered hourly rate will be valid for 12 calendar
                months from the date of the LEXIFY Contract between the Client
                and the legal service provider.
              </p>
            </>
          )}
          <p className="mt-2 text-md">
            The Legal Service Provider shall submit all invoices to the Client
            in the contract price currency, unless otherwise instructed in
            writing by the Client.
          </p>
        </Section>
        <Section title="Description of Client's Line of Business">
          <p>{formData.description || "-"}</p>
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
    </>
  );
}
