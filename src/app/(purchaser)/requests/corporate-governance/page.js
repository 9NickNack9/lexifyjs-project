"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useLexiDraftPrefill from "@/hooks/useLexiDraftPrefill";
import useRequestDrafts from "@/hooks/useRequestDrafts";
import useRequestWizardNav from "@/hooks/useRequestWizardNav";
import RequestWizard from "@/app/components/RequestWizard";
import AutoGrowTextarea from "@/app/components/AutoGrowTextarea";
import QuestionMarkTooltip from "@/app/components/QuestionmarkTooltip";
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
  LUMP_SUM_NOTE,
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

const REQUEST_DRAFT_TYPE = "corporateGovernance";
const PAGE_PATH = "/requests/corporate-governance";
const DRAFT_EMPTY_TEXT = "No saved Corporate Governance drafts found.";

const AUTHORITY_APP =
  "Comprehensive legal support with preparing a notification or application regarding a specific matter (for example, registration of new board members or applying for a business license) to the competent authority (including necessary attorney-client communications, preparation of needed documentation and required communications with the competent authority).";
const POLICY =
  "Preparation of a corporate policy for a specific purpose. The work includes the preparation of the first version of the document(s) and necessary revisions on the basis of the Client's feedback to the Legal Service Provider.";
const SHA_NEGOTIATION =
  "Comprehensive legal support throughout a shareholders' agreement negotiation process (including, but not limited to, drafting the shareholders' agreement and conducting required negotiations with the other parties to the agreement).";
const SHA_AGREEMENT =
  "A shareholders' agreement (including revisions based on client feedback).";
const OTHER_SUPPORT = "Other corporate governance support:";

const WORK_OPTIONS = [
  {
    value:
      "Comprehensive legal support with arranging a shareholders' meeting (including, for example, preparation of official invitations, minutes and other required documentation as well as support with chairing or acting as secretary in the meeting, as needed).",
    title:
      "Comprehensive legal support with arranging a shareholders' meeting (including, for example, preparation of official invitations, minutes and other required documentation as well as support with chairing or acting as secretary in the meeting, as needed).",
  },
  {
    value:
      "Comprehensive legal support with arranging a board of directors' meeting (including, for example, preparation of official invitations, minutes and other required documentation as well as support with chairing or acting as secretary in the meeting, as needed).",
    title:
      "Comprehensive legal support with arranging a board of directors' meeting (including, for example, preparation of official invitations, minutes and other required documentation as well as support with chairing or acting as secretary in the meeting, as needed).",
  },
  {
    value:
      "Comprehensive legal support with arranging an executive board meeting (including, for example, preparation of official invitations, minutes and other required documentation as well as support with chairing or acting as secretary in the meeting, as needed).",
    title:
      "Comprehensive legal support with arranging an executive board meeting (including, for example, preparation of official invitations, minutes and other required documentation as well as support with chairing or acting as secretary in the meeting, as needed).",
  },
  {
    value: AUTHORITY_APP,
    title: (
      <>
        {AUTHORITY_APP}{" "}
        <QuestionMarkTooltip tooltipText="Any offers you receive will not include fees or charges possibly levied by competent authorities and any such fees or charges will be invoiced separately." />
      </>
    ),
  },
  {
    value: POLICY,
    title: (
      <>
        {POLICY}{" "}
        <QuestionMarkTooltip tooltipText="Any offers you receive will include the preparation of the first version of the document(s) and necessary revisions on the basis of your feedback to the legal service provider." />
      </>
    ),
  },
  {
    value: SHA_NEGOTIATION,
    title: SHA_NEGOTIATION,
  },
  {
    value: SHA_AGREEMENT,
    title: (
      <>
        {SHA_AGREEMENT}{" "}
        <QuestionMarkTooltip tooltipText="Any offers you receive will include the preparation of the first version of the document(s) and necessary revisions on the basis of your feedback to the legal service provider. Other work (for example, legal review of comments from your counterparty) is not included." />
      </>
    ),
  },
  {
    value: OTHER_SUPPORT,
    title: OTHER_SUPPORT,
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

const initialFormState = {
  areaboxes: [],
  otherSupport: "",
  appDescription: "",
  confidential: "",
  confboxes: [],
  policyDescription: "",
  supportType: "",
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

export default function CorporateGovernance() {
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

  const retainerFeeOptions = retainerFeeOptionsForNeed(true);
  const selectedLanguages = selectedLanguagesFromForm(formData);
  const selectableLegalPanels = getSelectableLegalPanels(legalPanelGroups);
  const selectedLegalPanel = getSelectedLegalPanel(
    legalPanelGroups,
    formData.legalPanelGroupId,
  );
  const usingLegalPanel = formData.providerSource === "panel";
  const isShareholdersScope =
    (formData.areaboxes || []).includes(SHA_NEGOTIATION) ||
    (formData.areaboxes || []).includes(SHA_AGREEMENT);
  const selectedWork = [
    ...(formData.areaboxes || []).filter((item) => item !== OTHER_SUPPORT),
    (formData.areaboxes || []).includes(OTHER_SUPPORT)
      ? formData.otherSupport
      : null,
  ].filter(Boolean);
  const disclosedOnly = formData.confboxes.includes(
    "Disclosed to Winning Bidder Only",
  );

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
      requestType: "Corporate Governance",
      legalArea: [
        ...(formData.areaboxes || []).filter((item) => item !== OTHER_SUPPORT),
        formData.otherSupport || null,
      ].filter(Boolean),
      scopeOfWork: formData.supportType,
      description: formData.description,
      additionalBackgroundInfo: formData.background,
      confidentialCounterpartyInfo: formData.confidential,
      governanceDetails: {
        appDescription: formData.appDescription,
        policyDescription: formData.policyDescription,
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
  }, [formData, selectedLanguages, selectedLegalPanel, usingLegalPanel]);

  const validateStep = (step) => {
    if (step === 0) {
      if ((formData.areaboxes || []).length === 0) {
        return {
          error: "Please choose at least one support item.",
          field: "areaboxes",
        };
      }
      if (
        formData.areaboxes.includes(OTHER_SUPPORT) &&
        !formData.otherSupport
      ) {
        return {
          error:
            "Please specify the 'Other corporate governance support' support.",
          field: "otherSupport",
        };
      }
      if (
        formData.areaboxes.includes(AUTHORITY_APP) &&
        !formData.appDescription
      ) {
        return {
          error:
            "Please describe the purpose of the notification or application.",
          field: "appDescription",
        };
      }
      if (formData.areaboxes.includes(POLICY) && !formData.policyDescription) {
        return {
          error: "Please describe the purpose of the corporate policy.",
          field: "policyDescription",
        };
      }
      return null;
    }

    if (step === 1) return null;
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
      } else if (name === "areaboxes") {
        setFormData({
          ...formData,
          areaboxes: checked
            ? [...formData.areaboxes, value]
            : formData.areaboxes.filter((item) => item !== value),
        });
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
        setFormData({ ...formData, [name]: value });
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
      const payload = {
        requestState: "PENDING",
        requestCategory: "Help with Corporate Governance",
        scopeOfWork:
          "Lump sum corporate governance support as specified in the request. " +
          selectedWork.join(", "),
        description: selectedWork.join(", "),
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
          selectedItems: selectedWork.join(", "),
          applicationPurpose: formData.areaboxes.includes(AUTHORITY_APP)
            ? formData.appDescription || ""
            : "",
          policyPurpose: formData.areaboxes.includes(POLICY)
            ? formData.policyDescription || ""
            : "",
          maximumPrice: null,
          confidential: isShareholdersScope && disclosedOnly ? "Yes" : "No",
          winnerBidderOnlyStatus: isShareholdersScope
            ? (formData.confidential || "").trim()
            : "",
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
          categoryLabel="Help with Corporate Governance"
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
            <div className="space-y-6">
              <CheckboxOptionCards
                options={WORK_OPTIONS}
                selected={formData.areaboxes}
                onToggle={toggleAreabox}
              />
              {formData.areaboxes.includes(OTHER_SUPPORT) ? (
                <AutoGrowTextarea
                  name="otherSupport"
                  placeholder="Describe the specific support you need."
                  className={FIELD_CLASS}
                  value={formData.otherSupport}
                  onChange={handleChange}
                />
              ) : null}
              <div className="rounded-xl bg-[#e8f4f6] p-4 text-sm text-gray-700">
                <p>
                  <strong>NOTE: </strong>
                  {LUMP_SUM_NOTE}
                </p>
              </div>
              {formData.areaboxes.includes(AUTHORITY_APP) ? (
                <div data-field="appDescription">
                  <h4 className="mb-2 text-sm font-semibold text-gray-900">
                    Please describe briefly for what purpose the notification or
                    application is prepared{" "}
                    <QuestionMarkTooltip tooltipText="Please do not include any personal data in the description. This information will be visible to all legal service providers qualified to submit an offer in response to your LEXIFY Request." />
                  </h4>
                  <AutoGrowTextarea
                    name="appDescription"
                    className={FIELD_CLASS}
                    onChange={handleChange}
                    value={formData.appDescription}
                  />
                </div>
              ) : null}
              {formData.areaboxes.includes(POLICY) ? (
                <div data-field="policyDescription">
                  <h4 className="mb-2 text-sm font-semibold text-gray-900">
                    Please describe briefly for what purpose the corporate
                    policy is prepared (for example, what is the subject matter
                    of the policy and what is the target group to which the
                    policy applies){" "}
                    <QuestionMarkTooltip tooltipText="Please do not include any personal data in the description. This information will be visible to all legal service providers qualified to submit an offer in response to your LEXIFY Request." />
                  </h4>
                  <AutoGrowTextarea
                    name="policyDescription"
                    className={FIELD_CLASS}
                    onChange={handleChange}
                    value={formData.policyDescription}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {currentStep === 1 ? (
            <div className="space-y-6">
              {isShareholdersScope ? (
                <div data-field="confidential">
                  <h4 className="mb-2 text-sm font-semibold text-gray-900">
                    Please provide the name, business identity code (if
                    applicable), and country of domicile of the other parties to
                    the shareholders&apos; agreement. If you do not want your
                    identity and the identities of the other parties to the
                    agreement to be visible to all legal service providers
                    qualified to make you an offer, please also check the box
                    &quot;Disclosed to Winning Bidder Only&quot;
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
                      checked={disclosedOnly}
                      onChange={handleChange}
                      className="accent-[#11999e]"
                    />
                    Disclosed to Winning Bidder Only{" "}
                    <QuestionMarkTooltip tooltipText="Please note that checking “Disclosed to Winning Bidder Only” may cause additional delay in the processing of your LEXIFY Request as statutory conflict checks are postponed until the winning offer has been verified." />
                  </label>
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  This matter does not involve a counterparty, so there is
                  nothing to add here.
                </p>
              )}
            </div>
          ) : null}

          {currentStep === 2 ? (
            <BackgroundFields
              formData={formData}
              onChange={handleChange}
              onFileChange={handleBackgroundFileChange}
              onDeleteFile={handleDeleteBackgroundFile}
              heading={
                <>
                  Please provide additional background information, if any, you
                  wish to share with legal service providers in your LEXIFY
                  Request (for example, a summary of how many and what kind of
                  topics will be covered in the meeting if your LEXIFY Request
                  seeks support with arranging a shareholders&apos; meeting). If
                  you want, you can also upload a separate file with additional
                  background information by clicking “Upload Background Info”
                  <QuestionMarkTooltip tooltipText="Please do not include any personal data in the description. Any background information provided will be visible to all legal service providers qualified to submit an offer in response to your LEXIFY Request." />
                </>
              }
            />
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
                <SummaryRow label="Legal support needed" value={selectedWork} />
                {formData.areaboxes.includes(AUTHORITY_APP) ? (
                  <SummaryRow
                    label="Application purpose"
                    value={formData.appDescription}
                  />
                ) : null}
                {formData.areaboxes.includes(POLICY) ? (
                  <SummaryRow
                    label="Policy purpose"
                    value={formData.policyDescription}
                  />
                ) : null}
                {isShareholdersScope ? (
                  <SummaryRow
                    label="Counterparty"
                    value={
                      disclosedOnly
                        ? "Disclosed to Winning Bidder Only"
                        : formData.confidential
                    }
                  />
                ) : null}
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
                  value="Lump sum fixed price"
                />
              </dl>
              <ReviewSubmitFields
                formData={formData}
                handleChange={handleChange}
                onFileChange={handleSupplierFileChange}
                onDeleteFile={handleDeleteSupplierFile}
                onPreview={() => setShowPreview(true)}
                winningBidderNote={isShareholdersScope && disclosedOnly}
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
          {disclosedOnly
            ? "Disclosed to Winning Bidder Only"
            : [company.name, company.businessId, company.country]
                .filter(Boolean)
                .join(", ") || "-"}
        </Section>
        <Section title="Scope of Work">
          {formData.areaboxes && formData.areaboxes.length > 0 ? (
            <ul className="list-disc space-y-2 pl-5">
              {formData.areaboxes.map((item, idx) => {
                const displayItem =
                  item === OTHER_SUPPORT && formData.otherSupport
                    ? formData.otherSupport
                    : item;
                return (
                  <li key={idx}>
                    <p>{displayItem}</p>
                    {item === AUTHORITY_APP && formData.appDescription ? (
                      <p className="ml-4 text-sm text-black">
                        Description of purpose for notification/application:{" "}
                        {formData.appDescription}
                      </p>
                    ) : null}
                    {item === POLICY && formData.policyDescription ? (
                      <p className="ml-4 text-sm text-black">
                        Description of purpose for corporate policy:{" "}
                        {formData.policyDescription}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            "-"
          )}
        </Section>
        <Section title="Contract Price (Lump Sum Fixed Fee or Blended Hourly Rate) and Currency">
          {`Lump Sum Fixed Fee. The lump sum fixed fee does not include fees or charges possibly levied by competent authorities. Any such fees or charges will be invoiced separately. ${
            formData.currency ? `(${formData.currency})` : ""
          }`}
          <p className="mt-2 text-md">
            The Legal Service Provider shall submit all invoices to the Client
            in the contract price currency, unless otherwise instructed in
            writing by the Client.
          </p>
        </Section>
        {isShareholdersScope ? (
          <Section title="Name, Business Identity Code and Country of Domicile of Other Parties to the Shareholders' Agreement">
            {disclosedOnly
              ? "Disclosed to Winning Bidder Only"
              : formData.confidential || "-"}
            <p className="mt-2 text-xs italic">
              <strong>NOTE:</strong> If the above states &quot;Disclosed to
              Winning Bidder Only&quot;, the relevant identity or identities
              will be disclosed only to the legal service provider submitting
              the winning offer to enable that service provider to complete its
              mandatory conflict checks. If an existing conflict is then
              notified by the legal service provider to LEXIFY, the winning
              offer will automatically be disqualified and you will have the
              option to select an alternative winning offer.
            </p>
          </Section>
        ) : null}
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
