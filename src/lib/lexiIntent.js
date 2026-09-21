const INTENT_TAG = /\[INTENT:([A-Z_]+)\]/;

export function extractTaggedIntent(text) {
  const match = String(text || "").match(INTENT_TAG);
  return match ? match[1] : null;
}

function visibleUserText(text) {
  return String(text || "")
    .replace(/\[INTENT:.*?\]\s*/g, "")
    .replace(/\n\nCURRENT_REQUEST_CONTEXT:\n[\s\S]*$/g, "")
    .trim();
}

function matchesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

const APPLY_OPTIMIZATION_PATTERNS = [
  /\b(apply|incorporate|implement|use)\b[\s\S]{0,80}\b(the |those |these |your )?(optimiz(?:e|ing|ation|ations)?|suggestions?|improvements?|tips?)\b/i,
  /\b(update|revise|amend|change)\b[\s\S]{0,80}\b(draft|request|rfp)\b[\s\S]{0,80}\b(optimiz|suggestion|improvement|those|these|them)\b/i,
  /\b(update|revise|amend)\b[\s\S]{0,60}\b(based on|with|using|from|according to)\b[\s\S]{0,50}\b(optimiz|suggestion|improvement|those|these|them|your)\b/i,
  /\b(make|do)\b[\s\S]{0,30}\b(those|these|the)\s+(changes|updates|edits|improvements|optimizations)\b/i,
  /\b(go ahead and )?(apply|update)\s+(them|those|it)\b/i,
  /\bpäivitä\b[\s\S]{0,80}\b(tarjouspyynt|luonnos|pyynt)\w*[\s\S]{0,80}\b(optim|ehdot|parann)/i,
  /\b(sovella|toteuta)\b[\s\S]{0,60}\b(optim|ehdot|parann)/i,
  /\buppdatera\b[\s\S]{0,80}\b(förfrågan|utkast)\b[\s\S]{0,80}\b(optim|förslag|förbättr)/i,
  /\b(tillämpa|använd)\b[\s\S]{0,60}\b(optim|förslag)/i,
];

const OPTIMIZE_PATTERNS = [
  /\b(optimiz(?:e|ing|ation)|improve|improving|suggest(?:ed)? improvements?|refine|refining)\b[\s\S]{0,100}\b(lexify request|request contents?|rfp|draft request|my (?:draft )?request)\b/i,
  /\b(lexify request|request contents?|rfp|my (?:draft )?request)\b[\s\S]{0,80}\b(optimiz|improve|review|refine)\b/i,
  /\b(optimiz(?:e|ing)|improve|review)\s+(this|it|the contents?)\b/i,
  /\bhelp me optimize\b/i,
  /\boptimoi\b[\s\S]{0,80}\b(tarjouspyynt|luonnos|pyyntö)\b/i,
  /\b(tarjouspyynt|luonnos)\w*[\s\S]{0,80}\b(optimoi|paranna|tarkista sisäll)\b/i,
  /\b(optimera|förbättra)\b[\s\S]{0,80}\b(förfrågan|utkast)\b/i,
];

const FIND_TYPE_PATTERNS = [
  /\b(find|choose|pick|identify|select|right|correct|which|what)\b[\s\S]{0,100}\b(request type|rfp type|lexify request type|category)\b/i,
  /\b(request type|rfp type|lexify request type)\b[\s\S]{0,60}\b(find|choose|need|should|right|for me)\b/i,
  /\b(what|which)\s+type\s+of\s+(?:lexify\s+)?request\b/i,
  /\bhelp me find the right\b/i,
  /\b(mikä|oikea|sopiva|löydä|valitse)\b[\s\S]{0,80}\b(tarjouspyyntötyyppi|pyyntötyyppi|kategoria)\b/i,
  /\b(vilken|rätt|hitta|välj)\b[\s\S]{0,80}\b(förfråganstyp|typ av förfrågan|kategori)\b/i,
];

const DRAFT_PATTERNS = [
  /\b(make|create|prepare|write|generate|draft|put together|give me)\b[\s\S]{0,80}\b((?:a |an |the )?(?:lexify )?request|rfp)\b/i,
  /\b(make|create|prepare|write|generate|give me|put together)\b[\s\S]{0,50}\b(?:a |an |the )?draft\b/i,
  /\b(draft|prepare)\s+(?:me\s+)?(?:a\s+)?(?:lexify\s+)?request\b/i,
  /\bi (?:need|want|would like)\b[\s\S]{0,40}\b(?:a |an )?(?:draft|lexify request)\b/i,
  /\b(tee|laadi|luo|valmistele|kirjoita)\b[\s\S]{0,50}\b(luonnos|tarjouspyynt)\w*/i,
  /\b(gör|skapa|ta fram|förbered|skriv)\b[\s\S]{0,50}\b(utkast|förfrågan)\b/i,
];

export function isApplyOptimizationsRequest(text) {
  return matchesAny(visibleUserText(text), APPLY_OPTIMIZATION_PATTERNS);
}

export function inferChatIntent(text) {
  const t = visibleUserText(text);
  if (!t) return null;

  if (isApplyOptimizationsRequest(t)) return "DRAFT_REQUEST";
  if (matchesAny(t, OPTIMIZE_PATTERNS)) return "OPTIMIZE_REQUEST";
  if (matchesAny(t, FIND_TYPE_PATTERNS)) return "FIND_REQUEST_TYPE";
  if (matchesAny(t, DRAFT_PATTERNS)) return "DRAFT_REQUEST";
  return null;
}

export function resolveChatIntent(messages, getMessageText) {
  const getText =
    typeof getMessageText === "function"
      ? getMessageText
      : (message) =>
          message?.parts?.find((part) => part.type === "text")?.text ??
          message?.content ??
          "";

  let latestUserText = "";
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === "user") {
      latestUserText = getText(messages[i]);
      break;
    }
  }

  const latestTagged = extractTaggedIntent(latestUserText);
  if (isApplyOptimizationsRequest(latestUserText)) return "DRAFT_REQUEST";
  if (latestTagged) return latestTagged;

  const inferred = inferChatIntent(latestUserText);
  if (inferred) return inferred;

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const tagged = extractTaggedIntent(getText(messages[i]));
    if (tagged) return tagged;
  }

  return null;
}
