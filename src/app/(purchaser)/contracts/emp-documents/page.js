"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useLexiDraftPrefill from "@/hooks/useLexiDraftPrefill";
import useRequestWizardNav from "@/hooks/useRequestWizardNav";
import useRequestDrafts from "@/hooks/useRequestDrafts";
import QuestionMarkTooltip from "../../../components/QuestionmarkTooltip";
import AutoGrowTextarea from "../../../components/AutoGrowTextarea";
import RequestWizard from "@/app/components/RequestWizard";
import CheckboxOptionCards from "@/app/components/request-wizard/CheckboxOptionCards";
import SummaryRow from "@/app/components/request-wizard/SummaryRow";
import BackgroundFields from "@/app/components/request-wizard/BackgroundFields";
import ProviderOffersFields from "@/app/components/request-wizard/ProviderOffersFields";
import ReviewSubmitFields from "@/app/components/request-wizard/ReviewSubmitFields";
import {
  DraftHeaderActions,
  SaveDraftModal,
  LoadDraftModal,
} from "@/app/components/request-wizard/DraftControls";
import RequestPreviewModal, {
  PreviewSection as Section,
} from "@/app/components/request-wizard/RequestPreviewModal";
import {
  FIELD_CLASS,
  REVIEW_STEP_TOOLTIP,
  PROVIDER_REFERENCE_OPTIONS,
  retainerFeeOptionsForNeed,
  normalizeRetainerFee,
  selectedLanguagesFromForm,
  formatDeadlineDate,
  optionLabel,
  validateProviderOffers,
  validateReviewSubmit,
  eligibleFirmsSummary,
  legalPanelSubmitFields,
  getSelectableLegalPanels,
  getSelectedLegalPanel,
} from "@/lib/requestWizard";

const TEMPLATE_OPTIONS = [
  "Mutual Termination Agreement (Exit Agreement)",
  "Written Warning",
  "Termination Notice",
  "Document Templates Required to Perform Change Negotiations from Beginning to End",
  "Employment Policy (for example, a Remote Working Policy or a Company Car Policy)",
  "Other Template(s)",
];

const WIZARD_STEPS = [
  {
    id: "need",
    label: "Templates needed",
    title: "What kind of template(s) do you need?",
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
const REQUEST_DRAFT_TYPE = "employmentDocuments";
const DRAFT_EMPTY_TEXT = "No saved Employment Document Template drafts found.";

function documentTypesFromForm(formData) {
  return [
    ...formData.areaboxes.filter((item) => item !== "Other Template(s)"),
    formData.areaboxes.includes("Other Template(s)")
      ? formData.otherArea
      : null,
  ].filter(Boolean);
}

function applyDraftData(prev, draft) {
  const next = {
    ...prev,
    ...(draft.data || {}),
    requestTitle: draft.data?.requestTitle || draft.title || "",
    providerSource: draft.data?.providerSource || "criteria",
    legalPanelGroupId: draft.data?.legalPanelGroupId || "",
    areaboxes: Array.isArray(draft.data?.areaboxes) ? draft.data.areaboxes : [],
    checkboxes: Array.isArray(draft.data?.checkboxes)
      ? draft.data.checkboxes
      : [],
    backgroundFiles: [],
    supplierFiles: [],
    agree: false,
  };
  next.retainerFee = normalizeRetainerFee(next.retainerFee, true);
  return next;
}

export default function EmploymentDocs() {
  const router = useRouter();

  const initialFormState = {
    areaboxes: [],
    otherArea: "",
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

  const retainerFeeOptions = retainerFeeOptionsForNeed(true);
  const selectedLanguages = selectedLanguagesFromForm(formData);
  const selectableLegalPanels = getSelectableLegalPanels(legalPanelGroups);
  const selectedLegalPanel = getSelectedLegalPanel(
    legalPanelGroups,
    formData.legalPanelGroupId,
  );
  const usingLegalPanel = formData.providerSource === "panel";
  const documentTypes = documentTypesFromForm(formData);

  const validateStep = (step) => {
    const id = WIZARD_STEPS[step]?.id;
    if (id === "need") {
      if (formData.areaboxes.length === 0) {
        return {
          error: "Please choose at least one template.",
          field: "areaboxes",
        };
      }
      if (
        formData.areaboxes.includes("Other Template(s)") &&
        !formData.otherArea
      ) {
        return {
          error: "Please specify the 'Other' template.",
          field: "otherArea",
        };
      }
      return null;
    }
    if (id === "background") return null;
    if (id === "providers") {
      return validateProviderOffers(formData, {
        usingLegalPanel,
        selectedLegalPanel,
        selectedLanguages,
      });
    }
    if (id === "review") return validateReviewSubmit(formData);
    return null;
  };

  const wizard = useRequestWizardNav({ steps: WIZARD_STEPS, validateStep });
  const drafts = useRequestDrafts({
    requestType: REQUEST_DRAFT_TYPE,
    pagePath: "/contracts/emp-documents",
    formData,
    setFormData,
    emptyText: DRAFT_EMPTY_TEXT,
    applyDraftData,
  });
  drafts.onDraftLoadedRef.current = (skipReset) => {
    if (!skipReset) wizard.setCurrentStep(0);
    wizard.setStepError(null);
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
      requestType: "Employment Document Template",
      legalArea: [
        ...(formData.areaboxes || []).filter((x) => x !== "Other"),
        formData.otherArea || null,
      ].filter(Boolean),
      additionalBackgroundInfo: formData.background,
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
    wizard.setStepError(null);
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
        setFormData({ ...formData, [name]: value });
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
    if (wizard.currentStep < WIZARD_STEPS.length - 1) {
      wizard.goNext();
      return;
    }

    const err = wizard.showFirstInvalidStep();
    if (err) {
      alert(err);
      return;
    }

    setSubmitting(true);
    try {
      const languageCSV = selectedLanguagesFromForm(formData).join(", ");
      const scope = documentTypesFromForm(formData).join(", ");
      const payload = {
        requestState: "PENDING",
        requestCategory: "Help with Employment related Documents",
        requestSubcategory: "Employment related Document Templates",
        scopeOfWork:
          "Preparation of the following employment related document templates for the Client: " +
          scope,
        description: scope,
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
          (json && (json.error || json.message)) ||
            text ||
            "Failed to create request.",
        );
      }

      alert("LEXIFY Request submitted successfully.");
      drafts.clearDraftGuard();
      router.push("/main");
    } catch (e2) {
      alert(e2.message || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <form ref={wizard.formRef} onSubmit={handleSubmit} noValidate>
        <RequestWizard
          categoryLabel="Help with Employment related Document Templates"
          steps={WIZARD_STEPS}
          currentStep={wizard.currentStep}
          onStepClick={wizard.goToStep}
          onNext={() =>
            wizard.goNext({
              onLastStep: () => wizard.formRef.current?.requestSubmit(),
            })
          }
          onBack={wizard.goBack}
          onCancel={handleCancel}
          nextLabel={
            wizard.currentStep === WIZARD_STEPS.length - 1
              ? submitting
                ? "Submitting…"
                : "Submit LEXIFY Request"
              : "Next"
          }
          nextDisabled={submitting}
          error={wizard.stepError}
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
          {WIZARD_STEPS[wizard.currentStep]?.id === "need" ? (
            <div className="space-y-4">
              <CheckboxOptionCards
                options={TEMPLATE_OPTIONS}
                selected={formData.areaboxes}
                onToggle={(value) => {
                  wizard.setStepError(null);
                  setFormData((prev) => ({
                    ...prev,
                    areaboxes: prev.areaboxes.includes(value)
                      ? prev.areaboxes.filter((item) => item !== value)
                      : [...prev.areaboxes, value],
                  }));
                }}
              />
              {formData.areaboxes.includes("Other Template(s)") ? (
                <div data-field="otherArea">
                  <AutoGrowTextarea
                    name="otherArea"
                    placeholder="Please Specify"
                    className={FIELD_CLASS}
                    value={formData.otherArea}
                    onChange={handleChange}
                  />
                </div>
              ) : null}
              <div className="rounded-xl bg-[#e8f4f6] p-4 text-sm text-gray-700">
                <p>
                  <strong>NOTE: </strong>
                  Any offers you receive will be for a lump sum fixed price and
                  include the preparation of the document(s) and necessary
                  revisions on the basis of your feedback to the legal service
                  provider.
                </p>
              </div>
            </div>
          ) : null}

          {WIZARD_STEPS[wizard.currentStep]?.id === "background" ? (
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

          {WIZARD_STEPS[wizard.currentStep]?.id === "providers" ? (
            <ProviderOffersFields
              formData={formData}
              setFormData={setFormData}
              handleChange={handleChange}
              setStepError={wizard.setStepError}
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

          {WIZARD_STEPS[wizard.currentStep]?.id === "review" ? (
            <div className="space-y-6">
              <dl className="rounded-xl border border-gray-200 px-4">
                <SummaryRow
                  label="Document template(s) needed"
                  value={documentTypes}
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
          <p>
            Preparation of the following employment related document templates
            for the Client:
          </p>
          {formData.areaboxes && formData.areaboxes.length > 0 ? (
            <>
              {[...formData.areaboxes]
                .map((item) =>
                  item === "Other Template(s)" && formData.otherArea
                    ? `${formData.otherArea}`
                    : item,
                )
                .join(", ")}
            </>
          ) : (
            "-"
          )}
        </Section>

        <Section title="Contract Price (Lump Sum Fixed Fee or Blended Hourly Rate) and Currency">
          {`Lump Sum Fixed Fee. The lump sum fixed fee includes the preparation of the document(s) and necessary revisions on the basis of the Client's feedback to the Legal Service Provider. ${
            formData.currency ? `(${formData.currency})` : ""
          }`}
          <p className="text-md mt-2">
            The Legal Service Provider shall submit all invoices to the Client
            in the contract price currency, unless otherwise instructed in
            writing by the Client.
          </p>
        </Section>

        <Section title="Additional Background Information Provided by Client">
          <p>{formData.background || "-"}</p>
          {formData.backgroundFiles.length > 0 ? (
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
          ) : null}
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
    </>
  );
}
