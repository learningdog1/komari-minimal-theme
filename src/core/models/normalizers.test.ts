import { describe, expect, it } from "vitest";
import { UNGROUPED_GROUP_KEY } from "@/lib/groups";
import { normalizeNodes } from "./normalizers";

describe("normalizeNodes", () => {
  it("normalizes empty and default groups to the canonical internal key", () => {
    const nodes = normalizeNodes([
      {
        group: "Default",
        name: "Default group node",
        uuid: "default-group"
      },
      {
        name: "Missing group node",
        uuid: "missing-group"
      }
    ]);

    expect(nodes).toHaveLength(2);
    expect(nodes[0]?.group).toBe(UNGROUPED_GROUP_KEY);
    expect(nodes[1]?.group).toBe(UNGROUPED_GROUP_KEY);
  });
});
