export const UNGROUPED_GROUP_KEY = "__komari_ungrouped__";
export const UNGROUPED_GROUP_LABEL = "未分组";

export function normalizeGroupKey(value?: string | null): string {
  const trimmed = value?.trim() ?? "";

  if (
    !trimmed ||
    trimmed === UNGROUPED_GROUP_KEY ||
    trimmed === UNGROUPED_GROUP_LABEL ||
    trimmed.toLowerCase() === "default"
  ) {
    return UNGROUPED_GROUP_KEY;
  }

  return trimmed;
}

export function normalizeOptionalGroupKey(
  value?: string | null
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return normalizeGroupKey(value);
}

export function getGroupDisplayLabel(value?: string | null): string {
  return normalizeGroupKey(value) === UNGROUPED_GROUP_KEY
    ? UNGROUPED_GROUP_LABEL
    : value?.trim() ?? UNGROUPED_GROUP_LABEL;
}
