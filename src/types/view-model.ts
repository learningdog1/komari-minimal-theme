export type DashboardStatus = "idle" | "loading" | "ready" | "error";

export type DashboardViewMode = "grid" | "table";

export type PingTimeRange = "1h" | "6h" | "24h" | "7d";

export type RealtimeConnectionStatus =
  | "idle"
  | "connecting"
  | "open"
  | "closed"
  | "error";

/**
 * 统一四档严重度级别
 * normal: 正常（绿色）
 * notice: 注意（黄色）
 * warning: 警告（橙色）
 * danger: 危险（红色）
 */
export type SeverityLevel = "normal" | "notice" | "warning" | "danger";

export interface NodeMetricViewModel {
  value?: number;
  label: string;
  /** 严重度级别，供UI颜色分档使用 */
  severity?: SeverityLevel;
}

export interface LoadMetricViewModel extends NodeMetricViewModel {
  /** 负载率百分比 (load1 / cpuCores * 100) */
  ratioPercent?: number;
  /** 状态标签（空闲/正常/繁忙/过载） */
  statusLabel?: string;
}

export interface DashboardGroupOptionViewModel {
  key: string;
  label: string;
}

export interface DashboardNodeViewModel {
  id: string;
  uuid: string;
  title: string;
  subtitle: string;
  group: string;
  groupLabel: string;
  region: string;
  online: boolean;
  hidden: boolean;
  tags: string[];
  remark: string;
  updatedAt: string | null;
  metrics: {
    cpu: NodeMetricViewModel;
    memory: NodeMetricViewModel;
    disk: NodeMetricViewModel;
    /** @deprecated 保留兼容性，请使用networkUp/networkDown */
    network: NodeMetricViewModel;
    load: LoadMetricViewModel;
    uptime: NodeMetricViewModel;
  };
  /** 网络上行速度（bytes/s） */
  networkUp: NodeMetricViewModel;
  /** 网络下行速度（bytes/s） */
  networkDown: NodeMetricViewModel;
  /** TCP 连接数 */
  tcpConnections: NodeMetricViewModel;
  /** UDP 连接数 */
  udpConnections: NodeMetricViewModel;
  /** 进程数 */
  processCount: NodeMetricViewModel;
}

export interface DashboardPingPointViewModel {
  /** 聚合桶起始时间 */
  bucketStartAt: string;
  /** 聚合桶结束时间 */
  bucketEndAt: string;
  /** @deprecated 使用 bucketStartAt */
  recordedAt: string;
  /** 展示用延迟值（平均值） */
  valueMs: number;
  /** 样本数量 */
  sampleCount: number;
  /** 最小延迟 */
  minMs: number;
  /** 最大延迟 */
  maxMs: number;
  /** 平均延迟 */
  avgMs: number;
  /** 是否为聚合点 */
  isAggregated: boolean;
}

export interface DashboardPingSeriesViewModel {
  taskId: number;
  taskName: string;
  lossPercent?: number;
  intervalSeconds?: number;
  points: DashboardPingPointViewModel[];
}

export interface DashboardSelectedNodeViewModel {
  node: DashboardNodeViewModel;
  recent: Array<Record<string, unknown>>;
  load: Array<Record<string, unknown>>;
  ping: DashboardPingSeriesViewModel[];
}

/**
 * 延迟图表View Model（用于独立延迟视图）
 */
export interface PingChartViewModel {
  /** 任务ID */
  taskId: number;
  /** 任务名称 */
  taskName: string;
  /** 数据点（已聚合/降采样） */
  points: Array<{
    /** 时间点（ISO格式） */
    timestamp: string;
    /** 延迟值（毫秒） */
    valueMs: number;
    /** 区间最小值 */
    minMs: number;
    /** 区间最大值 */
    maxMs: number;
    /** 样本数量 */
    sampleCount: number;
  }>;
  /** 统计信息 */
  stats: {
    /** 平均延迟 */
    avg: number;
    /** 最小延迟 */
    min: number;
    /** 最大延迟 */
    max: number;
    /** 丢包率（百分比） */
    lossRate: number;
  };
  /** 时间范围 */
  timeRange: PingTimeRange;
}

/**
 * 负载图表View Model（用于独立负载视图）
 */
export interface LoadChartViewModel {
  /** 时间序列数据 */
  series: Array<{
    /** 时间戳 */
    timestamp: string;
    /** 1分钟平均负载 */
    load1: number;
    /** 5分钟平均负载 */
    load5: number;
    /** 15分钟平均负载 */
    load15: number;
    /** CPU使用率（可选） */
    cpuUsage?: number;
    /** 内存使用率（可选） */
    memoryUsage?: number;
    /** 磁盘使用率（可选，历史中可能缺失） */
    diskUsage?: number;
    /** 网络上行速度（可选，历史中可能缺失） */
    networkUp?: number;
    /** 网络下行速度（可选，历史中可能缺失） */
    networkDown?: number;
    /** TCP连接数（可选，历史中可能缺失） */
    tcpConnections?: number;
    /** UDP连接数（可选，历史中可能缺失） */
    udpConnections?: number;
    /** 进程数（可选，历史中可能缺失） */
    processCount?: number;
  }>;
  /** 统计信息 */
  stats: {
    /** 平均负载 */
    avgLoad1: number;
    /** 峰值负载 */
    peakLoad1: number;
    /** 当前负载 */
    currentLoad1: number;
  };
  /** 时间范围 */
  timeRange: PingTimeRange;
  /** 字段可用性说明（哪些字段有趋势数据） */
  availableFields: {
    diskUsage: boolean;
    networkUp: boolean;
    networkDown: boolean;
    tcpConnections: boolean;
    udpConnections: boolean;
    processCount: boolean;
  };
}

/**
 * 节点最新统计View Model（用于负载视图卡片）
 */
export interface NodeLatestStatsViewModel {
  /** CPU使用率 */
  cpuUsage: number;
  /** 内存使用率 */
  memoryUsage: number;
  /** 内存已用量（bytes） */
  memoryUsed: number;
  /** 内存总量（bytes） */
  memoryTotal: number;
  /** 磁盘使用率 */
  diskUsage: number;
  /** 磁盘已用量（bytes） */
  diskUsed: number;
  /** 磁盘总量（bytes） */
  diskTotal: number;
  /** 网络上行速度（bytes/s） */
  networkUp: number;
  /** 网络下行速度（bytes/s） */
  networkDown: number;
  /** TCP连接数 */
  tcpConnections: number;
  /** UDP连接数 */
  udpConnections: number;
  /** 进程数 */
  processCount: number;
  /** 1分钟平均负载 */
  load1: number;
  /** 5分钟平均负载 */
  load5: number;
  /** 15分钟平均负载 */
  load15: number;
  /** 运行时间（秒） */
  uptimeSeconds: number;
  /** 更新时间 */
  updatedAt: string | null;
}

/**
 * Hover命中区间
 */
export interface HoverHitInterval {
  /** 屏幕起始X坐标 */
  startX: number;
  /** 屏幕结束X坐标 */
  endX: number;
  /** 对应时间戳 */
  timestamp: string;
}

/**
 * Hover命中数据
 */
export interface HoverHitData {
  /** 延迟值（毫秒） */
  valueMs: number;
  /** 区间最小值 */
  minMs: number;
  /** 区间最大值 */
  maxMs: number;
  /** 样本数量 */
  sampleCount: number;
}

/**
 * Hover命中模型（用于稳定tooltip显示）
 */
export interface HoverHitModel {
  /** 命中区间 */
  hitInterval: HoverHitInterval;
  /** 命中数据 */
  data: HoverHitData;
  /** 稳定ID（用于React key） */
  stableId: string;
}

export interface DashboardSummaryViewModel {
  totalNodes: number;
  onlineNodes: number;
  offlineNodes: number;
  groupCount: number;
  lastUpdatedAt: string | null;
}

export interface DashboardViewModel {
  site: {
    description: string;
    subtitle: string;
    themeName: string;
    title: string;
  };
  theme: {
    accentColor: string;
    defaultGroup: string | null;
    defaultGroupLabel: string | null;
    defaultViewMode: DashboardViewMode;
    extra: Record<string, boolean | number | string | null>;
    footerText: string;
    loadHours: number;
    pingHours: number;
    refreshIntervalMs: number;
    showOfflineNodes: boolean;
    subtitle: string;
    title: string;
  };
  status: DashboardStatus;
  error: string | null;
  groups: DashboardGroupOptionViewModel[];
  nodes: DashboardNodeViewModel[];
  selectedGroup: string | null;
  selectedGroupLabel: string | null;
  selectedNodeId: string | null;
  selectedNode: DashboardSelectedNodeViewModel | null;
  selectedPingTimeRange: PingTimeRange;
  viewMode: DashboardViewMode;
  sortKey: import("./domain").NodeSortKey | null;
  sortDirection: import("./domain").SortDirection;
  realtimeConnection: RealtimeConnectionStatus;
  isReservedRoute: boolean;
  summary: DashboardSummaryViewModel;
}
