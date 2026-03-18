import type { DashboardState, NodeEntity } from "@/types/domain";
import type {
  DashboardGroupOptionViewModel,
  DashboardNodeViewModel,
  DashboardPingSeriesViewModel,
  DashboardSelectedNodeViewModel,
  DashboardSummaryViewModel,
  DashboardViewModel
} from "@/types/view-model";
import { getGroupDisplayLabel, normalizeGroupKey, UNGROUPED_GROUP_KEY } from "@/lib/groups";
import {
  formatBandwidth,
  formatBytes,
  formatDuration,
  formatPercent,
  roundPercentValue,
  calculateSeverityLevel,
  calculateLoadStatus,
  calculateNetworkSeverity
} from "@/lib/formatters";
import { filterRecordsByTimeRange, aggregatePingData, generateHoverHitIntervals } from "@/lib/time";

let cachedDashboardState: DashboardState | null = null;
let cachedDashboardViewModel: DashboardViewModel | null = null;

export function selectDashboardViewModel(
  state: DashboardState
): DashboardViewModel {
  if (cachedDashboardState === state && cachedDashboardViewModel) {
    return cachedDashboardViewModel;
  }

  // 提取唯一分组
  const groupsMap = state.nodeOrder.reduce<Map<string, DashboardGroupOptionViewModel>>(
    (accumulator, uuid) => {
      const groupKey = state.nodes[uuid]?.meta.group;

      if (!groupKey) {
        return accumulator;
      }

      accumulator.set(groupKey, {
        key: groupKey,
        label: getGroupDisplayLabel(groupKey)
      });
      return accumulator;
    },
    new Map()
  );

  // 应用自定义排序或按 label 排序
  const groups = Array.from(groupsMap.values()).sort((left, right) => {
    const customOrder = state.preferences.groupOrder;
    if (customOrder && customOrder.length > 0) {
      // 过滤掉已不存在于当前分组的 key
      const validOrder = customOrder.filter((key) => groupsMap.has(key));
      const leftIndex = validOrder.indexOf(left.key);
      const rightIndex = validOrder.indexOf(right.key);
      // 如果都在自定义顺序中，按顺序排序
      if (leftIndex !== -1 && rightIndex !== -1) {
        return leftIndex - rightIndex;
      }
      // 如果只有一个在自定义顺序中，优先排在前面
      if (leftIndex !== -1) return -1;
      if (rightIndex !== -1) return 1;
    }
    // 默认按 label 字母排序
    return left.label.localeCompare(right.label);
  });

  // 检查 selectedGroup 是否仍然有效（存在于当前节点中）
  const validGroupKeys = new Set(
    state.nodeOrder
      .map(uuid => state.nodes[uuid]?.meta.group)
      .filter((group): group is string => Boolean(group))
  );
  const selectedGroupIsValid = state.preferences.selectedGroup 
    ? validGroupKeys.has(state.preferences.selectedGroup)
    : true;

  const nodes = state.nodeOrder
    .map((uuid) => state.nodes[uuid])
    .filter((node): node is NodeEntity => Boolean(node))
    .filter((node) => {
      if (!state.publicInfo.themeSettings.showOfflineNodes && !node.isOnline) {
        return false;
      }

      // 如果 selectedGroup 无效，重置为显示全部
      if (!selectedGroupIsValid) {
        return true;
      }

      if (!state.preferences.selectedGroup) {
        return true;
      }

      // 处理未分组情况：selectedGroup 为 UNGROUPED_GROUP_KEY 时，匹配 group 为 null/undefined/空字符串或 UNGROUPED_GROUP_KEY 的节点
      if (state.preferences.selectedGroup === UNGROUPED_GROUP_KEY) {
        return !node.meta.group || node.meta.group === UNGROUPED_GROUP_KEY;
      }

      return node.meta.group === state.preferences.selectedGroup;
    })
    .sort((a, b) => {
      const { sortKey, sortDirection } = state.preferences;
      if (!sortKey) return 0; // 默认不排序，保持nodeOrder顺序

      let comparison = 0;
      switch (sortKey) {
        case "cpu":
          comparison = (a.latest?.cpuUsage || 0) - (b.latest?.cpuUsage || 0);
          break;
        case "memory":
          comparison =
            (a.latest?.memoryUsagePercent || 0) -
            (b.latest?.memoryUsagePercent || 0);
          break;
        case "disk":
          comparison =
            (a.latest?.diskUsagePercent || 0) - (b.latest?.diskUsagePercent || 0);
          break;
        case "load":
          comparison =
            (a.latest?.load1 || a.latest?.load || 0) -
            (b.latest?.load1 || b.latest?.load || 0);
          break;
        case "networkUp":
          comparison = (a.latest?.networkUp || 0) - (b.latest?.networkUp || 0);
          break;
        case "networkDown":
          comparison =
            (a.latest?.networkDown || 0) - (b.latest?.networkDown || 0);
          break;
        case "uptime":
          comparison =
            (a.latest?.uptimeSeconds || 0) - (b.latest?.uptimeSeconds || 0);
          break;
        case "name":
          comparison = a.meta.name.localeCompare(b.meta.name);
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    })
    .map((node) => mapNodeToViewModel(node));

  const selectedNode = resolveSelectedNode(state);

  const viewModel = {
    site: {
      description: state.publicInfo.description,
      subtitle: state.publicInfo.themeSettings.subtitle,
      themeName: state.publicInfo.themeName,
      title: state.publicInfo.themeSettings.title || state.publicInfo.siteName
    },
    theme: {
      ...state.publicInfo.themeSettings,
      defaultGroupLabel: state.publicInfo.themeSettings.defaultGroup
        ? getGroupDisplayLabel(state.publicInfo.themeSettings.defaultGroup)
        : null
    },
    status: state.status,
    error: state.error,
    groups,
    nodes,
    selectedGroup: selectedGroupIsValid ? state.preferences.selectedGroup : null,
    selectedGroupLabel: selectedGroupIsValid && state.preferences.selectedGroup
      ? getGroupDisplayLabel(state.preferences.selectedGroup)
      : null,
    selectedNodeId:
      state.selectedNodeId && state.nodes[state.selectedNodeId]
        ? state.selectedNodeId
        : null,
    selectedNode,
    selectedPingTimeRange: state.preferences.selectedPingTimeRange,
    viewMode: state.preferences.viewMode,
    sortKey: state.preferences.sortKey,
    sortDirection: state.preferences.sortDirection,
    realtimeConnection: state.realtimeConnection,
    isReservedRoute: state.isReservedRoute,
    summary: buildSummary(state)
  };

  cachedDashboardState = state;
  cachedDashboardViewModel = viewModel;

  return viewModel;
}

function buildSummary(state: DashboardState): DashboardSummaryViewModel {
  const entities = state.nodeOrder
    .map((uuid) => state.nodes[uuid])
    .filter((node): node is NodeEntity => Boolean(node));

  const onlineNodes = entities.filter((node) => node.isOnline).length;
  const timestamps = entities
    .map((node) => node.lastUpdatedAt)
    .filter((value): value is string => Boolean(value))
    .sort();

  return {
    totalNodes: entities.length,
    onlineNodes,
    offlineNodes: Math.max(entities.length - onlineNodes, 0),
    groupCount: new Set(entities.map((entity) => entity.meta.group)).size,
    lastUpdatedAt: timestamps.at(-1) ?? null
  };
}

function mapNodeToViewModel(node: NodeEntity): DashboardNodeViewModel {
  const cpuPercent = roundPercentValue(node.latest?.cpuUsage);
  const memoryPercent =
    roundPercentValue(
      node.latest?.memoryUsagePercent ??
        derivePercent(node.latest?.memoryUsed, node.latest?.memoryTotal)
    );
  const diskPercent =
    roundPercentValue(
      node.latest?.diskUsagePercent ??
        derivePercent(node.latest?.diskUsed, node.latest?.diskTotal)
    );

  return {
    id: node.meta.uuid,
    uuid: node.meta.uuid,
    title: node.meta.name,
    subtitle:
      node.meta.publicRemark ||
      node.meta.operatingSystem ||
      node.meta.cpuName ||
      "暂无说明",
    group: normalizeGroupKey(node.meta.group),
    groupLabel: getGroupDisplayLabel(node.meta.group),
    region: node.meta.region || "未标注地区",
    online: node.isOnline,
    hidden: node.meta.hidden,
    tags: node.meta.tags,
    remark: node.meta.publicRemark,
    updatedAt: node.lastUpdatedAt,
    metrics: {
      cpu: {
        value: cpuPercent,
        label: formatPercent(cpuPercent),
        severity: calculateSeverityLevel(cpuPercent)
      },
      memory: {
        value: memoryPercent,
        label:
          memoryPercent !== undefined
            ? `${formatPercent(memoryPercent)} (${formatBytes(
                node.latest?.memoryUsed
              )}/${formatBytes(node.latest?.memoryTotal)})`
            : "N/A",
        severity: calculateSeverityLevel(memoryPercent)
      },
      disk: {
        value: diskPercent,
        label:
          diskPercent !== undefined
            ? `${formatPercent(diskPercent)} (${formatBytes(
                node.latest?.diskUsed
              )}/${formatBytes(node.latest?.diskTotal)})`
            : "N/A",
        severity: calculateSeverityLevel(diskPercent)
      },
      network: {
        value: node.latest?.networkDown,
        label: `${formatBandwidth(node.latest?.networkDown)} ↓ / ${formatBandwidth(
          node.latest?.networkUp
        )} ↑`
      },
      load: (() => {
        const loadStatus = calculateLoadStatus(
          node.latest?.load1 ?? node.latest?.load,
          node.meta.cpuCores
        );
        return {
          value: node.latest?.load1 ?? node.latest?.load,
          label: loadStatus.label,
          severity: loadStatus.severity,
          ratioPercent: loadStatus.ratioPercent,
          statusLabel: loadStatus.statusLabel
        };
      })(),
      uptime: {
        value: node.latest?.uptimeSeconds,
        label: formatDuration(node.latest?.uptimeSeconds)
      }
    },
    networkUp: {
      value: node.latest?.networkUp,
      label: formatBandwidth(node.latest?.networkUp),
      severity: calculateNetworkSeverity(node.latest?.networkUp)
    },
    networkDown: {
      value: node.latest?.networkDown,
      label: formatBandwidth(node.latest?.networkDown),
      severity: calculateNetworkSeverity(node.latest?.networkDown)
    },
    tcpConnections: {
      value: node.latest?.tcpConnections,
      label: node.latest?.tcpConnections?.toString() ?? 'N/A'
    },
    udpConnections: {
      value: node.latest?.udpConnections,
      label: node.latest?.udpConnections?.toString() ?? 'N/A'
    },
    processCount: {
      value: node.latest?.processCount,
      label: node.latest?.processCount?.toString() ?? 'N/A'
    }
  };
}

function mapSelectedNode(
  node: NodeEntity,
  timeRange: import("@/types/view-model").PingTimeRange
): DashboardSelectedNodeViewModel {
  const base = mapNodeToViewModel(node);
  const taskMap = new Map(node.pingHistory.tasks.map((task) => [task.id, task]));

  // 根据选定时段过滤ping记录
  const filteredRecords = filterRecordsByTimeRange(
    node.pingHistory.records,
    timeRange
  );

  // 按任务聚合ping数据
  const ping = node.pingHistory.tasks.map<DashboardPingSeriesViewModel>((task) => {
    const taskRecords = filteredRecords
      .filter((record) => record.taskId === task.id)
      .map((record) => ({
        recordedAt: record.recordedAt,
        valueMs: record.valueMs,
        taskId: record.taskId
      }));

    return {
      taskId: task.id,
      taskName: task.name,
      intervalSeconds: task.intervalSeconds,
      lossPercent: roundPercentValue(task.lossPercent),
      points: aggregatePingData(taskRecords, timeRange)
    };
  });

  // 处理孤儿任务（有记录但没有任务定义）
  const orphanTaskIds = filteredRecords
    .map((record) => record.taskId)
    .filter((taskId, index, items) => items.indexOf(taskId) === index)
    .filter((taskId) => !taskMap.has(taskId));

  orphanTaskIds.forEach((taskId) => {
    const taskRecords = filteredRecords
      .filter((record) => record.taskId === taskId)
      .map((record) => ({
        recordedAt: record.recordedAt,
        valueMs: record.valueMs,
        taskId: record.taskId
      }));

    ping.push({
      taskId,
      taskName: `Task ${taskId}`,
      points: aggregatePingData(taskRecords, timeRange)
    });
  });

  return {
    node: base,
    recent: node.recentHistory.map((entry) => ({ ...entry })),
    load: node.loadHistory.map((entry) => ({ ...entry })),
    ping
  };
}

function resolveSelectedNode(
  state: DashboardState
): DashboardSelectedNodeViewModel | null {
  if (!state.selectedNodeId) {
    return null;
  }

  const entity = state.nodes[state.selectedNodeId];
  return entity ? mapSelectedNode(entity, state.preferences.selectedPingTimeRange) : null;
}

function derivePercent(used?: number, total?: number): number | undefined {
  if (
    used === undefined ||
    total === undefined ||
    total <= 0 ||
    Number.isNaN(used) ||
    Number.isNaN(total)
  ) {
    return undefined;
  }

  return (used / total) * 100;
}

/**
 * 选择延迟图表View Model（用于独立延迟视图）
 * @param state Dashboard状态
 * @param taskId Ping任务ID
 * @param chartWidth 图表宽度（像素，用于hover区间计算）
 * @returns PingChartViewModel或null
 */
export function selectPingChartViewModel(
  state: DashboardState,
  taskId: number,
  _chartWidth: number = 800
): import("@/types/view-model").PingChartViewModel | null {
  if (!state.selectedNodeId) {
    return null;
  }

  const entity = state.nodes[state.selectedNodeId];
  if (!entity) {
    return null;
  }

  const timeRange = state.preferences.selectedPingTimeRange;

  // 过滤并聚合ping记录
  const filteredRecords = filterRecordsByTimeRange(
    entity.pingHistory.records.filter((r) => r.taskId === taskId),
    timeRange
  );

  const task = entity.pingHistory.tasks.find((t) => t.id === taskId);
  if (!task && filteredRecords.length === 0) {
    return null;
  }

  // 聚合数据点
  const aggregated = aggregatePingData(
    filteredRecords.map((r) => ({
      recordedAt: r.recordedAt,
      valueMs: r.valueMs,
      taskId: r.taskId
    })),
    timeRange
  );

  // 计算统计信息
  const validValues = aggregated.map((p) => p.valueMs).filter((v) => !Number.isNaN(v));
  const avg = validValues.length > 0
    ? validValues.reduce((sum, v) => sum + v, 0) / validValues.length
    : 0;
  const min = validValues.length > 0 ? Math.min(...validValues) : 0;
  const max = validValues.length > 0 ? Math.max(...validValues) : 0;

  // 计算丢包率
  const totalRecords = filteredRecords.length;
  const lostRecords = filteredRecords.filter((r) => r.valueMs === undefined || r.valueMs === null).length;
  const lossRate = totalRecords > 0 ? (lostRecords / totalRecords) * 100 : 0;

  return {
    taskId,
    taskName: task?.name || `Task ${taskId}`,
    points: aggregated.map((p) => ({
      timestamp: p.bucketStartAt,
      valueMs: p.valueMs,
      minMs: p.minMs,
      maxMs: p.maxMs,
      sampleCount: p.sampleCount
    })),
    stats: {
      avg: Math.round(avg),
      min: Math.round(min),
      max: Math.round(max),
      lossRate: Math.round(lossRate * 10) / 10
    },
    timeRange
  };
}

/**
 * 选择负载图表View Model（用于独立负载视图）
 * @param state Dashboard状态
 * @returns LoadChartViewModel或null
 */
export function selectLoadChartViewModel(
  state: DashboardState
): import("@/types/view-model").LoadChartViewModel | null {
  if (!state.selectedNodeId) {
    return null;
  }

  const entity = state.nodes[state.selectedNodeId];
  if (!entity) {
    return null;
  }

  const timeRange = state.preferences.selectedPingTimeRange;

  // 过滤负载历史记录
  const filteredHistory = filterRecordsByTimeRange(
    entity.loadHistory.map((h) => ({
      ...h,
      recordedAt: h.recordedAt
    })),
    timeRange
  );

  if (filteredHistory.length === 0) {
    return null;
  }

  // 构建时间序列（包含所有可能的历史字段）
  const series = filteredHistory.map((h) => ({
    timestamp: h.recordedAt,
    load1: h.load1 ?? h.load ?? 0,
    load5: h.load5 ?? 0,
    load15: h.load15 ?? 0,
    cpuUsage: h.cpuUsage,
    memoryUsage: h.memoryUsagePercent,
    // 以下字段历史中可能缺失，优雅降级为undefined
    diskUsage: h.diskUsagePercent,
    networkUp: h.networkUp,
    networkDown: h.networkDown,
    tcpConnections: h.tcpConnections,
    udpConnections: h.udpConnections,
    processCount: h.processCount
  }));

  // 计算统计信息
  const load1Values = series.map((s) => s.load1).filter((v) => v > 0);
  const avgLoad1 = load1Values.length > 0
    ? load1Values.reduce((sum, v) => sum + v, 0) / load1Values.length
    : 0;
  const peakLoad1 = load1Values.length > 0 ? Math.max(...load1Values) : 0;
  const currentLoad1Series = series.length > 0 ? series[series.length - 1] : null;
  const currentLoad1 = currentLoad1Series ? currentLoad1Series.load1 : 0;

  // 检查哪些字段有趋势数据（非undefined的样本占比超过50%）
  const hasTrendData = (field: keyof typeof series[0]) => {
    const validCount = series.filter((s) => s[field] !== undefined && s[field] !== null).length;
    return validCount > series.length * 0.5;
  };

  return {
    series,
    stats: {
      avgLoad1: Math.round(avgLoad1 * 100) / 100,
      peakLoad1: Math.round(peakLoad1 * 100) / 100,
      currentLoad1: Math.round(currentLoad1 * 100) / 100
    },
    timeRange,
    availableFields: {
      diskUsage: hasTrendData('diskUsage'),
      networkUp: hasTrendData('networkUp'),
      networkDown: hasTrendData('networkDown'),
      tcpConnections: hasTrendData('tcpConnections'),
      udpConnections: hasTrendData('udpConnections'),
      processCount: hasTrendData('processCount')
    }
  };
}

/**
 * 选择Hover命中区间（用于稳定tooltip显示）
 * @param pingChartViewModel 延迟图表View Model
 * @param chartWidth 图表宽度（像素）
 * @returns Hover命中模型数组
 */
export function selectHoverHitIntervals(
  pingChartViewModel: import("@/types/view-model").PingChartViewModel | null,
  chartWidth: number = 800
): import("@/types/view-model").HoverHitModel[] {
  if (!pingChartViewModel || pingChartViewModel.points.length === 0) {
    return [];
  }

  const intervals = generateHoverHitIntervals(
    pingChartViewModel.points.map((p) => ({
      bucketStartAt: p.timestamp,
      bucketEndAt: p.timestamp, // 单点使用timestamp作为结束
      valueMs: p.valueMs,
      minMs: p.minMs,
      maxMs: p.maxMs,
      sampleCount: p.sampleCount
    })),
    chartWidth
  );

  return intervals.map((item) => ({
    hitInterval: item.hitInterval,
    data: item.data,
    stableId: item.stableId
  }));
}

/**
 * 选择节点最新统计View Model（用于负载视图卡片）
 * @param state Dashboard状态
 * @returns NodeLatestStatsViewModel或null
 */
export function selectNodeLatestStats(
  state: DashboardState
): import("@/types/view-model").NodeLatestStatsViewModel | null {
  if (!state.selectedNodeId) {
    return null;
  }

  const entity = state.nodes[state.selectedNodeId];
  if (!entity || !entity.latest) {
    return null;
  }

  const latest = entity.latest;

  return {
    cpuUsage: latest.cpuUsage ?? 0,
    memoryUsage: latest.memoryUsagePercent ?? 0,
    memoryUsed: latest.memoryUsed ?? 0,
    memoryTotal: latest.memoryTotal ?? 0,
    diskUsage: latest.diskUsagePercent ?? 0,
    diskUsed: latest.diskUsed ?? 0,
    diskTotal: latest.diskTotal ?? 0,
    networkUp: latest.networkUp ?? 0,
    networkDown: latest.networkDown ?? 0,
    tcpConnections: latest.tcpConnections ?? 0,
    udpConnections: latest.udpConnections ?? 0,
    processCount: latest.processCount ?? 0,
    load1: latest.load1 ?? latest.load ?? 0,
    load5: latest.load5 ?? 0,
    load15: latest.load15 ?? 0,
    uptimeSeconds: latest.uptimeSeconds ?? 0,
    updatedAt: latest.updatedAt ?? entity.lastUpdatedAt
  };
}
