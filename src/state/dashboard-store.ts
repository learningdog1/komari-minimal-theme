import {
  readGroupOrder,
  readPingTimeRange,
  readSortDirection,
  readSortKey,
  readStorageItem,
  readViewMode,
  STORAGE_KEYS
} from "@/lib/persistence";
import { normalizeOptionalGroupKey } from "@/lib/groups";
import type {
  DashboardPreferences,
  DashboardState,
  PublicInfo,
  RealtimeSnapshot
} from "@/types/domain";
import type { DashboardViewMode, PingTimeRange, RealtimeConnectionStatus } from "@/types/view-model";
import { createStore } from "./store";

const initialPublicInfo: PublicInfo = {
  allowCors: false,
  customBody: "",
  customHead: "",
  description: "A simple server monitor tool.",
  disablePasswordLogin: false,
  oauthEnabled: false,
  oauthProvider: null,
  pingRecordPreserveHours: 0,
  privateSite: false,
  recordEnabled: false,
  recordPreserveHours: 0,
  siteName: "Komari Monitor",
  themeName: "Komari",
  themeSettings: {
    title: "Komari Monitor",
    subtitle: "",
    accentColor: "#0f766e",
    defaultGroup: null,
    defaultViewMode: "grid" as DashboardViewMode,
    showOfflineNodes: true,
    loadHours: 24,
    pingHours: 6,
    refreshIntervalMs: 5000,
    footerText: "Powered by Komari Monitor.",
    extra: {}
  }
};

const initialPreferences: DashboardPreferences = {
  selectedGroup: normalizeOptionalGroupKey(
    readStorageItem(STORAGE_KEYS.selectedGroup)
  ),
  viewMode: readViewMode(),
  selectedPingTimeRange: readPingTimeRange(),
  groupOrder: readGroupOrder(),
  sortKey: readSortKey(),
  sortDirection: readSortDirection()
};

const initialState: DashboardState = {
  status: "idle",
  error: null,
  isReservedRoute: false,
  realtimeConnection: "idle" as RealtimeConnectionStatus,
  publicInfo: initialPublicInfo,
  preferences: initialPreferences,
  nodes: {},
  nodeOrder: [],
  selectedNodeId: null
};

export const dashboardStore = createStore<DashboardState>(initialState);

// 导出 Actions
export const dashboardStoreActions = {
  setStatus: (status: DashboardState["status"]) => dashboardStore.setState((state) => ({ ...state, status })),
  setError: (error: string | null) => dashboardStore.setState((state) => ({ ...state, error })),
  clearError: () => dashboardStore.setState((state) => ({ ...state, error: null })),
  setReservedRoute: (isReservedRoute: boolean) => dashboardStore.setState((state) => ({ ...state, isReservedRoute })),
  setRealtimeConnection: (realtimeConnection: RealtimeConnectionStatus) => dashboardStore.setState((state) => ({ ...state, realtimeConnection })),
  setPublicInfo: (publicInfo: PublicInfo) => dashboardStore.setState((state) => ({ ...state, publicInfo })),
  setNodeOrder: (nodeOrder: string[]) => dashboardStore.setState((state) => ({ ...state, nodeOrder })),
  setSelectedNode: (selectedNodeId: string | null) => dashboardStore.setState((state) => ({ ...state, selectedNodeId })),
  setSelectedGroup: (selectedGroup: string | null) => dashboardStore.setState((state) => ({
    ...state,
    preferences: { ...state.preferences, selectedGroup }
  })),
  setViewMode: (viewMode: DashboardViewMode) => dashboardStore.setState((state) => ({
    ...state,
    preferences: { ...state.preferences, viewMode }
  })),
  setPingTimeRange: (selectedPingTimeRange: PingTimeRange) => dashboardStore.setState((state) => ({
    ...state,
    preferences: { ...state.preferences, selectedPingTimeRange }
  })),
  setGroupOrder: (groupOrder: string[] | null) => dashboardStore.setState((state) => ({
    ...state,
    preferences: { ...state.preferences, groupOrder }
  })),
  setSortPreference: (sortKey: any, sortDirection: any) => dashboardStore.setState((state) => ({
    ...state,
    preferences: { ...state.preferences, sortKey, sortDirection }
  })),
  setRecentHistory: (uuid: string, history: any) => dashboardStore.setState((state) => {
    const node = state.nodes[uuid];
    if (!node) return state;
    return {
      ...state,
      nodes: { ...state.nodes, [uuid]: { ...node, recentHistory: history } }
    };
  }),
  setLoadHistory: (uuid: string, history: any) => dashboardStore.setState((state) => {
    const node = state.nodes[uuid];
    if (!node) return state;
    return {
      ...state,
      nodes: { ...state.nodes, [uuid]: { ...node, loadHistory: history } }
    };
  }),
  setPingHistory: (uuid: string, history: any) => dashboardStore.setState((state) => {
    const node = state.nodes[uuid];
    if (!node) return state;
    return {
      ...state,
      nodes: { ...state.nodes, [uuid]: { ...node, pingHistory: history } }
    };
  }),
  replaceNodes: (nodes: any) => dashboardStore.setState((state) => ({ ...state, nodes })),
  mergeRealtime: (snapshot: RealtimeSnapshot) => dashboardStore.setState((state) => {
    const now = new Date().toISOString();
    const recordedAt = snapshot.receivedAt || now;
    const updatedNodes = { ...state.nodes };

    // 更新在线状态和采样数据
    Object.entries(snapshot.samples).forEach(([uuid, sample]) => {
      const node = updatedNodes[uuid];
      if (node) {
        // 构建新的历史记录点
        const historyPoint = { ...sample, recordedAt };

        // 追加到 recentHistory，保持最多30条
        const newRecentHistory = [...node.recentHistory, historyPoint].slice(-30);

        // 追加到 loadHistory，保持最多30条
        const newLoadHistory = [...node.loadHistory, historyPoint].slice(-30);

        updatedNodes[uuid] = {
          ...node,
          latest: { ...sample, updatedAt: now },
          recentHistory: newRecentHistory,
          loadHistory: newLoadHistory,
          isOnline: snapshot.onlineNodeIds.includes(uuid),
          lastUpdatedAt: now
        };
      }
    });

    // 标记不在 onlineNodeIds 中的节点为离线
    Object.keys(updatedNodes).forEach((uuid) => {
      if (!snapshot.onlineNodeIds.includes(uuid)) {
        const node = updatedNodes[uuid];
        if (node && node.isOnline) {
          updatedNodes[uuid] = {
            ...node,
            isOnline: false,
            lastUpdatedAt: now
          };
        }
      }
    });

    return { ...state, nodes: updatedNodes };
  }),
  retry: () => dashboardStore.setState((state) => ({ ...state, status: "idle", error: null }))
};
