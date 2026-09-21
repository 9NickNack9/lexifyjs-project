import { applyStatedMonetaryRange, coerceDraftFieldsForRoute } from "@/lib/lexiDraftFields";
import { normalizeRetainerFee } from "@/lib/requestWizard";

export const LEXI_DRAFT_STORAGE_KEY = "lexify_lexi_draft";

const COUNTERPARTY_FIELDS = ["confidential", "counterparty"];

const FINANCE_ROUTES = new Set([
  "/contracts/finance-debt",
  "/contracts/finance-debt-terms",
  "/contracts/finance-breach-waiver",
]);

const COUNTERPARTY_IDENTIFIERS =
  /\b(?:business\s+(?:identity\s+)?(?:code|id)|business\s+id|country\s+of\s+domicile|counterparty\s*:|target\s+company\s*:)\b/i;

function sanitizeCounterpartyField(value) {
  if (value == null) return null;
  if (typeof value === "boolean") return null;

  const trimmed = String(value).trim();
  if (!trimmed || /^(true|false)$/i.test(trimmed)) return null;

  return trimmed;
}

function hasCounterpartyIdentifyingDetails(text) {
  return COUNTERPARTY_IDENTIFIERS.test(text);
}

function looksLikeDedicatedCounterpartyBlock(text) {
  if (!hasCounterpartyIdentifyingDetails(text)) return false;
  if (text.length <= 300) return true;
  if (/^(counterparty|target company)\s*:/i.test(text)) return true;

  const markerCount = [
    /\bbusiness\s+(?:identity\s+)?(?:code|id)\b/i,
    /\bcountry\s+of\s+domicile\b/i,
    /\bcounterparty\s*:/i,
  ].filter((pattern) => pattern.test(text)).length;

  return markerCount >= 2;
}

function relocateMisplacedCounterpartyInfo(draftData) {
  const result = { ...draftData };

  const existingConfidential = sanitizeCounterpartyField(result.confidential);
  const existingCounterparty = sanitizeCounterpartyField(result.counterparty);

  if (existingConfidential) {
    result.confidential = existingConfidential;
  } else {
    delete result.confidential;
  }

  if (existingCounterparty) {
    result.counterparty = existingCounterparty;
  } else {
    delete result.counterparty;
  }

  if (existingConfidential || existingCounterparty) {
    return result;
  }

  const background =
    typeof result.background === "string" ? result.background.trim() : "";
  if (!background || !looksLikeDedicatedCounterpartyBlock(background)) {
    return result;
  }

  result.confidential = background;
  delete result.background;

  return result;
}

function mapDraftFieldsForRoute(route, draftData) {
  const mapped = { ...draftData };

  // Some forms/APIs call the value field expectedValue; forms use priceRange
  if (mapped.expectedValue && !mapped.priceRange) {
    mapped.priceRange = mapped.expectedValue;
  }
  delete mapped.expectedValue;

  if (FINANCE_ROUTES.has(route)) {
    if (mapped.confidential && !mapped.counterparty) {
      mapped.counterparty = mapped.confidential;
    }
    delete mapped.confidential;
  }

  return mapped;
}

function getHelsinkiTodayParts() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Helsinki",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  return { year, month, day };
}

function getDateDaysAhead(days) {
  const { year, month, day } = getHelsinkiTodayParts();
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getDateSevenDaysAhead() {
  return getDateDaysAhead(7);
}

function isValidIsoDate(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;
  const parsed = Date.parse(`${trimmed}T12:00:00Z`);
  return !Number.isNaN(parsed);
}

const OFFERS_DEADLINE_UNIT =
  "(?:days?|day|weeks?|week|päivä(?:ä|n|ssä|än)?|paiva(?:a|n|ssa|an)?|viikko(?:a|n|ssa|on)?)";

/**
 * Resolve the RFP offers deadline from an explicit draft date or case-context preference.
 * Falls back to +7 days when no offers-timing preference is found.
 */
function resolveOffersDeadlineDate(caseContextText = "", draftData = {}) {
  const explicit =
    (typeof draftData.date === "string" && draftData.date.trim()) ||
    (typeof draftData.offersDeadline === "string" &&
      draftData.offersDeadline.trim()) ||
    "";
  if (isValidIsoDate(explicit)) {
    return explicit.trim().slice(0, 10);
  }

  const text = [caseContextText, draftData.description, draftData.background]
    .filter((part) => typeof part === "string" && part.trim())
    .join("\n");
  if (!text.trim()) return getDateSevenDaysAhead();

  const offersRelative = text.match(
    new RegExp(
      [
        // "get offers within 3 days" / "law firms respond within 1 week"
        `(?:offers?|bids?|tenders?|proposals?|tarjouks\\w*|tarjous(?:aika|ten|ta|pyynt)\\w*|anbud\\w*|offerter|responses?\\s+from\\s+(?:law\\s+)?firms?|provider\\s+responses?|law\\s+firms?\\s+(?:to\\s+)?(?:respond|reply|bid|offer)|legal\\s+service\\s+providers?\\s+(?:to\\s+)?(?:respond|reply|bid|offer)|get\\s+(?:the\\s+)?offers?|receive\\s+(?:the\\s+)?offers?|need\\s+(?:the\\s+)?offers?|want\\s+(?:the\\s+)?offers?)[\\s\\S]{0,60}?(?:within|in|inside|by|kuluessa|sisällä|sisalla)\\s+(?:about\\s+|approx(?:imately)?\\s+|roughly\\s+|noin\\s+)?(\\d+)\\s*${OFFERS_DEADLINE_UNIT}`,
        // "within 3 days ... offers/firms"
        `(?:within|in|inside|kuluessa|sisällä|sisalla)\\s+(?:about\\s+|approx(?:imately)?\\s+|roughly\\s+|noin\\s+)?(\\d+)\\s*${OFFERS_DEADLINE_UNIT}[\\s\\S]{0,60}?(?:offers?|bids?|tenders?|proposals?|tarjouks\\w*|tarjous(?:aika|ten|ta|pyynt)\\w*|anbud\\w*|law\\s+firms?|providers?|legal\\s+service\\s+providers?)`,
        // Finnish order: "Tarjoukset 3 päivän kuluessa" / "tarjousaika 5 päivää"
        `(?:tarjouks\\w*|tarjous(?:aika|ten|ta|pyynt)\\w*|anbud\\w*|offers?|bids?)\\s+(?:noin\\s+)?(\\d+)\\s*${OFFERS_DEADLINE_UNIT}(?:\\s*(?:kuluessa|sisällä|sisalla))?`,
        // Finnish order: "3 päivän kuluessa tarjoukset"
        `(\\d+)\\s*${OFFERS_DEADLINE_UNIT}\\s*(?:kuluessa|sisällä|sisalla)[\\s\\S]{0,40}?(?:tarjouks\\w*|tarjous(?:aika|ten|ta|pyynt)\\w*|anbud\\w*|offers?|bids?)`,
      ].join("|"),
      "i",
    ),
  );

  if (offersRelative) {
    const amount = Number.parseInt(
      offersRelative[1] ||
        offersRelative[2] ||
        offersRelative[3] ||
        offersRelative[4] ||
        "",
      10,
    );
    const unitSource = offersRelative[0] || "";
    if (Number.isFinite(amount) && amount > 0 && amount <= 90) {
      const days = /week|viikko/i.test(unitSource) ? amount * 7 : amount;
      return getDateDaysAhead(days);
    }
  }

  if (
    /\b(?:offers?|bids?|tenders?|tarjouks\w*|tarjousaika)\b[\s\S]{0,40}\basap\b|\basap\b[\s\S]{0,40}\b(?:offers?|bids?|tenders?|tarjouks\w*)/i.test(
      text,
    )
  ) {
    return getDateDaysAhead(2);
  }

  return getDateSevenDaysAhead();
}

const ONE_WRITTEN_REFERENCE = "Yes, 1 written reference must be provided";
const TWO_WRITTEN_REFERENCES = "Yes, 2 written references must be provided";

const REFERENCE_REQUEST_PATTERN =
  /\b(?:written\s+references?|references?\s+(?:from|by|of)\s+(?:the\s+)?(?:law\s+firms?|legal\s+service\s+providers?|providers?|counsel|lawyers?)|(?:law\s+firms?|legal\s+service\s+providers?|providers?|counsel|lawyers?)\b[\s\S]{0,80}\breferences?|(?:previous|prior|recent|past|comparable|similar)\s+(?:transactions?|deals?|matters?|assignments?|engagements?|cases?)\b[\s\S]{0,80}\b(?:references?|track\s+record|experience)|(?:references?|track\s+record)\b[\s\S]{0,80}\b(?:previous|prior|recent|past|comparable|similar)\s+(?:transactions?|deals?|matters?|assignments?|engagements?|cases?)|provide\s+(?:a\s+)?(?:written\s+)?references?|must\s+(?:include|provide|submit)\s+(?:a\s+)?(?:written\s+)?references?)\b/i;

function textRequestsProviderReferences(text) {
  return typeof text === "string" && REFERENCE_REQUEST_PATTERN.test(text);
}

function resolveProviderReferences(value, caseContextText = "", draftData = {}) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^Yes,\s*2\s+written reference/i.test(trimmed)) {
      return TWO_WRITTEN_REFERENCES;
    }
    if (/^Yes,\s*1\s+written reference/i.test(trimmed)) {
      return ONE_WRITTEN_REFERENCE;
    }
  }

  const contextAsksForReferences =
    textRequestsProviderReferences(caseContextText) ||
    textRequestsProviderReferences(draftData.description) ||
    textRequestsProviderReferences(draftData.background);

  return contextAsksForReferences ? ONE_WRITTEN_REFERENCE : "No";
}

const ALWAYS_HOURLY_ROUTES = new Set([
  "/contracts/emp-negotiation",
  "/contracts/ict-negotiation",
  "/contracts/sourcing-negotiation",
  "/contracts/data-breach",
]);

const ALWAYS_FIXED_ROUTES = new Set([
  "/contracts/emp-contract",
  "/contracts/emp-documents",
  "/contracts/ict-review",
  "/contracts/ict-template",
  "/contracts/sourcing-agreement",
  "/contracts/sourcing-comments",
  "/contracts/privacy-documentation",
  "/contracts/gdpr-compliance",
  "/contracts/finance-breach-waiver",
  "/requests/corporate-governance",
  "/requests/legal-training",
  "/requests/kyc",
]);

function draftNeedText(draftData) {
  return String(
    draftData?.need ||
      draftData?.supportType ||
      draftData?.templateType ||
      "",
  );
}

function isFixedFeeForLexiDraft(route, draftData) {
  if (ALWAYS_HOURLY_ROUTES.has(route)) return false;
  if (ALWAYS_FIXED_ROUTES.has(route)) return true;

  if (route === "/contracts/data-question") {
    return draftData?.pricingType === "Fixed Fee";
  }
  if (route === "/requests/legal-advice") {
    return /lump sum monthly|fixed monthly number of hours/i.test(
      draftNeedText(draftData),
    );
  }
  if (route === "/contracts/sales-b2b" || route === "/contracts/sales-b2c") {
    return /sales contract template/i.test(draftNeedText(draftData));
  }
  if (
    route === "/contracts/dispute-court" ||
    route === "/contracts/dispute-arbitration"
  ) {
    return /^Full legal representation/i.test(draftNeedText(draftData));
  }
  if (route === "/contracts/dispute-settlement") {
    return /^Full legal representation in settlement/i.test(
      draftNeedText(draftData),
    );
  }
  if (route === "/contracts/dispute-debt") {
    return /legal letter addressed to a debtor/i.test(draftNeedText(draftData));
  }

  const need = draftNeedText(draftData);
  if (/^Occasional (?:legal )?support/i.test(need)) return false;
  return true;
}

function applyRetainerFeeForDraft(draftData, route) {
  const isFixedFee = isFixedFeeForLexiDraft(route, draftData);
  return {
    ...draftData,
    retainerFee:
      normalizeRetainerFee(draftData.retainerFee || "No", isFixedFee) || "No",
  };
}

function applyProviderDefaults(draftData, caseContextText = "") {
  const resolved = {
    ...draftData,
    providerSource:
      draftData.providerSource === "panel" ? "panel" : "criteria",
    offerer: "All",
    providerCountry:
      "Yes, I want offers from domestic legal service providers only.",
    lawyerCount: "Any size",
    firmAge: "Any age",
    firmRating: "Any rating",
    providerReferences: resolveProviderReferences(
      draftData.providerReferences,
      caseContextText,
      draftData,
    ),
    currency: "Euro (€)",
    retainerFee: draftData.retainerFee || "No",
    paymentTerms:
      "On a monthly basis, invoice sent at end of each calendar month",
    checkboxes: ["English", "Finnish"],
    date: resolveOffersDeadlineDate(caseContextText, draftData),
  };
  delete resolved.offersDeadline;
  return resolved;
}

const BILLING_PROPOSAL_SENTENCE =
  /[^.!?\n]*(?:\blaw\s+firms?\b|\blegal\s+service\s+providers?\b|\bproviders?\b|\boffer(?:er|ors)?\b)[^.!?\n]*(?:\bbilling\b|\bfee\s+structure\b|\bfee\s+model\b|\bpricing\s+(?:approach|model|structure)\b|\bfixed\s+fee\b|\bhourly\s+rate\b|\bpropose\b|\bsuggest\b)[^.!?\n]*[.!?]?/gi;

const OPEN_BILLING_SENTENCE =
  /[^.!?\n]*(?:\bpropose\b|\bsuggest\b|\bindicate\b|\bchoose\b|\bdetermine\b)[^.!?\n]*(?:\bbilling\b|\bfee\s+structure\b|\bfee\s+model\b|\bfixed\s+(?:or\s+)?(?:fee|hourly)\b|\bhourly\s+(?:or\s+)?(?:fixed\s+)?(?:fee|rate)\b)[^.!?\n]*[.!?]?/gi;

function stripRfpPlaceholderLanguage(text) {
  if (typeof text !== "string" || !text.trim()) return text;

  return text
    .replace(
      /[^.!?\n]*(?:täydennetään|lisätään|tarkennetaan|ilmoitetaan)[^.!?\n]{0,80}(?:tarjouspyyntöön|tarjouspyynnössä|tarjouspyyntöä)[^.!?\n]*[.!?]?/gi,
      " ",
    )
    .replace(
      /[^.!?\n]*(?:tarjouspyyntöön|tarjouspyynnössä)[^.!?\n]{0,40}(?:täydennetään|lisätään|tarkennetaan)[^.!?\n]*[.!?]?/gi,
      " ",
    )
    .replace(
      /[^.!?\n]*(?:will be|to be|can be)\s+(?:completed|added|filled(?:\s+in)?|supplemented|provided|specified|confirmed|updated)[^.!?\n]{0,80}\b(?:(?:the\s+)?(?:LEXIFY\s+)?(?:Request|RFP|tender)|this request)\b[^.!?\n]*[.!?]?/gi,
      " ",
    )
    .replace(
      /[^.!?\n]*\b(?:completed|added|filled in|supplemented)\s+(?:later\s+)?(?:in|to|on)\s+(?:the\s+)?(?:LEXIFY\s+)?(?:Request|RFP)\b[^.!?\n]*[.!?]?/gi,
      " ",
    )
    .replace(
      /[^.!?\n]*(?:kompletteras|anges|fylls i)[^.!?\n]{0,80}(?:förfrågan|anbudsförfrågan)[^.!?\n]*[.!?]?/gi,
      " ",
    )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function stripBillingProposalLanguage(text) {
  if (typeof text !== "string" || !text.trim()) return text;

  return text
    .replace(BILLING_PROPOSAL_SENTENCE, " ")
    .replace(OPEN_BILLING_SENTENCE, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

const WINNING_BIDDER_ONLY = "Disclosed to Winning Bidder Only";

const ANONYMITY_REQUEST_PATTERN =
  /\b(?:anonymous(?:ly)?|anonymity|undisclosed|winning\s+bidder\s+only|do\s+not\s+disclose|don't\s+disclose|keep\s+(?:the\s+)?(?:identity|name|counterparty|target(?:\s+company)?)\b[\s\S]{0,80}\b(?:confidential|private|hidden|secret|anonymous)|(?:identity|name)\b[\s\S]{0,80}\b(?:not\s+(?:be\s+)?(?:disclosed|visible|shared|revealed)|remain(?:s)?\s+(?:confidential|private|anonymous)|stay(?:s)?\s+(?:confidential|private|anonymous)))\b/i;

function decodeLiteralBreaks(text) {
  if (typeof text !== "string" || !text) return text;

  return text
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sanitizeNarrativeFields(draftData) {
  const result = { ...draftData };

  for (const [field, value] of Object.entries(result)) {
    if (typeof value !== "string") continue;
    result[field] = decodeLiteralBreaks(value);
  }

  for (const field of ["description", "background", "generalDescription", "breachStatus"]) {
    if (typeof result[field] !== "string") continue;
    const cleaned = stripRfpPlaceholderLanguage(
      stripBillingProposalLanguage(result[field]),
    );
    if (cleaned) {
      result[field] = cleaned;
    } else {
      delete result[field];
    }
  }

  return result;
}

function textRequestsPartyAnonymity(text) {
  return typeof text === "string" && ANONYMITY_REQUEST_PATTERN.test(text);
}

function applyAnonymityConfboxes(draftData, caseContextText = "") {
  const result = { ...draftData };
  const existing = Array.isArray(result.confboxes) ? [...result.confboxes] : [];

  const alreadyChecked = existing.includes(WINNING_BIDDER_ONLY);
  const contextSaysAnonymous =
    textRequestsPartyAnonymity(caseContextText) ||
    textRequestsPartyAnonymity(result.description) ||
    textRequestsPartyAnonymity(result.background) ||
    textRequestsPartyAnonymity(result.confidential) ||
    textRequestsPartyAnonymity(result.counterparty);

  if (alreadyChecked || contextSaysAnonymous) {
    result.confboxes = alreadyChecked
      ? existing
      : [...existing, WINNING_BIDDER_ONLY];
  } else if ("confboxes" in result && existing.length === 0) {
    delete result.confboxes;
  }

  return result;
}

const ORG_PROFILE_ROUTES = new Set([
  "/contracts/privacy-documentation",
  "/contracts/data-breach",
]);

function extractEmployeeCountFromText(text) {
  if (typeof text !== "string" || !text.trim()) return null;

  const patterns = [
    /\b(?:approximately|approx\.?|about|around|roughly|noin|cirka|ca\.?)\s*(\d[\d\s,]{0,12})\s*(?:\+)?\s*(?:employees?|staff(?:\s+members?)?|workers|henkilöstö|työntekij(?:ää|ät|öitä)?)/i,
    /\b(\d[\d\s,]{0,12})\s*(?:\+)?\s*(?:employees?|staff(?:\s+members?)?|workers|henkilöstö|työntekij(?:ää|ät|öitä)?)/i,
    /\b(?:employee(?:\s+count|\s+headcount)?|headcount|staff(?:\s+size)?|henkilöstö(?:määrä)?)\s*(?:is|of|:|on)?\s*(?:approximately|approx\.?|about|around|roughly|noin|cirka|ca\.?)?\s*(\d[\d\s,]{0,12})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const raw = (match[1] || "").replace(/\s+/g, "").replace(/,/g, "");
    if (!raw || !/^\d+$/.test(raw)) continue;
    return match[0].includes("approximately") ||
      match[0].includes("about") ||
      match[0].includes("around") ||
      match[0].includes("roughly") ||
      match[0].includes("approx") ||
      match[0].includes("noin") ||
      match[0].includes("cirka")
      ? `approximately ${raw}`
      : raw;
  }

  return null;
}

const DATA_BREACH_INCIDENT_PATTERN =
  /\b(?:personal\s+data\s+breach|data\s+breach|tietosuojaloukkaus|tietovuoto|tieto(?:jen)?\s+vuot(?:o|anut)|unauthorized\s+(?:access|part(?:y|ies))|unlawfully\s+(?:accessed|disclosed|obtained)|ransomware|phishing|exfiltrat|(?:data|tiedot)\s+(?:was|were|have\s+been|has\s+been)\s+(?:leaked|stolen|lost|exposed|accessed|disclosed|compromised)|accidentally\s+disclosed|sent\s+to\s+the\s+wrong|wrong\s+recipient|stolen\s+(?:laptop|device|usb)|lost\s+(?:laptop|device|usb)|supervisory\s+authority|tietosuojavaltuutettu|article\s+33|article\s+34|actions?\s+(?:have\s+been\s+)?taken|when\s+(?:did\s+)?the\s+breach|what\s+data\s+was|impacted\s+(?:personal\s+)?data|personal\s+data\s+of|henkilötieto|ilmoitimme|ilmoitettu)\b/i;

const LINE_OF_BUSINESS_PATTERN =
  /\b(?:line\s+of\s+business|operates?\s+in|we\s+(?:sell|provide|offer|manufacture|develop|operate|supply)|our\s+company\s+(?:sells|provides|offers|operates|is\s+a|develops)|toimiala|liiketoiminta|tarjoamme|myymme|toimimme|products?\s+(?:and|or)\s+services?)\b/i;

const CASE_BACKGROUND_PATTERN =
  /\b(?:we need legal|need legal support|legal support with|we are (?:currently )?(?:negotiat|reviewing|commenting)|(?:the|our|a) customer(?:'s)?\s+(?:sent|has|wants|asked|provided|template|contract|comments|agreement)|our customer|the counterparty|comments? (?:on|from)|template sent by|sent (?:us |to us )?(?:a |their )?(?:draft |contract|agreement)|review (?:of )?(?:the |their )?(?:contract|agreement|template)|further (?:negotiation|assistance)|key issues?|who will (?:do|handle)|we would like (?:legal|the firm)|please (?:review|comment)|tarvitsemme|oikeudellista (?:tukea|apua)|neuvottelemme|asiakas (?:on )?lähettänyt|asiakkaan (?:sopimus|komment)|sopimusluonnos|lisätietoja|taustatiedot)\b/i;

const LINE_OF_BUSINESS_DESCRIPTION_ROUTES = new Set([
  "/contracts/sales-b2b",
  "/contracts/sales-b2c",
  "/contracts/ict-template",
  "/contracts/ict-review",
  "/contracts/ict-negotiation",
  "/contracts/sourcing-comments",
  "/contracts/sourcing-negotiation",
  "/contracts/gdpr-compliance",
  "/contracts/privacy-documentation",
  "/contracts/data-breach",
  "/requests/kyc",
  "/requests/legal-advice",
  "/requests/data-privacy",
]);

function splitNarrativeSentences(text) {
  if (typeof text !== "string" || !text.trim()) return [];
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function looksLikeDataBreachIncident(text) {
  return typeof text === "string" && DATA_BREACH_INCIDENT_PATTERN.test(text);
}

function looksLikeCaseBackground(text) {
  return typeof text === "string" && CASE_BACKGROUND_PATTERN.test(text);
}

function looksLikePageCount(text) {
  return (
    typeof text === "string" &&
    /\b\d{1,4}\s*(?:-|–)?\s*(?:page|pages|sivua|sivu(?:a|inen)?)\b/i.test(text)
  );
}

function looksLikeLineOfBusiness(text) {
  return (
    typeof text === "string" &&
    LINE_OF_BUSINESS_PATTERN.test(text) &&
    !looksLikeDataBreachIncident(text) &&
    !looksLikeCaseBackground(text)
  );
}

function mergeUniqueNarrative(existing, incoming) {
  const current = typeof existing === "string" ? existing.trim() : "";
  const next = typeof incoming === "string" ? incoming.trim() : "";
  if (!next) return current;
  if (!current) return next;
  if (current.includes(next)) return current;
  if (next.includes(current)) return next;
  return `${current}\n\n${next}`;
}

function splitDataBreachDescription(text) {
  const sentences = splitNarrativeSentences(text);
  if (!sentences.length) {
    return { lineOfBusiness: "", incident: "" };
  }

  const lineOfBusiness = [];
  const incident = [];

  for (const sentence of sentences) {
    if (looksLikeDataBreachIncident(sentence)) {
      incident.push(sentence);
    } else if (looksLikeLineOfBusiness(sentence)) {
      lineOfBusiness.push(sentence);
    } else if (incident.length && !lineOfBusiness.length) {
      incident.push(sentence);
    } else if (lineOfBusiness.length && !looksLikeDataBreachIncident(text)) {
      lineOfBusiness.push(sentence);
    } else if (looksLikeDataBreachIncident(text)) {
      incident.push(sentence);
    } else {
      lineOfBusiness.push(sentence);
    }
  }

  return {
    lineOfBusiness: lineOfBusiness.join(" ").trim(),
    incident: incident.join(" ").trim(),
  };
}

function relocateDataBreachFields(draftData, route) {
  if (route !== "/contracts/data-breach" || !draftData || typeof draftData !== "object") {
    return draftData;
  }

  const result = { ...draftData };
  const description =
    typeof result.description === "string" ? result.description.trim() : "";
  const background =
    typeof result.background === "string" ? result.background.trim() : "";
  let breachStatus =
    typeof result.breachStatus === "string" ? result.breachStatus.trim() : "";

  if (description) {
    const split = splitDataBreachDescription(description);
    if (split.incident) {
      breachStatus = mergeUniqueNarrative(breachStatus, split.incident);
      if (split.lineOfBusiness) {
        result.description = split.lineOfBusiness;
      } else {
        delete result.description;
      }
    }
  }

  if (!breachStatus && background && looksLikeDataBreachIncident(background)) {
    const split = splitDataBreachDescription(background);
    if (split.incident) {
      breachStatus = split.incident;
      if (split.lineOfBusiness) {
        result.background = split.lineOfBusiness;
      } else {
        delete result.background;
      }
    }
  }

  if (breachStatus) {
    result.breachStatus = breachStatus;
  }

  return result;
}

function splitLineOfBusinessDescription(text) {
  const sentences = splitNarrativeSentences(text);
  if (!sentences.length) {
    return { lineOfBusiness: "", background: "" };
  }

  const lineOfBusiness = [];
  const background = [];

  for (const sentence of sentences) {
    if (looksLikePageCount(sentence)) {
      lineOfBusiness.push(sentence);
    } else if (looksLikeCaseBackground(sentence)) {
      background.push(sentence);
    } else if (looksLikeLineOfBusiness(sentence)) {
      lineOfBusiness.push(sentence);
    } else if (background.length && !lineOfBusiness.length) {
      background.push(sentence);
    } else if (lineOfBusiness.length && !looksLikeCaseBackground(text)) {
      lineOfBusiness.push(sentence);
    } else if (looksLikeCaseBackground(text)) {
      background.push(sentence);
    } else {
      lineOfBusiness.push(sentence);
    }
  }

  return {
    lineOfBusiness: lineOfBusiness.join(" ").trim(),
    background: background.join(" ").trim(),
  };
}

function relocateBackgroundFromLineOfBusinessDescription(draftData, route) {
  if (
    !LINE_OF_BUSINESS_DESCRIPTION_ROUTES.has(route) ||
    !draftData ||
    typeof draftData !== "object"
  ) {
    return draftData;
  }

  const result = { ...draftData };
  const description =
    typeof result.description === "string" ? result.description.trim() : "";
  if (!description || !looksLikeCaseBackground(description)) {
    return result;
  }

  const split = splitLineOfBusinessDescription(description);
  if (!split.background) {
    return result;
  }

  if (split.lineOfBusiness) {
    result.description = split.lineOfBusiness;
  } else {
    delete result.description;
  }

  result.background = mergeUniqueNarrative(result.background, split.background);
  return result;
}

function extractPageCountPhrase(text) {
  if (typeof text !== "string" || !text.trim()) return null;

  const match = text.match(
    /((?:approximately|about|around|roughly|approx\.?|noin|cirka|ca\.?)\s*)?(\d{1,4})\s*(?:-|–)?\s*(?:page|pages|sivua|sivu(?:a|inen)?)\b/i,
  );
  if (!match) return null;

  const approx = Boolean(match[1]);
  const count = match[2];
  return { count, approx, raw: match[0].trim() };
}

function descriptionHasPageCount(text) {
  return looksLikePageCount(text);
}

function applySupplierAgreementPageCount(draftData, route, caseContextText = "") {
  if (route !== "/contracts/sourcing-comments" || !draftData || typeof draftData !== "object") {
    return draftData;
  }

  const result = { ...draftData };
  const description =
    typeof result.description === "string" ? result.description.trim() : "";
  if (descriptionHasPageCount(description)) {
    return result;
  }

  const combined = [caseContextText, result.background, description]
    .filter((part) => typeof part === "string" && part.trim())
    .join("\n");
  const extracted = extractPageCountPhrase(combined);
  if (!extracted) {
    return result;
  }

  const looksFinnish =
    /[äöÄÖ]/.test(combined) &&
    /\b(ja|että|olemme|tarvitsemme|sopimus|toimittaja|sivua)\b/i.test(combined);
  const pageSentence = looksFinnish
    ? extracted.approx
      ? `Toimittajan lähettämässä sopimuksessa on noin ${extracted.count} sivua.`
      : `Toimittajan lähettämässä sopimuksessa on ${extracted.count} sivua.`
    : extracted.approx
      ? `The agreement sent by the supplier is approximately ${extracted.count} pages.`
      : `The agreement sent by the supplier is ${extracted.count} pages.`;

  result.description = description
    ? `${description.replace(/[.?!]?$/, ".")} ${pageSentence}`
    : pageSentence;
  return result;
}

function fillMissingOrgProfileFields(draftData, route, caseContextText = "") {
  if (!ORG_PROFILE_ROUTES.has(route) || !draftData || typeof draftData !== "object") {
    return draftData;
  }

  const result = { ...draftData };
  const hasEmployeeCount =
    typeof result.employeeCount === "string" && result.employeeCount.trim();

  if (!hasEmployeeCount) {
    const combined = [caseContextText, result.description, result.background]
      .filter((part) => typeof part === "string" && part.trim())
      .join("\n");
    const extracted = extractEmployeeCountFromText(combined);
    if (extracted) {
      result.employeeCount = extracted;
    }
  }

  return result;
}

const MA_RED_FLAG_DD =
  "'Red flag' report - report outlines significant legal concerns only";

const MA_LONG_FORM_DD =
  "Long form report - report provides a comprehensive review of all legal matters related to the target";

const MA_DD_NOT_NEEDED = "Legal Due Diligence inspection not needed";

const NO_DUE_DILIGENCE_PATTERN =
  /\b(?:(?:no|without|skip(?:ping)?)\s+(?:a\s+|any\s+|legal\s+)?due\s+diligence|(?:legal\s+)?due\s+diligence\s+(?:inspection\s+)?(?:is\s+)?not\s+(?:needed|required|necessary)|(?:legal\s+)?due\s+diligence\s+(?:is\s+)?unnecessary|dd\s+(?:is\s+)?not\s+(?:needed|required)|due\s+diligence(?:ä|a)?\s+ei(?:\s+(?:tarvita|tarvitaan|tehdä))?)\b/i;

const LONG_FORM_DD_PATTERN =
  /\b(?:long[\s-]?form|comprehensive\s+(?:legal\s+)?(?:dd|due\s+diligence)|full(?:-|\s+)(?:legal\s+)?due\s+diligence)\b/i;

const RED_FLAG_DD_PATTERN = /\b(?:red[\s-]?flag)\b/i;

const DUE_DILIGENCE_ROUTES = new Set([
  "/requests/mergers-acquisitions",
  "/contracts/re-sale",
  "/contracts/re-leaseback",
]);

function supportIncludesDueDiligenceField(supportType) {
  return /legal due diligence inspection of the target/i.test(
    String(supportType || ""),
  );
}

function isBuySideDueDiligenceCustomer(draftData, route) {
  const customerType =
    typeof draftData?.customerType === "string" ? draftData.customerType : "";
  if (route === "/contracts/re-leaseback") {
    return customerType === "I am buyer and lessor";
  }
  return customerType === "I am the buyer";
}

function applyDueDiligenceDefault(draftData, route, caseContextText = "") {
  if (!DUE_DILIGENCE_ROUTES.has(route) || !draftData || typeof draftData !== "object") {
    return draftData;
  }

  const supportType =
    typeof draftData.supportType === "string" ? draftData.supportType : "";
  if (!supportIncludesDueDiligenceField(supportType)) {
    return draftData;
  }

  const context = [
    caseContextText,
    draftData.description,
    draftData.background,
  ]
    .filter((part) => typeof part === "string" && part.trim())
    .join("\n");

  const result = { ...draftData };
  const allowsNotNeeded = /comprehensive legal support/i.test(supportType);

  if (NO_DUE_DILIGENCE_PATTERN.test(context)) {
    if (allowsNotNeeded) {
      result.dueDiligence = MA_DD_NOT_NEEDED;
    }
    return result;
  }

  if (LONG_FORM_DD_PATTERN.test(context) && !RED_FLAG_DD_PATTERN.test(context)) {
    result.dueDiligence = MA_LONG_FORM_DD;
    return result;
  }

  if (RED_FLAG_DD_PATTERN.test(context)) {
    result.dueDiligence = MA_RED_FLAG_DD;
    return result;
  }

  if (!isBuySideDueDiligenceCustomer(result, route)) {
    return result;
  }

  const current =
    typeof result.dueDiligence === "string" ? result.dueDiligence.trim() : "";
  if (!current || current === MA_DD_NOT_NEEDED) {
    result.dueDiligence = MA_RED_FLAG_DD;
  }

  return result;
}

export function sanitizeDraftData(draftData, route = null, caseContextText = "") {
  if (!draftData || typeof draftData !== "object") return draftData;

  let sanitized = relocateMisplacedCounterpartyInfo(draftData);
  sanitized = sanitizeNarrativeFields(sanitized);
  sanitized = applyAnonymityConfboxes(sanitized, caseContextText);

  for (const field of COUNTERPARTY_FIELDS) {
    if (!(field in sanitized)) continue;

    const cleaned = sanitizeCounterpartyField(sanitized[field]);
    if (cleaned) {
      sanitized[field] = cleaned;
    } else {
      delete sanitized[field];
    }
  }

  sanitized = applyProviderDefaults(sanitized, caseContextText);

  if (route) {
    sanitized = mapDraftFieldsForRoute(route, sanitized);
    sanitized = coerceDraftFieldsForRoute(route, sanitized);
    sanitized = applyStatedMonetaryRange(sanitized, route, caseContextText);
    sanitized = fillMissingOrgProfileFields(sanitized, route, caseContextText);
    sanitized = relocateDataBreachFields(sanitized, route);
    sanitized = relocateBackgroundFromLineOfBusinessDescription(sanitized, route);
    sanitized = applySupplierAgreementPageCount(
      sanitized,
      route,
      caseContextText,
    );
    sanitized = applyDueDiligenceDefault(
      sanitized,
      route,
      caseContextText,
    );
    sanitized = applyRetainerFeeForDraft(sanitized, route);
  } else {
    sanitized = applyRetainerFeeForDraft(sanitized, null);
  }

  return sanitized;
}

export function saveLexiDraft(route, draftData, caseContextText = "") {
  if (typeof window === "undefined" || !route || !draftData) return;

  sessionStorage.setItem(
    LEXI_DRAFT_STORAGE_KEY,
    JSON.stringify({
      route,
      draftData: sanitizeDraftData(draftData, route, caseContextText),
      caseContextText: caseContextText || "",
      savedAt: Date.now(),
    }),
  );
}

export function consumeLexiDraft(route) {
  if (typeof window === "undefined" || !route) return null;

  try {
    const raw = sessionStorage.getItem(LEXI_DRAFT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (parsed?.route !== route || !parsed?.draftData) return null;

    sessionStorage.removeItem(LEXI_DRAFT_STORAGE_KEY);
    return sanitizeDraftData(
      parsed.draftData,
      route,
      parsed.caseContextText || "",
    );
  } catch {
    sessionStorage.removeItem(LEXI_DRAFT_STORAGE_KEY);
    return null;
  }
}
