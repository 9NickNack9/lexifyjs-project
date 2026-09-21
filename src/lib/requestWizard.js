export const FIELD_CLASS =
  "w-full border border-gray-200 rounded-lg p-3 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#11999e]/30 focus:border-[#11999e]";

export const REVIEW_STEP_TOOLTIP =
  'This page shows all data related to this LEXIFY Request, including the criteria you have set for eligible law firms. The eligibility criteria are never disclosed to law firms. Check that all information is correct before submitting — once the Request is submitted, firms begin reviewing it and preparing offers.\n\nTo see the LEXIFY Request as firms will see it on the marketplace, click the "Preview" button at the end of the page.';

export const DEFAULT_WIZARD_STEPS = [
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
    tooltip: REVIEW_STEP_TOOLTIP,
  },
];

export const UNSAVED_LOADED_DRAFT_MESSAGE =
  'You have unsaved changes to the draft. If you leave without clicking "Save Changes", those changes will be lost.';

export const PANEL_CRITERIA_DEFAULTS = {
  serviceProviderType: "All",
  domesticOffers:
    "No, I want offers from both domestic and foreign legal service providers.",
  providerSize: "Any size",
  providerCompanyAge: "Any age",
  providerMinimumRating: "Any rating",
  providerReferences: "No",
};

export const OFFERER_OPTIONS = [
  { value: "Attorneys-at-law", label: "Attorneys-at-law" },
  { value: "Law firms", label: "Law firms" },
  { value: "All", label: "Both attorneys-at-law & law firms" },
];

export const PROVIDER_COUNTRY_OPTIONS = [
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

export const LAWYER_COUNT_OPTIONS = [
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

export const FIRM_AGE_OPTIONS = [
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

export const FIRM_RATING_OPTIONS = [
  { value: "Any rating", label: "No" },
  { value: "3", label: "Yes, average rating of at least 3/5" },
  { value: "4", label: "Yes, average rating of at least 4/5" },
];

export const PROVIDER_REFERENCE_OPTIONS = [
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

export const CURRENCY_OPTIONS = [
  "Euro (€)",
  "Swedish krona (kr)",
  "Danish krone (kr)",
  "Polish złoty (zł)",
  "Czech koruna (Kč)",
  "Romanian leu (Leu)",
  "Bulgarian lev (лв)",
  "Hungarian forint (Ft)",
];

export const LANGUAGE_OPTIONS = [
  "English",
  "Finnish",
  "Swedish",
  "German",
  "French",
  "Other:",
];

export const PAYMENT_TERMS_OPTIONS = [
  "On a monthly basis, invoice sent at end of each calendar month",
  "On a quarterly basis, invoice sent at end of each quarter",
  "One time invoice upon completion of the assignment",
];

export const RETAINER_FEE_FIXED_OPTIONS = [
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

export const RETAINER_FEE_HOURLY_OPTIONS = [
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

export function retainerFeeOptionsForNeed(isFixedFee) {
  return isFixedFee ? RETAINER_FEE_FIXED_OPTIONS : RETAINER_FEE_HOURLY_OPTIONS;
}

export function normalizeRetainerFee(value, isFixedFee) {
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

export function getComparableDraftData(data) {
  const { backgroundFiles, supplierFiles, agree, ...draftData } = data || {};

  return {
    ...draftData,
    backgroundFiles: [],
    supplierFiles: [],
    agree: false,
  };
}

export function snapshotDraftData(data) {
  return JSON.stringify(getComparableDraftData(data));
}

export function formatDeadlineDate(value) {
  if (!value) return "";
  const [year, month, day] = String(value).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

export function stripYesNoPrefix(text) {
  if (!text) return "";
  const stripped = String(text)
    .replace(/^(yes|no),\s*/i, "")
    .replace(/\s+/g, " ")
    .replace(/\.+$/, "")
    .trim();
  if (!stripped) return String(text).trim();
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

export function optionLabel(options, value) {
  if (!value) return "";
  const match = (options || []).find((option) => option.value === value);
  return stripYesNoPrefix(match?.label || value);
}

export function selectedLanguagesFromForm(formData) {
  return [
    ...(formData.checkboxes || []).filter((lang) => lang !== "Other:"),
    formData.otherLang || null,
  ].filter(Boolean);
}

export function formatDraftSavedDate(draft) {
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
}

export function getSelectableLegalPanels(legalPanelGroups) {
  return (legalPanelGroups || []).filter(
    (group) => (group.providers || []).length > 0,
  );
}

export function getSelectedLegalPanel(legalPanelGroups, groupId) {
  return getSelectableLegalPanels(legalPanelGroups).find(
    (group) => group.id === groupId,
  );
}

export function eligibleFirmsSummary({
  usingLegalPanel,
  selectedLegalPanel,
  formData,
}) {
  if (usingLegalPanel) {
    if (!selectedLegalPanel) return "";
    return `${selectedLegalPanel.name} (${(selectedLegalPanel.providers || []).join(", ")})`;
  }

  return [
    optionLabel(OFFERER_OPTIONS, formData.offerer),
    optionLabel(PROVIDER_COUNTRY_OPTIONS, formData.providerCountry),
    optionLabel(LAWYER_COUNT_OPTIONS, formData.lawyerCount),
    optionLabel(FIRM_AGE_OPTIONS, formData.firmAge),
    formData.firmRating && formData.firmRating !== "Any rating"
      ? optionLabel(FIRM_RATING_OPTIONS, formData.firmRating)
      : "",
  ].filter(Boolean);
}

export function validateProviderOffers(
  formData,
  { usingLegalPanel, selectedLegalPanel, selectedLanguages } = {},
) {
  if (!formData.providerSource) {
    return {
      error: "Please choose whether to use a legal panel or provider criteria.",
      field: "providerSource",
    };
  }

  if (usingLegalPanel) {
    if (!formData.legalPanelGroupId) {
      return {
        error: "Please select a legal panel.",
        field: "legalPanelGroupId",
      };
    }
    if (!selectedLegalPanel) {
      return {
        error: "The selected legal panel has no providers.",
        field: "legalPanelGroupId",
      };
    }
  } else {
    if (!formData.offerer) {
      return {
        error: "Please choose which providers can offer.",
        field: "offerer",
      };
    }
    if (!formData.providerCountry) {
      return {
        error: "Please choose domestic/foreign offers.",
        field: "providerCountry",
      };
    }
    if (!formData.lawyerCount) {
      return {
        error: "Please choose a minimum provider size.",
        field: "lawyerCount",
      };
    }
    if (!formData.firmAge) {
      return {
        error: "Please choose a minimum company age.",
        field: "firmAge",
      };
    }
    if (!formData.firmRating) {
      return {
        error: "Please choose a minimum rating.",
        field: "firmRating",
      };
    }
  }

  if (!formData.providerReferences) {
    return {
      error: "Please choose the amount of references needed.",
      field: "providerReferences",
    };
  }
  if (!formData.currency) {
    return { error: "Please choose a currency.", field: "currency" };
  }
  if (!formData.retainerFee) {
    return {
      error: "Please choose an advance retainer option.",
      field: "retainerFee",
    };
  }
  if (!formData.paymentTerms) {
    return {
      error: "Please choose how you want to be invoiced.",
      field: "paymentTerms",
    };
  }
  if ((selectedLanguages || []).length === 0) {
    return {
      error: "Please select at least one language (or type another).",
      field: "languages",
    };
  }
  if (!formData.date) {
    return { error: "Please pick an offers deadline.", field: "date" };
  }

  return null;
}

export function validateReviewSubmit(formData) {
  if (!formData.requestTitle) {
    return {
      error: "Please give a title for your LEXIFY Request.",
      field: "requestTitle",
    };
  }
  if (!formData.agree) {
    return {
      error: "You must confirm you're ready to submit.",
      field: "agree",
    };
  }
  return null;
}

export function fileNames(files) {
  if (!Array.isArray(files) || files.length === 0) return "";
  return files.map((file) => file.name).join(", ");
}

export function legalPanelSubmitFields({
  usingLegalPanel,
  selectedLegalPanel,
  formData,
}) {
  if (usingLegalPanel) {
    return {
      ...PANEL_CRITERIA_DEFAULTS,
      providerReferences: formData.providerReferences,
      legalPanelGroupId: selectedLegalPanel?.id || null,
      legalPanelGroupName: selectedLegalPanel?.name || null,
      legalPanelProviders: selectedLegalPanel?.providers || [],
    };
  }

  return {
    serviceProviderType: formData.offerer,
    domesticOffers: formData.providerCountry,
    providerSize: formData.lawyerCount,
    providerCompanyAge: formData.firmAge,
    providerMinimumRating: formData.firmRating,
    providerReferences: formData.providerReferences,
    legalPanelGroupId: null,
    legalPanelGroupName: null,
    legalPanelProviders: [],
  };
}

export const HOURLY_RATE_NOTE =
  "Any offers you receive will provide an applicable hourly rate only. The total price of the service will be calculated by multiplying the hourly rate with the number of hours of legal support provided by the legal service provider submitting the winning offer. The offered hourly rate will be valid until the relevant customer contract has been signed or abandoned, whichever comes first.";

export const LUMP_SUM_NOTE =
  "Any offers you receive will be for a lump sum fixed price.";
