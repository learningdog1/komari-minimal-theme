import { describe, expect, it } from "vitest";
import { UNGROUPED_GROUP_KEY } from "@/lib/groups";
import {
  DEFAULT_THEME_SETTINGS,
  normalizeThemeSettings
} from "./theme-settings";

describe("normalizeThemeSettings", () => {
  it("merges known fields and preserves custom primitives", () => {
    const settings = normalizeThemeSettings({
      accent_color: "#123456",
      default_group: "Default",
      default_view_mode: "table",
      extra_toggle: true,
      footer_text: "Powered by Komari Monitor.",
      load_hours: 36,
      ping_hours: 12,
      refresh_interval_ms: 15_000,
      show_offline_nodes: false,
      subtitle: "Custom subtitle",
      title: "Custom title"
    });

    expect(settings).toMatchObject({
      accentColor: "#123456",
      defaultGroup: UNGROUPED_GROUP_KEY,
      defaultViewMode: "table",
      footerText: "Powered by Komari Monitor.",
      loadHours: 36,
      pingHours: 12,
      refreshIntervalMs: 15_000,
      showOfflineNodes: false,
      subtitle: "Custom subtitle",
      title: "Custom title"
    });
    expect(settings.extra).toEqual({
      extra_toggle: true
    });
  });

  it("falls back to defaults when theme_settings is missing", () => {
    expect(normalizeThemeSettings(null)).toEqual(DEFAULT_THEME_SETTINGS);
  });
});
