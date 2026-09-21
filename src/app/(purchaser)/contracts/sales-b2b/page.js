"use client";

import { useEffect, useRef, useState } from "react";
import useLexiDraftPrefill from "@/hooks/useLexiDraftPrefill";
import { useRouter, useSearchParams } from "next/navigation";
import QuestionMarkTooltip from "../../../components/QuestionmarkTooltip";
import AutoGrowTextarea from "../../../components/AutoGrowTextarea";
import RequestWizard from "../../../components/RequestWizard";
import RequestPreviewModal, {
  PreviewSection as Section,
} from "@/app/components/request-wizard/RequestPreviewModal";

const NEED_TEMPLATE =
  "A sales contract template for the client's B2B business. The work includes preparation of the template documentation, necessary revisions based on client feedback and all related attorney-client communication.";
const NEED_REVIEW_TEMPLATE =
  "Legal review of a contract template sent by a customer of the client and possible further assistance during later negotiation rounds.";
const NEED_REVIEW_COMMENTS =
  "Legal review of comments from a customer of the client on the client's contract template and possible further assistance during later negotiation rounds.";

const HOURLY_RATE_NOTE =
  "Any offers you receive will provide an applicable hourly rate only. The total price of the service will be calculated by multiplying the hourly rate with the number of hours of legal support provided by the legal service provider submitting the winning offer. The offered hourly rate will be valid until the relevant customer contract has been signed or abandoned, whichever comes first.";

const NEED_OPTIONS = [
  {
    value: NEED_TEMPLATE,
    title: "I need a sales contract template for my B2B business",
    pricing: "Lump sum fixed price",
    note: "Any offers you receive will be for a lump sum fixed price.",
    tooltip:
      "Any offers you receive will include the preparation of the document(s) and necessary revisions on the basis of your feedback to the legal service provider.",
    icon: "template",
  },
  {
    value: NEED_REVIEW_TEMPLATE,
    title:
      "I need a legal review of a contract template sent by a customer and possible further assistance during later negotiation rounds",
    pricing: "Blended hourly rate",
    note: HOURLY_RATE_NOTE,
    icon: "review",
  },
  {
    value: NEED_REVIEW_COMMENTS,
    title:
      "I need a legal review of a customer's comments on my own contract template and possible further assistance during later negotiation rounds",
    pricing: "Blended hourly rate",
    note: HOURLY_RATE_NOTE,
    icon: "comments",
  },
];

const WIZARD_STEPS = [
  { id: "need", label: "Support needed", title: "What do you need?" },
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
    tooltip:
      'This page shows all data related to this LEXIFY Request, including the criteria you have set for eligible law firms. The eligibility criteria are never disclosed to law firms. Check that all information is correct before submitting — once the Request is submitted, firms begin reviewing it and preparing offers.\n\nTo see the LEXIFY Request as firms will see it on the marketplace, click the "Preview" button at the end of the page.',
  },
];

const FIELD_CLASS =
  "w-full border border-gray-200 rounded-lg p-3 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#11999e]/30 focus:border-[#11999e]";

function NeedIcon({ type }) {
  const className = "h-5 w-5";
  if (type === "review") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className={className}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3.5 4.75 6.75v5.4c0 4.05 2.95 7.85 7.25 8.85 4.3-1 7.25-4.8 7.25-8.85v-5.4L12 3.5Z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
      </svg>
    );
  }
  if (type === "comments") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className={className}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.5 18.5 4.5 21V7.5A2.5 2.5 0 0 1 7 5h10a2.5 2.5 0 0 1 2.5 2.5v8A2.5 2.5 0 0 1 17 18H7.5Z"
        />
        <path strokeLinecap="round" d="M8.5 10h7M8.5 13.5h4.5" />
      </svg>
    );
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 3.75h7.5L19.5 8.75V20.25A1.5 1.5 0 0 1 18 21.75H7A1.5 1.5 0 0 1 5.5 20.25V5.25A1.5 1.5 0 0 1 7 3.75Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.5 3.75V8.75H19.5M8.5 12.75h7M8.5 16.25h5"
      />
    </svg>
  );
}

function SummaryRow({ label, value }) {
  const items = Array.isArray(value)
    ? value
        .flat(Infinity)
        .map((item) => (item == null ? "" : String(item).trim()))
        .filter(Boolean)
    : null;

  return (
    <div className="grid gap-1 border-b border-gray-100 py-3 sm:grid-cols-[220px_1fr] sm:gap-4">
      <dt className="text-sm font-semibold text-gray-500">{label}</dt>
      <dd className="text-sm whitespace-pre-wrap text-gray-900">
        {items ? (
          items.length ? (
            <ul className="list-disc space-y-1 pl-5">
              {items.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          ) : (
            "—"
          )
        ) : (
          value || "—"
        )}
      </dd>
    </div>
  );
}

function formatDeadlineDate(value) {
  if (!value) return "";
  const [year, month, day] = String(value).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function stripYesNoPrefix(text) {
  if (!text) return "";
  const stripped = String(text)
    .replace(/^(yes|no),\s*/i, "")
    .replace(/\s+/g, " ")
    .replace(/\.+$/, "")
    .trim();
  if (!stripped) return String(text).trim();
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

function optionLabel(options, value) {
  if (!value) return "";
  const match = options.find((option) => option.value === value);
  return stripYesNoPrefix(match?.label || value);
}

const OFFERER_OPTIONS = [
  { value: "Attorneys-at-law", label: "Attorneys-at-law" },
  { value: "Law firms", label: "Law firms" },
  { value: "All", label: "Both attorneys-at-law & law firms" },
];

const PROVIDER_COUNTRY_OPTIONS = [
  {
    value: "Yes, I want offers from domestic legal service providers only.",
    label: "Yes, I want offers from domestic legal service providers only.",
  },
  {
    value:
      "No, I want offers from both domestic and foreign legal service providers.",
    label:
      "No, I want offers from both domestic and foreign legal service providers.",
  },
];

const LAWYER_COUNT_OPTIONS = [
  {
    value: "Any size",
    label: "No, the legal service provider can be of any size",
  },
  {
    value: "5",
    label: "Yes, the legal service provider must employ at least 5 lawyers",
  },
  {
    value: "15",
    label: "Yes, the legal service provider must employ at least 15 lawyers",
  },
  {
    value: "40",
    label: "Yes, the legal service provider must employ at least 40 lawyers",
  },
];

const FIRM_AGE_OPTIONS = [
  {
    value: "Any age",
    label: "No, the legal service provider can be of any age",
  },
  {
    value: "5",
    label:
      "Yes, the legal service provider has been in operation for at least 5 years",
  },
  {
    value: "10",
    label:
      "Yes, the legal service provider has been in operation for at least 10 years",
  },
  {
    value: "25",
    label:
      "Yes, the legal service provider has been in operation for at least 25 years",
  },
];

const FIRM_RATING_OPTIONS = [
  { value: "Any rating", label: "No" },
  { value: "3", label: "Yes, average rating of at least 3/5" },
  { value: "4", label: "Yes, average rating of at least 4/5" },
];

const PROVIDER_REFERENCE_OPTIONS = [
  { value: "No", label: "No" },
  {
    value: "Yes, 1 written reference must be provided",
    label: "Yes, 1 written reference must be provided",
  },
  {
    value: "Yes, 2 written references must be provided",
    label: "Yes, 2 written references must be provided",
  },
];

const RETAINER_FEE_FIXED_OPTIONS = [
  { value: "No", label: "No" },
  {
    value: "Yes, 10% of the lump sum price",
    label: "Yes, 10% of the lump sum price",
  },
  {
    value: "Yes, 25% of the lump sum price",
    label: "Yes, 25% of the lump sum price",
  },
  {
    value: "Yes, 50% of the lump sum price",
    label: "Yes, 50% of the lump sum price",
  },
];

const RETAINER_FEE_HOURLY_OPTIONS = [
  { value: "No", label: "No" },
  {
    value: "Yes, the offered hourly rate multiplied by 3",
    label: "Yes, the offered hourly rate multiplied by 3",
  },
  {
    value: "Yes, the offered hourly rate multiplied by 5",
    label: "Yes, the offered hourly rate multiplied by 5",
  },
  {
    value: "Yes, the offered hourly rate multiplied by 10",
    label: "Yes, the offered hourly rate multiplied by 10",
  },
];

function retainerFeeOptionsForNeed(isFixedFee) {
  return isFixedFee ? RETAINER_FEE_FIXED_OPTIONS : RETAINER_FEE_HOURLY_OPTIONS;
}

function normalizeRetainerFee(value, isFixedFee) {
  if (!value) return value;
  const options = retainerFeeOptionsForNeed(isFixedFee);
  if (options.some((option) => option.value === value)) return value;

  const isFifty = value.includes("50%") || value.includes("multiplied by 10");
  const isTwentyFive =
    value.includes("25%") || value.includes("multiplied by 5");
  const isTen = value.includes("10%") || value.includes("multiplied by 3");

  if (isFifty) return options[3].value;
  if (isTwentyFive) return options[2].value;
  if (isTen) return options[1].value;
  if (value === "No") return "No";
  return "";
}

function getComparableDraftData(data) {
  const { backgroundFiles, supplierFiles, agree, ...draftData } = data || {};

  return {
    ...draftData,
    backgroundFiles: [],
    supplierFiles: [],
    agree: false,
  };
}

function snapshotDraftData(data) {
  return JSON.stringify(getComparableDraftData(data));
}

const UNSAVED_LOADED_DRAFT_MESSAGE =
  'You have unsaved changes to the draft. If you leave without clicking "Save Changes", those changes will be lost.';

export default function SalesB2B() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialFormState = {
    need: "",
    description: "",
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

  const [showLoadDraftModal, setShowLoadDraftModal] = useState(false);
  const [showSaveDraftModal, setShowSaveDraftModal] = useState(false);
  const [draftTitleInput, setDraftTitleInput] = useState("");
  const [draftSaveError, setDraftSaveError] = useState("");
  const [loadedDraft, setLoadedDraft] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftActionLoading, setDraftActionLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepError, setStepError] = useState(null);
  const [pendingScrollField, setPendingScrollField] = useState(null);
  const formRef = useRef(null);
  const skipDraftStepResetRef = useRef(false);
  const draftSnapshotRef = useRef(null);
  const isLoadedDraftDirtyRef = useRef(false);

  const REQUEST_DRAFT_TYPE = "salesB2b";
  const DRAFT_EMPTY_TEXT = "No saved Sales B2B drafts found.";

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

  const applyLoadedDraft = (draft) => {
    setFormData((prev) => {
      const next = {
        ...prev,
        ...draft.data,
        requestTitle: draft.data?.requestTitle || draft.title || "",
        providerSource: draft.data?.providerSource || "criteria",
        legalPanelGroupId: draft.data?.legalPanelGroupId || "",
        backgroundFiles: [],
        supplierFiles: [],
        agree: false,
      };
      next.retainerFee = normalizeRetainerFee(
        next.retainerFee,
        next.need === NEED_TEMPLATE,
      );
      draftSnapshotRef.current = snapshotDraftData(next);
      isLoadedDraftDirtyRef.current = false;
      return next;
    });
    setLoadedDraft({
      id: String(draft.id),
      title: draft.title || draft.data?.requestTitle || "",
    });
    if (skipDraftStepResetRef.current) {
      skipDraftStepResetRef.current = false;
    } else {
      setCurrentStep(0);
    }
    setStepError(null);
  };

  useEffect(() => {
    const draftId = searchParams.get("draftId");

    if (!draftId) return;

    const loadDraftFromUrl = async () => {
      try {
        const res = await fetch(`/api/request-drafts/${REQUEST_DRAFT_TYPE}`, {
          method: "GET",
          cache: "no-store",
        });

        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.error || "Failed to load draft.");
        }

        const draft = Array.isArray(json?.drafts)
          ? json.drafts.find((item) => String(item.id) === String(draftId))
          : null;

        if (!draft) {
          alert("The selected draft could not be found.");
          setLoadedDraft(null);
          return;
        }

        applyLoadedDraft(draft);
      } catch (error) {
        alert(error.message || "Failed to load draft.");
      }
    };

    loadDraftFromUrl();
  }, [searchParams]);

  useEffect(() => {
    if (!loadedDraft || !draftSnapshotRef.current) {
      isLoadedDraftDirtyRef.current = false;
      return;
    }

    isLoadedDraftDirtyRef.current =
      snapshotDraftData(formData) !== draftSnapshotRef.current;
  }, [formData, loadedDraft]);

  useEffect(() => {
    const onBeforeUnload = (event) => {
      if (!isLoadedDraftDirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };

    const onDocumentClick = (event) => {
      if (!isLoadedDraftDirtyRef.current) return;
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;

      const anchor = event.target.closest?.("a[href]");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      let url;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      if (url.protocol !== "http:" && url.protocol !== "https:") return;
      if (
        url.origin === window.location.origin &&
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }

      const confirmed = window.confirm(UNSAVED_LOADED_DRAFT_MESSAGE);
      if (!confirmed) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      isLoadedDraftDirtyRef.current = false;
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onDocumentClick, true);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onDocumentClick, true);
    };
  }, []);

  useEffect(() => {
    window.__LEXIFY_REQUEST_CONTEXT__ = {
      requestType: "Sales B2B",

      scopeOfWork: formData.need,

      description: formData.description,

      additionalBackgroundInfo: formData.background,

      confidentialCounterpartyInfo: formData.confidential,

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

      languages: [
        ...(formData.checkboxes || []).filter((l) => l !== "Other:"),
        formData.otherLang || null,
      ].filter(Boolean),

      offersDeadline: formData.date,

      uploadedBackgroundFiles: formData.backgroundFiles?.map((f) => f.name),

      uploadedSupplierFiles: formData.supplierFiles?.map((f) => f.name),
    };
  }, [formData, legalPanelGroups]);

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
        const selectable = legalPanelGroups.filter(
          (group) => (group.providers || []).length > 0,
        );
        setFormData({
          ...formData,
          providerSource: value,
          legalPanelGroupId:
            value === "panel" && selectable.length === 1
              ? selectable[0].id
              : value === "panel"
                ? formData.legalPanelGroupId
                : "",
        });
        setPanelDropdownOpen(false);
      } else {
        const paymentTypeChanged =
          name === "need" &&
          (value === NEED_TEMPLATE) !== (formData.need === NEED_TEMPLATE);
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

  const isTemplateOption = formData.need === NEED_TEMPLATE;
  const selectedNeed = NEED_OPTIONS.find(
    (option) => option.value === formData.need,
  );
  const retainerFeeOptions = retainerFeeOptionsForNeed(isTemplateOption);

  useEffect(() => {
    setFormData((prev) => {
      const nextRetainerFee = normalizeRetainerFee(
        prev.retainerFee,
        prev.need === NEED_TEMPLATE,
      );
      if (nextRetainerFee === prev.retainerFee) return prev;
      return { ...prev, retainerFee: nextRetainerFee };
    });
  }, [isTemplateOption]);

  const selectedLanguages = [
    ...(formData.checkboxes || []).filter((l) => l !== "Other:"),
    formData.otherLang || null,
  ].filter(Boolean);

  const selectableLegalPanels = legalPanelGroups.filter(
    (group) => (group.providers || []).length > 0,
  );
  const selectedLegalPanel = selectableLegalPanels.find(
    (group) => group.id === formData.legalPanelGroupId,
  );
  const usingLegalPanel = formData.providerSource === "panel";
  const PANEL_CRITERIA_DEFAULTS = {
    serviceProviderType: "All",
    domesticOffers:
      "No, I want offers from both domestic and foreign legal service providers.",
    providerSize: "Any size",
    providerCompanyAge: "Any age",
    providerMinimumRating: "Any rating",
    providerReferences: "No",
  };

  const validateStep = (step) => {
    if (step === 0) {
      if (!formData.need)
        return {
          error: "Please select what kind of legal help you need.",
          field: "need",
        };
      return null;
    }

    if (step === 1) {
      if (!formData.description)
        return {
          error:
            "Please provide a brief description of your company's line of business.",
          field: "description",
        };
      if (!isTemplateOption && !String(formData.confidential || "").trim())
        return {
          error:
            "Please provide the name, business identity code and country of domicile of the customer.",
          field: "confidential",
        };
      return null;
    }

    if (step === 2) return null;

    if (step === 3) {
      if (!formData.providerSource)
        return {
          error:
            "Please choose whether to use a legal panel or provider criteria.",
          field: "providerSource",
        };
      if (usingLegalPanel) {
        if (!formData.legalPanelGroupId)
          return {
            error: "Please select a legal panel.",
            field: "legalPanelGroupId",
          };
        if (!selectedLegalPanel)
          return {
            error: "The selected legal panel has no providers.",
            field: "legalPanelGroupId",
          };
      } else {
        if (!formData.offerer)
          return {
            error: "Please choose which providers can offer.",
            field: "offerer",
          };
        if (!formData.providerCountry)
          return {
            error: "Please choose domestic/foreign offers.",
            field: "providerCountry",
          };
        if (!formData.lawyerCount)
          return {
            error: "Please choose a minimum provider size.",
            field: "lawyerCount",
          };
        if (!formData.firmAge)
          return {
            error: "Please choose a minimum company age.",
            field: "firmAge",
          };
        if (!formData.firmRating)
          return {
            error: "Please choose a minimum rating.",
            field: "firmRating",
          };
      }
      if (!formData.providerReferences)
        return {
          error: "Please choose the amount of references needed.",
          field: "providerReferences",
        };
      if (!formData.currency)
        return { error: "Please choose a currency.", field: "currency" };
      if (!formData.retainerFee)
        return {
          error: "Please choose an advance retainer option.",
          field: "retainerFee",
        };
      if (!formData.paymentTerms)
        return {
          error: "Please choose how you want to be invoiced.",
          field: "paymentTerms",
        };
      if (selectedLanguages.length === 0)
        return {
          error: "Please select at least one language (or type another).",
          field: "languages",
        };
      if (!formData.date)
        return { error: "Please pick an offers deadline.", field: "date" };
      return null;
    }

    if (step === 4) {
      if (!formData.requestTitle)
        return {
          error: "Please give a title for your LEXIFY Request.",
          field: "requestTitle",
        };
      if (!formData.agree)
        return {
          error: "You must confirm you're ready to submit.",
          field: "agree",
        };
      return null;
    }

    return null;
  };

  const validate = () => {
    for (let i = 0; i < WIZARD_STEPS.length; i += 1) {
      const result = validateStep(i);
      if (result) return result.error;
    }
    return null;
  };

  useEffect(() => {
    if (!pendingScrollField) return;

    const field = pendingScrollField;
    const timeoutId = window.setTimeout(() => {
      const root = formRef.current;
      if (!root) {
        setPendingScrollField(null);
        return;
      }

      const el =
        root.querySelector(`[data-field="${field}"]`) ||
        root.querySelector(`[name="${field}"]`);

      if (el) {
        const navHeight =
          document.querySelector("nav.sticky")?.getBoundingClientRect()
            .height || 0;
        const top =
          el.getBoundingClientRect().top + window.scrollY - navHeight - 24;
        window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });

        const focusable = el.matches("input, select, textarea, button")
          ? el
          : el.querySelector("input, select, textarea, button");
        focusable?.focus?.({ preventScroll: true });
      }

      setPendingScrollField(null);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [pendingScrollField, currentStep]);

  const goToStep = (index) => {
    if (index === currentStep) return;
    if (index < currentStep) {
      setStepError(null);
      setCurrentStep(index);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    for (let i = currentStep; i < index; i += 1) {
      const result = validateStep(i);
      if (result) {
        setStepError(result.error);
        setCurrentStep(i);
        setPendingScrollField(result.field);
        return;
      }
    }

    setStepError(null);
    setCurrentStep(index);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goNext = () => {
    const result = validateStep(currentStep);
    if (result) {
      setStepError(result.error);
      setPendingScrollField(result.field);
      return;
    }

    if (currentStep >= WIZARD_STEPS.length - 1) {
      formRef.current?.requestSubmit();
      return;
    }

    setStepError(null);
    setCurrentStep((step) => Math.min(step + 1, WIZARD_STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setStepError(null);
    setCurrentStep((step) => Math.max(step - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancel = () => {
    const confirmed = confirm(
      isLoadedDraftDirtyRef.current
        ? UNSAVED_LOADED_DRAFT_MESSAGE
        : "Are you sure you want to exit? All unsaved changes will be lost.",
    );
    if (!confirmed) return;
    isLoadedDraftDirtyRef.current = false;
    router.push("/main");
  };

  const getDraftDataForSave = () => getComparableDraftData(formData);

  const fetchDrafts = async () => {
    setDraftsLoading(true);

    try {
      const res = await fetch(`/api/request-drafts/${REQUEST_DRAFT_TYPE}`, {
        method: "GET",
        cache: "no-store",
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load drafts.");
      }

      setDrafts(Array.isArray(json?.drafts) ? json.drafts : []);
    } catch (error) {
      alert(error.message || "Failed to load drafts.");
      setDrafts([]);
    } finally {
      setDraftsLoading(false);
    }
  };

  const openLoadDraftModal = () => {
    setShowLoadDraftModal(true);
    fetchDrafts();
  };

  const postDraft = async ({ overwrite = false, title } = {}) => {
    const res = await fetch(`/api/request-drafts/${REQUEST_DRAFT_TYPE}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        data: getDraftDataForSave(),
        overwrite,
      }),
    });

    const json = await res.json().catch(() => null);

    return { res, json };
  };

  const openSaveDraftModal = () => {
    setDraftTitleInput(String(formData.requestTitle || "").trim());
    setDraftSaveError("");
    setShowSaveDraftModal(true);
  };

  const closeSaveDraftModal = () => {
    if (draftActionLoading) return;
    setDraftSaveError("");
    setShowSaveDraftModal(false);
  };

  const handleSaveChanges = async () => {
    if (!loadedDraft?.title) return;

    const confirmed = confirm(
      `Save changes to the draft "${loadedDraft.title}"? This will overwrite the currently saved version.`,
    );
    if (!confirmed) return;

    setDraftActionLoading(true);

    try {
      const { res, json } = await postDraft({
        title: loadedDraft.title,
        overwrite: true,
      });

      if (!res.ok) {
        throw new Error(json?.error || "Failed to save changes.");
      }

      if (json?.draft?.id) {
        setLoadedDraft({
          id: String(json.draft.id),
          title: json.draft.title || loadedDraft.title,
        });
      }

      draftSnapshotRef.current = snapshotDraftData(formData);
      isLoadedDraftDirtyRef.current = false;

      alert("Draft changes saved successfully.");
    } catch (error) {
      alert(error.message || "Failed to save changes.");
    } finally {
      setDraftActionLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    const title = String(draftTitleInput || "").trim();

    if (!title) {
      setDraftSaveError(
        "Please enter a title for your LEXIFY Request before saving.",
      );
      return;
    }

    setDraftSaveError("");
    setDraftActionLoading(true);

    try {
      const { res, json } = await postDraft({
        title,
        overwrite: false,
      });

      if (res.status === 409) {
        setDraftSaveError(
          `A draft named "${title}" already exists. Please use another name for the draft.`,
        );
        return;
      }

      if (!res.ok) {
        throw new Error(json?.error || "Failed to save draft.");
      }

      setFormData((prev) => ({
        ...prev,
        requestTitle: title,
      }));

      draftSnapshotRef.current = snapshotDraftData({
        ...formData,
        requestTitle: title,
      });
      isLoadedDraftDirtyRef.current = false;

      if (json?.draft?.id) {
        setLoadedDraft({
          id: String(json.draft.id),
          title: json.draft.title || title,
        });
        skipDraftStepResetRef.current = true;
        router.replace(
          `/contracts/sales-b2b?draftId=${encodeURIComponent(json.draft.id)}`,
        );
      }

      setShowSaveDraftModal(false);
      alert(
        'Draft saved successfully. If you make further changes, use "Save changes" to update this draft.',
      );
    } catch (error) {
      alert(error.message || "Failed to save draft.");
    } finally {
      setDraftActionLoading(false);
    }
  };

  const handleLoadDraft = (draft) => {
    if (isLoadedDraftDirtyRef.current) {
      const confirmed = confirm(
        "You have unsaved changes to the loaded draft. If you load another draft, those changes will be lost.",
      );
      if (!confirmed) return;
      isLoadedDraftDirtyRef.current = false;
    }

    setShowLoadDraftModal(false);
    skipDraftStepResetRef.current = false;

    if (String(searchParams.get("draftId") || "") === String(draft.id)) {
      applyLoadedDraft(draft);
      return;
    }

    router.replace(
      `/contracts/sales-b2b?draftId=${encodeURIComponent(draft.id)}`,
    );
  };

  const handleDeleteDraft = async (draftId) => {
    const confirmed = confirm("Are you sure you want to delete this draft?");
    if (!confirmed) return;

    setDraftActionLoading(true);

    try {
      const res = await fetch(`/api/request-drafts/${REQUEST_DRAFT_TYPE}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ draftId }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || "Failed to delete draft.");
      }

      setDrafts(Array.isArray(json?.drafts) ? json.drafts : []);

      if (loadedDraft && String(loadedDraft.id) === String(draftId)) {
        draftSnapshotRef.current = null;
        isLoadedDraftDirtyRef.current = false;
        setLoadedDraft(null);
        router.replace("/contracts/sales-b2b");
      }
    } catch (error) {
      alert(error.message || "Failed to delete draft.");
    } finally {
      setDraftActionLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (currentStep < WIZARD_STEPS.length - 1) {
      goNext();
      return;
    }

    const err = validate();
    if (err) {
      for (let i = 0; i < WIZARD_STEPS.length; i += 1) {
        const result = validateStep(i);
        if (result) {
          setCurrentStep(i);
          setStepError(result.error);
          setPendingScrollField(result.field);
          break;
        }
      }
      alert(err);
      return;
    }

    setSubmitting(true);
    try {
      const paymentRate = isTemplateOption
        ? "Lump sum fixed price."
        : "Blended Hourly Rate. The total price of the service will be calculated by multiplying the hourly rate with the number of hours of legal support provided by the legal service provider submitting the winning offer. The offered hourly rate will be valid until the relevant customer contract has been signed or abandoned, whichever comes first.";
      const languageCSV = [
        ...(formData.checkboxes || []).filter((l) => l !== "Other:"),
        formData.otherLang || null,
      ]
        .filter(Boolean)
        .join(", ");

      const payload = {
        requestState: "PENDING",
        requestCategory: "Help with Contracts",
        requestSubcategory: "B2B Sales",
        scopeOfWork: formData.need,
        description: formData.description,
        additionalBackgroundInfo: formData.background || "",
        // arrays will be filled server-side from file blobs
        backgroundInfoFiles: [],
        supplierCodeOfConductFiles: [],
        ...(usingLegalPanel
          ? {
              ...PANEL_CRITERIA_DEFAULTS,
              providerReferences: formData.providerReferences,
            }
          : {
              serviceProviderType: formData.offerer,
              domesticOffers: formData.providerCountry,
              providerSize: formData.lawyerCount,
              providerCompanyAge: formData.firmAge,
              providerMinimumRating: formData.firmRating,
              providerReferences: formData.providerReferences,
            }),
        legalPanelGroupId: usingLegalPanel ? selectedLegalPanel?.id : null,
        legalPanelGroupName: usingLegalPanel ? selectedLegalPanel?.name : null,
        legalPanelProviders: usingLegalPanel
          ? selectedLegalPanel?.providers || []
          : [],
        currency: formData.currency,
        paymentRate: paymentRate,
        advanceRetainerFee: formData.retainerFee,
        invoiceType: formData.paymentTerms,
        language: languageCSV,
        offersDeadline: formData.date,
        title: formData.requestTitle,
        dateExpired: formData.date,
        details: {
          confidential:
            !isTemplateOption &&
            formData.confboxes.includes("Disclosed to Winning Bidder Only")
              ? "Yes"
              : "No",
          winnerBidderOnlyStatus: !isTemplateOption
            ? (formData.confidential || "").trim()
            : "",
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
        // keep json = null; text will include any HTML or error message
      }

      if (!res.ok) {
        throw new Error(
          (json && json.error) || text || "Failed to create request.",
        );
      }

      alert("LEXIFY Request submitted successfully.");
      isLoadedDraftDirtyRef.current = false;
      draftSnapshotRef.current = null;
      router.push("/main");
    } catch (e2) {
      alert(e2.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDraftSavedDate = (draft) => {
    const rawDate = draft?.savedAt || draft?.updatedAt || draft?.createdAt;

    if (!rawDate) return "Draft saved date unavailable";

    const parsed = new Date(rawDate);

    if (Number.isNaN(parsed.getTime())) {
      return "Draft saved date unavailable";
    }

    return `Draft Saved ${parsed.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })}`;
  };

  return (
    <>
      <form ref={formRef} onSubmit={handleSubmit} noValidate>
        <RequestWizard
          categoryLabel="Help with B2B Sales Contracts"
          steps={WIZARD_STEPS}
          currentStep={currentStep}
          onStepClick={goToStep}
          onNext={goNext}
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
            <div className="flex flex-wrap items-center justify-end gap-2">
              {loadedDraft ? (
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={draftActionLoading}
                  className="rounded-lg border border-[#11999e] px-4 py-2 text-sm font-semibold text-[#11999e] hover:bg-[#f3fbfb] cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {draftActionLoading ? "Saving…" : "Save changes"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={openSaveDraftModal}
                disabled={draftActionLoading}
                className="rounded-lg border border-[#11999e] px-4 py-2 text-sm font-semibold text-[#11999e] hover:bg-[#f3fbfb] cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                Save as new draft
              </button>
              <button
                type="button"
                onClick={openLoadDraftModal}
                className="rounded-lg border border-[#11999e] px-4 py-2 text-sm font-semibold text-[#11999e] hover:bg-[#f3fbfb] cursor-pointer"
              >
                Load draft
              </button>
            </div>
          }
        >
          {currentStep === 0 && (
            <div className="space-y-3" data-field="need">
              {NEED_OPTIONS.map((option) => {
                const selected = formData.need === option.value;
                return (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-start gap-4 rounded-xl border-2 p-4 transition ${
                      selected
                        ? "border-[#11999e] bg-[#f3fbfb]"
                        : "border-gray-200 hover:border-[#11999e]/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="need"
                      value={option.value}
                      checked={selected}
                      onChange={handleChange}
                      className="mt-1 accent-[#11999e]"
                    />
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e6f5f5] text-[#11999e]">
                      <NeedIcon type={option.icon} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900">
                        {option.title}
                      </p>
                      <p className="mt-0.5 text-sm text-gray-500">
                        {option.pricing}
                      </p>
                    </div>
                    {option.tooltip ? (
                      <QuestionMarkTooltip tooltipText={option.tooltip} />
                    ) : null}
                  </label>
                );
              })}
              {selectedNeed ? (
                <div className="mt-4 flex gap-3 rounded-xl bg-[#e8f4f6] p-4 text-sm text-gray-700">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="mt-0.5 h-5 w-5 shrink-0 text-[#11999e]"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 1.75a4.75 4.75 0 0 0-4.75 4.75v1.094c-1.34.312-2.25 1.56-2.25 3.031v4.25c0 1.657 1.343 3 3 3h8c1.657 0 3-1.343 3-3v-4.25c0-1.47-.91-2.72-2.25-3.03V6.5A4.75 4.75 0 0 0 10 1.75Zm3.25 4.75V6.5a3.25 3.25 0 1 0-6.5 0v.094h6.5Z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p>
                    <strong>NOTE: </strong>
                    {selectedNeed.note}
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-6">
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

              {!isTemplateOption && formData.need ? (
                <div data-field="confidential">
                  <h4 className="mb-2 text-sm font-semibold text-gray-900">
                    Please provide the name, business identity code and country
                    of domicile of the customer with whom you are negotiating
                    the contract. If you do not want your name and the name of
                    the customer to be visible to all legal service providers
                    qualified to make you an offer, please also check the box
                    “Disclosed to Winning Bidder Only”.{" "}
                    <QuestionMarkTooltip tooltipText="If 'Disclosed to Winning Bidder Only' is checked, your identity and the identity of your customer will be disclosed solely to the legal service provider that submitted the winning offer, to enable that provider to conduct mandatory conflict checks. If the legal service provider notifies LEXIFY of an existing conflict, the winning offer will automatically be disqualified, and you will have the option to select an alternative winning offer." />
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
                    Disclosed to Winning Bidder Only{" "}
                    <QuestionMarkTooltip tooltipText="Please note that checking “Disclosed to Winning Bidder Only” may cause additional delay in the processing of your LEXIFY Request as statutory conflict checks are postponed until the winning offer has been verified." />
                  </label>
                </div>
              ) : null}
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900">
                Please provide additional background information, if any, you
                wish to share with legal service providers in your LEXIFY
                Request. If you want, you can also upload a separate file with
                additional background information by clicking “Upload Background
                Info”
                <QuestionMarkTooltip tooltipText="Please do not include any personal data in the description. Any background information provided will be visible to all legal service providers qualified to submit an offer in response to your LEXIFY Request." />
              </h4>
              <AutoGrowTextarea
                name="background"
                className={FIELD_CLASS}
                onChange={handleChange}
                value={formData.background}
              />
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200">
                  Upload Background Info
                  <input
                    type="file"
                    name="backgroundFiles"
                    multiple
                    className="hidden"
                    onChange={handleBackgroundFileChange}
                  />
                </label>
                <span className="text-sm text-gray-500">
                  {formData.backgroundFiles.length > 0
                    ? `${formData.backgroundFiles.length} file(s) selected`
                    : "No files selected"}
                </span>
              </div>
              {formData.backgroundFiles.length > 0 ? (
                <div>
                  <h5 className="mb-2 text-sm font-medium">Uploaded Files:</h5>
                  <ul className="space-y-2">
                    {formData.backgroundFiles.map((file, index) => (
                      <li
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      >
                        <span className="truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteBackgroundFile(index)}
                          className="ml-2 cursor-pointer rounded bg-red-500 px-2 py-1 text-xs text-white"
                        >
                          Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div data-field="providerSource">
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  Decide which firms will see this LEXIFY Request and be able to
                  submit offers:
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition ${
                      formData.providerSource === "criteria"
                        ? "border-[#11999e] bg-[#f3fbfb]"
                        : "border-gray-200 hover:border-[#11999e]/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="providerSource"
                      value="criteria"
                      checked={formData.providerSource === "criteria"}
                      onChange={handleChange}
                      className="mt-1 accent-[#11999e]"
                    />
                    <div>
                      <p className="font-semibold text-gray-900">
                        Set criteria for qualifying firms
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        Open this LEXIFY Request to any firm meeting the
                        requirements you set, such as firm size or LEXIFY
                        rating.
                      </p>
                    </div>
                  </label>
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition ${
                      formData.providerSource === "panel"
                        ? "border-[#11999e] bg-[#f3fbfb]"
                        : "border-gray-200 hover:border-[#11999e]/40"
                    } ${selectableLegalPanels.length === 0 ? "opacity-60" : ""}`}
                  >
                    <input
                      type="radio"
                      name="providerSource"
                      value="panel"
                      checked={formData.providerSource === "panel"}
                      disabled={selectableLegalPanels.length === 0}
                      onChange={handleChange}
                      className="mt-1 accent-[#11999e]"
                    />
                    <div>
                      <p className="font-semibold text-gray-900">
                        Choose a saved legal panel
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        Restrict this LEXIFY Request to the firms on one of your
                        saved panels. Only those firms will see the Request and
                        can submit offers, regardless of your other settings.
                        You can create and save panels under "My Account" in the
                        main menu.
                      </p>
                    </div>
                  </label>
                </div>
                {selectableLegalPanels.length === 0 ? (
                  <p className="mt-2 text-xs text-gray-500">
                    You do not have any legal panels with providers yet. Create
                    a group on your account page to use this option.
                  </p>
                ) : null}
              </div>

              {usingLegalPanel ? (
                <div
                  ref={panelDropdownRef}
                  className="relative"
                  data-field="legalPanelGroupId"
                >
                  <h4 className="mb-2 text-sm font-semibold text-gray-900">
                    Select a legal panel
                  </h4>
                  <button
                    type="button"
                    className={`${FIELD_CLASS} relative pr-10 text-left`}
                    onClick={() => setPanelDropdownOpen((open) => !open)}
                    aria-haspopup="listbox"
                    aria-expanded={panelDropdownOpen}
                  >
                    {selectedLegalPanel ? (
                      <span className="block">
                        <span className="block font-medium text-gray-900">
                          {selectedLegalPanel.name}
                        </span>
                        <span className="block text-sm text-gray-500">
                          ({(selectedLegalPanel.providers || []).join(", ")})
                        </span>
                      </span>
                    ) : (
                      <span className="text-black">Select</span>
                    )}
                    <span
                      className="pointer-events-none absolute inset-y-0 right-0.5 flex items-center text-black"
                      aria-hidden="true"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        fill="none"
                        className="h-3 w-3"
                      >
                        <path
                          d="M3.5 6.25 8 10.75l4.5-4.5"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </button>
                  {panelDropdownOpen ? (
                    <div
                      role="listbox"
                      className="absolute z-20 mt-1 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg max-h-64"
                    >
                      {selectableLegalPanels.map((group) => (
                        <button
                          type="button"
                          key={group.id}
                          role="option"
                          aria-selected={
                            formData.legalPanelGroupId === group.id
                          }
                          className={`w-full cursor-pointer px-3 py-2 text-left hover:bg-[#f3fbfb] ${
                            formData.legalPanelGroupId === group.id
                              ? "bg-[#e6f7f7]"
                              : ""
                          }`}
                          onClick={() => {
                            setFormData({
                              ...formData,
                              legalPanelGroupId: group.id,
                            });
                            setPanelDropdownOpen(false);
                            setStepError(null);
                          }}
                        >
                          <span className="block font-medium text-gray-900">
                            {group.name}
                          </span>
                          <span className="block text-sm text-gray-400">
                            ({(group.providers || []).join(", ")})
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {formData.providerSource === "criteria" ? (
                <>
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-gray-900">
                      Which legal service providers can make you an offer?
                    </h4>
                    <select
                      name="offerer"
                      className={FIELD_CLASS}
                      onChange={handleChange}
                      value={formData.offerer}
                    >
                      <option value="">Select</option>
                      <option value="Attorneys-at-law">Attorneys-at-law</option>
                      <option value="Law firms">Law firms</option>
                      <option value="All">
                        Both attorneys-at-law & law firms
                      </option>
                    </select>
                    <p className="mt-2 text-xs text-gray-500">
                      <strong>NOTE:</strong> Attorneys-at-law are legal service
                      providers who are members of the local bar association in
                      their country of domicile. Law firms are legal service
                      providers who are not members of the local bar association
                      in their country of domicile, but who may offer legal
                      services according to the law of their country of
                      domicile.
                    </p>
                  </div>

                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-gray-900">
                      Do you want offers only from legal service providers based
                      in the same country as you?
                    </h4>
                    <select
                      name="providerCountry"
                      className={FIELD_CLASS}
                      onChange={handleChange}
                      value={formData.providerCountry}
                    >
                      <option value="">Select</option>
                      <option value="Yes, I want offers from domestic legal service providers only.">
                        Yes, I want offers from domestic legal service providers
                        only.
                      </option>
                      <option value="No, I want offers from both domestic and foreign legal service providers.">
                        No, I want offers from both domestic and foreign legal
                        service providers.
                      </option>
                    </select>
                  </div>

                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-gray-900">
                      Do you want offers only from legal service providers of a
                      specific minimum size?
                    </h4>
                    <select
                      name="lawyerCount"
                      className={FIELD_CLASS}
                      onChange={handleChange}
                      value={formData.lawyerCount}
                    >
                      <option value="">Select</option>
                      <option value="Any size">
                        No, the legal service provider can be of any size
                      </option>
                      <option value="5">
                        Yes, the legal service provider must employ at least 5
                        lawyers
                      </option>
                      <option value="15">
                        Yes, the legal service provider must employ at least 15
                        lawyers
                      </option>
                      <option value="40">
                        Yes, the legal service provider must employ at least 40
                        lawyers
                      </option>
                    </select>
                  </div>

                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-gray-900">
                      Do you want offers only from legal service providers who
                      have been in operation for a specific minimum period of
                      time?
                    </h4>
                    <select
                      name="firmAge"
                      className={FIELD_CLASS}
                      onChange={handleChange}
                      value={formData.firmAge}
                    >
                      <option value="">Select</option>
                      <option value="Any age">
                        No, the legal service provider can be of any age
                      </option>
                      <option value="5">
                        Yes, the legal service provider has been in operation
                        for at least 5 years
                      </option>
                      <option value="10">
                        Yes, the legal service provider has been in operation
                        for at least 10 years
                      </option>
                      <option value="25">
                        Yes, the legal service provider has been in operation
                        for at least 25 years
                      </option>
                    </select>
                  </div>
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-gray-900">
                      Do tendering legal service providers need to have a
                      minimum customer feedback rating?
                    </h4>
                    <select
                      name="firmRating"
                      className={FIELD_CLASS}
                      onChange={handleChange}
                      value={formData.firmRating}
                    >
                      <option value="">Select</option>
                      <option value="Any rating">No</option>
                      <option value="3">
                        Yes, average rating of at least 3/5
                      </option>
                      <option value="4">
                        Yes, average rating of at least 4/5
                      </option>
                    </select>
                    <p className="mt-2 text-xs text-gray-500">
                      This rating is based on aggregated feedback a legal
                      service provider has received previously from other legal
                      service purchasers on LEXIFY.
                    </p>
                  </div>
                </>
              ) : null}

              {formData.providerSource ? (
                <>
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-gray-900">
                      Do tendering legal service providers need to provide a
                      written reference with their offer?{" "}
                      <QuestionMarkTooltip tooltipText="A written reference is a formal statement or endorsement that describes a legal service provider's performance for a past client on previous legal work of a similar nature to the legal services sought in your LEXIFY Request." />
                    </h4>
                    <select
                      name="providerReferences"
                      className={FIELD_CLASS}
                      onChange={handleChange}
                      value={formData.providerReferences}
                    >
                      <option value="">Select</option>
                      <option value="No">No</option>
                      <option value="Yes, 1 written reference must be provided">
                        Yes, 1 written reference must be provided
                      </option>
                      <option value="Yes, 2 written references must be provided">
                        Yes, 2 written references must be provided
                      </option>
                    </select>
                  </div>

                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-gray-900">
                      In what currency do you want to buy the legal service?
                    </h4>
                    <select
                      name="currency"
                      className={FIELD_CLASS}
                      onChange={handleChange}
                      value={formData.currency}
                    >
                      <option value="">Select</option>
                      <option value="Euro (€)">Euro (€)</option>
                      <option value="Swedish krona (kr)">
                        Swedish krona (kr)
                      </option>
                      <option value="Danish krone (kr)">
                        Danish krone (kr)
                      </option>
                      <option value="Polish złoty (zł)">
                        Polish złoty (zł)
                      </option>
                      <option value="Czech koruna (Kč)">
                        Czech koruna (Kč)
                      </option>
                      <option value="Romanian leu (Leu)">
                        Romanian leu (Leu)
                      </option>
                      <option value="Bulgarian lev (лв)">
                        Bulgarian lev (лв)
                      </option>
                      <option value="Hungarian forint (Ft)">
                        Hungarian forint (Ft)
                      </option>
                    </select>
                  </div>

                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-gray-900">
                      Are you prepared to pay an advance retainer fee to the
                      legal service provider submitting the winning offer?{" "}
                      <QuestionMarkTooltip
                        tooltipText={
                          isTemplateOption
                            ? "An advance retainer fee is an amount payable by you to the legal service provider submitting the winning offer within 14 days of the date of the LEXIFY Contract between you and the legal service provider. The advance retainer fee forms a part of the total price of the legal service as offered by the legal service provider."
                            : "An advance retainer fee is an amount payable by you to the legal service provider submitting the winning offer within 14 days of the date of the LEXIFY Contract between you and the legal service provider. The advance retainer fee forms a part of the total price of the legal service as offered by the legal service provider. For legal work based on an hourly rate offer, the legal service provider will refund you for any unused amount of the advance retainer fee if the total price of the legal service when completed amounts to less than the amount of the advance retainer fee."
                        }
                      />
                    </h4>
                    <select
                      name="retainerFee"
                      className={FIELD_CLASS}
                      onChange={handleChange}
                      value={formData.retainerFee}
                    >
                      <option value="">Select</option>
                      {retainerFeeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-gray-900">
                      How do you want to be invoiced?
                    </h4>
                    <select
                      name="paymentTerms"
                      className={FIELD_CLASS}
                      onChange={handleChange}
                      value={formData.paymentTerms}
                    >
                      <option value="">Select</option>
                      <option value="On a monthly basis, invoice sent at end of each calendar month">
                        On a monthly basis, invoice sent at end of each calendar
                        month
                      </option>
                      <option value="On a quarterly basis, invoice sent at end of each quarter">
                        On a quarterly basis, invoice sent at end of each
                        quarter
                      </option>
                      <option value="One time invoice upon completion of the assignment">
                        One time invoice upon completion of the assignment
                      </option>
                    </select>
                  </div>

                  <div data-field="languages">
                    <h4 className="mb-2 text-sm font-semibold text-gray-900">
                      What languages are needed for the performance of the work?
                    </h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {[
                        "English",
                        "Finnish",
                        "Swedish",
                        "German",
                        "French",
                        "Other:",
                      ].map((option) => (
                        <label
                          key={option}
                          className="flex items-center gap-2 text-sm text-gray-800"
                        >
                          <input
                            type="checkbox"
                            value={option}
                            checked={formData.checkboxes.includes(option)}
                            onChange={handleChange}
                            className="accent-[#11999e]"
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                    {formData.checkboxes.includes("Other:") ? (
                      <input
                        type="text"
                        name="otherLang"
                        placeholder="Specify Other Language"
                        className={`${FIELD_CLASS} mt-3`}
                        value={formData.otherLang}
                        onChange={handleChange}
                      />
                    ) : null}
                  </div>

                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-gray-900">
                      By when do you need offers from interested legal service
                      providers?{" "}
                      <QuestionMarkTooltip tooltipText="Sets the deadline for offers at the end of the selected day." />
                    </h4>
                    <input
                      type="date"
                      name="date"
                      className={`${FIELD_CLASS} max-w-xs`}
                      value={formData.date}
                      onChange={handleChange}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                </>
              ) : null}
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <dl className="rounded-xl border border-gray-200 px-4">
                <SummaryRow label="Scope of work" value={selectedNeed?.title} />
                <SummaryRow
                  label="Company's line of business"
                  value={formData.description}
                />
                <SummaryRow label="Background" value={formData.background} />
                {!isTemplateOption ? (
                  <SummaryRow
                    label="Counterparty"
                    value={
                      formData.confboxes.includes(
                        "Disclosed to Winning Bidder Only",
                      )
                        ? "Disclosed to Winning Bidder Only"
                        : formData.confidential
                    }
                  />
                ) : null}
                <SummaryRow
                  label="Law firms eligible to submit offers"
                  value={
                    usingLegalPanel
                      ? selectedLegalPanel
                        ? `${selectedLegalPanel.name} (${(
                            selectedLegalPanel.providers || []
                          ).join(", ")})`
                        : ""
                      : [
                          optionLabel(OFFERER_OPTIONS, formData.offerer),
                          optionLabel(
                            PROVIDER_COUNTRY_OPTIONS,
                            formData.providerCountry,
                          ),
                          optionLabel(
                            LAWYER_COUNT_OPTIONS,
                            formData.lawyerCount,
                          ),
                          optionLabel(FIRM_AGE_OPTIONS, formData.firmAge),
                          formData.firmRating &&
                          formData.firmRating !== "Any rating"
                            ? optionLabel(
                                FIRM_RATING_OPTIONS,
                                formData.firmRating,
                              )
                            : "",
                        ].filter(Boolean)
                  }
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

              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  Do you want to include in the LEXIFY Request your Supplier
                  Code of Conduct or other procurement related requirements
                  which legal service providers are required to follow? If yes,
                  please upload the relevant documents by clicking “Upload
                  Procurement Appendices” below.{" "}
                  <QuestionMarkTooltip tooltipText="Please upload only requirements mandatory to all suppliers of your company (such as your Supplier Code of Conduct or minimum standards for supplier information security). Please do not upload your general procurement contract terms and conditions. Any such general contract terms and conditions, even if uploaded, will not become a binding part of the LEXIFY Contract between you and the legal service provider submitting the winning offer. The terms and conditions applicable to all LEXIFY Contracts are set out in the General Terms and Conditions for LEXIFY Contracts." />
                </h4>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200">
                    Upload Procurement Appendices
                    <input
                      type="file"
                      name="supplierFiles"
                      multiple
                      className="hidden"
                      onChange={handleSupplierFileChange}
                    />
                  </label>
                  <span className="text-sm text-gray-500">
                    {formData.supplierFiles.length > 0
                      ? `${formData.supplierFiles.length} file(s) selected`
                      : "No files selected"}
                  </span>
                </div>
                {formData.supplierFiles.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {formData.supplierFiles.map((file, index) => (
                      <li
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      >
                        <span className="truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteSupplierFile(index)}
                          className="ml-2 cursor-pointer rounded bg-red-500 px-2 py-1 text-xs text-white"
                        >
                          Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {!isTemplateOption &&
                formData.confboxes.includes(
                  "Disclosed to Winning Bidder Only",
                ) ? (
                  <p className="mt-3 text-xs text-gray-500">
                    <strong>NOTE:</strong> If you have selected &quot;Disclosed
                    to Winning Bidder Only&quot; earlier in the LEXIFY Request
                    to ensure your name and the name of your counterparty are
                    disclosed only to the legal service provider submitting the
                    winning offer, please make sure that any procurement
                    appendices you may upload do not disclose the name of your
                    company.
                  </p>
                ) : null}
              </div>

              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-900">
                  Give a title for your LEXIFY Request{" "}
                  <QuestionMarkTooltip tooltipText="This title will not be shown to any legal service providers and will only be used in your personal LEXIFY Request archive (see My Dashboard in the LEXIFY main menu)." />
                </h4>
                <input
                  type="text"
                  name="requestTitle"
                  className={FIELD_CLASS}
                  value={formData.requestTitle}
                  onChange={handleChange}
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className="cursor-pointer rounded-lg bg-gray-700 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                >
                  Preview
                </button>
              </div>

              <label className="flex items-start gap-2 text-sm text-gray-800">
                <input
                  type="checkbox"
                  name="agree"
                  checked={formData.agree}
                  onChange={handleChange}
                  className="mt-0.5 accent-[#11999e]"
                />
                I have carefully reviewed my LEXIFY Request and I am ready to
                submit it.
              </label>

              <p className="text-xs leading-relaxed text-gray-500">
                By submitting this LEXIFY Request, I accept that LEXIFY will
                automatically generate a binding LEXIFY Contract between my
                company, as the legal service purchaser, and the legal service
                provider submitting the winning offer, subject to the parameters
                defined in my LEXIFY Request and my selection of the winning
                offer from the best offers received. The LEXIFY Contract will
                consist of (i) the service description, other specifications,
                and any Procurement Appendices (if applicable) designated in the
                LEXIFY Request, and (ii) the General Terms and Conditions for
                LEXIFY Contracts. The LEXIFY Contract will not be generated if
                (i) no qualifying offers have been received prior to the
                expiration of my LEXIFY Request, (ii) I, as representative of
                the legal service purchaser, cancel the LEXIFY Request, or (iii)
                I do not actively select any winning service provider within the
                period allocated for the selection of a winning offer after the
                expiration of the LEXIFY Request.
              </p>
            </div>
          )}
        </RequestWizard>
      </form>

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

        <Section title="Scope of Work">{formData.need || "-"}</Section>

        <Section title="Contract Price (Lump Sum Fixed Fee or Blended Hourly Rate) and Currency">
          {isTemplateOption ? (
            `Lump Sum Fixed Fee ${
              formData.currency ? `(${formData.currency})` : ""
            }`
          ) : (
            <>
              {`Blended Hourly Rate ${
                formData.currency ? `(${formData.currency})` : ""
              }`}
              <p className="text-md mt-2">
                The total price of the service will be calculated by multiplying
                the hourly rate with the number of hours of legal support
                provided by the legal service provider submitting the winning
                offer. The offered hourly rate will be valid until the relevant
                customer contract has been signed or abandoned, whichever comes
                first.
              </p>
            </>
          )}
          <p className="text-md mt-2">
            The Legal Service Provider shall submit all invoices to the Client
            in the contract price currency, unless otherwise instructed in
            writing by the Client.
          </p>
        </Section>

        <Section title="Description of Client's Line of Business">
          <p>{formData.description || "-"}</p>
        </Section>

        {formData.need &&
          (formData.need.includes("Legal review of a contract template") ||
            formData.need.includes("Legal review of comments")) && (
            <Section title="Name, Business Identity Code and Country of Domicile of Client's Counterparty in the Matter">
              {formData.confboxes.includes("Disclosed to Winning Bidder Only")
                ? "Disclosed to Winning Bidder Only"
                : formData.confidential || "-"}
              <p className="text-xs mt-2 italic">
                <strong>NOTE:</strong> If the above states &quot;Disclosed to
                Winning Bidder Only&quot;, the relevant identity or identities
                will be disclosed only to the legal service provider submitting
                the winning offer to enable that service provider to complete
                its mandatory conflict checks. If an existing conflict is then
                notified by the legal service provider to LEXIFY, the winning
                offer will automatically be disqualified and you will have the
                option to select an alternative winning offer.
              </p>
            </Section>
          )}

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
            the legal service provider.
            {!isTemplateOption ? (
              <>
                {" "}
                For legal service based on an hourly rate, the legal service
                provider shall refund the client for any unused amount of the
                advance retainer fee if the total price of the legal service
                when completed amounts to less than the amount of the advance
                retainer fee. Such refund shall be paid within 14 days of the
                completion of the legal service.
              </>
            ) : null}
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
          {[
            ...(formData.checkboxes || []).filter((lang) => lang !== "Other:"),
            formData.otherLang,
          ]
            .filter(Boolean)
            .join(", ") || "-"}
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
      {showSaveDraftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-semibold text-gray-800">
              Name your LEXIFY Request draft
            </h2>
            <input
              type="text"
              className={FIELD_CLASS}
              value={draftTitleInput}
              onChange={(e) => {
                setDraftTitleInput(e.target.value);
                if (draftSaveError) setDraftSaveError("");
              }}
              placeholder="Insert name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSaveDraft();
                }
                if (e.key === "Escape") {
                  closeSaveDraftModal();
                }
              }}
            />
            {draftSaveError ? (
              <p className="mt-2 text-sm font-medium text-red-600">
                {draftSaveError}
              </p>
            ) : null}
            <p className="mt-2 text-xs text-gray-500">
              <strong>Note:</strong> Attachments are not saved with a draft, so
              add any attachments you may wish to include only when you are
              ready to submit the LEXIFY Request.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeSaveDraftModal}
                disabled={draftActionLoading}
                className="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel save
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={draftActionLoading}
                className="cursor-pointer rounded-lg bg-[#11999e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d7e82] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {draftActionLoading ? "Saving…" : "Save draft"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showLoadDraftModal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white w-full max-w-xl p-6 rounded shadow-lg relative">
            {/* Close button */}
            <button
              type="button"
              className="absolute top-3 right-3 px-3 py-1 rounded bg-gray-700 hover:bg-gray-400 cursor-pointer"
              onClick={() => setShowLoadDraftModal(false)}
            >
              Close
            </button>

            <h2 className="text-xl font-semibold mb-4 text-gray-700">
              Select a draft to load
            </h2>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {draftsLoading ? (
                <p className="text-sm text-gray-600">Loading drafts…</p>
              ) : drafts.length === 0 ? (
                <p className="text-sm text-gray-600">{DRAFT_EMPTY_TEXT}</p>
              ) : (
                drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="flex justify-between items-center border p-3 rounded gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium break-words text-gray-700">
                        {draft.title || "Untitled draft"}
                      </p>

                      <p className="text-xs text-gray-400 mt-1">
                        {formatDraftSavedDate(draft)}
                      </p>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleLoadDraft(draft)}
                        disabled={draftActionLoading}
                        className="px-3 py-1 bg-[#11999e] text-white rounded hover:opacity-90 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Load Draft
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteDraft(draft.id)}
                        disabled={draftActionLoading}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:opacity-90 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Delete Draft
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
