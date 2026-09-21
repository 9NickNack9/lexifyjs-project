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

const REQUEST_DRAFT_TYPE = "dataPrivacyQuestion";
const PAGE_PATH = "/contracts/data-question";
const DRAFT_EMPTY_TEXT = "No saved Data Privacy Question drafts found.";

const WIZARD_STEPS = [
  {
    id: "question",
    label: "Support needed",
    title: "Data privacy related question",
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

const PRICING_TOOLTIP =
  "A fixed fee works when the question can be stated as a defined whole and answered in a defined form — a specific question, a written opinion in response. If your question is really several questions, or if answering it requires a broader assessment first, say so in the Request: that is still fixed-fee work, but only if firms can see its extent. A question left open-ended draws offers that are not comparable, because each firm will have guessed at a different scope.\n\nAn hourly rate suits a question whose extent cannot be established in advance — where the answer is likely to raise further questions, or where the position depends on facts not yet established. You pay for the work done rather than a defined output.";

export default function DataQuestion() {
  const router = useRouter();

  const initialFormState = {
    description: "",
    pricingType: "",
    maxPrice: "",
    background: "",
    backgroundFiles: [],
    providerSource: "",
    legalPanelGroupId: "",
    offerer: "",
    providerCountry: "",
    lawyerCount: "",
    firmAge: "",
    firmRating: "",
    currency: "",
    providerReferences: "",
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
      pricingType: draft.data?.pricingType || "Hourly Rate",
      requestTitle: draft.data?.requestTitle || draft.title || "",
      providerSource: draft.data?.providerSource || "criteria",
      legalPanelGroupId: draft.data?.legalPanelGroupId || "",
      backgroundFiles: [],
      supplierFiles: [],
      agree: false,
    };
    next.retainerFee = normalizeRetainerFee(
      next.retainerFee,
      next.pricingType === "Fixed Fee",
    );
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

  const isFixedFee = formData.pricingType === "Fixed Fee";
  const selectedLanguages = selectedLanguagesFromForm(formData);
  const selectableLegalPanels = getSelectableLegalPanels(legalPanelGroups);
  const selectedLegalPanel = getSelectedLegalPanel(
    legalPanelGroups,
    formData.legalPanelGroupId,
  );
  const usingLegalPanel = formData.providerSource === "panel";
  const retainerFeeOptions = retainerFeeOptionsForNeed(isFixedFee);

  useEffect(() => {
    setFormData((prev) => {
      const nextRetainerFee = normalizeRetainerFee(
        prev.retainerFee,
        prev.pricingType === "Fixed Fee",
      );
      if (nextRetainerFee === prev.retainerFee) return prev;
      return { ...prev, retainerFee: nextRetainerFee };
    });
  }, [isFixedFee]);

  const validateStep = (step) => {
    if (step === 0) {
      if (!formData.description) {
        return {
          error: "Please type your data privacy question.",
          field: "description",
        };
      }
      if (!formData.pricingType) {
        return {
          error:
            "Choose whether offers should be a fixed fee or an hourly rate.",
          field: "pricingType",
        };
      }
      return null;
    }
    if (step === 1) return null;
    if (step === 2) {
      return validateProviderOffers(formData, {
        usingLegalPanel,
        selectedLegalPanel,
        selectedLanguages,
      });
    }
    if (step === 3) return validateReviewSubmit(formData);
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
      requestType: "Data Privacy Question",
      description: formData.description,
      additionalBackgroundInfo: formData.background,
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
        pricingType: formData.pricingType,
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
  }, [formData, selectedLanguages, selectedLegalPanel, isFixedFee]);

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
    } else if (name === "pricingType") {
      setFormData({
        ...formData,
        pricingType: value,
        retainerFee: "",
      });
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
      const paymentRate = isFixedFee
        ? "Lump sum fixed price."
        : "Blended Hourly Rate. The total price of the service will be calculated by multiplying the hourly rate with the number of hours of legal support provided by the Legal Service Provider. The offered hourly rate will be valid for 12 calendar months from the date of the LEXIFY Contract between the Client and the Legal Service Provider.";
      const panelFields = legalPanelSubmitFields({
        usingLegalPanel,
        selectedLegalPanel,
        formData,
      });

      const payload = {
        requestState: "PENDING",
        requestCategory: "Help with Personal Data Protection",
        requestSubcategory: "Specific Privacy related Question",
        scopeOfWork:
          "Legal support for the Client with the following specific data privacy related question/inquiry:" +
          formData.description,
        description: formData.description || "",
        additionalBackgroundInfo: formData.background || "",
        backgroundInfoFiles: [],
        supplierCodeOfConductFiles: [],
        ...panelFields,
        currency: formData.currency,
        paymentRate,
        advanceRetainerFee: formData.retainerFee,
        invoiceType: formData.paymentTerms,
        language: languageCSV,
        offersDeadline: formData.date,
        title: formData.requestTitle,
        dateExpired: formData.date,
        details: {
          maximumPrice: null,
          pricingType: formData.pricingType,
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
          categoryLabel="Help with Specific Data Privacy related Question"
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
              <div data-field="description">
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  Please type below the data privacy related question or inquiry
                  with which you need legal support{" "}
                  <QuestionMarkTooltip tooltipText="Please do not include any personal data in the description. This information will be visible to all legal service providers qualified to submit an offer in response to your LEXIFY Request." />
                </h4>
                <AutoGrowTextarea
                  name="description"
                  className={FIELD_CLASS}
                  onChange={handleChange}
                  value={formData.description}
                />
              </div>
              <div data-field="pricingType">
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  How would you like to receive offers for this assignment?{" "}
                  <QuestionMarkTooltip tooltipText={PRICING_TOOLTIP} />
                </h4>
                <select
                  name="pricingType"
                  className={FIELD_CLASS}
                  onChange={handleChange}
                  value={formData.pricingType}
                >
                  <option value="">Select</option>
                  <option value="Fixed Fee">
                    As a fixed fee — one pre-set aggregate price for the whole
                    work
                  </option>
                  <option value="Hourly Rate">
                    As a blended hourly rate — you pay by the hour for the work
                    done as the question develops
                  </option>
                </select>
              </div>
              {formData.pricingType === "Hourly Rate" ? (
                <div className="rounded-xl bg-[#e8f4f6] p-4 text-sm text-gray-700">
                  <p>
                    <strong>NOTE:</strong> Any offers you receive will provide
                    an applicable hourly rate only. The total price of the
                    service will be calculated by multiplying the hourly rate
                    with the number of hours of legal support provided by the
                    legal service provider submitting the winning offer. The
                    offered hourly rate will be valid for 12 calendar months
                    from the date of the LEXIFY Contract between you as the
                    legal service purchaser and the legal service provider
                    submitting the winning offer.
                  </p>
                </div>
              ) : null}
              {formData.pricingType === "Fixed Fee" ? (
                <div className="rounded-xl bg-[#e8f4f6] p-4 text-sm text-gray-700">
                  <p>
                    <strong>NOTE:</strong> Any offers you receive will be for a
                    lump sum fixed price.
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {currentStep === 1 && (
            <BackgroundFields
              formData={formData}
              onChange={handleChange}
              onFileChange={handleBackgroundFileChange}
              onDeleteFile={handleDeleteBackgroundFile}
            />
          )}

          {currentStep === 2 && (
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
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <dl className="rounded-xl border border-gray-200 px-4">
                <SummaryRow
                  label="Data privacy related question"
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
                  value={
                    isFixedFee ? "Lump sum fixed price" : "Blended hourly rate"
                  }
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
            Legal support for the Client with the following specific data
            privacy related question/inquiry:
          </p>
          <br />
          {formData.description}
        </Section>
        <Section title="Contract Price (Lump Sum Fixed Fee or Blended Hourly Rate) and Currency">
          {formData.pricingType === "Fixed Fee"
            ? `Lump Sum Fixed Fee. The lump sum fixed fee includes the preparation of the document(s) and necessary revisions on the basis of the Client's feedback to the Legal Service Provider. ${
                formData.currency ? `(${formData.currency})` : ""
              }`
            : `Blended hourly rate. The total price of the service will be calculated by multiplying the hourly rate with the number of hours of legal support provided by the Legal Service Provider. The offered hourly rate will be valid for 12 calendar months from the date of the LEXIFY Contract between the Client and the Legal Service Provider. ${
                formData.currency ? `(${formData.currency})` : ""
              }`}
          <p className="mt-2 text-md">
            The Legal Service Provider shall submit all invoices to the Client
            in the contract price currency, unless otherwise instructed in
            writing by the Client.
          </p>
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
