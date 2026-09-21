"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronRight,
  FilePen,
  ListChecks,
  Minus,
  Plus,
  Search,
  Send,
  Shield,
} from "lucide-react";
import { saveLexiDraft } from "@/lib/lexiDraft";
import { LEXI_APPLY_DRAFT_EVENT } from "@/hooks/useLexiDraftPrefill";
import { inferChatIntent, isApplyOptimizationsRequest } from "@/lib/lexiIntent";
import { LEXI_START_DRAFT_EVENT } from "@/lib/lexiChat";

async function convertFilesToDataURLs(files) {
  return Promise.all(
    files.map(
      (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              type: "file",
              filename: file.name,
              mediaType: file.type || "application/pdf",
              url: reader.result,
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        }),
    ),
  );
}

function stripDraftDataBlock(text) {
  if (!text) return text;

  const markerMatch = text.match(/DRAFT_DATA:\s*\{/i);
  if (!markerMatch) {
    return text.replace(/\bDRAFT_DATA\b/gi, "draft request");
  }

  const markerIndex = markerMatch.index;
  const jsonStart = text.indexOf("{", markerIndex);
  if (jsonStart === -1) {
    return text
      .replace(/DRAFT_DATA:\s*/i, "")
      .replace(/\bDRAFT_DATA\b/gi, "draft request");
  }

  let depth = 0;
  for (let i = jsonStart; i < text.length; i += 1) {
    if (text[i] === "{") depth += 1;
    if (text[i] === "}") depth -= 1;
    if (depth === 0) {
      const before = text.slice(0, markerIndex);
      const after = text.slice(i + 1);
      return `${before}${after}`.replace(/\bDRAFT_DATA\b/gi, "draft request");
    }
  }

  // Incomplete JSON: drop from marker to end so partial machine output stays hidden
  return text
    .slice(0, markerIndex)
    .replace(/\bDRAFT_DATA\b/gi, "draft request");
}

function extractRouteFromText(text) {
  if (!text) return null;
  const routeMatch = text.match(/Route:\s*(\/[^\s]+)/i);
  return routeMatch ? routeMatch[1] : null;
}

function extractLabeledField(text, field) {
  if (!text) return null;
  const match = text.match(new RegExp(`${field}:\\s*(.*)`, "i"));
  if (!match) return null;
  const value = match[1].split("\n")[0].trim();
  if (!value || /^n\/a$/i.test(value)) return null;
  return value;
}

function formatRecommendedRequestType(category, subcategory, assignment) {
  return [category, subcategory, assignment].filter(Boolean).join(" → ");
}

function parseAssistantMessage(rawText, { isUpdatedDraft = false } = {}) {
  const text = rawText
    .replace(/\[INTENT:.*?\]\s*/g, "")
    .replace(/\n\nCURRENT_REQUEST_CONTEXT:\n[\s\S]*$/g, "");

  const route = extractRouteFromText(text);
  const recommendedCategory = extractLabeledField(text, "Recommended Category");
  const recommendedSubcategory = extractLabeledField(
    text,
    "Recommended Subcategory",
  );
  const recommendedAssignment = extractLabeledField(
    text,
    "Recommended Assignment Type",
  );
  const recommendedRequestType = formatRecommendedRequestType(
    recommendedCategory,
    recommendedSubcategory,
    recommendedAssignment,
  );

  const openDraftLabelMatch = text.match(/OPEN_DRAFT_LABEL:\s*([^\n]+)/i);
  const openDraftLabel = openDraftLabelMatch
    ? openDraftLabelMatch[1].trim()
    : null;

  const reviewDraftNoteMatch = text.match(/REVIEW_DRAFT_NOTE:\s*([^\n]+)/i);
  const reviewDraftNote = reviewDraftNoteMatch
    ? reviewDraftNoteMatch[1].trim()
    : null;

  let draftData = null;
  const draftMarker = "DRAFT_DATA:";
  const draftStart = text.indexOf(draftMarker);
  if (draftStart !== -1) {
    const jsonStart = text.indexOf("{", draftStart);
    if (jsonStart !== -1) {
      let depth = 0;
      for (let i = jsonStart; i < text.length; i += 1) {
        if (text[i] === "{") depth += 1;
        if (text[i] === "}") depth -= 1;
        if (depth === 0) {
          try {
            draftData = JSON.parse(text.slice(jsonStart, i + 1));
          } catch {
            draftData = null;
          }
          break;
        }
      }
    }
  }

  const cleanedText = stripDraftDataBlock(text)
    .replace(/^\s*Route\s*:\s*\/[^\s]+/gim, "")
    .replace(/\bRoute\s*:\s*\/[^\s]+/gi, "")
    .replace(/OPEN_DRAFT_LABEL:\s*[^\n]*/gi, "")
    .replace(/REVIEW_DRAFT_NOTE:\s*[^\n]*/gi, "")
    .replace(/\bOPEN_DRAFT_LABEL\b/gi, "")
    .replace(/\bREVIEW_DRAFT_NOTE\b/gi, "")
    .replace(/\brequestTitle\b/gi, "request title")
    .replace(/\bsupportType\b/gi, "scope of work")
    .replace(/\btemplateType\b/gi, "template type")
    .replace(/\btemplateboxes\b/gi, "template options")
    .replace(/\bareaboxes\b/gi, "selected areas")
    .replace(/\bconfboxes\b/gi, "disclosure options")
    .replace(/\bmaxPrice\b/gi, "maximum price")
    .replace(/\bcheckboxes\b/gi, "language options")
    .split("\n")
    .map((line) => {
      // Hide machine-readable recommendation / routing lines from the chat UI
      if (
        /^\s*Recommended\s+(Category|Subcategory|Assignment Type)\s*:/i.test(
          line,
        )
      ) {
        return "";
      }
      if (/^\s*Route\s*:/i.test(line)) return "";
      // Keep marker for splitting; stripped from display after split
      if (/^\s*---OPTIMIZATIONS---\s*$/i.test(line))
        return "---OPTIMIZATIONS---";
      if (/^\s*[-•]/.test(line)) return line;

      return line
        .replace(
          /[^.!?]*(?:category\s+tree|no further subcategory|assignment type|fits squarely within|with no further subcategor(?:y|ies))[^.!?]*[.!?]?/gi,
          " ",
        )
        .replace(
          /[^.!?]*(?:\b(?:this|that|it|your case|the case|your need|the need)\b[^.!?]{0,80}\b(?:fits|fit|matches|match|belongs to|is best suited for|aligns with|falls (?:under|within)|maps to)\b[^.!?]{0,120}\b(?:request type|LEXIFY request|category|subcategory|assignment)\b)[^.!?]*[.!?]?/gi,
          " ",
        )
        .replace(
          /[^.!?]*(?:\b(?:sopii|sopia|kuuluu|vastaa)\b[^.!?]{0,120}\b(?:tarjouspyynt[oö](?:tyyppi)?|kategori(?:a|aan)|toimeksiant))[^.!?]*[.!?]?/gi,
          " ",
        )
        .replace(/\bRoute\s*:\s*\/[^\s]+/gi, "")
        .replace(/[ \t]{2,}/g, " ")
        .trim();
    })
    .filter((line, index, arr) => !(line === "" && arr[index - 1] === ""))
    .join("\n")
    .trim();

  const optimizationParts = cleanedText
    .split(/\s*---OPTIMIZATIONS---\s*/i)
    .map((part) => part.trim())
    .filter(Boolean);

  let introText = "";
  let optimizationsText = "";

  if (optimizationParts.length >= 2) {
    // Use the last marker block as optimizations; earlier blocks are intro
    introText = optimizationParts.slice(0, -1).join("\n\n").trim();
    optimizationsText = optimizationParts[optimizationParts.length - 1].trim();
  } else {
    const legacyMatch = cleanedText.match(
      /^([\s\S]*?)(\n\s*(?:Suggested Optimizations|Ehdotetut optimoinnit|Suositellut (?:optimoinnit|lisäykset)|Ehdotetut lisäykset|Föreslagna (?:optimeringar|tillägg))\s*:?\s*\n[\s\S]*)$/i,
    );
    introText = (legacyMatch ? legacyMatch[1] : cleanedText).trim();
    optimizationsText = (legacyMatch ? legacyMatch[2] : "").trim();
  }

  introText = stripOptimizationsMarker(introText);
  optimizationsText = stripOptimizationsMarker(optimizationsText);
  introText = stripPricingConsequenceLanguage(introText);
  optimizationsText = stripPricingConsequenceLanguage(optimizationsText);
  optimizationsText = filterOptimizationsCoveredByDraft(
    optimizationsText,
    draftData,
  );
  optimizationsText = ensurePropertyIdentifierOptimization(
    optimizationsText,
    route,
    draftData,
    recommendedRequestType,
    `${introText}\n${optimizationsText}`,
  );
  optimizationsText = ensureDueDiligenceOptimization(
    optimizationsText,
    route,
    draftData,
    recommendedRequestType,
    `${introText}\n${optimizationsText}`,
  );

  const sampleForLanguage = `${introText}\n${optimizationsText}\n${openDraftLabel || ""}`;
  const labelLooksUpdated =
    /updated draft|päivitetylle tarjouspyyntö|uppdaterade förfrågan/i.test(
      openDraftLabel || "",
    );
  const resolvedOpenDraftLabel =
    openDraftLabel ||
    inferOpenDraftLabel(
      sampleForLanguage,
      Boolean(draftData),
      isUpdatedDraft || labelLooksUpdated,
    );
  const resolvedReviewDraftNote =
    reviewDraftNote || inferReviewDraftNote(sampleForLanguage);

  // Remove duplicate button label text from visible message body
  introText = stripDuplicateButtonLabel(introText, resolvedOpenDraftLabel);
  optimizationsText = stripDuplicateButtonLabel(
    optimizationsText,
    resolvedOpenDraftLabel,
  );
  introText = stripDuplicateButtonLabel(introText, resolvedReviewDraftNote);
  optimizationsText = stripDuplicateButtonLabel(
    optimizationsText,
    resolvedReviewDraftNote,
  );

  // If machine fields were stripped and nothing visible remains, keep a short status line
  if (!introText && !optimizationsText && draftData) {
    introText = inferUpdatedDraftFallback(sampleForLanguage, isUpdatedDraft);
  }

  return {
    cleanedText,
    introText,
    optimizationsText,
    route,
    draftData,
    recommendedRequestType,
    openDraftLabel: resolvedOpenDraftLabel,
    reviewDraftNote: resolvedReviewDraftNote,
  };
}

function stripPricingConsequenceLanguage(text) {
  if (typeof text !== "string" || !text.trim()) return text || "";

  const pricingConsequenceSentence =
    /[^.!?\n]*(?:\b(?:assignment|engagement|matter|toimeksianto|laajuud(?:ella|en)?|laajuus|uppdrag(?:et)?)\b[^.!?\n]{0,80}\b(?:priced|hinnoitel(?:laan|tu)|prissätt(?:s|ning)|tuntiveloitus(?:perusteisesti)?|hourly(?:-|\s+)(?:rate|basis)|capped(?:-|\s+)price|fixed(?:-|\s+)fee|kattohinta|kiinteä(?:llä)?\s+hinta|timarvode|takpris|fast(?:a)?\s+(?:pris|arvode))|\b(?:tuntiveloitus(?:perusteisesti)?|hourly(?:-|\s+)(?:rate|basis)|capped(?:-|\s+)price|kattohinta)\b[^.!?\n]{0,80}\b(?:hinnoitel(?:laan|tu)|priced|prissätt))[^.!?\n]*[.!?]?/gi;

  const maxPriceOmissionSentence =
    /[^.!?\n]*(?:\b(?:max(?:imum)?\s+price|enimmäishinta(?:a)?|maxpris(?:et)?)\b[^.!?\n]{0,80}\b(?:not\s+(?:filled|completed|recorded|required|set)|(?:is|was)\s+(?:left\s+)?empty|omit(?:ted)?|ei\s+(?:täytetä|aseteta|tarvita|täytetty)|fylls\s+inte)|(?:no|ei\s+ole)\s+(?:maximum\s+price|enimmäishintaa)\s+to\s+(?:record|fill|set))[^.!?\n]*[.!?]?/gi;

  return text
    .replace(pricingConsequenceSentence, " ")
    .replace(maxPriceOmissionSentence, " ")
    .replace(
      /[^.!?\n]*\b(?:tuntiveloitusperusteisesti|priced on an hourly basis)\b[^.!?\n]*[.!?]?/gi,
      " ",
    )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function stripOptimizationsMarker(text) {
  if (!text) return "";
  return text
    .replace(/(^|\n)\s*---OPTIMIZATIONS---\s*(?=\n|$)/gi, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function collectDraftPlainText(draftData) {
  if (!draftData || typeof draftData !== "object") return "";

  const parts = [];
  const walk = (value) => {
    if (typeof value === "string") {
      parts.push(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (value && typeof value === "object") {
      Object.values(value).forEach(walk);
    }
  };
  walk(draftData);
  return parts.join("\n");
}

function normalizeForOverlap(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const OPTIMIZATION_STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "to",
  "of",
  "in",
  "for",
  "on",
  "with",
  "that",
  "this",
  "add",
  "adding",
  "include",
  "including",
  "consider",
  "please",
  "request",
  "draft",
  "section",
  "field",
  "user",
  "should",
  "would",
  "could",
  "may",
  "might",
  "also",
  "into",
  "from",
  "your",
  "you",
  "brief",
  "description",
  "background",
  "information",
  "confirm",
  "specify",
  "mention",
  "clarify",
  "already",
  "still",
  "missing",
  "lisää",
  "lisata",
  "täydennä",
  "tarken",
  "pyynto",
  "luonnos",
  "osio",
  "kentta",
]);

function significantTokens(text) {
  return normalizeForOverlap(text)
    .split(" ")
    .filter((word) => word.length >= 4 && !OPTIMIZATION_STOPWORDS.has(word));
}

function draftHasTopic(draftText, pattern) {
  return pattern.test(draftText);
}

const PROPERTY_IDENTIFIER_MENTION =
  /kiinteist[oö]tunnus|property identification(?:\s+code)?s?|property identifiers?|fastighetsbeteckning/i;

const PROPERTY_IDENTIFIER_CODE = /\b\d{1,3}-\d{1,3}-\d{1,4}-\d{1,4}\b/;

function isPropertyIdentifierTip(text) {
  return PROPERTY_IDENTIFIER_MENTION.test(String(text || ""));
}

function draftHasPropertyIdentifier(draftData) {
  if (!draftData) return false;
  const blob = [
    draftData.confidential,
    draftData.counterparty,
    draftData.description,
    draftData.background,
  ]
    .filter(Boolean)
    .join("\n");
  return (
    PROPERTY_IDENTIFIER_MENTION.test(blob) ||
    PROPERTY_IDENTIFIER_CODE.test(blob)
  );
}

function propertyIdentifierRouteKind(route, recommendedRequestType = "") {
  const haystack = `${route || ""} ${recommendedRequestType || ""}`;
  if (/re-easement|easement agreement/i.test(haystack)) return "easement";
  if (/re-landuse|land use agreement/i.test(haystack)) return "landuse";
  return null;
}

function detectChatLanguage(sampleText) {
  const sample = sampleText || "";
  const looksFinnish =
    /[äöÄÖ]/.test(sample) &&
    /\b(ja|että|olemme|tarvitsemme|yrityks|sopimus|vuokra|kiinteist|lisää|vastapuoli)/i.test(
      sample,
    );
  const looksSwedish =
    /[äöåÄÖÅ]/.test(sample) &&
    /\b(och|att|vi|behöver|företag|avtal|hyra|fastighet|motpart)/i.test(sample);
  if (looksFinnish) return "fi";
  if (looksSwedish) return "sv";
  return "en";
}

function propertyIdentifierTipText(kind, languageSample) {
  const language = detectChatLanguage(languageSample);
  if (kind === "landuse") {
    if (language === "fi") {
      return "Lisää maankäyttösopimukseen kuuluvien kiinteistöjen kiinteistötunnukset tai vastaavat tunnisteet vastapuolen tietoihin.";
    }
    if (language === "sv") {
      return "Lägg till fastighetsbeteckningarna eller motsvarande identifierare för fastigheterna i markanvändningsavtalet under motpartsuppgifterna.";
    }
    return "Add the property identification codes or corresponding identifiers of the properties included in the land use agreement in the counterparty details.";
  }
  if (language === "fi") {
    return "Lisää rasitesopimukseen kuuluvien kiinteistöjen kiinteistötunnukset tai vastaavat tunnisteet vastapuolen tietoihin.";
  }
  if (language === "sv") {
    return "Lägg till fastighetsbeteckningarna eller motsvarande identifierare för fastigheterna i servitutsavtalet under motpartsuppgifterna.";
  }
  return "Add the property identification codes or corresponding identifiers of the properties included in the easement agreement in the counterparty details.";
}

function optimizationsHeadingForLanguage(languageSample) {
  const language = detectChatLanguage(languageSample);
  if (language === "fi") return "Ehdotetut lisäykset:";
  if (language === "sv") return "Föreslagna tillägg:";
  return "Suggested optimizations:";
}

function insertOptimizationBullet(optimizationsText, bullet, languageSample) {
  const existing = optimizationsText || "";
  if (!existing.trim()) {
    return `${optimizationsHeadingForLanguage(languageSample)}\n${bullet}`;
  }

  const lines = existing.split("\n");
  const headingIndex = lines.findIndex(
    (line) =>
      /suggested optimizations|ehdotetut|suositellut|föreslagna/i.test(line) &&
      !/^\s*[-•]/.test(line),
  );
  if (headingIndex >= 0) {
    return [
      ...lines.slice(0, headingIndex + 1),
      bullet,
      ...lines.slice(headingIndex + 1),
    ]
      .join("\n")
      .trim();
  }

  return `${bullet}\n${existing}`.trim();
}

function supportShowsDueDiligence(supportType) {
  return /legal due diligence inspection of the target/i.test(
    String(supportType || ""),
  );
}

function isDueDiligenceRoute(route, recommendedRequestType = "") {
  const haystack = `${route || ""} ${recommendedRequestType || ""}`;
  return /mergers-acquisitions|mergers & acquisitions|re-sale|re-leaseback|sale and purchase of real estate|sale and leaseback/i.test(
    haystack,
  );
}

function isDueDiligenceTip(text) {
  return /due\s+diligence|red[\s-]?flag|dd-raport|due diligence/i.test(
    String(text || ""),
  );
}

function caseSpecifiedDueDiligenceFormat(draftData) {
  const value =
    typeof draftData?.dueDiligence === "string"
      ? draftData.dueDiligence.trim()
      : "";
  if (!value) return false;
  return /long form|not needed/i.test(value);
}

function dueDiligenceTipText(languageSample) {
  const language = detectChatLanguage(languageSample);
  if (language === "fi") {
    return "Tarkista due diligence -raportoinnin muoto — due diligencen laajuus on teidän päätettävissänne, ja teillä voi olla syitä rajata tai jättää se pois.";
  }
  if (language === "sv") {
    return "Kontrollera due diligence-rapportens form — omfattningen är er att besluta, och ni kan ha skäl att begränsa eller utelämna den.";
  }
  return "Check the due diligence reporting format — the scope and depth of due diligence is yours to decide, and you may have reasons for limiting or omitting it.";
}

function ensureDueDiligenceOptimization(
  optimizationsText,
  route,
  draftData,
  recommendedRequestType,
  languageSample,
) {
  if (!isDueDiligenceRoute(route, recommendedRequestType)) {
    return optimizationsText || "";
  }
  if (!supportShowsDueDiligence(draftData?.supportType)) {
    return optimizationsText || "";
  }
  if (caseSpecifiedDueDiligenceFormat(draftData)) {
    return optimizationsText || "";
  }

  const existing = optimizationsText || "";
  if (isDueDiligenceTip(existing)) return existing;

  return insertOptimizationBullet(
    existing,
    `- ${dueDiligenceTipText(languageSample)}`,
    languageSample,
  );
}

function ensurePropertyIdentifierOptimization(
  optimizationsText,
  route,
  draftData,
  recommendedRequestType,
  languageSample,
) {
  const kind = propertyIdentifierRouteKind(route, recommendedRequestType);
  if (!kind) return optimizationsText || "";
  if (draftHasPropertyIdentifier(draftData)) return optimizationsText || "";

  const existing = optimizationsText || "";
  if (isPropertyIdentifierTip(existing)) return existing;

  const bullet = `- ${propertyIdentifierTipText(kind, languageSample)}`;
  if (!existing.trim()) {
    return `${optimizationsHeadingForLanguage(languageSample)}\n${bullet}`;
  }

  const lines = existing.split("\n");
  const headingIndex = lines.findIndex(
    (line) =>
      /suggested optimizations|ehdotetut|suositellut|föreslagna/i.test(line) &&
      !/^\s*[-•]/.test(line),
  );
  if (headingIndex >= 0) {
    return [
      ...lines.slice(0, headingIndex + 1),
      bullet,
      ...lines.slice(headingIndex + 1),
    ]
      .join("\n")
      .trim();
  }

  return `${bullet}\n${existing}`.trim();
}

function optimizationTipCoveredByDraft(tip, draftText, draftData) {
  const tipText = String(tip || "");
  const draft = String(draftText || "");
  if (!tipText.trim() || !draft.trim()) return false;

  // Buy-side M&A: confirming the defaulted red-flag DD position is intentional
  if (
    /\b(confirm|varmista|tarkista|bekräfta).{0,100}\b(due\s+diligence|red[\s-]?flag|dd-raport)/i.test(
      tipText,
    ) ||
    /\b(due\s+diligence|red[\s-]?flag).{0,100}\b(confirm|varmista|tarkista|bekräfta|position|kanta)\b/i.test(
      tipText,
    )
  ) {
    return false;
  }

  // Easement / land use: asking for property identification codes is not a
  // duplicate of an already-filled counterparty name or a property description.
  if (isPropertyIdentifierTip(tipText)) {
    return false;
  }

  const topics = [
    {
      tip: /\b(timeline|deadline|schedule|timing|aikataulu|määräaika|maaraaika)\b|\bby\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
      draft:
        /\b(deadline|by\s+\d|within\s+\d|q[1-4]|20\d{2}|january|february|march|april|june|july|august|september|october|november|december|tammikuu|helmikuu|maaliskuu|huhtikuu|toukokuu|kesäkuu|heinäkuu|elokuu|syyskuu|lokakuu|marraskuu|joulukuu|määräaika|aikataulu)\b/i,
    },
    {
      tip: /\b(counterparty|vastapuoli|business\s+(?:id|identity)|y-?tunnus|country of domicile)\b/i,
      draft:
        /\b(counterparty|vastapuoli|business\s+(?:id|identity)|y-?tunnus|country of domicile)\b/i,
      filled:
        (typeof draftData?.confidential === "string" &&
          draftData.confidential.trim()) ||
        (typeof draftData?.counterparty === "string" &&
          draftData.counterparty.trim()),
    },
    {
      tip: /\b(page count|number of pages|pages requiring|sivumäärä|sivua)\b/i,
      draft: /\b\d+\s*(pages?|sivua|sivu)\b/i,
    },
    {
      tip: /\b(m²|m2|floor area|property size|size of the (?:leased )?propert|neliö)/i,
      draft: /\b\d[\d.,]*\s*(m²|m2|sqm|neliö)/i,
    },
    {
      tip: /\b(who will|named lawyer|lead counsel|staffing|day-to-day|kuka (?:tekee|hoitaa)|tiimi)\b/i,
      draft:
        /\b(who will|named lawyer|lead counsel|day-to-day|staffing|kuka|tiimi)\b/i,
    },
    {
      tip: /\b(line of business|products? or services?|what .+ sell|toimiala)\b/i,
      draft:
        /\b(operates?|sells?|product|service|line of business|toimiala|myymme)\b/i,
    },
    {
      tip: /\b(existing material|template to be updated|case file|can be made available)\b/i,
      draft:
        /\b(existing (?:material|template|agreement)|can be made available|case file)\b/i,
    },
    {
      tip: /\b(employee count|number of employees|headcount|työntekij)\b/i,
      draft: /\b\d[\d\s,]*\s*(employees?|staff|työntekij)/i,
    },
  ];

  for (const topic of topics) {
    if (!topic.tip.test(tipText)) continue;
    const covered =
      topic.filled ||
      (topic.draft instanceof RegExp && draftHasTopic(draft, topic.draft));
    if (covered) return true;
  }

  const tipTokens = significantTokens(tipText);
  if (tipTokens.length < 3) return false;

  const draftNorm = ` ${normalizeForOverlap(draft)} `;
  const hits = tipTokens.filter((token) => draftNorm.includes(` ${token} `));
  return hits.length / tipTokens.length >= 0.55;
}

function filterOptimizationsCoveredByDraft(optimizationsText, draftData) {
  if (!optimizationsText || !draftData) return optimizationsText || "";

  const draftText = collectDraftPlainText(draftData);
  if (!draftText.trim()) return optimizationsText;

  const lines = optimizationsText.split("\n");
  const kept = lines.filter((line) => {
    if (!/^\s*[-•]/.test(line)) return true;
    return !optimizationTipCoveredByDraft(line, draftText, draftData);
  });

  const hasBullets = kept.some((line) => /^\s*[-•]/.test(line));
  if (!hasBullets) return "";

  return kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripDuplicateButtonLabel(text, label) {
  if (!text) return "";

  let result = text;
  const candidates = [
    label,
    "Open draft request page →",
    "Open draft request page",
    "Go to updated draft request page →",
    "Go to updated draft request page",
    "Siirry tarjouspyyntösivulle →",
    "Siirry tarjouspyyntösivulle",
    "Mene päivitetylle tarjouspyyntösivulle →",
    "Mene päivitetylle tarjouspyyntösivulle",
    "Öppna utkastet till förfrågan →",
    "Öppna utkastet till förfrågan",
    "Gå till den uppdaterade förfrågan →",
    "Gå till den uppdaterade förfrågan",
    "Go to recommended page →",
    "Go to recommended page",
    "Siirry suositellulle sivulle →",
    "Siirry suositellulle sivulle",
    "Gå till rekommenderad sida →",
    "Gå till rekommenderad sida",
    "Please thoroughly review the generated draft before submitting. Check every pre-filled field, complete anything still empty, and confirm the request accurately reflects your case.",
    "Tarkista luotu tarjouspyyntöluonnos huolellisesti ennen lähettämistä. Käy läpi kaikki esitäytetyt kentät, täydennä tyhjiksi jääneet kohdat ja varmista, että pyyntö vastaa tapaustasi.",
    "Granska det genererade utkastet noggrant innan du skickar. Kontrollera alla förifyllda fält, fyll i eventuella tomma fält och se till att förfrågan stämmer med ditt ärende.",
  ].filter(Boolean);

  for (const candidate of candidates) {
    const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(`\\n?\\s*${escaped}\\s*$`, "i"), "");
    result = result.replace(new RegExp(`^\\s*${escaped}\\s*$`, "im"), "");
  }

  return result.replace(/\n{3,}/g, "\n\n").trim();
}

function inferReviewDraftNote(sampleText) {
  const sample = sampleText || "";
  const looksFinnish =
    /[äöÄÖ]/.test(sample) &&
    /\b(ja|että|olemme|tarvitsemme|yrityks|sopimus|vuokra|kiinteist)/i.test(
      sample,
    );
  const looksSwedish =
    /[äöåÄÖÅ]/.test(sample) &&
    /\b(och|att|vi|behöver|företag|avtal|hyra|fastighet)/i.test(sample);

  if (looksFinnish) {
    return "Tarkista luotu luonnos huolellisesti ennen lähettämistä. Käy läpi kaikki esitäytetyt kentät, täydennä tyhjiksi jääneet kohdat ja varmista, että pyyntö vastaa tapaustasi.";
  }
  if (looksSwedish) {
    return "Granska det genererade utkastet noggrant innan du skickar. Kontrollera alla förifyllda fält, fyll i eventuella tomma fält och se till att förfrågan stämmer med ditt ärende.";
  }
  return "Please thoroughly review the generated draft before submitting. Check every pre-filled field, complete anything still empty, and confirm the request accurately reflects your case.";
}

function inferOpenDraftLabel(sampleText, hasDraft, isUpdatedDraft = false) {
  const sample = sampleText || "";
  const looksFinnish =
    /[äöÄÖ]/.test(sample) &&
    /\b(ja|että|olemme|tarvitsemme|yrityks|sopimus|vuokra|kiinteist|päivitet)/i.test(
      sample,
    );
  const looksSwedish =
    /[äöåÄÖÅ]/.test(sample) &&
    /\b(och|att|vi|behöver|företag|avtal|hyra|fastighet|uppdaterad)/i.test(
      sample,
    );

  if (hasDraft) {
    if (isUpdatedDraft) {
      if (looksFinnish) return "Mene päivitetylle tarjouspyyntösivulle";
      if (looksSwedish) return "Gå till den uppdaterade förfrågan";
      return "Go to updated draft request page";
    }
    if (looksFinnish) return "Siirry tarjouspyyntösivulle →";
    if (looksSwedish) return "Öppna utkastet till förfrågan →";
    return "Open draft request page →";
  }

  if (looksFinnish) return "Siirry suositellulle sivulle →";
  if (looksSwedish) return "Gå till rekommenderad sida →";
  return "Go to recommended page →";
}

function inferUpdatedDraftFallback(sampleText, isUpdatedDraft) {
  const sample = sampleText || "";
  const looksFinnish =
    /[äöÄÖ]/.test(sample) &&
    /\b(ja|että|olemme|tarvitsemme|yrityks|sopimus|vuokra|kiinteist|päivitet)/i.test(
      sample,
    );
  const looksSwedish =
    /[äöåÄÖÅ]/.test(sample) &&
    /\b(och|att|vi|behöver|företag|avtal|hyra|fastighet|uppdaterad)/i.test(
      sample,
    );

  if (isUpdatedDraft) {
    if (looksFinnish) return "Päivitin luonnoksen pyyntösi mukaan.";
    if (looksSwedish) return "Jag har uppdaterat utkastet enligt din begäran.";
    return "I've updated the draft based on your request.";
  }

  if (looksFinnish) return "Loin tarjouspyyntöluonnoksen valmiiksi.";
  if (looksSwedish) return "Jag har skapat ett utkast till förfrågan.";
  return "I've prepared a draft LEXIFY Request for you.";
}

function messageContainsDraftData(text) {
  return typeof text === "string" && /DRAFT_DATA\s*:/i.test(text);
}

const LEXI_CHAT_STORAGE_KEY = "lexify_lexi_chat";

const WELCOME_TEXT =
  "Hi, I'm Lexi – your LEXIFY assistant.\n\nDescribe your legal need and I'll draft a complete LEXIFY Request for you to review and submit. Or choose one of the options below if you'd like help with something else.\n\nYou can write to me in Finnish, English or another language, and I'll reply in the same one.";

function createWelcomeMessage() {
  return {
    id: "welcome",
    role: "assistant",
    createdAt: Date.now(),
    parts: [{ type: "text", text: WELCOME_TEXT }],
  };
}

const WELCOME_MESSAGE = createWelcomeMessage();

function formatMessageTime(createdAt) {
  const date = createdAt ? new Date(createdAt) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function LexiAvatar({ className = "", pulse = false }) {
  return (
    <div
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#11999e] text-[10px] font-bold text-white shadow-sm ${
        pulse ? "animate-pulse" : ""
      } ${className}`}
    >
      Lexi
    </div>
  );
}

const QUICK_REPLIES = [
  {
    intent: "DRAFT_REQUEST",
    title: "Prepare a draft LEXIFY Request for me",
    subtitle: "I'll create a draft RFP based on your legal need.",
    message: "Prepare a draft LEXIFY Request for me",
    icon: FilePen,
  },
  {
    intent: "OPTIMIZE_REQUEST",
    title: "Help me optimize the contents of my LEXIFY Request",
    subtitle:
      "I'll review a draft RFP you have created and suggest improvements.",
    message: "Help me optimize the contents of my LEXIFY Request",
    icon: ListChecks,
  },
  {
    intent: "FIND_REQUEST_TYPE",
    title: "Help me find the right LEXIFY Request type for my legal need",
    subtitle:
      "If you want to create a new LEXIFY Request yourself, I can help you choose the best LEXIFY Request category for your specific legal need.",
    message: "Help me find the right LEXIFY Request type for my legal need",
    icon: Search,
  },
];

const RFP_HUB_PATHS = new Set([
  "/contracts/real-estate",
  "/contracts/sourcing",
  "/contracts/ict-it",
  "/requests/contracts",
  "/requests/dispute-resolution",
  "/requests/banking-and-finance",
  "/requests/employment-documents",
  "/requests/privacy-selection",
]);

function isRfpFormPage(pathname) {
  if (!pathname || RFP_HUB_PATHS.has(pathname)) return false;
  return (
    /^\/contracts\/[a-z0-9-]+$/i.test(pathname) ||
    /^\/requests\/[a-z0-9-]+$/i.test(pathname)
  );
}

const NO_RFP_TO_OPTIMIZE_MESSAGE =
  "I can help optimize a LEXIFY Request once you have one open. Please open an existing Request draft, or open a Request form and fill it in, then ask me again. If you prefer, I can also help you prepare a draft Request from a description of your case.";

function loadLexiChat() {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(LEXI_CHAT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.messages) || !parsed.messages.length) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function stripFileUrlsFromMessages(messages) {
  return messages.map((message) => {
    if (!Array.isArray(message.parts)) return message;

    return {
      ...message,
      parts: message.parts.map((part) => {
        if (part?.type !== "file" || !part.url) return part;
        const { url, ...rest } = part;
        return rest;
      }),
    };
  });
}

function saveLexiChat({ messages, isOpen, usedQuickReply }) {
  if (typeof window === "undefined") return;

  const payload = {
    messages,
    isOpen: Boolean(isOpen),
    usedQuickReply: Boolean(usedQuickReply),
    savedAt: Date.now(),
  };

  try {
    sessionStorage.setItem(LEXI_CHAT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    try {
      sessionStorage.setItem(
        LEXI_CHAT_STORAGE_KEY,
        JSON.stringify({
          ...payload,
          messages: stripFileUrlsFromMessages(messages),
        }),
      );
    } catch {
      // Ignore quota errors; chat still works in memory.
    }
  }
}

function clearLexiChatStorage() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(LEXI_CHAT_STORAGE_KEY);
}

export default function FloatingChat() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [animateOpen, setAnimateOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimerRef = useRef(null);
  const [usedQuickReply, setUsedQuickReply] = useState(false);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const getMessageText = (message) => {
    if (message.parts?.length) {
      return message.parts
        .filter((p) => p.type === "text")
        .map((p) => p.text)
        .join("");
    }
    if (typeof message.content === "string") return message.content;
    if (Array.isArray(message.content)) {
      return message.content
        .filter((p) => p.type === "text")
        .map((p) => p.text)
        .join("");
    }
    return "";
  };

  const getMessageFileNames = (message) => {
    const parts = message.parts ?? message.content;
    if (!Array.isArray(parts)) return [];

    return parts
      .filter((part) => part.type === "file")
      .map((part) => part.filename || part.name || "Attached file");
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selected]);
    e.target.value = "";
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const { messages, setMessages, sendMessage, isLoading } = useChat({
    api: "/api/chat",
    messages: [WELCOME_MESSAGE],
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = loadLexiChat();
    if (stored?.messages?.length) {
      setMessages(
        stored.messages.map((message) => {
          if (message.id !== "welcome") return message;
          return {
            ...createWelcomeMessage(),
            createdAt: message.createdAt || Date.now(),
          };
        }),
      );
      setUsedQuickReply(Boolean(stored.usedQuickReply));
      if (typeof stored.isOpen === "boolean") {
        setIsOpen(stored.isOpen);
      }
    }
    setHydrated(true);
  }, [setMessages]);

  const messageTimesRef = useRef({});
  const getMessageCreatedAt = (message) => {
    if (message.createdAt) return message.createdAt;
    if (!messageTimesRef.current[message.id]) {
      messageTimesRef.current[message.id] = Date.now();
    }
    return messageTimesRef.current[message.id];
  };

  useEffect(() => {
    if (!hydrated) return;
    saveLexiChat({
      messages: messages.map((message) => ({
        ...message,
        createdAt: getMessageCreatedAt(message),
      })),
      isOpen,
      usedQuickReply,
    });
  }, [hydrated, messages, isOpen, usedQuickReply]);

  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen, isLoading]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const nextHeight = Math.min(el.scrollHeight, 160);
    el.style.height = `${nextHeight}px`;
    el.style.overflowY = el.scrollHeight > 160 ? "auto" : "hidden";
  }, [input, isOpen]);

  const handleQuickReply = async (intent, message) => {
    await sendChatMessage(message, { intent });
  };

  const appendLocalExchange = (userText, assistantText) => {
    const now = Date.now();
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "user",
        createdAt: now,
        parts: [{ type: "text", text: userText }],
      },
      {
        id: crypto.randomUUID(),
        role: "assistant",
        createdAt: now,
        parts: [{ type: "text", text: assistantText }],
      },
    ]);
  };

  const sendChatMessage = async (
    message,
    { intent = null, extraParts = [] } = {},
  ) => {
    if (intent === "OPTIMIZE_REQUEST" && !isRfpFormPage(pathname)) {
      setUsedQuickReply(true);
      appendLocalExchange(message, NO_RFP_TO_OPTIMIZE_MESSAGE);
      return;
    }

    if (intent) setUsedQuickReply(true);
    setIsThinking(true);

    const requestContext =
      typeof window !== "undefined" ? window.__LEXIFY_REQUEST_CONTEXT__ : null;

    const contextText =
      (intent === "OPTIMIZE_REQUEST" || isApplyOptimizationsRequest(message)) &&
      requestContext
        ? `\n\nCURRENT_REQUEST_CONTEXT:\n${JSON.stringify(requestContext, null, 2)}`
        : "";

    const prefix = intent ? `[INTENT:${intent}] ` : "";

    try {
      await sendMessage({
        role: "user",
        parts: [
          {
            type: "text",
            text: `${prefix}${message}${contextText}`,
          },
          ...extraParts,
        ],
      });
    } finally {
      setTimeout(() => setIsThinking(false), 500);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if ((!trimmed && files.length === 0) || isThinking) return;

    const inferredIntent = inferChatIntent(trimmed);

    if (inferredIntent === "OPTIMIZE_REQUEST" && !isRfpFormPage(pathname)) {
      setUsedQuickReply(true);
      appendLocalExchange(trimmed, NO_RFP_TO_OPTIMIZE_MESSAGE);
      setInput("");
      setFiles([]);
      return;
    }

    setIsThinking(true);

    const fileParts =
      files.length > 0 ? await convertFilesToDataURLs(files) : [];
    const messageText =
      trimmed ||
      (files.length > 0
        ? "Please review the attached document(s) for my case context."
        : "");

    setInput("");
    setFiles([]);

    await sendChatMessage(messageText, {
      intent: inferredIntent,
      extraParts: fileParts,
    });
  };

  const handleNewChat = () => {
    messageTimesRef.current = {};
    setMessages([createWelcomeMessage()]);
    setUsedQuickReply(false);
    setInput("");
    setFiles([]);
    setIsThinking(false);
    clearLexiChatStorage();
  };

  const handleDraftNavigation = (route, draftData) => {
    if (!route || !draftData) return;

    const caseContextText = messages
      .filter((message) => message.role === "user")
      .map((message) => getMessageText(message))
      .join("\n");

    saveLexiDraft(route, draftData, caseContextText);

    // Same RFP page: re-apply draft without a full reload (keeps Lexi chat).
    // Different page: navigate so the prefill hook runs on mount.
    if (pathname === route) {
      window.dispatchEvent(new Event(LEXI_APPLY_DRAFT_EVENT));
      setAnimateOpen(false);
      setIsClosing(false);
      setIsOpen(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      router.push(route);
    }
  };

  const finishClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsOpen(false);
    setIsClosing(false);
    setAnimateOpen(false);
  };

  const handleMinimize = () => {
    if (!isOpen || isClosing) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      finishClose();
      return;
    }

    setAnimateOpen(false);
    setIsClosing(true);
    closeTimerRef.current = setTimeout(finishClose, 175);
  };

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const startDraftFromHubRef = useRef(null);
  startDraftFromHubRef.current = async () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsClosing(false);
    setAnimateOpen(true);
    setIsOpen(true);

    const draftReply = QUICK_REPLIES.find(
      (item) => item.intent === "DRAFT_REQUEST",
    );
    if (!draftReply) return;
    await sendChatMessage(draftReply.message, { intent: "DRAFT_REQUEST" });
  };

  useEffect(() => {
    const onStartDraft = () => {
      startDraftFromHubRef.current?.();
    };
    window.addEventListener(LEXI_START_DRAFT_EVENT, onStartDraft);
    return () => window.removeEventListener(LEXI_START_DRAFT_EVENT, onStartDraft);
  }, []);

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => {
            if (closeTimerRef.current) {
              clearTimeout(closeTimerRef.current);
              closeTimerRef.current = null;
            }
            setIsClosing(false);
            setAnimateOpen(true);
            setIsOpen(true);
          }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-full bg-white pl-2 pr-4 py-2 border border-gray-300 shadow-[0_10px_28px_rgba(15,23,42,0.22),0_4px_12px_rgba(17,153,158,0.2)] ring-1 ring-black/10 hover:shadow-[0_14px_36px_rgba(15,23,42,0.28),0_6px_16px_rgba(17,153,158,0.28)] hover:scale-[1.02] transition cursor-pointer"
          title="Open Lexi"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#11999e] text-white">
            <strong className="text-[20px] font-bold leading-none tracking-tight">
              Lexi
            </strong>
          </span>
          <span className="flex flex-col items-start text-left">
            <span className="text-[15px] font-bold leading-tight text-gray-900">
              Hi! I&apos;m Lexi
            </span>
            <span className="text-[13px] leading-tight text-gray-500">
              How can I help you today?
            </span>
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="ml-2 h-4 w-4 shrink-0 text-gray-400"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.5 4.5 13 10l-5.5 5.5"
            />
          </svg>
        </button>
      )}

      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-50 w-[420px] h-[740px] bg-white border border-gray-300 rounded-2xl shadow-[0_18px_50px_rgba(15,23,42,0.28),0_6px_18px_rgba(17,153,158,0.22)] ring-1 ring-black/10 flex flex-col overflow-hidden origin-bottom-right ${
            isClosing
              ? "animate-lexi-close"
              : animateOpen
                ? "animate-lexi-open"
                : ""
          }`}
          onAnimationEnd={(event) => {
            if (event.target !== event.currentTarget) return;
            if (!isClosing) return;
            finishClose();
          }}
        >
          <div className="flex items-center gap-3 px-3.5 py-3 bg-[#11999e]">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[24px] font-semibold leading-none text-white">
                  Lexi
                </span>
                <span className="rounded-md bg-white px-1.5 py-0.5 text-[12px] font-bold uppercase tracking-wide text-[#11999e] leading-none shadow-sm">
                  Beta
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleNewChat}
                className="flex items-center gap-1 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-[#11999e] cursor-pointer whitespace-nowrap transition-all hover:bg-[#e7f6f6] hover:shadow-md hover:scale-[1.03]"
                title="Start a New Chat"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                New Chat
              </button>
              <button
                type="button"
                onClick={handleMinimize}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#11999e] cursor-pointer transition-all hover:bg-[#e7f6f6] hover:shadow-md hover:scale-110"
                title="Minimize"
              >
                <Minus className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f4f5f7]">
            {messages.map((m, messageIndex) => {
              const isWelcome = m.id === "welcome";

              const rawText = getMessageText(m);
              const isUser = m.role === "user";
              const displayText = isUser
                ? rawText
                    .replace(/\[INTENT:.*?\]\s*/g, "")
                    .replace(/\n*CURRENT_REQUEST_CONTEXT:\n[\s\S]*$/g, "")
                    .trim()
                : rawText;
              const isUpdatedDraft =
                !isUser &&
                messageContainsDraftData(rawText) &&
                messages
                  .slice(0, messageIndex)
                  .some(
                    (prior) =>
                      prior.role === "assistant" &&
                      messageContainsDraftData(getMessageText(prior)),
                  );
              const {
                cleanedText,
                introText,
                optimizationsText,
                route: parsedRoute,
                draftData,
                recommendedRequestType,
                openDraftLabel,
                reviewDraftNote,
              } = isUser
                ? {
                    cleanedText: displayText,
                    introText: displayText,
                    optimizationsText: "",
                    route: null,
                    draftData: null,
                    recommendedRequestType: "",
                    openDraftLabel: null,
                    reviewDraftNote: null,
                  }
                : parseAssistantMessage(rawText, { isUpdatedDraft });

              // Revisions sometimes omit Recommended/Route lines — reuse prior draft route
              let route = parsedRoute;
              if (!route && draftData) {
                for (let i = messageIndex - 1; i >= 0; i -= 1) {
                  const prior = messages[i];
                  if (prior.role !== "assistant") continue;
                  route = extractRouteFromText(getMessageText(prior));
                  if (route) break;
                }
              }
              if (
                !route &&
                draftData &&
                pathname &&
                (pathname.startsWith("/contracts/") ||
                  pathname.startsWith("/requests/"))
              ) {
                route = pathname;
              }
              const text = isWelcome
                ? rawText
                    .replace(/\[INTENT:.*?\]\s*/g, "")
                    .replace(/\n\nCURRENT_REQUEST_CONTEXT:\n[\s\S]*$/g, "")
                : cleanedText;
              const attachedFileNames = isUser ? getMessageFileNames(m) : [];

              const routeButton = route ? (
                <div
                  className={
                    introText || attachedFileNames.length ? "mt-3" : ""
                  }
                >
                  {draftData ? (
                    <button
                      type="button"
                      onClick={() => handleDraftNavigation(route, draftData)}
                      className="inline-block bg-[#11999e] text-white px-4 py-2 rounded-md text-sm hover:bg-[#1bbec4] cursor-pointer"
                    >
                      {openDraftLabel ||
                        (isUpdatedDraft
                          ? "Open updated draft RFP"
                          : "Open draft RFP →")}
                    </button>
                  ) : (
                    <>
                      {recommendedRequestType ? (
                        <p className="mb-2">
                          The recommended LEXIFY Request type is{" "}
                          <strong>{recommendedRequestType}</strong>.
                        </p>
                      ) : null}
                      <Link
                        href={route}
                        className="inline-block bg-[#11999e] text-white px-4 py-2 rounded-md text-sm hover:bg-[#1bbec4]"
                      >
                        {openDraftLabel || "Go to recommended page →"}
                      </Link>
                    </>
                  )}

                  {draftData && (
                    <p className="mt-2 text-xs text-gray-600 italic leading-snug">
                      {reviewDraftNote ||
                        "Please thoroughly review the generated draft before submitting. Check every pre-filled field, complete anything still empty, and confirm the request accurately reflects your case."}
                    </p>
                  )}
                </div>
              ) : null;

              return (
                <div key={m.id} className="space-y-3">
                  <div
                    className={`flex ${
                      isUser ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`flex flex-col ${
                        isUser
                          ? "max-w-[85%] items-end"
                          : "max-w-[90%] items-start"
                      }`}
                    >
                      <div
                        className={`flex items-end gap-2 ${
                          isUser ? "flex-row-reverse" : ""
                        }`}
                      >
                        {!isUser && <LexiAvatar />}

                        <div
                          className={`min-w-0 px-3.5 py-2.5 text-[13px] font-normal leading-relaxed shadow-sm ${
                            isWelcome ? "" : "whitespace-pre-wrap"
                          } ${
                            isUser
                              ? "bg-[#c5e4e6] border border-[#8ec9cd] text-gray-800 rounded-2xl rounded-br-sm"
                              : "bg-gray-200 border border-gray-300 text-gray-800 rounded-2xl rounded-bl-sm"
                          }`}
                        >
                          {isWelcome && (
                            <div className="space-y-3">
                              {(text || WELCOME_TEXT)
                                .split(/\n\n+/)
                                .filter(Boolean)
                                .map((paragraph, index) => (
                                  <p key={`${m.id}-p-${index}`}>{paragraph}</p>
                                ))}
                            </div>
                          )}

                          {!isWelcome && (
                            <div>
                              {introText && <div>{introText}</div>}

                              {attachedFileNames.length > 0 && (
                                <div
                                  className={`flex flex-col gap-1.5 ${
                                    introText ? "mt-2" : ""
                                  }`}
                                >
                                  {attachedFileNames.map((fileName, index) => (
                                    <div
                                      key={`${m.id}-file-${index}`}
                                      className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
                                        isUser
                                          ? "bg-[#a9d4d7] text-gray-800"
                                          : "bg-gray-300 text-gray-800"
                                      }`}
                                    >
                                      {fileName}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {routeButton}

                              {optimizationsText && (
                                <div className="mt-3">{optimizationsText}</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div
                        className={`mt-1 text-[11px] leading-none text-gray-400 ${
                          isUser ? "text-right" : "pl-9"
                        }`}
                      >
                        {formatMessageTime(getMessageCreatedAt(m))}
                      </div>
                    </div>
                  </div>

                  {isWelcome && !usedQuickReply && (
                    <div className="flex min-w-0 flex-col gap-1.5 pl-9">
                      {QUICK_REPLIES.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.intent}
                            type="button"
                            onClick={() =>
                              handleQuickReply(item.intent, item.message)
                            }
                            className="flex w-full items-center gap-2.5 rounded-lg border border-[#b7d9dc] bg-white px-2.5 py-2 text-left shadow-[0_2px_8px_rgba(15,23,42,0.08),0_1px_3px_rgba(17,153,158,0.12)] hover:border-[#11999e] hover:bg-[#f4fbfb] hover:shadow-[0_6px_16px_rgba(15,23,42,0.12),0_2px_8px_rgba(17,153,158,0.2)] transition cursor-pointer"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#e7f6f6] text-[#11999e]">
                              <Icon className="h-4 w-4" strokeWidth={1.75} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[12px] font-bold leading-snug text-[#11999e]">
                                {item.title}
                              </span>
                              <span className="mt-0.5 block text-[11px] leading-snug text-gray-500">
                                {item.subtitle}
                              </span>
                            </span>
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {isThinking && (
              <div className="flex justify-start animate-fadeIn">
                <div className="flex items-end gap-2 max-w-[85%]">
                  <LexiAvatar pulse />

                  <div className="min-w-[110px] rounded-2xl rounded-bl-sm border border-gray-300 bg-gray-200 px-3.5 py-2.5 text-[13px] text-gray-600 shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">Thinking</span>

                      <div className="flex gap-1 items-center">
                        <div className="w-2 h-2 rounded-full bg-[#11999e] animate-bounce" />
                        <div
                          className="w-2 h-2 rounded-full bg-[#11999e] animate-bounce"
                          style={{ animationDelay: "0.15s" }}
                        />
                        <div
                          className="w-2 h-2 rounded-full bg-[#11999e] animate-bounce"
                          style={{ animationDelay: "0.3s" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={handleFormSubmit}
            className="border-t border-gray-200 bg-[#f4f5f7] p-3 flex flex-col gap-2"
          >
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {files.map((file, i) => (
                  <div
                    key={i}
                    className="bg-gray-700 text-white text-xs font-medium px-2.5 py-1.5 rounded-md flex items-center gap-1.5 shadow-sm"
                  >
                    {file.name}
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="text-red-300 hover:text-red-200 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 items-end">
              <button
                type="button"
                title="Attach a PDF or document for case context"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-500 cursor-pointer transition-colors hover:border-[#11999e] hover:bg-[#e7f6f6] hover:text-[#11999e]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13"
                  />
                </svg>
              </button>

              <input
                type="file"
                multiple
                accept=".pdf,application/pdf"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />

              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder="Describe your case or reply..."
                rows={1}
                className="flex-1 border border-gray-300 bg-white rounded-lg px-3 py-2 text-[13px] font-normal leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#11999e] text-gray-700 resize-none min-h-[40px] max-h-[160px]"
              />

              <button
                type="submit"
                disabled={isThinking}
                className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-[#11999e] px-3 text-sm font-medium text-white cursor-pointer hover:bg-[#1bbec4] disabled:opacity-60"
              >
                <Send className="h-4 w-4" strokeWidth={2} />
                Send
              </button>
            </div>
            <div className="flex items-start gap-2 text-[11px] leading-snug text-gray-500">
              <Shield
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400"
                strokeWidth={1.75}
              />
              <p>
                Lexi does not provide legal advice. Lexi is an AI assistant and
                its responses may occasionally contain inaccuracies. All outputs
                should be reviewed before submission.
              </p>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
