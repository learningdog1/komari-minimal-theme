import type { ThemeSettingPrimitive } from "@/types/api";
import type { ThemeSettings } from "@/types/domain";
import type { DashboardViewMode } from "@/types/view-model";
import { normalizeOptionalGroupKey } from "@/lib/groups";
import {
  asRecord,
  clampNumber,
  coerceBoolean,
  coerceNumber,
  coerceString
} from "@/lib/validation";

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  title: "Komari Monitor",
  subtitle: "Observability overview",
  accentColor: "#0f766e",
  defaultGroup: null,
  defaultViewMode: "grid",
  showOfflineNodes: true,
  loadHours: 24,
  pingHours: 6,
  refreshIntervalMs: 5_000,
  footerText: "Powered by Komari Monitor.",
  extra: {}
};

const KNOWN_THEME_SETTING_KEYS = new Set([
  "accentColor",
  "accent_color",
  "defaultGroup",
  "default_group",
  "defaultViewMode",
  "default_view_mode",
  "footerText",
  "footer_text",
  "loadHours",
  "load_hours",
  "pingHours",
  "ping_hours",
  "refreshIntervalMs",
  "refresh_interval_ms",
  "showOfflineNodes",
  "show_offline_nodes",
  "subtitle",
  "title"
]);

export function normalizeThemeSettings(value: unknown): ThemeSettings {
  const record = asRecord(value);

  if (!record) {
    return { ...DEFAULT_THEME_SETTINGS };
  }

  const defaultViewMode = normalizeViewMode(
    coerceString(record.defaultViewMode) ?? coerceString(record.default_view_mode)
  );

  const extra = Object.entries(record).reduce<Record<string, ThemeSettingPrimitive>>(
    (accumulator, [key, entry]) => {
      if (KNOWN_THEME_SETTING_KEYS.has(key)) {
        return accumulator;
      }

      if (
        typeof entry === "boolean" ||
        typeof entry === "number" ||
        typeof entry === "string" ||
        entry === null
      ) {
        accumulator[key] = entry;
      }

      return accumulator;
    },
    {}
  );

  return {
    title: coerceString(record.title) ?? DEFAULT_THEME_SETTINGS.title,
    subtitle: coerceString(record.subtitle) ?? DEFAULT_THEME_SETTINGS.subtitle,
    accentColor:
      coerceString(record.accentColor) ??
      coerceString(record.accent_color) ??
      DEFAULT_THEME_SETTINGS.accentColor,
    defaultGroup: normalizeOptionalGroupKey(
      coerceString(record.defaultGroup) ??
      coerceString(record.default_group) ??
      DEFAULT_THEME_SETTINGS.defaultGroup
    ),
    defaultViewMode,
    showOfflineNodes:
      coerceBoolean(record.showOfflineNodes) ??
      coerceBoolean(record.show_offline_nodes) ??
      DEFAULT_THEME_SETTINGS.showOfflineNodes,
    loadHours: clampNumber(
      coerceNumber(record.loadHours) ?? coerceNumber(record.load_hours),
      1,
      720,
      DEFAULT_THEME_SETTINGS.loadHours
    ),
    pingHours: clampNumber(
      coerceNumber(record.pingHours) ?? coerceNumber(record.ping_hours),
      1,
      168,
      DEFAULT_THEME_SETTINGS.pingHours
    ),
    refreshIntervalMs: clampNumber(
      coerceNumber(record.refreshIntervalMs) ??
        coerceNumber(record.refresh_interval_ms),
      5_000,
      300_000,
      DEFAULT_THEME_SETTINGS.refreshIntervalMs
    ),
    footerText:
      coerceString(record.footerText) ??
      coerceString(record.footer_text) ??
      DEFAULT_THEME_SETTINGS.footerText,
    extra
  };
}

function normalizeViewMode(value: string | undefined): DashboardViewMode {
  return value === "table" ? "table" : DEFAULT_THEME_SETTINGS.defaultViewMode;
}
