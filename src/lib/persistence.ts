export function readStorageItem(key: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorageItem(key: string, value: string | null): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (value === null) {
      window.localStorage.removeItem(key);
      return;
    }

    window.localStorage.setItem(key, value);
  } catch {
    // 忽略存储失败，避免在无权限环境下中断主题渲染。
  }
}

// Storage keys for preferences
export const STORAGE_KEYS = {
  selectedGroup: "nodeSelectedGroup",
  viewMode: "nodeViewMode",
  selectedPingTimeRange: "pingTimeRange",
  groupOrder: "nodeGroupOrder",
  sortKey: "nodeSortKey",
  sortDirection: "nodeSortDirection"
} as const;

// Read view mode from storage
export function readViewMode(): "grid" | "table" {
  const value = readStorageItem(STORAGE_KEYS.viewMode);
  return value === "table" ? "table" : "grid";
}

// Read ping time range from storage
export function readPingTimeRange(): "1h" | "6h" | "24h" | "7d" {
  const value = readStorageItem(STORAGE_KEYS.selectedPingTimeRange);
  if (value === "1h" || value === "6h" || value === "24h" || value === "7d") {
    return value;
  }
  return "24h";
}

// Read group order from storage
export function readGroupOrder(): string[] | null {
  const value = readStorageItem(STORAGE_KEYS.groupOrder);
  if (!value) {
    return null;
  }
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as string[];
    }
  } catch {
    // Invalid JSON, return null
  }
  return null;
}

// Read sort key from storage
export function readSortKey(): import("@/types/domain").NodeSortKey | null {
  const value = readStorageItem(STORAGE_KEYS.sortKey);
  const validKeys: import("@/types/domain").NodeSortKey[] = [
    "cpu",
    "memory",
    "disk",
    "load",
    "networkUp",
    "networkDown",
    "uptime",
    "name"
  ];
  return validKeys.includes(value as import("@/types/domain").NodeSortKey)
    ? (value as import("@/types/domain").NodeSortKey)
    : null;
}

// Read sort direction from storage
export function readSortDirection(): "asc" | "desc" {
  const value = readStorageItem(STORAGE_KEYS.sortDirection);
  return value === "desc" ? "desc" : "asc";
}

