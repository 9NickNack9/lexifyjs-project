"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useLexiDraftPrefill from "@/hooks/useLexiDraftPrefill";
import useRequestWizardNav from "@/hooks/useRequestWizardNav";
import useRequestDrafts from "@/hooks/useRequestDrafts";
import QuestionMarkTooltip from "../../../components/QuestionmarkTooltip";
import AutoGrowTextarea from "../../../components/AutoGrowTextarea";
import RequestWizard from "@/app/components/RequestWizard";
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
  DEFAULT_WIZARD_STEPS,
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

const WIZARD_STEPS = DEFAULT_WIZARD_STEPS.filter((step) => step.id !== "need");
const REQUEST_DRAFT_TYPE = "sourcingNegotiation";
const DRAFT_EMPTY_TEXT = "No saved Sourcing Negotiation drafts found.";
const SCOPE_OF_WORK =
  "Legal support with negotiating a sourcing agreement. The legal support can include, for example, commenting on sourcing agreement documentation or legal advice during different stages of the negotiation process.";
const SCOPE_TITLE = "Legal support with negotiating a sourcing agreement";

function applyDraftData(prev, draft) {
  const next = {
    ...prev,
    ...(draft.data || {}),
    requestTitle: draft.data?.requestTitle || draft.title || "",
    providerSource: draft.data?.providerSource || "criteria",
    legalPanelGroupId: draft.data?.legalPanelGroupId || "",
    confboxes: Array.isArray(draft.data?.confboxes) ? draft.data.confboxes : [],
    checkboxes: Array.isArray(draft.data?.checkboxes)
      ? draft.data.checkboxes
      : [],
    backgroundFiles: [],
    supplierFiles: [],
    agree: false,
  };
  next.retainerFee = normalizeRetainerFee(next.retainerFee, false);
  return next;
}

export default function SourcingNegotiation() {
  const router = useRouter();

  const initialFormState = {
    negotiationType: "",
    confidential: "",
    confboxes: [],
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

  const retainerFeeOptions = retainerFeeOptionsForNeed(false);
  const selectedLanguages = selectedLanguagesFromForm(formData);
  const selectableLegalPanels = getSelectableLegalPanels(legalPanelGroups);
  const selectedLegalPanel = getSelectedLegalPanel(
    legalPanelGroups,
    formData.legalPanelGroupId,
  );
  const usingLegalPanel = formData.providerSource === "panel";

  const validateStep = (step) => {
    const id = WIZARD_STEPS[step]?.id;
    if (id === "company") {
      if (!String(formData.confidential || "").trim()) {
        return {
          error:
            "Please provide the name, business identity code and country of domicile of the supplier.",
          field: "confidential",
        };
      }
      return null;
    }
    if (id === "background") {
      if (!formData.description) {
        return {
          error: "Please provide the brief description.",
          field: "description",
        };
      }
      if (!formData.priceRange) {
        return {
          error: "Please select the expected value of the contract.",
          field: "priceRange",
        };
      }
      if (!formData.negotiationType) {
        return {
          error: "Please select negotiation template type.",
          field: "negotiationType",
        };
      }
      return null;
    }
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
    pagePath: "/contracts/sourcing-negotiation",
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
      requestType: "Sourcing Negotiation",
      negotiationType: formData.negotiationType,
      description: formData.description,
      additionalBackgroundInfo: formData.background,
      confidentialCounterpartyInfo: formData.confidential,
      priceRange: formData.priceRange,
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
    wizard.setStepError(null);
    if (type === "checkbox") {
      if (name === "agree") {
        setFormData({ ...formData, agree: checked });
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
      const payload = {
        requestState: "PENDING",
        requestCategory: "Help with Contracts",
        requestSubcategory: "Sourcing",
        assignmentType: "Support with sourcing agreement negotiations",
        scopeOfWork: SCOPE_OF_WORK,
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
        paymentRate:
          "Blended Hourly Rate. The total price of the service will be calculated by multiplying the hourly rate with the number of hours of legal support provided by the Legal Service Provider. The hourly rate offered by the Legal Service Provider will be valid until the sourcing agreement has been signed or abandoned, whichever comes first.",
        advanceRetainerFee: formData.retainerFee,
        invoiceType: formData.paymentTerms,
        language: languageCSV,
        offersDeadline: formData.date,
        title: formData.requestTitle,
        dateExpired: formData.date,
        details: {
          negotiationTemplate: formData.negotiationType || "",
          confidential: formData.confboxes.includes(
            "Disclosed to Winning Bidder Only",
          )
            ? "Yes"
            : "No",
          winnerBidderOnlyStatus: (formData.confidential || "").trim(),
          expectedValue: formData.priceRange || "",
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

  const supplierValue = formData.confboxes.includes(
    "Disclosed to Winning Bidder Only",
  )
    ? "Disclosed to Winning Bidder Only"
    : formData.confidential;

  return (
    <>
      <form ref={wizard.formRef} onSubmit={handleSubmit} noValidate>
        <RequestWizard
          categoryLabel="Help with Negotiating a Sourcing Agreement"
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
          {WIZARD_STEPS[wizard.currentStep]?.id === "company" ? (
            <div className="space-y-6">
              <div data-field="confidential">
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  Please provide the name, business identity code and country of
                  domicile of the supplier with whom you are negotiating the
                  agreement. If you do not want your name and the name of the
                  supplier to be visible to all legal service providers
                  qualified to make you an offer, please also check the box
                  &quot;Disclosed to Winning Bidder Only&quot;
                  <QuestionMarkTooltip tooltipText="If 'Disclosed to Winning Bidder Only' is checked, your identity and the identity of your supplier will be disclosed solely to the legal service provider that submitted the winning offer, to enable that provider to conduct mandatory conflict checks. If the legal service provider notifies LEXIFY of an existing conflict, the winning offer will automatically be disqualified, and you will have the option to select an alternative winning offer." />
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
                    checked={formData.confboxes.includes(
                      "Disclosed to Winning Bidder Only",
                    )}
                    onChange={handleChange}
                    className="accent-[#11999e]"
                  />
                  Disclosed to Winning Bidder Only
                  <QuestionMarkTooltip tooltipText="Please note that checking “Disclosed to Winning Bidder Only” may cause additional delay in the processing of your LEXIFY Request as statutory conflict checks are postponed until the winning offer has been verified." />
                </label>
              </div>
            </div>
          ) : null}

          {WIZARD_STEPS[wizard.currentStep]?.id === "background" ? (
            <div className="space-y-6">
              <div data-field="description">
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  Please provide a brief description of the product or service
                  you are buying with the agreement under negotiation
                  <QuestionMarkTooltip tooltipText="Please do not include any personal data in the description. This information will be visible to all legal service providers qualified to submit an offer in response to your LEXIFY Request." />
                </h4>
                <AutoGrowTextarea
                  name="description"
                  className={FIELD_CLASS}
                  onChange={handleChange}
                  value={formData.description}
                />
                <div className="mt-4 rounded-xl bg-[#e8f4f6] p-4 text-sm text-gray-700">
                  <p>
                    <strong>NOTE: </strong>
                    Any offers you receive will provide for occasional legal
                    support during the negotiation process as needed (for
                    example, commenting on agreement documentation or legal
                    advice during different stages of the negotiation process).
                    Any offers you receive will include an applicable hourly
                    rate only. The total price of the service will be calculated
                    by multiplying the hourly rate with the number of hours of
                    legal support provided by the legal service provider
                    submitting the winning offer. The offered hourly rate will
                    be valid until the sourcing agreement has been signed or
                    abandoned, whichever comes first.
                  </p>
                </div>
              </div>

              <div data-field="priceRange">
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  What is the the expected value of the contract?
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

              <div data-field="negotiationType">
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  Is the sourcing agreement being negotiated on your own
                  contract template or the supplier&apos;s template?
                  <QuestionMarkTooltip tooltipText="This information will be visible to all legal service providers qualified to submit an offer in response to your LEXIFY Request." />
                </h4>
                <select
                  name="negotiationType"
                  className={FIELD_CLASS}
                  onChange={handleChange}
                  value={formData.negotiationType}
                >
                  <option value="">Select</option>
                  <option value="My contract template">
                    My contract template
                  </option>
                  <option value="Supplier's contract template">
                    Supplier&apos;s contract template
                  </option>
                </select>
              </div>

              <BackgroundFields
                formData={formData}
                onChange={handleChange}
                onFileChange={handleBackgroundFileChange}
                onDeleteFile={handleDeleteBackgroundFile}
                heading={
                  <>
                    Please provide additional background information, if any,
                    you wish to share with legal service providers in your
                    LEXIFY Request. If you want, you can also upload a separate
                    file with additional background information by clicking
                    “Upload Background Info”
                    <QuestionMarkTooltip tooltipText="Please do not include any personal data in the description. Any background information provided will be visible to all legal service providers qualified to submit an offer in response to your LEXIFY Request." />
                  </>
                }
              />
            </div>
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
              isFixedFee={false}
            />
          ) : null}

          {WIZARD_STEPS[wizard.currentStep]?.id === "review" ? (
            <div className="space-y-6">
              <dl className="rounded-xl border border-gray-200 px-4">
                <SummaryRow label="Scope of work" value={SCOPE_TITLE} />
                <SummaryRow label="Supplier" value={supplierValue} />
                <SummaryRow
                  label="Product or service"
                  value={formData.description}
                />
                <SummaryRow
                  label="Expected value"
                  value={formData.priceRange}
                />
                <SummaryRow
                  label="Contract template used"
                  value={formData.negotiationType}
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
                <SummaryRow label="Pricing model" value="Blended hourly rate" />
              </dl>
              <ReviewSubmitFields
                formData={formData}
                handleChange={handleChange}
                onFileChange={handleSupplierFileChange}
                onDeleteFile={handleDeleteSupplierFile}
                onPreview={() => setShowPreview(true)}
                winningBidderNote
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
          {formData.confboxes.includes("Disclosed to Winning Bidder Only")
            ? "Disclosed to Winning Bidder Only"
            : [company.name, company.businessId, company.country]
                .filter(Boolean)
                .join(", ") || "-"}
        </Section>

        <Section title="Scope of Work">
          Legal support with negotiating a sourcing agreement.
          <br />
          The legal support can include, for example, commenting on sourcing
          agreement documentation or legal advice during different stages of the
          negotiation process.
        </Section>

        <Section title="Contract Price (Lump Sum Fixed Fee or Blended Hourly Rate) and Currency">
          Blended hourly rate. The total price of the service will be calculated
          by multiplying the hourly rate with the number of hours of legal
          support provided by the Legal Service Provider. The hourly rate
          offered by the Legal Service Provider will be valid until the sourcing
          agreement has been signed or abandoned, whichever comes first.{" "}
          {formData.currency ? `(${formData.currency})` : ""}
          <p className="text-md mt-2">
            The Legal Service Provider shall submit all invoices to the Client
            in the contract price currency, unless otherwise instructed in
            writing by the Client.
          </p>
        </Section>

        <Section title="Description of the Product or Service the Client is Buying with the Sourcing Agreement under Negotiation">
          <p>{formData.description || "-"}</p>
        </Section>

        <Section title="Name, Business Identity Code and Country of Domicile of Client's Counterparty in the Matter">
          {formData.confboxes.includes("Disclosed to Winning Bidder Only")
            ? "Disclosed to Winning Bidder Only"
            : formData.confidential || "-"}
          <p className="text-xs mt-2 italic">
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

        <Section title="Expected Value of the Sourcing Agreement Under Negotiation">
          <p>{formData.priceRange || "-"}</p>
        </Section>

        <Section title="Is the Sourcing Agreement Negotiated on the Client's Contract Template or the Counterparty's Contract Template? ">
          <p>{formData.negotiationType || "-"}</p>
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
