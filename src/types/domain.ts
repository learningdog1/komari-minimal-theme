import type {
  DashboardStatus,
  DashboardViewMode,
  PingTimeRange,
  RealtimeConnectionStatus
} from "./view-model";

export interface ThemeSettings {
  title: string;
  subtitle: string;
  accentColor: string;
  defaultGroup: string | null;
  defaultViewMode: DashboardViewMode;
  showOfflineNodes: boolean;
  loadHours: number;
  pingHours: number;
  refreshIntervalMs: number;
  footerText: string;
  extra: Record<string, boolean | number | string | null>;
}

export interface PublicInfo {
  allowCors: boolean;
  customBody: string;
  customHead: string;
  description: string;
  disablePasswordLogin: boolean;
  oauthEnabled: boolean;
  oauthProvider: string | null;
  pingRecordPreserveHours: number;
  privateSite: boolean;
  recordEnabled: boolean;
  recordPreserveHours: number;
  siteName: string;
  themeName: string;
  themeSettings: ThemeSettings;
}

export interface NodeMetadata {
  uuid: string;
  name: string;
  cpuName: string;
  virtualization: string;
  architecture: string;
  cpuCores?: number;
  operatingSystem: string;
  kernelVersion: string;
  gpuName: string;
  region: string;
  memoryTotal?: number;
  swapTotal?: number;
  diskTotal?: number;
  weight: number;
  price?: number;
  billingCycleDays?: number;
  autoRenewal: boolean;
  currency: string;
  expiredAt: string | null;
  group: string;
  tags: string[];
  publicRemark: string;
  hidden: boolean;
  trafficLimit?: number;
  trafficLimitType: string;
  createdAt: string | null;
  updatedAt: string | null;
  /** 从/api/nodes解析的实时指标样本，用于HTTP轮询更新 */
  latestSample?: MetricSample;
}

export interface MetricSample {
  cpuUsage?: number;
  gpuUsage?: number;
  memoryUsed?: number;
  memoryTotal?: number;
  memoryUsagePercent?: number;
  swapUsed?: number;
  swapTotal?: number;
  swapUsagePercent?: number;
  load?: number;
  load1?: number;
  load5?: number;
  load15?: number;
  temperatureCelsius?: number;
  diskUsed?: number;
  diskTotal?: number;
  diskUsagePercent?: number;
  networkUp?: number;
  networkDown?: number;
  networkTotalUp?: number;
  networkTotalDown?: number;
  tcpConnections?: number;
  udpConnections?: number;
  uptimeSeconds?: number;
  processCount?: number;
  message?: string;
  updatedAt?: string;
}

export interface RecentHistoryPoint extends MetricSample {
  recordedAt: string;
}

export interface LoadHistoryPoint extends MetricSample {
  recordedAt: string;
}

export interface PingTask {
  id: number;
  name: string;
  intervalSeconds?: number;
  lossPercent?: number;
}

export interface PingHistoryPoint {
  taskId: number;
  recordedAt: string;
  valueMs?: number;
}

export interface PingHistory {
  tasks: PingTask[];
  records: PingHistoryPoint[];
}

export interface RealtimeSnapshot {
  onlineNodeIds: string[];
  receivedAt: string;
  samples: Record<string, MetricSample>;
}

export interface NodeEntity {
  meta: NodeMetadata;
  latest?: MetricSample;
  recentHistory: RecentHistoryPoint[];
  loadHistory: LoadHistoryPoint[];
  pingHistory: PingHistory;
  isOnline: boolean;
  lastUpdatedAt: string | null;
}

/** 节点排序字段 */
export type NodeSortKey =
  | "cpu"
  | "memory"
  | "disk"
  | "load"
  | "networkUp"
  | "networkDown"
  | "uptime"
  | "name";

/** 排序方向 */
export type SortDirection = "asc" | "desc";

export interface DashboardPreferences {
  selectedGroup: string | null;
  viewMode: DashboardViewMode;
  selectedPingTimeRange: PingTimeRange;
  /** 自定义分组顺序，null 时按 label 字母排序 */
  groupOrder: string[] | null;
  /** 节点排序字段，null 时保持默认顺序 */
  sortKey: NodeSortKey | null;
  /** 排序方向 */
  sortDirection: SortDirection;
}

export interface DashboardState {
  status: DashboardStatus;
  error: string | null;
  isReservedRoute: boolean;
  realtimeConnection: RealtimeConnectionStatus;
  publicInfo: PublicInfo;
  nodes: Record<string, NodeEntity>;
  nodeOrder: string[];
  selectedNodeId: string | null;
  preferences: DashboardPreferences;
}
