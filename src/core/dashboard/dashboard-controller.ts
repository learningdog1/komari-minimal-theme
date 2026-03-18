import type { DashboardViewMode, PingTimeRange } from "@/types/view-model";
import type { ThemeRuntimeConfig } from "@/core/config/runtime";
import { createKomariApiClient, type KomariApiClient } from "@/core/api/komari-api";
import {
  createClientsSocketController,
  type ClientsSocketController
} from "@/core/api/clients-socket";
import {
  isReservedRoutePath,
  resolveThemeRuntimeConfig
} from "@/core/config/runtime";
import { dashboardStore, dashboardStoreActions } from "@/state/dashboard-store";
import { getAvailableTimeRange } from "@/lib/time";
import { writeStorageItem, STORAGE_KEYS } from "@/lib/persistence";
import { mergeNodeEntities } from "@/core/models/mappers";

// 将 PingTimeRange 转换为小时数
function timeRangeToHours(range: PingTimeRange): number {
  switch (range) {
    case "1h":
      return 1;
    case "6h":
      return 6;
    case "24h":
      return 24;
    case "7d":
      return 168;
    default:
      return 24;
  }
}

let apiClient: KomariApiClient | null = null;
let bootstrapPromise: Promise<void> | null = null;
let realtimeController: ClientsSocketController | null = null;
let runtimeConfig: ThemeRuntimeConfig | null = null;
let pollingTimer: number | null = null;
let snapshotTimer: number | null = null; // 实时数据快照轮询定时器
let isRefreshing = false; // 防重入标志

export const dashboardController = {
  async bootstrap(): Promise<void> {
    if (isReservedRoutePath(window.location.pathname)) {
      dashboardStore.setState({ isReservedRoute: true });
      dashboardStore.setState({ status: "ready" });
      return;
    }

    if (bootstrapPromise) return bootstrapPromise;

    bootstrapPromise = (async () => {
      try {
        dashboardStore.setState({ isReservedRoute: false });
        dashboardStore.setState({ status: "loading" });
        dashboardStore.setState({ error: null });

        const publicInfo = await getApiClient().getPublicInfo();
        dashboardStore.setState({ publicInfo });

        await this.refreshNodes();

        // 首屏获取最新状态并合并，避免 showOfflineNodes=false 时节点被隐藏
        try {
          const latestStatus = await getApiClient().getNodesLatestStatus();
          dashboardStoreActions.mergeRealtime(latestStatus);
        } catch {
          // 忽略 latest status 获取失败，不影响首屏展示
        }

        dashboardStore.setState({ status: "ready" });

        this.startPolling();
        this.connectRealtime();
      } catch (error) {
        dashboardStore.setState({ error: String(error) });
        dashboardStore.setState({ status: "error" });
      } finally {
        bootstrapPromise = null;
      }
    })();

    return bootstrapPromise;
  },

  async refreshNodes(): Promise<void> {
    if (isRefreshing) return;
    isRefreshing = true;

    try {
      const nodes = await getApiClient().getNodes();
      // Convert NodeMetadata[] to Record<string, NodeEntity> and update nodeOrder
      const state = dashboardStore.getState();
      const nodesRecord = mergeNodeEntities(state.nodes, nodes);
      const nodeOrder = nodes.map((n) => n.uuid);
      dashboardStore.setState({ nodes: nodesRecord, nodeOrder });
    } finally {
      isRefreshing = false;
    }
  },

  startPolling(): void {
    if (pollingTimer) clearInterval(pollingTimer);
    pollingTimer = window.setInterval(() => {
      this.refreshNodes();
    }, 30000);
  },

  disconnect(): void {
    if (pollingTimer) clearInterval(pollingTimer);
    if (snapshotTimer) {
      clearInterval(snapshotTimer);
      snapshotTimer = null;
    }
    if (realtimeController) {
      realtimeController.disconnect();
      realtimeController = null;
    }
  },

  connectRealtime(): void {
    if (realtimeController) return;

    const runtime = getRuntimeConfig();
    realtimeController = createClientsSocketController(
      runtime.origin,
      runtime.realtimePath,
      {
        onMessage: (snapshot) => {
          // 合并逻辑具体实现在 store 订阅中
          dashboardStoreActions.mergeRealtime(snapshot);
        },
        onStateChange: (status) => {
          dashboardStore.setState({ realtimeConnection: status });

          // 连接打开时启动定时请求快照，保持数据实时性
          if (status === "open") {
            if (snapshotTimer) clearInterval(snapshotTimer);
            snapshotTimer = window.setInterval(() => {
              realtimeController?.requestSnapshot();
            }, 5000); // 每5秒请求一次快照
          }
          // 连接断开时清除定时器
          if (status === "closed" || status === "error") {
            if (snapshotTimer) {
              clearInterval(snapshotTimer);
              snapshotTimer = null;
            }
          }
        },
        onError: (error) => {
          dashboardStore.setState({ error: String(error) });
        }
      }
    );

    realtimeController.connect();
  },

  async selectNode(uuid: string | null): Promise<void> {
    dashboardStore.setState({ selectedNodeId: uuid });

    // 加载节点详情历史数据
    if (uuid) {
      const state = dashboardStore.getState();
      const hours = timeRangeToHours(state.preferences.selectedPingTimeRange);

      // 并行加载 ping/recent/load history
      Promise.all([
        getApiClient().getPingHistory(uuid, hours).catch(() => null),
        getApiClient().getRecentHistory(uuid).catch(() => null),
        getApiClient().getLoadHistory(uuid, 24).catch(() => null)
      ]).then(([pingHistory, recentHistory, loadHistory]) => {
        if (pingHistory) {
          dashboardStoreActions.setPingHistory(uuid, pingHistory);
        }
        if (recentHistory) {
          dashboardStoreActions.setRecentHistory(uuid, recentHistory);
        }
        if (loadHistory) {
          dashboardStoreActions.setLoadHistory(uuid, loadHistory);
        }
      });
    }
  },

  setSelectedGroup(group: string | null): void {
    // 验证分组是否存在（如果传入非 null 值）
    if (group !== null) {
      const state = dashboardStore.getState();
      const availableGroups = new Set(
        Object.values(state.nodes)
          .map((n) => n.meta.group)
          .filter((g): g is string => Boolean(g))
      );
      // 如果分组不存在，重置为 null（显示全部）
      if (!availableGroups.has(group)) {
        group = null;
      }
    }

    writeStorageItem(STORAGE_KEYS.selectedGroup, group);
    dashboardStore.setState((state) => ({
      preferences: { ...state.preferences, selectedGroup: group }
    }));
  },

  setPingTimeRange(range: PingTimeRange): void {
    const state = dashboardStore.getState();
    const preserveHours = state.publicInfo.pingRecordPreserveHours || 24;
    const availableRange = getAvailableTimeRange(range, preserveHours);
    dashboardStore.setState((state) => ({
      preferences: { ...state.preferences, selectedPingTimeRange: availableRange }
    }));

    // 如果有选中的节点，重新加载对应时段的 ping history
    const selectedNodeId = state.selectedNodeId;
    if (selectedNodeId) {
      const hours = timeRangeToHours(availableRange);
      getApiClient()
        .getPingHistory(selectedNodeId, hours)
        .then((pingHistory) => {
          dashboardStoreActions.setPingHistory(selectedNodeId, pingHistory);
        })
        .catch(() => {
          // 忽略加载失败
        });
    }
  },

  setViewMode(viewMode: DashboardViewMode): void {
    dashboardStore.setState((state) => ({
      preferences: { ...state.preferences, viewMode }
    }));
  },

  setGroupOrder(groupOrder: string[]): void {
    const state = dashboardStore.getState();
    const availableGroups = new Set(
      Object.values(state.nodes)
        .map((n) => n.meta.group)
        .filter((g): g is string => Boolean(g))
    );

    const validGroupOrder = groupOrder.filter((key) => availableGroups.has(key));
    dashboardStore.setState((state) => ({
      preferences: {
        ...state.preferences,
        groupOrder: validGroupOrder.length > 0 ? validGroupOrder : null
      }
    }));

    writeStorageItem(
      STORAGE_KEYS.groupOrder,
      validGroupOrder.length > 0 ? JSON.stringify(validGroupOrder) : null
    );
  },

  setSortPreference(
    sortKey: import("@/types/domain").NodeSortKey | null,
    sortDirection: import("@/types/domain").SortDirection
  ): void {
    writeStorageItem(STORAGE_KEYS.sortKey, sortKey);
    writeStorageItem(STORAGE_KEYS.sortDirection, sortDirection);
    dashboardStoreActions.setSortPreference(sortKey, sortDirection);
  }
};
function getApiClient(): KomariApiClient {
  if (!apiClient) {
    apiClient = createKomariApiClient(getRuntimeConfig());
  }
  return apiClient;
}

function getRuntimeConfig(): ThemeRuntimeConfig {
  if (!runtimeConfig) {
    runtimeConfig = resolveThemeRuntimeConfig(window.location);
  }
  return runtimeConfig;
}
