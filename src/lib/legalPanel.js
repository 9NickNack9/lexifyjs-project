import { randomUUID } from "crypto";

export const LEGACY_PANEL_GROUP_ID = "legacy-default";
export const LEGACY_PANEL_GROUP_NAME = "Legal Panel";

export function createLegalPanelGroupId() {
  return randomUUID();
}

export function uniqueProviderNames(values) {
  const out = [];
  const seen = new Set();
  for (const value of Array.isArray(values) ? values : []) {
    const name = typeof value === "string" ? value.trim() : "";
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

function isLegacyProviderList(value) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === "string")
  );
}

export function normalizeLegalPanelGroups(value) {
  if (!Array.isArray(value)) return [];

  if (isLegacyProviderList(value)) {
    const providers = uniqueProviderNames(value);
    if (!providers.length) return [];
    return [
      {
        id: LEGACY_PANEL_GROUP_ID,
        name: LEGACY_PANEL_GROUP_NAME,
        providers,
      },
    ];
  }

  const groups = [];
  const usedIds = new Set();
  const usedNames = new Set();

  for (const row of value) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const name = typeof row.name === "string" ? row.name.trim() : "";
    if (!name) continue;

    const nameKey = name.toLowerCase();
    if (usedNames.has(nameKey)) continue;
    usedNames.add(nameKey);

    let id =
      typeof row.id === "string" && row.id.trim()
        ? row.id.trim()
        : createLegalPanelGroupId();
    if (usedIds.has(id)) id = createLegalPanelGroupId();
    usedIds.add(id);

    groups.push({
      id,
      name,
      providers: uniqueProviderNames(row.providers),
    });
  }

  return groups;
}

export function findLegalPanelGroup(groups, groupId) {
  const id = String(groupId || "").trim();
  if (!id) return null;
  return (groups || []).find((group) => String(group.id) === id) || null;
}

export function providerNameSet(names) {
  return new Set(
    uniqueProviderNames(names).map((name) => name.toLowerCase()),
  );
}

export function hasProviderName(names, companyName) {
  const target = String(companyName || "")
    .trim()
    .toLowerCase();
  if (!target) return false;
  return providerNameSet(names).has(target);
}
