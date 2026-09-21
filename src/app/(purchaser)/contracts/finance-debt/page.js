"use client";

import { useEffect, useRef, useState } from "react";
import useLexiDraftPrefill from "@/hooks/useLexiDraftPrefill";
import useRequestDrafts from "@/hooks/useRequestDrafts";
import useRequestWizardNav from "@/hooks/useRequestWizardNav";
import { useRouter } from "next/navigation";
import QuestionMarkTooltip from "../../../components/QuestionmarkTooltip";
import AutoGrowTextarea from "../../../components/AutoGrowTextarea";
import RequestWizard from "../../../components/RequestWizard";
import NeedOptionCards from "../../../components/request-wizard/NeedOptionCards";
import SummaryRow from "../../../components/request-wizard/SummaryRow";
import BackgroundFields from "../../../components/request-wizard/BackgroundFields";
import ProviderOffersFields from "../../../components/request-wizard/ProviderOffersFields";
import ReviewSubmitFields from "../../../components/request-wizard/ReviewSubmitFields";
import {
  DraftHeaderActions,
  SaveDraftModal,
  LoadDraftModal,
} from "../../../components/request-wizard/DraftControls";
import RequestPreviewModal, {
  PreviewSection as Section,
} from "@/app/components/request-wizard/RequestPreviewModal";
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
  getSelectableLegalPanels,
  getSelectedLegalPanel,
  fileNames,
  LUMP_SUM_NOTE,
} from "@/lib/requestWizard";

const NEED_COMPREHENSIVE =
  "Comprehensive legal support throughout the refinancing process (including but not limited to drafting or commenting of a facility/facilities agreement and related legal documentation, required negotiations with the counterparty and drafting/collecting or reviewing of customary conditions precedent documents)";
const NEED_OCCASIONAL =
  "Occasional legal support with the refinancing process when needed (for example, commenting of facility/facilities agreement documentation or specific legal advice during different stages of the process)";

const NEED_OPTIONS = [
  {
    value: NEED_COMPREHENSIVE,
    title: NEED_COMPREHENSIVE,
    pricing: "Lump sum fixed price",
    note: LUMP_SUM_NOTE,
    tooltip:
      "Conditions precedent refer to terms that must be satisfied before signing or before the agreement becomes effective. Typical conditions precedent documents include constitutional documents, corporate resolutions, KYC documents and financial accounts.",
    icon: "review",
  },
  {
    value: NEED_OCCASIONAL,
    title: NEED_OCCASIONAL,
    pricing: "Blended hourly rate",
    note: "Any offers you receive will provide an applicable hourly rate only. The total price of the service will be calculated by multiplying the hourly rate with the number of hours of legal support provided by the legal service provider submitting the winning offer. The offered hourly rate will be valid until the refinancing has been completed or abandoned, whichever comes first.",
    icon: "template",
  },
];

const WIZARD_STEPS = [
  { id: "need", label: "Support needed", title: "What do you need?" },
  { id: "company", label: "Who is involved", title: "Who is involved?" },
  { id: "matter", label: "Matter details", title: "Matter details" },
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

const PAGE_PATH = "/contracts/finance-debt";
const REQUEST_DRAFT_TYPE = "bankingRefinancing";
const DRAFT_EMPTY_TEXT = "No saved Refinancing of Existing Debt drafts found.";
const SECURED_VALUE =
  "Secured - the debt will be backed by specific collateral";

function isHourlyNeed(supportType) {
  return String(supportType || "").startsWith("Occasional legal support");
}

export default function FinanceDebt() {
  const router = useRouter();

  const initialFormState = {
    termSign: "",
    refinanceType: "",
    financeAct: "",
    agreementCoverage: "",
    relationRole: "",
    description: "",
    debtSecurance: "",
    assetDescription: "",
    supportType: "",
    background: "",
    backgroundFiles: [],
    providerSource: "",
    legalPanelGroupId: "",
    offerer: "",
    providerCountry: "",
    counterparty: "",
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

  const isHourly = isHourlyNeed(formData.supportType);
  const isFixedFee = Boolean(formData.supportType) && !isHourly;
  const selectedNeed = NEED_OPTIONS.find(
    (option) => option.value === formData.supportType,
  );
  const retainerFeeOptions = retainerFeeOptionsForNeed(isFixedFee);
  const selectedLanguages = selectedLanguagesFromForm(formData);
  const selectableLegalPanels = getSelectableLegalPanels(legalPanelGroups);
  const selectedLegalPanel = getSelectedLegalPanel(
    legalPanelGroups,
    formData.legalPanelGroupId,
  );
  const usingLegalPanel = formData.providerSource === "panel";
  const isLender = formData.refinanceType === "I am the lender";
  const showRelationRole =
    isLender &&
    formData.financeAct === "On my own behalf and for other lenders";
  const showAssetDescription = formData.debtSecurance === SECURED_VALUE;

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
        Boolean(next.supportType) && !isHourlyNeed(next.supportType),
      );
      return next;
    },
  });

  const validateStep = (step) => {
    if (step === 0) {
      if (!formData.supportType) {
        return { error: "Please select what you need.", field: "supportType" };
      }
      return null;
    }

    if (step === 1) {
      if (!String(formData.counterparty || "").trim()) {
        return {
          error: "Please provide the name of your counterparty.",
          field: "counterparty",
        };
      }
      return null;
    }

    if (step === 2) {
      if (!formData.description) {
        return {
          error:
            "Please briefly describe the nature of the facility/facilities to be provided.",
          field: "description",
        };
      }
      if (!formData.refinanceType) {
        return {
          error: "Please select the refinancing process role.",
          field: "refinanceType",
        };
      }
      if (isLender && !formData.financeAct) {
        return {
          error:
            "Please select whether you are acting only on your own behalf or also for other lenders.",
          field: "financeAct",
        };
      }
      if (showRelationRole && !formData.relationRole) {
        return {
          error: "Please describe your role in relation to the other lenders.",
          field: "relationRole",
        };
      }
      if (!formData.termSign) {
        return {
          error:
            "Please select whether the term sheet has already been signed or not.",
          field: "termSign",
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

  useEffect(() => {
    drafts.onDraftLoadedRef.current = (skipReset) => {
      if (!skipReset) setCurrentStep(0);
      setStepError(null);
    };
  }, [drafts.onDraftLoadedRef, setCurrentStep, setStepError]);

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
    window.__LEXIFY_REQUEST_CONTEXT__ = {
      requestType: "Refinancing of Existing Debt",
      scopeOfWork: formData.supportType,
      description: formData.description,
      additionalBackgroundInfo: formData.background,
      financeDetails: {
        termSign: formData.termSign,
        refinanceType: formData.refinanceType,
        financeAct: formData.financeAct,
        agreementCoverage: formData.agreementCoverage,
        relationRole: formData.relationRole,
        debtSecurance: formData.debtSecurance,
        assetDescription: formData.assetDescription,
        counterparty: formData.counterparty,
      },
      providerRequirements:
        formData.providerSource === "panel"
          ? {
              selection: "legalPanel",
              legalPanelGroupId: formData.legalPanelGroupId,
              legalPanelGroupName:
                legalPanelGroups.find(
                  (group) => group.id === formData.legalPanelGroupId,
                )?.name || "",
              legalPanelProviders:
                legalPanelGroups.find(
                  (group) => group.id === formData.legalPanelGroupId,
                )?.providers || [],
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
      uploadedBackgroundFiles: formData.backgroundFiles?.map((f) => f.name),
      uploadedSupplierFiles: formData.supplierFiles?.map((f) => f.name),
    };
  }, [formData, legalPanelGroups, selectedLanguages]);

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
        Boolean(prev.supportType) && !isHourlyNeed(prev.supportType),
      );
      if (nextRetainerFee === prev.retainerFee) return prev;
      return { ...prev, retainerFee: nextRetainerFee };
    });
  }, [isFixedFee]);

  const handleBackgroundFileChange = (e) => {
    const newFiles = Array.from(e.target.files || []);
    setFormData((s) => ({
      ...s,
      backgroundFiles: [...s.backgroundFiles, ...newFiles],
    }));
    e.target.value = "";
  };
  const handleSupplierFileChange = (e) => {
    const newFiles = Array.from(e.target.files || []);
    setFormData((s) => ({
      ...s,
      supplierFiles: [...s.supplierFiles, ...newFiles],
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
      } else {
        setFormData({
          ...formData,
          checkboxes: checked
            ? [...formData.checkboxes, value]
            : formData.checkboxes.filter((v) => v !== value),
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
          name === "supportType" &&
          isHourlyNeed(value) !== isHourlyNeed(formData.supportType);
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
      const payload = {
        requestState: "PENDING",
        requestCategory: "Help with Banking & Finance Matters",
        requestSubcategory: "Refinancing of Existing Debt",
        scopeOfWork: formData.supportType,
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
        paymentRate: isHourly
          ? "Blended Hourly Rate. The total price of the service will be calculated by multiplying the hourly rate with the number of hours of legal support provided by the Legal Service Provider. The offered hourly rate will be valid until the transaction has been closed or abandoned, whichever comes first."
          : "Lump sum fixed price.",
        advanceRetainerFee: formData.retainerFee,
        invoiceType: formData.paymentTerms,
        language: selectedLanguages.join(", "),
        offersDeadline: formData.date,
        title: formData.requestTitle,
        dateExpired: formData.date,
        details: {
          refinanceType: formData.refinanceType,
          financeAct: isLender ? formData.financeAct || "" : "",
          relationRole: showRelationRole ? formData.relationRole || "" : "",
          termSign: formData.termSign,
          agreementCoverage: formData.agreementCoverage,
          debtSecurance: formData.debtSecurance,
          counterparty: (formData.counterparty || "").trim(),
          maximumPrice: null,
          assetDescription: formData.assetDescription || "",
        },
      };

      const form = new FormData();
      form.append(
        "data",
        new Blob([JSON.stringify(payload)], { type: "application/json" }),
      );
      for (const f of formData.backgroundFiles)
        form.append("backgroundFiles", f, f.name);
      for (const f of formData.supplierFiles)
        form.append("supplierFiles", f, f.name);

      const res = await fetch("/api/requests", { method: "POST", body: form });
      const text = await res.text();
      let json = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        /* keep json = null */
      }
      if (!res.ok)
        throw new Error(
          (json && (json.error || json.message)) ||
            text ||
            "Failed to create request.",
        );

      alert("LEXIFY Request submitted successfully.");
      drafts.clearDraftGuard();
      router.push("/main");
    } catch (e2) {
      alert(e2.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const firmsSummary = eligibleFirmsSummary({
    usingLegalPanel,
    selectedLegalPanel,
    formData,
  });

  return (
    <>
      <form ref={formRef} onSubmit={handleSubmit} noValidate>
        <RequestWizard
          categoryLabel="Help with Refinancing of Existing Debt"
          steps={WIZARD_STEPS}
          currentStep={currentStep}
          onStepClick={goToStep}
          onNext={() =>
            goNext({ onLastStep: () => formRef.current?.requestSubmit() })
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
          {currentStep === 0 ? (
            <NeedOptionCards
              options={NEED_OPTIONS}
              name="supportType"
              field="supportType"
              value={formData.supportType}
              onChange={handleChange}
            />
          ) : null}

          {currentStep === 1 ? (
            <div className="space-y-6">
              <div data-field="counterparty">
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  Please provide the name, business identity code and country of
                  domicile of your counterparty in the refinancing process and
                  the name and business ID number of other companies (if any)
                  involved in the process.
                </h4>
                <AutoGrowTextarea
                  name="counterparty"
                  className={FIELD_CLASS}
                  onChange={handleChange}
                  value={formData.counterparty}
                />
              </div>
            </div>
          ) : null}

          {currentStep === 2 ? (
            <div className="space-y-6">
              <div data-field="description">
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  Please briefly describe the nature of the facility/facilities
                  to be provided (for example, a term loan facility, a revolving
                  loan facility or a guarantee facility). Please also confirm
                  whether an ancillary facility structure will be used (for
                  example, to allow the use of a bilateral credit limit).
                  <QuestionMarkTooltip tooltipText="A term loan refers to a loan that is repaid by regular payments over a set period of time. A revolving loan is a loan that may be drawn, repaid, and redrawn throughout the loan's maturity." />
                </h4>
                <AutoGrowTextarea
                  name="description"
                  className={FIELD_CLASS}
                  onChange={handleChange}
                  value={formData.description}
                />
              </div>
              <div data-field="refinanceType">
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  Are you the lender or the borrower in the refinancing process?
                </h4>
                <select
                  name="refinanceType"
                  className={FIELD_CLASS}
                  onChange={handleChange}
                  value={formData.refinanceType}
                >
                  <option value="">Select</option>
                  <option value="I am the lender">I am the lender</option>
                  <option value="I am the borrower">I am the borrower</option>
                </select>
              </div>
              {isLender ? (
                <div data-field="financeAct">
                  <h4 className="mb-2 text-sm font-semibold text-gray-900">
                    In this refinancing process, are you acting only on your own
                    behalf or also for other lenders?
                  </h4>
                  <select
                    name="financeAct"
                    className={FIELD_CLASS}
                    onChange={handleChange}
                    value={formData.financeAct}
                  >
                    <option value="">Select</option>
                    <option value="On my own behalf only">
                      On my own behalf only
                    </option>
                    <option value="On my own behalf and for other lenders">
                      On my own behalf and for other lenders
                    </option>
                  </select>
                </div>
              ) : null}
              {showRelationRole ? (
                <div data-field="relationRole">
                  <h4 className="mb-2 text-sm font-semibold text-gray-900">
                    Please describe your role in relation to the other lenders
                    (for example, a coordinator or a facility agent) and provide
                    the name, business identity code and country of domicile of
                    the other lenders involved in the refinancing process.
                  </h4>
                  <AutoGrowTextarea
                    name="relationRole"
                    className={FIELD_CLASS}
                    onChange={handleChange}
                    value={formData.relationRole}
                  />
                </div>
              ) : null}
              <div data-field="termSign">
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  Has a term sheet already been signed between the lender and
                  the borrower?
                </h4>
                <select
                  name="termSign"
                  className={FIELD_CLASS}
                  onChange={handleChange}
                  value={formData.termSign}
                >
                  <option value="">Select</option>
                  <option value="Yes, a signed term sheet is available">
                    Yes, a signed term sheet is available
                  </option>
                  <option value="No, a term sheet has not yet been signed. Legal support for negotiating a term sheet shall be included in the work performed under this LEXIFY Request.">
                    No, a term sheet has not yet been signed. Legal support for
                    negotiating a term sheet shall be included in the work
                    performed under this LEXIFY Request.
                  </option>
                  <option value="No, a term sheet has not yet been signed. Legal support for negotiating a term sheet does not need to be included in the work performed under this LEXIFY Request.">
                    No, a term sheet has not yet been signed. Legal support for
                    negotiating a term sheet does not need to be included in the
                    work performed under this LEXIFY Request.
                  </option>
                </select>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  Will the facility/facilities agreement covering the
                  refinancing be based on an investment grade or leveraged LMA
                  template?
                  <QuestionMarkTooltip tooltipText="Investment grade and leveraged templates refer to the respective document templates of the Loan Market Association (LMA). The investment grade template is a shorter document template which includes financial covenants typical for an investment grade corporate borrower. The leveraged template includes financial covenants typical for a non-investment grade corporate borrower or a company controlled by a private equity fund (or similar), as well as more stringent negative covenants." />
                </h4>
                <select
                  name="agreementCoverage"
                  className={FIELD_CLASS}
                  onChange={handleChange}
                  value={formData.agreementCoverage}
                >
                  <option value="">Select</option>
                  <option value="Investment grade">Investment grade</option>
                  <option value="Leveraged">Leveraged</option>
                  <option value="Not known at this stage">
                    Not known at this stage
                  </option>
                </select>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  Will the debt be secured or unsecured?
                </h4>
                <select
                  name="debtSecurance"
                  className={FIELD_CLASS}
                  onChange={handleChange}
                  value={formData.debtSecurance}
                >
                  <option value="">Select</option>
                  <option value="Unsecured - the debt will not be backed by any collateral">
                    Unsecured - the debt will not be backed by any collateral
                  </option>
                  <option value={SECURED_VALUE}>{SECURED_VALUE}</option>
                </select>
              </div>
              {showAssetDescription ? (
                <div data-field="assetDescription">
                  <h4 className="mb-2 text-sm font-semibold text-gray-900">
                    Please describe the asset(s) to be used as collateral.
                    Please also confirm whether the assets are domestic or
                    foreign (and if foreign, in which country/countries).
                  </h4>
                  <AutoGrowTextarea
                    name="assetDescription"
                    className={FIELD_CLASS}
                    onChange={handleChange}
                    value={formData.assetDescription}
                  />
                </div>
              ) : null}
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
                  Request (for example, the amounts of the facilities to be
                  provided and the anticipated number of negotiation rounds in
                  the refinancing process). If you want, you can also upload a
                  separate file with additional background information (for
                  example, a signed term sheet) by clicking “Upload Background
                  Info”
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
              isFixedFee={isFixedFee}
            />
          ) : null}

          {currentStep === 5 ? (
            <div className="space-y-6">
              <dl className="rounded-xl border border-gray-200 px-4">
                <SummaryRow
                  label="Legal support needed"
                  value={selectedNeed?.title || formData.supportType}
                />
                <SummaryRow
                  label="Facility description"
                  value={formData.description}
                />
                <SummaryRow
                  label="Counterparty"
                  value={formData.counterparty}
                />
                <SummaryRow
                  label="Lender or borrower"
                  value={formData.refinanceType}
                />
                {isLender ? (
                  <SummaryRow
                    label="Acting for other lenders"
                    value={formData.financeAct}
                  />
                ) : null}
                {showRelationRole ? (
                  <SummaryRow
                    label="Role vs other lenders"
                    value={formData.relationRole}
                  />
                ) : null}
                <SummaryRow label="Term sheet" value={formData.termSign} />
                <SummaryRow
                  label="LMA template"
                  value={formData.agreementCoverage}
                />
                <SummaryRow
                  label="Secured or unsecured"
                  value={formData.debtSecurance}
                />
                {showAssetDescription ? (
                  <SummaryRow
                    label="Collateral assets"
                    value={formData.assetDescription}
                  />
                ) : null}
                <SummaryRow label="Background" value={formData.background} />
                <SummaryRow
                  label="Background files"
                  value={fileNames(formData.backgroundFiles)}
                />
                <SummaryRow
                  label="Law firms eligible to submit offers"
                  value={firmsSummary}
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

      <RequestPreviewModal
        open={showPreview}
        onClose={() => setShowPreview(false)}
      >
        <Section title="Client Name, Business Identity Code and Country of Domicile">
          {[company.name, company.businessId, company.country]
            .filter(Boolean)
            .join(", ") || "-"}
        </Section>
        <Section title="Scope of Work">{formData.supportType || "-"}</Section>
        <Section title="Contract Price (Lump Sum Fixed Fee or Blended Hourly Rate) and Currency">
          {formData.supportType.includes(NEED_OCCASIONAL) ? (
            <>
              {`Blended Hourly Rate ${
                formData.currency ? `(${formData.currency})` : ""
              }`}
              <p className="text-md mt-2">
                The total price of the service will be calculated by multiplying
                the hourly rate with the number of hours of legal support
                provided by the legal service provider submitting the winning
                offer. The offered hourly rate will be valid until the
                refinancing has been completed or abandoned, whichever comes
                first.
              </p>
            </>
          ) : (
            `Lump Sum Fixed Fee ${
              formData.currency ? `(${formData.currency})` : ""
            }`
          )}
          <p className="text-md mt-2">
            The Legal Service Provider shall submit all invoices to the Client
            in the contract price currency, unless otherwise instructed in
            writing by the Client.
          </p>
        </Section>
        <Section title="Is the Client the Lender or the Borrower in the Refinancing Process?">
          <p>{formData.refinanceType || "-"}</p>
        </Section>
        {isLender ? (
          <Section title="Is the Client Acting Only on Its Own Behalf or Also on Behalf of Other Lenders in the Refinancing Process?">
            <p>{formData.financeAct || "-"}</p>
          </Section>
        ) : null}
        {showRelationRole ? (
          <Section title="Description of the Other Lenders and the Client's Role in Relation to the Other Lenders">
            <p>{formData.relationRole || "-"}</p>
          </Section>
        ) : null}
        <Section title="Name, Business Identity Code and Country of Domicile of the Client's Counterparty in the Refinancing Process">
          {formData.counterparty}
        </Section>
        <Section title="Has a Term Sheet Already Been Signed Between the Lender and the Borrower?">
          <p>{formData.termSign || "-"}</p>
        </Section>
        <Section title="Will the Facility/Facilities Agreement Covering the Refinancing Be Based on an Investment Grade or Leveraged LMA Template?">
          <p>{formData.agreementCoverage || "-"}</p>
        </Section>
        <Section title="Description of the Nature of the Facility/Facilities to be Provided">
          <p>{formData.description || "-"}</p>
        </Section>
        <Section title="Will the Debt Be Secured or Unsecured">
          <p>{formData.debtSecurance || "-"}</p>
        </Section>
        {showAssetDescription ? (
          <Section title="Description of the Asset(s) to Be Used As Collateral">
            <p>{formData.assetDescription || "-"}</p>
          </Section>
        ) : null}
        <Section title="Additional Background Information Provided by Client">
          <p>{formData.background || "-"}</p>
          {formData.backgroundFiles.length > 0 && (
            <ul className="list-disc pl-6 mt-2">
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
          )}
        </Section>
        <Section title="Is an Advance Retainer Fee Paid to the Legal Service Provider?">
          {formData.retainerFee || "-"}
          <p className="text-xs mt-2 italic">
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
          <p className="text-md mt-2">
            The Legal Service Provider shall invoice the Client in the following
            manner:
          </p>
          {formData.paymentTerms || "-"}
          <p className="text-md mt-2">
            Further details, such as contact person for invoices and method of
            invoicing (for example, email, e-invoicing or other), related to
            invoicing shall be agreed separately between the client and the
            legal service provider.
          </p>
        </Section>
        <Section title="Languages Required for the Performance of the Work">
          {selectedLanguages.join(", ") || "-"}
          <p className="text-md mt-2">
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

      <SaveDraftModal
        open={drafts.showSaveDraftModal}
        title={drafts.draftTitleInput}
        error={drafts.draftSaveError}
        loading={drafts.draftActionLoading}
        onChangeTitle={drafts.setDraftTitleInput}
        onClose={drafts.closeSaveDraftModal}
        onSave={drafts.handleSaveDraft}
      />
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
    </>
  );
}
