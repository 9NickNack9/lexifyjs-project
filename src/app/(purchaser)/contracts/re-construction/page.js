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
  "Comprehensive legal support throughout the construction contract negotiation process, including but not limited to drafting/commenting of the construction contract and negotiations with the counterparty. The work does not include drafting of scope of construction work descriptions or other non-legal documents of primarily technical nature.";
const NEED_OCCASIONAL =
  "Occasional legal support with the construction contract negotiation process when needed (for example, commenting of construction contract documentation or legal advice during different stages of the process).";
const NEED_CONTRACT =
  "A construction contract. The work includes the preparation of the first version of the document and necessary revisions on the basis of the Client's feedback to the Legal Service Provider. Additional work (for example, legal review of comments from the Client's counterparty or preparation of non-legal documents of primarily technical nature such as technical scope of work descriptions) is not included.";

const HOURLY_NOTE =
  "Any offers you receive will provide an applicable hourly rate only. The total price of the service will be calculated by multiplying the hourly rate with the number of hours of legal support provided by the legal service provider submitting the winning offer. The offered hourly rate will be valid until the construction contract has been signed or abandoned.";

const NEED_OPTIONS = [
  {
    value: NEED_COMPREHENSIVE,
    title:
      "Comprehensive legal support throughout the construction contract negotiation process (including but not limited to drafting of the construction contract and negotiations with the counterparty)",
    pricing: "Lump sum fixed price",
    note: LUMP_SUM_NOTE,
    tooltip:
      "The work does not include drafting of scope of construction work descriptions or other non-legal documents of primarily technical nature. ",
    icon: "review",
  },
  {
    value: NEED_OCCASIONAL,
    title:
      "Occasional legal support with the construction contract negotiation process when needed (for example, commenting of contract documentation or legal advice during different stages of the process)",
    pricing: "Blended hourly rate",
    note: HOURLY_NOTE,
    icon: "comments",
  },
  {
    value: NEED_CONTRACT,
    title:
      "A construction contract (including revisions based on client feedback)",
    pricing: "Lump sum fixed price",
    note: LUMP_SUM_NOTE,
    tooltip:
      "Any offers you receive will include the preparation of the first version of the document(s) and necessary revisions on the basis of your feedback to the legal service provider. Other work (for example, legal review of comments from your counterparty) or drafting of non-legal documents of primarily technical nature (for example technical scope of work descriptions) is not included.",
    icon: "template",
  },
];

const WIZARD_STEPS = [
  { id: "need", label: "Support needed", title: "What do you need?" },
  { id: "company", label: "Who is involved", title: "Who is involved?" },
  {
    id: "transaction",
    label: "Contract details",
    title: "Contract details",
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

const PAGE_PATH = "/contracts/re-construction";
const REQUEST_DRAFT_TYPE = "reConstruction";

export default function ReConstruction() {
  const router = useRouter();

  const initialFormState = {
    customerType: "",
    description: "",
    priceRange: "",
    supportType: "",
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
    emptyText: "No saved Construction Contract drafts found.",
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
      if (!formData.description) {
        return {
          error: "Please provide a brief description.",
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
      requestType: "Construction Contract",
      scopeOfWork: formData.supportType,
      description: formData.description,
      additionalBackgroundInfo: formData.background,
      confidentialCounterpartyInfo: formData.confidential,
      realEstateDetails: {
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
        ? "Blended Hourly Rate. The total price of the service will be calculated by multiplying the hourly rate with the number of hours of legal support provided by the Legal Service Provider. The offered hourly rate will be valid until the construction contract has been signed or abandoned."
        : "Lump sum fixed price.";
      const languageCSV = selectedLanguages.join(", ");

      const payload = {
        requestState: "PENDING",
        requestCategory: "Help with Contracts",
        requestSubcategory: "Real Estate and Construction",
        assignmentType: "Construction Contract",
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
          customerType: formData.customerType || "",
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

  return (
    <>
      <form ref={formRef} onSubmit={handleSubmit} noValidate>
        <RequestWizard
          categoryLabel="Help with Construction Contract"
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
              <div data-field="confidential">
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  Please provide the name, business identity code and country of
                  domicile of your counterparty in the construction contract. If
                  you do not want your name and the name of the counterparty to
                  be visible to all legal service providers qualified to make
                  you an offer, please also check the box &quot;Disclosed to
                  Winning Bidder Only&quot;{" "}
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
                  What is your role as party to the construction contract?
                </h4>
                <select
                  name="customerType"
                  className={FIELD_CLASS}
                  onChange={handleChange}
                  value={formData.customerType}
                >
                  <option value="">Select</option>
                  <option value="Property owner as buyer of construction services">
                    Property owner as buyer of construction services
                  </option>
                  <option value="Main contractor as buyer of services">
                    Main contractor as buyer of construction services
                  </option>
                  <option value="Subcontractor as buyer of construction services">
                    Subcontractor as buyer of construction services
                  </option>
                  <option value="Main contractor as seller of construction services">
                    Main contractor as seller of construction services
                  </option>
                  <option value="Subcontractor as seller of construction services">
                    Subcontractor as seller of construction services
                  </option>
                </select>
              </div>
              <div data-field="description">
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  Please provide a brief description of the construction work to
                  be performed under the construction contract and the site or
                  location of the work{" "}
                  <QuestionMarkTooltip tooltipText="Please do not include any personal data in the description. This information will be visible to all legal service providers qualified to submit an offer in response to your LEXIFY Request." />
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
                  What is the range of the expected contract value (VAT 0%)?{" "}
                  <QuestionMarkTooltip tooltipText="This information will be visible to all legal service providers qualified to submit an offer in response to your LEXIFY Request." />
                </h4>
                <select
                  name="priceRange"
                  className={FIELD_CLASS}
                  onChange={handleChange}
                  value={formData.priceRange}
                >
                  <option value="">Select</option>
                  <option value="0-50 kEUR">0-50 kEUR</option>
                  <option value="50-100 kEUR">50-100 kEUR</option>
                  <option value="100 kEUR-1 mEUR">100 kEUR-1 mEUR</option>
                  <option value="1 mEUR-10 mEUR">1 mEUR-10 mEUR</option>
                  <option value="10+ mEUR">10+ mEUR</option>
                  <option value="To be confirmed later">
                    To be confirmed later
                  </option>
                </select>
              </div>
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
                  Background Info”.{" "}
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
                  label="Counterparty"
                  value={
                    disclosedToWinner
                      ? "Disclosed to Winning Bidder Only"
                      : formData.confidential
                  }
                />
                <SummaryRow label="My role" value={formData.customerType} />
                <SummaryRow
                  label="Construction work"
                  value={formData.description}
                />
                <SummaryRow label="Price range" value={formData.priceRange} />
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
        <Section title="Scope of Work">{formData.supportType || "-"}</Section>
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
                will be valid until the construction contract has been signed or
                abandoned.
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
        <Section title="Client's Role in the Construction Contract">
          <p>{formData.customerType || "-"}</p>
        </Section>
        <Section title="Name, Business Identity Code and Country of Domicile of Client's Counterparty in the Construction Contract">
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
        <Section title="Description of the Work to be Performed under the Construction Contract and the Site or Location of the Work">
          <p>{formData.description || "-"}</p>
        </Section>
        <Section title="Range of Expected Contract Value (VAT 0%)">
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
