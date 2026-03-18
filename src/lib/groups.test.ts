import { describe, expect, it } from "vitest";
import {
  getGroupDisplayLabel,
  normalizeOptionalGroupKey,
  UNGROUPED_GROUP_KEY,
  UNGROUPED_GROUP_LABEL
} from "./groups";

describe("group compatibility helpers", () => {
  it("maps historical selected group values to the canonical internal key", () => {
    expect(normalizeOptionalGroupKey("Default")).toBe(UNGROUPED_GROUP_KEY);
    expect(normalizeOptionalGroupKey("未分组")).toBe(UNGROUPED_GROUP_KEY);
    expect(normalizeOptionalGroupKey(UNGROUPED_GROUP_KEY)).toBe(
      UNGROUPED_GROUP_KEY
    );
  });

  it("exposes a user-facing label without leaking the internal key", () => {
    expect(getGroupDisplayLabel("Default")).toBe(UNGROUPED_GROUP_LABEL);
    expect(getGroupDisplayLabel(UNGROUPED_GROUP_KEY)).toBe(
      UNGROUPED_GROUP_LABEL
    );
    expect(getGroupDisplayLabel("Tokyo")).toBe("Tokyo");
  });
});
