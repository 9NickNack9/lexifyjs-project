"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useLexiDraftPrefill from "@/hooks/useLexiDraftPrefill";
import useRequestDrafts from "@/hooks/useRequestDrafts";
import useRequestWizardNav from "@/hooks/useRequestWizardNav";
import RequestWizard from "@/app/components/RequestWizard";
import AutoGrowTextarea from "@/app/components/AutoGrowTextarea";
import QuestionMarkTooltip from "@/app/components/QuestionmarkTooltip";
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

const REQUEST_DRAFT_TYPE = "legalTraining";
const PAGE_PATH = "/requests/legal-training";
const DRAFT_EMPTY_TEXT = "No saved Legal Training drafts found.";

const WIZARD_STEPS = [
  {
    id: "details",
    label: "Legal training details",
    title: "Training details",
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

const initialFormState = {
  trainDateSelect: "",
  trainDate: "",
  otherDate: "",
  trainDuration: "",
  otherDuration: "",
  trainLocation: "",
  specificLocation: "",
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

function getCurrentDateTime() {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(Date.now() - tzOffset).toISOString().slice(0, 16);
}

function formatDateTimeDDMMYYYYHHMM(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const dd = String(parsed.getDate()).padStart(2, "0");
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const yyyy = parsed.getFullYear();
  const hh = String(parsed.getHours()).padStart(2, "0");
  const min = String(parsed.getMinutes()).padStart(2, "0");
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
}

export default function LegalTraining() {
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
  const trainingDuration =
    formData.trainDuration === "Other"
      ? formData.otherDuration
      : formData.trainDuration;
  const trainingDateTime =
    formData.trainDateSelect === "On a specific date and time already known"
      ? formData.trainDate
      : "Date and time to be confirmed later";
  const trainingLocation =
    formData.trainLocation === "Face to face at a specific location"
      ? formData.specificLocation || ""
      : formData.trainLocation || "";

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
      requestType: "Legal Training",
      description: formData.description,
      additionalBackgroundInfo: formData.background,
      trainingDetails: {
        trainDateSelect: formData.trainDateSelect,
        trainDate: formData.trainDate,
        otherDate: formData.otherDate,
        trainDuration: formData.trainDuration,
        otherDuration: formData.otherDuration,
        trainLocation: formData.trainLocation,
        specificLocation: formData.specificLocation,
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
      if (!formData.description) {
        return {
          error: "Please describe the training topics.",
          field: "description",
        };
      }
      if (!formData.trainDuration) {
        return {
          error: "Please choose the training duration.",
          field: "trainDuration",
        };
      }
      if (formData.trainDuration === "Other" && !formData.otherDuration) {
        return {
          error: "Please specify the duration.",
          field: "otherDuration",
        };
      }
      if (!formData.trainDateSelect) {
        return {
          error: "Please choose when the training takes place.",
          field: "trainDateSelect",
        };
      }
      if (
        formData.trainDateSelect ===
          "On a specific date and time already known" &&
        !formData.trainDate
      ) {
        return {
          error: "Please set the training date and time.",
          field: "trainDate",
        };
      }
      if (!formData.trainLocation) {
        return {
          error: "Please choose how the training takes place.",
          field: "trainLocation",
        };
      }
      if (
        formData.trainLocation === "Face to face at a specific location" &&
        !formData.specificLocation
      ) {
        return {
          error: "Please specify the training location.",
          field: "specificLocation",
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
      const details = {
        trainingDuration,
        trainingDateTime,
        trainingLocation,
        maximumPrice: null,
      };

      const payload = {
        requestState: "PENDING",
        requestCategory: "Legal Training for Management and/or Personnel",
        scopeOfWork:
          "Legal training regarding specific topic(s) for personnel of the Client. Further details regarding the training to be given by the Legal Service Provider: Topics to be covered by the training: " +
          formData.description +
          "," +
          " Duration of the training: " +
          trainingDuration +
          "," +
          " Date and time of the training(yyyy-mm-dd): " +
          trainingDateTime +
          "," +
          " Location of the training: " +
          trainingLocation,
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
        details,
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

  const reviewTrainingDate =
    formData.trainDateSelect === "Date and time to be confirmed later"
      ? "Date and time to be confirmed later"
      : formData.trainDateSelect === "On a specific date and time already known"
        ? formatDateTimeDDMMYYYYHHMM(formData.trainDate)
        : "";

  return (
    <>
      <form ref={formRef} onSubmit={handleSubmit} noValidate>
        <RequestWizard
          categoryLabel="Help with Legal Training for Personnel"
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
              <div data-field="description">
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  What legal topic(s) do you want the training to cover?{" "}
                  <QuestionMarkTooltip tooltipText="Please do not include any personal data in the description. This information will be visible to all legal service providers qualified to submit an offer in response to your LEXIFY Request." />
                </h4>
                <AutoGrowTextarea
                  name="description"
                  className={FIELD_CLASS}
                  onChange={handleChange}
                  value={formData.description}
                />
              </div>
              <div data-field="trainDuration">
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  How comprehensive do you want the training to be (duration of
                  the training)?
                </h4>
                <select
                  name="trainDuration"
                  className={FIELD_CLASS}
                  onChange={handleChange}
                  value={formData.trainDuration}
                >
                  <option value="">Select</option>
                  <option value="1 hour">1 hour</option>
                  <option value="2 hours">2 hours</option>
                  <option value="4 hours">4 hours</option>
                  <option value="1 full day">1 full day</option>
                  <option value="2 full days">2 full days</option>
                  <option value="Other">Other</option>
                </select>
                {formData.trainDuration === "Other" ? (
                  <input
                    type="text"
                    name="otherDuration"
                    placeholder="Please specify"
                    className={`${FIELD_CLASS} mt-3`}
                    value={formData.otherDuration}
                    onChange={handleChange}
                  />
                ) : null}
              </div>
              <div data-field="trainDateSelect">
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  When will the training take place?
                </h4>
                <select
                  name="trainDateSelect"
                  className={FIELD_CLASS}
                  value={formData.trainDateSelect}
                  onChange={handleChange}
                >
                  <option value="">Select</option>
                  <option value="On a specific date and time already known">
                    On a specific date and time already known
                  </option>
                  <option value="Date and time to be confirmed later">
                    Date and time to be confirmed later
                  </option>
                </select>
                {formData.trainDateSelect ===
                "On a specific date and time already known" ? (
                  <div className="mt-4" data-field="trainDate">
                    <h4 className="mb-2 text-sm font-semibold text-gray-900">
                      Please confirm the training date and time
                    </h4>
                    <input
                      type="datetime-local"
                      name="trainDate"
                      className={`${FIELD_CLASS} max-w-xs`}
                      value={formData.trainDate}
                      min={getCurrentDateTime()}
                      onChange={handleChange}
                    />
                  </div>
                ) : null}
              </div>
              <div data-field="trainLocation">
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  How will the training take place?
                </h4>
                <select
                  name="trainLocation"
                  className={FIELD_CLASS}
                  onChange={handleChange}
                  value={formData.trainLocation}
                >
                  <option value="">Select</option>
                  <option value="Face to face at a specific location">
                    Face to face at a specific location
                  </option>
                  <option value="Remotely (for example, over Microsoft Teams)">
                    Remotely (for example, over Microsoft Teams)
                  </option>
                </select>
                {formData.trainLocation ===
                "Face to face at a specific location" ? (
                  <input
                    type="text"
                    name="specificLocation"
                    placeholder="Specify location"
                    className={`${FIELD_CLASS} mt-3`}
                    value={formData.specificLocation}
                    onChange={handleChange}
                  />
                ) : null}
              </div>
              <div className="rounded-xl bg-[#e8f4f6] p-4 text-sm text-gray-700">
                <p>
                  <strong>NOTE: </strong>
                  {LUMP_SUM_NOTE}
                </p>
              </div>
            </div>
          ) : null}

          {currentStep === 1 ? (
            <BackgroundFields
              formData={formData}
              onChange={handleChange}
              onFileChange={handleBackgroundFileChange}
              onDeleteFile={handleDeleteBackgroundFile}
              heading={
                <>
                  Please provide additional background information, if any, you
                  wish to share with legal service providers in your LEXIFY
                  Request (for example, you can specify what occupational group
                  the audience represents and how many participants are
                  expected). If you want, you can also upload a separate file
                  with additional background information by clicking “Upload
                  Background Info”
                  <QuestionMarkTooltip tooltipText="Please do not include any personal data in the description. Any background information provided will be visible to all legal service providers qualified to submit an offer in response to your LEXIFY Request." />
                </>
              }
            />
          ) : null}

          {currentStep === 2 ? (
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

          {currentStep === 3 ? (
            <div className="space-y-6">
              <dl className="rounded-xl border border-gray-200 px-4">
                <SummaryRow
                  label="Topic(s) of legal training needed"
                  value={formData.description}
                />
                <SummaryRow
                  label="Training duration"
                  value={trainingDuration}
                />
                <SummaryRow label="Training date" value={reviewTrainingDate} />
                <SummaryRow
                  label="Training location"
                  value={trainingLocation}
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
          <p className="mt-2 text-md">
            Legal training regarding specific topic(s) for personnel of the
            Client.
          </p>
          <br />
          <p className="mt-2 text-md underline">
            Further details regarding the training to be given by the Legal
            Service Provider:
          </p>
          <p className="mt-2 text-md">
            Topics to be covered by the training: {formData.description || "-"}
          </p>
          <p className="mt-2 text-md">
            Duration of the training: {trainingDuration || "-"}
          </p>
          <p className="mt-2 text-md">
            Date and time of the training(dd.mm.yyyy hh:mm):{" "}
            {formData.trainDateSelect === "Date and time to be confirmed later"
              ? "Date and time to be confirmed later"
              : formData.trainDateSelect ===
                  "On a specific date and time already known"
                ? formatDateTimeDDMMYYYYHHMM(formData.trainDate) || "-"
                : "-"}
          </p>
          <p className="mt-2 text-md">
            Location of the training: {trainingLocation || "-"}
          </p>
        </Section>
        <Section title="Contract Price (Lump Sum Fixed Fee or Blended Hourly Rate) and Currency">
          {`Lump Sum Fixed Fee. ${
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
            by the Client to the Legal Service Provider submitting the winning
            offer within 14 days of the date of the LEXIFY Contract between the
            Client and the Legal Service Provider. The advance retainer fee
            forms a part of the total price of the legal service as offered by
            the Legal Service Provider.
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
