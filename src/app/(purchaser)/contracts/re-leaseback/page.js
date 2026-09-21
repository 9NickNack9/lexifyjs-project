"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useLexiDraftPrefill from "@/hooks/useLexiDraftPrefill";
import useRequestDrafts from "@/hooks/useRequestDrafts";
import useRequestWizardNav from "@/hooks/useRequestWizardNav";
import RequestWizard from "@/app/components/RequestWizard";
import QuestionMarkTooltip from "@/app/components/QuestionmarkTooltip";
import AutoGrowTextarea from "@/app/components/AutoGrowTextarea";
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
  LUMP_SUM_NOTE,
  fileNames,
  getSelectableLegalPanels,
  getSelectedLegalPanel,
} from "@/lib/requestWizard";

const NEED_COMPREHENSIVE =
  "Comprehensive legal support throughout the transaction process, including but not limited to a legal due diligence inspection of the target with a written report of findings (as required by Client), drafting/commenting of a sale and purchase agreement, lease agreement and related legal documents, required negotiations with the counterparty and support with completion of signing/closing related legal items.";
const NEED_OCCASIONAL =
  "Occasional legal support with the transaction process when needed (for example, commenting of transactional documents or legal advice during different stages of the transaction).";
const NEED_SPA =
  "A sale and purchase agreement and a lease agreement. The work includes the preparation of the first version of the documents and necessary revisions on the basis of the Client's feedback to the Legal Service Provider. Additional work (for example, legal review of comments from the Client's counterparty) is not included.";
const NEED_LOI =
  "A letter of intent. The work includes the preparation of the first version of the document and necessary revisions on the basis of the Client's feedback to the Legal Service Provider. Additional work (for example, legal review of comments from the Client's counterparty) is not included.";
const NEED_DD =
  "A legal due diligence inspection of the target with a written report of findings.";

const HOURLY_NOTE =
  "Any offers you receive will provide an applicable hourly rate only. The total price of the service will be calculated by multiplying the hourly rate with the number of hours of legal support provided by the legal service provider submitting the winning offer. The offered hourly rate will be valid until the transaction has been closed or abandoned, whichever comes first.";
const DOCUMENT_TOOLTIP =
  "Any offers you receive will include the preparation of the first version of the document(s) and necessary revisions on the basis of your feedback to the legal service provider. Other work (for example, legal review of comments from your counterparty) is not included.";

const NEED_OPTIONS = [
  {
    value: NEED_COMPREHENSIVE,
    title:
      "Comprehensive legal support throughout the transaction process (including but not limited to a legal due diligence inspection of the target with a written report of findings (if needed), drafting of a sale and purchase agreement, lease agreement and related legal documents, required negotiations with the counterparty and support with completion of signing/closing related legal items)",
    pricing: "Lump sum fixed price",
    note: LUMP_SUM_NOTE,
    icon: "review",
  },
  {
    value: NEED_OCCASIONAL,
    title:
      "Occasional legal support with the transaction process when needed (for example, commenting of transactional documents or legal advice during different stages of the transaction)",
    pricing: "Blended hourly rate",
    note: HOURLY_NOTE,
    icon: "comments",
  },
  {
    value: NEED_SPA,
    title:
      "A sale and purchase agreement and a lease agreement (including revisions based on client feedback)",
    pricing: "Lump sum fixed price",
    note: LUMP_SUM_NOTE,
    tooltip: DOCUMENT_TOOLTIP,
    icon: "template",
  },
  {
    value: NEED_LOI,
    title: "A letter of intent (including revisions based on client feedback)",
    pricing: "Lump sum fixed price",
    note: LUMP_SUM_NOTE,
    tooltip: DOCUMENT_TOOLTIP,
    icon: "template",
  },
  {
    value: NEED_DD,
    title:
      "A legal due diligence inspection of the target with a written report of findings",
    pricing: "Lump sum fixed price",
    note: LUMP_SUM_NOTE,
    icon: "review",
  },
];

const WIZARD_STEPS = [
  { id: "need", label: "Support needed", title: "What do you need?" },
  { id: "company", label: "Who is involved", title: "Who is involved?" },
  {
    id: "transaction",
    label: "Transaction details",
    title: "Transaction details",
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

const PAGE_PATH = "/contracts/re-leaseback";
const REQUEST_DRAFT_TYPE = "reLeaseback";

function dueDiligenceOptionsFor(supportType) {
  if (supportType === NEED_COMPREHENSIVE) {
    return [
      "'Red flag' report - report outlines significant legal concerns only",
      "Long form report - report provides a comprehensive review of all legal matters related to the target",
      "Legal Due Diligence inspection not needed",
    ];
  }
  if (supportType === NEED_DD) {
    return [
      "'Red flag' report - report outlines significant legal concerns only",
      "Long form report - report provides a comprehensive review of all legal matters related to the target",
    ];
  }
  return null;
}

export default function ReLeaseback() {
  const router = useRouter();

  const initialFormState = {
    supportType: "",
    dueDiligence: "",
    saleObject: "",
    otherObject: "",
    confidential: "",
    confboxes: [],
    customerType: "",
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
    maxPrice: "",
    firmRating: "",
    providerReferences: "",
    currency: "",
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
  const [company, setCompany] = useState({
    name: "",
    businessId: "",
    country: "",
  });
  const [legalPanelGroups, setLegalPanelGroups] = useState([]);
  const [panelDropdownOpen, setPanelDropdownOpen] = useState(false);
  const panelDropdownRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);

  const isHourly = formData.supportType.startsWith("Occasional legal support");
  const dueDiligenceOptions = dueDiligenceOptionsFor(formData.supportType);
  const selectedNeed = NEED_OPTIONS.find(
    (option) => option.value === formData.supportType,
  );
  const retainerFeeOptions = retainerFeeOptionsForNeed(!isHourly);
  const selectedLanguages = selectedLanguagesFromForm(formData);
  const selectableLegalPanels = getSelectableLegalPanels(legalPanelGroups);
  const selectedLegalPanel = getSelectedLegalPanel(
    legalPanelGroups,
    formData.legalPanelGroupId,
  );
  const usingLegalPanel = formData.providerSource === "panel";
  const disclosedToWinner = formData.confboxes.includes(
    "Disclosed to Winning Bidder Only",
  );

  const drafts = useRequestDrafts({
    requestType: REQUEST_DRAFT_TYPE,
    pagePath: PAGE_PATH,
    formData,
    setFormData,
    emptyText: "No saved Sale and Leaseback drafts found.",
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
        !String(next.supportType || "").startsWith("Occasional legal support"),
      );
      return next;
    },
  });

  const validateStep = (stepIndex) => {
    const stepId = WIZARD_STEPS[stepIndex]?.id;
    if (stepId === "need") {
      if (!formData.supportType) {
        return { error: "Please select what you need.", field: "supportType" };
      }
      return null;
    }
    if (stepId === "company") {
      if (!formData.description) {
        return {
          error: "Please provide a brief description.",
          field: "description",
        };
      }
      if (!String(formData.confidential || "").trim()) {
        return {
          error:
            "Please provide the name, business identity code and country of domicile of your counterparty.",
          field: "confidential",
        };
      }
      return null;
    }
    if (stepId === "transaction") {
      if (
        dueDiligenceOptions &&
        !dueDiligenceOptions.includes(formData.dueDiligence)
      ) {
        return {
          error: "Please choose the due diligence reporting format.",
          field: "dueDiligence",
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
  } = useRequestWizardNav({ steps: WIZARD_STEPS, validateStep });

  drafts.onDraftLoadedRef.current = (skipReset) => {
    if (!skipReset) setCurrentStep(0);
    setStepError(null);
  };

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
      requestType: "Sale and Leaseback",
      scopeOfWork: formData.supportType,
      description: formData.description,
      additionalBackgroundInfo: formData.background,
      confidentialCounterpartyInfo: formData.confidential,
      realEstateDetails: {
        dueDiligence: formData.dueDiligence,
        saleObject: [
          formData.saleObject !== "Other" ? formData.saleObject : null,
          formData.otherObject || null,
        ].filter(Boolean),
        customerType: formData.customerType,
        priceRange: formData.priceRange,
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
      languages: selectedLanguagesFromForm(formData),
      offersDeadline: formData.date,
      uploadedBackgroundFiles: formData.backgroundFiles?.map((f) => f.name),
      uploadedSupplierFiles: formData.supplierFiles?.map((f) => f.name),
    };
  }, [formData, legalPanelGroups]);

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
      const nextRetainerFee = normalizeRetainerFee(prev.retainerFee, !isHourly);
      if (nextRetainerFee === prev.retainerFee) return prev;
      return { ...prev, retainerFee: nextRetainerFee };
    });
  }, [isHourly]);

  const handleBackgroundFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    setFormData((s) => ({
      ...s,
      backgroundFiles: [...s.backgroundFiles, ...files],
    }));
    e.target.value = "";
  };
  const handleSupplierFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    setFormData((s) => ({
      ...s,
      supplierFiles: [...s.supplierFiles, ...files],
    }));
    e.target.value = "";
  };
  const handleDeleteBackgroundFile = (i) => {
    const arr = [...formData.backgroundFiles];
    arr.splice(i, 1);
    setFormData({ ...formData, backgroundFiles: arr });
  };
  const handleDeleteSupplierFile = (i) => {
    const arr = [...formData.supplierFiles];
    arr.splice(i, 1);
    setFormData({ ...formData, supplierFiles: arr });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setStepError(null);
    if (type === "checkbox") {
      if (name === "agree") setFormData({ ...formData, agree: checked });
      else if (name === "confboxes") {
        setFormData({
          ...formData,
          confboxes: checked
            ? [...formData.confboxes, value]
            : formData.confboxes.filter((v) => v !== value),
        });
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
        const nextHourly =
          name === "supportType"
            ? value.startsWith("Occasional legal support")
            : isHourly;
        setFormData({
          ...formData,
          [name]: value,
          ...(name === "supportType" ? { dueDiligence: "" } : {}),
          ...(name === "supportType" && nextHourly !== isHourly
            ? { retainerFee: "" }
            : {}),
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
      const paymentRate = isHourly
        ? "Blended Hourly Rate. The total price of the service will be calculated by multiplying the hourly rate with the number of hours of legal support provided by the Legal Service Provider. The offered hourly rate will be valid until the transaction has been closed or abandoned, whichever comes first."
        : "Lump sum fixed price.";
      const languageCSV = selectedLanguages.join(", ");

      const payload = {
        requestState: "PENDING",
        requestCategory: "Help with Contracts",
        requestSubcategory: "Real Estate and Construction",
        assignmentType: "Sale and Leaseback of Real Estate",
        scopeOfWork: formData.supportType,
        description: formData.description,
        additionalBackgroundInfo: formData.background || "",
        backgroundInfoFiles: [],
        supplierCodeOfConductFiles: [],
        ...legalPanelSubmitFields({
          usingLegalPanel,
          selectedLegalPanel,
          formData,
        }),
        currency: formData.currency,
        paymentRate,
        advanceRetainerFee: formData.retainerFee,
        invoiceType: formData.paymentTerms,
        language: languageCSV,
        offersDeadline: formData.date,
        title: formData.requestTitle,
        dateExpired: formData.date,
        details: {
          dueDiligence: formData.dueDiligence || "",
          saleObject: formData.saleObject || "",
          otherObject:
            formData.saleObject === "Other" ? formData.otherObject || "" : "",
          confidential: disclosedToWinner ? "Yes" : "No",
          winnerBidderOnlyStatus: (formData.confidential || "").trim(),
          priceRange: formData.priceRange || "",
          maximumPrice: null,
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
      if (!res.ok) {
        throw new Error(
          (json && json.error) || text || "Failed to create request.",
        );
      }

      alert("LEXIFY Request submitted successfully.");
      drafts.clearDraftGuard();
      router.push("/main");
    } catch (e2) {
      alert(e2.message);
    } finally {
      setSubmitting(false);
    }
  };

  const transactionObject =
    formData.saleObject === "Other"
      ? formData.otherObject || "Other"
      : formData.saleObject;

  return (
    <>
      <form ref={formRef} onSubmit={handleSubmit} noValidate>
        <RequestWizard
          categoryLabel="Help with Sale and Leaseback"
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
              <div data-field="description">
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  Please describe the target property briefly{" "}
                  <QuestionMarkTooltip tooltipText="Please do not include any personal data in the description. This information will be visible to all legal service providers qualified to submit an offer in response to your LEXIFY Request." />
                </h4>
                <AutoGrowTextarea
                  name="description"
                  className={FIELD_CLASS}
                  onChange={handleChange}
                  value={formData.description}
                />
              </div>
              <div data-field="confidential">
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  Please provide the name, business identity code and country of
                  domicile of your counterparty in the transaction. If you do
                  not want your name and the name of the counterparty to be
                  visible to all legal service providers qualified to make you
                  an offer, please also check the box &quot;Disclosed to Winning
                  Bidder Only&quot;.{" "}
                  <QuestionMarkTooltip tooltipText="If 'Disclosed to Winning Bidder Only' is checked, your identity and the identity of your counterparty will be disclosed solely to the legal service provider that submitted the winning offer, to enable that provider to conduct mandatory conflict checks. If the legal service provider notifies LEXIFY of an existing conflict, the winning offer will automatically be disqualified, and you will have the option to select an alternative winning offer." />
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
                    checked={disclosedToWinner}
                    onChange={handleChange}
                    className="accent-[#11999e]"
                  />
                  Disclosed to Winning Bidder Only{" "}
                  <QuestionMarkTooltip tooltipText="Please note that checking “Disclosed to Winning Bidder Only” may cause additional delay in the processing of your LEXIFY Request as statutory conflict checks are postponed until the winning offer has been verified." />
                </label>
              </div>
            </div>
          ) : null}

          {currentStep === 2 ? (
            <div className="space-y-6">
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  What is the object of sale?
                </h4>
                <select
                  name="saleObject"
                  className={FIELD_CLASS}
                  onChange={handleChange}
                  value={formData.saleObject}
                >
                  <option value="">Select</option>
                  <option value="Plot/Parcel of Land">
                    Plot/Parcel of Land
                  </option>
                  <option value="Shares in a Real Estate Company">
                    Shares in a Real Estate Company
                  </option>
                  <option value="Shares in a Housing Association">
                    Shares in a Housing Association
                  </option>
                  <option value="Other">Other (Specify below)</option>
                </select>
                {formData.saleObject === "Other" ? (
                  <input
                    type="text"
                    name="otherObject"
                    placeholder="Specify Other Object of Sale"
                    className={`${FIELD_CLASS} mt-3`}
                    value={formData.otherObject}
                    onChange={handleChange}
                  />
                ) : null}
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  Are you buying (and leasing as lessor) or selling (and leasing
                  as lessee)?
                </h4>
                <select
                  name="customerType"
                  className={FIELD_CLASS}
                  onChange={handleChange}
                  value={formData.customerType}
                >
                  <option value="">Select</option>
                  <option value="I am buyer and lessor">
                    I am buyer and lessor
                  </option>
                  <option value="I am seller and lessee">
                    I am seller and lessee
                  </option>
                </select>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  What is the range of the expected purchase price (cash and
                  debt free)?{" "}
                  <QuestionMarkTooltip tooltipText="This information will be visible to all legal service providers qualified to submit an offer in response to your LEXIFY Request." />
                </h4>
                <select
                  name="priceRange"
                  className={FIELD_CLASS}
                  onChange={handleChange}
                  value={formData.priceRange}
                >
                  <option value="">Select</option>
                  <option value="0-100 kEUR">0-100 kEUR</option>
                  <option value="100 kEUR- 1 mEUR">100 kEUR-1 mEUR</option>
                  <option value="1-10 mEUR">1-10 mEUR</option>
                  <option value="10-50 mEUR">10-50 mEUR</option>
                  <option value="50+ mEUR">50+ mEUR</option>
                  <option value="To be confirmed later">
                    To be confirmed later
                  </option>
                </select>
              </div>
              {dueDiligenceOptions ? (
                <div data-field="dueDiligence">
                  <h4 className="mb-2 text-sm font-semibold text-gray-900">
                    How do you want findings of the legal due diligence
                    inspection to be reported?
                  </h4>
                  <select
                    name="dueDiligence"
                    className={FIELD_CLASS}
                    onChange={handleChange}
                    value={formData.dueDiligence}
                  >
                    <option value="">Select</option>
                    {dueDiligenceOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
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
                  Request (for example, an estimate of the amount of due
                  diligence material to be reviewed if your LEXIFY Request
                  includes a due diligence inspection). If you want, you can
                  also upload a separate file with additional background
                  information by clicking “Upload Background Info”.{" "}
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
              isFixedFee={!isHourly}
            />
          ) : null}

          {currentStep === 5 ? (
            <div className="space-y-6">
              <dl className="rounded-xl border border-gray-200 px-4">
                <SummaryRow label="Scope of work" value={selectedNeed?.title} />
                <SummaryRow
                  label="Target property"
                  value={formData.description}
                />
                <SummaryRow
                  label="Counterparty"
                  value={
                    disclosedToWinner
                      ? "Disclosed to Winning Bidder Only"
                      : formData.confidential
                  }
                />
                <SummaryRow
                  label="Transaction object"
                  value={transactionObject}
                />
                <SummaryRow
                  label="Buyer/seller"
                  value={formData.customerType}
                />
                <SummaryRow label="Price range" value={formData.priceRange} />
                {dueDiligenceOptions ? (
                  <SummaryRow
                    label="Due diligence reporting"
                    value={formData.dueDiligence}
                  />
                ) : null}
                <SummaryRow
                  label="Background"
                  value={
                    [formData.background, fileNames(formData.backgroundFiles)]
                      .filter(Boolean)
                      .join("\n") || ""
                  }
                />
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
                winningBidderNote={disclosedToWinner}
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
          {disclosedToWinner
            ? "Disclosed to Winning Bidder Only"
            : [company.name, company.businessId, company.country]
                .filter(Boolean)
                .join(", ") || "-"}
        </Section>
        <Section title="Scope of Work">
          {[NEED_COMPREHENSIVE, NEED_DD].includes(formData.supportType)
            ? `${formData.supportType} Format of due diligence reporting: ${formData.dueDiligence}`
            : formData.supportType || "-"}
        </Section>
        <Section title="Contract Price (Lump Sum Fixed Fee or Blended Hourly Rate) and Currency">
          {isHourly ? (
            <>
              {`Blended Hourly Rate ${
                formData.currency ? `(${formData.currency})` : ""
              }`}
              <p className="mt-2 text-md">
                The total price of the service will be calculated by multiplying
                the hourly rate with the number of hours of legal support
                provided by the Legal Service Provider. The offered hourly rate
                will be valid until the transaction has been closed or
                abandoned, whichever comes first.
              </p>
            </>
          ) : (
            `Lump Sum Fixed Fee ${
              formData.currency ? `(${formData.currency})` : ""
            }`
          )}
          <p className="mt-2 text-md">
            The Legal Service Provider shall submit all invoices to the Client
            in the contract price currency, unless otherwise instructed in
            writing by the Client.
          </p>
        </Section>
        <Section title="Object of Sale">
          <p>{formData.saleObject || "-"}</p>
        </Section>
        <Section title="Name, Business Identity Code and Country of Domicile of Client's Counterparty in the Transaction">
          {disclosedToWinner
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
        <Section title="Is the Client Buying or Selling in the Transaction?">
          <p>{formData.customerType || "-"}</p>
        </Section>
        <Section title="Description of the Target Property">
          <p>{formData.description || "-"}</p>
        </Section>
        <Section title="Range of Expected Purchase Price (Cash and Debt Free)">
          <p>{formData.priceRange || "-"}</p>
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
