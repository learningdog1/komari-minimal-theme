import type { ApiEnvelope } from "@/types/api";
import type {
  LoadHistoryPoint,
  MetricSample,
  NodeMetadata,
  PingHistory,
  PingHistoryPoint,
  PingTask,
  PublicInfo,
  RecentHistoryPoint,
  RealtimeSnapshot
} from "@/types/domain";
import {
  asRecord,
  coerceBoolean,
  coerceIsoDate,
  coerceString,
  ensureArray,
  parseTagList,
  pickFirstDefined,
  readArray,
  readNestedNumber,
  readNumber,
  readObject,
  readString
} from "@/lib/validation";
import { normalizeGroupKey } from "@/lib/groups";
import {
  DEFAULT_THEME_SETTINGS,
  normalizeThemeSettings
} from "@/core/config/theme-settings";

export function extractEnvelopeData<T = unknown>(value: unknown): T | unknown {
  const record = asRecord(value);
  return record && "data" in record ? (record.data as T) : value;
}

export function normalizePublicInfo(value: unknown): PublicInfo {
  const payload = asRecord(extractEnvelopeData<ApiEnvelope>(value));
  const siteName = readString(payload, "sitename") ?? DEFAULT_THEME_SETTINGS.title;
  const themeSettings = normalizeThemeSettings(payload?.theme_settings);

  return {
    allowCors: readBoolean(payload, "allow_cors") ?? false,
    customBody: readString(payload, "custom_body") ?? "",
    customHead: readString(payload, "custom_head") ?? "",
    description:
      readString(payload, "description") ?? "A simple server monitor tool.",
    disablePasswordLogin:
      readBoolean(payload, "disable_password_login") ?? false,
    oauthEnabled: readBoolean(payload, "oauth_enable") ?? false,
    oauthProvider: readString(payload, "oauth_provider") ?? null,
    pingRecordPreserveHours: readNumber(payload, "ping_record_preserve_time") ?? 0,
    privateSite: readBoolean(payload, "private_site") ?? false,
    recordEnabled: readBoolean(payload, "record_enabled") ?? false,
    recordPreserveHours: readNumber(payload, "record_preserve_time") ?? 0,
    siteName,
    themeName: readString(payload, "theme") ?? "Komari",
    themeSettings: {
      ...themeSettings,
      title: themeSettings.title || siteName,
      subtitle: themeSettings.subtitle || readString(payload, "description") || ""
    }
  };
}

export function normalizeNodes(value: unknown): NodeMetadata[] {
  const payload = extractEnvelopeData(value);
  const items = Array.isArray(payload)
    ? payload
    : readArray(payload, "nodes") ?? [];

  return items
    .map((entry, index) => normalizeNode(entry, index))
    .filter((node): node is NodeMetadata => node !== null)
    .sort((left, right) => {
      if (left.weight !== right.weight) {
        return right.weight - left.weight;
      }

      return left.name.localeCompare(right.name);
    });
}

export function normalizeRecentHistory(value: unknown): RecentHistoryPoint[] {
  const payload = extractEnvelopeData(value);
  const items = Array.isArray(payload)
    ? payload
    : readArray(payload, "records") ?? readArray(payload, "data") ?? [];

  return items
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) {
        return null;
      }

      const sample = normalizeMetricSample(record);
      return {
        ...sample,
        recordedAt:
          coerceIsoDate(record.updated_at) ??
          coerceIsoDate(record.time) ??
          sample.updatedAt ??
          new Date().toISOString()
      };
    })
    .filter((entry): entry is RecentHistoryPoint => entry !== null);
}

export function normalizeLoadHistory(value: unknown): LoadHistoryPoint[] {
  const payload = asRecord(extractEnvelopeData(value));
  const records = ensureArray(payload?.records);

  return records
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) {
        return null;
      }

      return {
        ...normalizeMetricSample(record),
        recordedAt: coerceIsoDate(record.time) ?? new Date().toISOString()
      };
    })
    .filter((entry): entry is LoadHistoryPoint => entry !== null);
}

export function normalizePingHistory(value: unknown): PingHistory {
  const payload = asRecord(extractEnvelopeData(value));
  const tasks = ensureArray(payload?.tasks)
    .map((entry) => normalizePingTask(entry))
    .filter((entry): entry is PingTask => entry !== null);

  const records = ensureArray(payload?.records)
    .map((entry) => normalizePingPoint(entry))
    .filter((entry): entry is PingHistoryPoint => entry !== null);

  return {
    tasks,
    records
  };
}

export function normalizeRealtimeSnapshot(value: unknown): RealtimeSnapshot {
  const payload = asRecord(extractEnvelopeData(value));
  const data = readObject(payload, "data");
  const onlineNodeIds = ensureArray(payload?.online).reduce<string[]>(
    (accumulator, entry) => {
      const uuid = coerceString(entry);

      if (uuid) {
        accumulator.push(uuid);
      }

      return accumulator;
    },
    []
  );

  const samples = Object.entries(data ?? {}).reduce<Record<string, MetricSample>>(
    (accumulator, [uuid, entry]) => {
      if (!uuid) {
        return accumulator;
      }

      accumulator[uuid] = normalizeMetricSample(entry);
      return accumulator;
    },
    {}
  );

  return {
    onlineNodeIds,
    receivedAt: new Date().toISOString(),
    samples
  };
}

/**
 * 归一化 RPC2 common:getNodesLatestStatus 响应
 * 转换为 RealtimeSnapshot 结构以便复用现有 mergeRealtime
 * 
 * 真实响应格式: { uuid1: { client, online, cpu, ram, ... }, uuid2: { ... } }
 * 每个节点记录有自己的 online 字段，不存在顶层 online 数组
 */
export function normalizeNodesLatestStatus(value: unknown): RealtimeSnapshot {
  const payload = asRecord(value);
  const onlineNodeIds: string[] = [];
  const samples: Record<string, MetricSample> = {};

  // 遍历 payload 中的每个键值对
  for (const [key, entry] of Object.entries(payload ?? {})) {
    // 跳过元数据键
    if (!key || key === "code" || key === "message") {
      continue;
    }

    const record = asRecord(entry);
    if (!record) {
      continue;
    }

    // 确定节点UUID：优先使用client字段，否则使用key
    const uuid = coerceString(record.client) || key;

    // 检查节点online状态
    const isOnline = coerceBoolean(record.online) ?? false;
    if (isOnline) {
      onlineNodeIds.push(uuid);
    }

    // 解析指标样本
    samples[uuid] = normalizeMetricSample(record);
  }

  return {
    onlineNodeIds,
    receivedAt: new Date().toISOString(),
    samples
  };
}

export function normalizeMetricSample(value: unknown): MetricSample {
  const record = asRecord(value);

  if (!record) {
    return {};
  }

  const flatMemoryValue = readNumber(record, "ram");
  const nestedMemoryUsed = pickFirstDefined(
    readNestedNumber(record, ["ram", "used"]),
    readNumber(record, "ram_used")
  );
  const memoryTotal = pickFirstDefined(
    readNestedNumber(record, ["ram", "total"]),
    readNumber(record, "ram_total")
  );
  const memoryUsed = resolveFlatUsageValue(
    flatMemoryValue,
    nestedMemoryUsed,
    memoryTotal
  );
  const memoryUsagePercent = pickFirstDefined(
    resolveFlatPercentValue(flatMemoryValue, memoryTotal),
    derivePercent(memoryUsed, memoryTotal)
  );
  const flatSwapValue = readNumber(record, "swap");
  const nestedSwapUsed = pickFirstDefined(
    readNestedNumber(record, ["swap", "used"]),
    readNumber(record, "swap_used")
  );
  const swapTotal = pickFirstDefined(
    readNestedNumber(record, ["swap", "total"]),
    readNumber(record, "swap_total")
  );
  const swapUsed = resolveFlatUsageValue(flatSwapValue, nestedSwapUsed, swapTotal);
  const swapUsagePercent = pickFirstDefined(
    resolveFlatPercentValue(flatSwapValue, swapTotal),
    derivePercent(swapUsed, swapTotal)
  );
  const flatDiskValue = readNumber(record, "disk");
  const nestedDiskUsed = pickFirstDefined(
    readNestedNumber(record, ["disk", "used"]),
    readNumber(record, "disk_used")
  );
  const diskTotal = pickFirstDefined(
    readNestedNumber(record, ["disk", "total"]),
    readNumber(record, "disk_total")
  );
  const diskUsed = resolveFlatUsageValue(flatDiskValue, nestedDiskUsed, diskTotal);
  const diskUsagePercent = pickFirstDefined(
    resolveFlatPercentValue(flatDiskValue, diskTotal),
    derivePercent(diskUsed, diskTotal)
  );

  return {
    cpuUsage: pickFirstDefined(
      readNestedNumber(record, ["cpu", "usage"]),
      readNumber(record, "cpu")
    ),
    gpuUsage: pickFirstDefined(
      readNestedNumber(record, ["gpu", "usage"]),
      readNumber(record, "gpu")
    ),
    memoryUsed,
    memoryTotal,
    memoryUsagePercent,
    swapUsed,
    swapTotal,
    swapUsagePercent,
    load: readNumber(record, "load"),
    load1: pickFirstDefined(
      readNestedNumber(record, ["load", "load1"]),
      readNumber(record, "load1")
    ),
    load5: pickFirstDefined(
      readNestedNumber(record, ["load", "load5"]),
      readNumber(record, "load5")
    ),
    load15: pickFirstDefined(
      readNestedNumber(record, ["load", "load15"]),
      readNumber(record, "load15")
    ),
    temperatureCelsius: pickFirstDefined(
      readNestedNumber(record, ["temperature", "value"]),
      readNumber(record, "temp")
    ),
    diskUsed,
    diskTotal,
    diskUsagePercent,
    networkUp: pickFirstDefined(
      readNestedNumber(record, ["network", "up"]),
      readNumber(record, "net_out")
    ),
    networkDown: pickFirstDefined(
      readNestedNumber(record, ["network", "down"]),
      readNumber(record, "net_in")
    ),
    networkTotalUp: pickFirstDefined(
      readNestedNumber(record, ["network", "totalUp"]),
      readNumber(record, "net_total_up")
    ),
    networkTotalDown: pickFirstDefined(
      readNestedNumber(record, ["network", "totalDown"]),
      readNumber(record, "net_total_down")
    ),
    tcpConnections: pickFirstDefined(
      readNestedNumber(record, ["connections", "tcp"]),
      readNumber(record, "connections")
    ),
    udpConnections: pickFirstDefined(
      readNestedNumber(record, ["connections", "udp"]),
      readNumber(record, "connections_udp")
    ),
    uptimeSeconds: readNumber(record, "uptime"),
    processCount: readNumber(record, "process"),
    message: readString(record, "message"),
    updatedAt:
      coerceIsoDate(record.updated_at) ??
      coerceIsoDate(record.time) ??
      undefined
  };
}

function resolveFlatPercentValue(
  value: number | undefined,
  total: number | undefined
): number | undefined {
  if (value === undefined || Number.isNaN(value)) {
    return undefined;
  }

  // 部分接口直接返回百分比，通常落在 0-100 之间。
  if (value >= 0 && value <= 100) {
    return value;
  }

  // 当接口同时返回 total 且平铺值远大于 100 时，平铺值应视为 used bytes。
  if (total !== undefined && total > 0) {
    return undefined;
  }

  return value;
}

function resolveFlatUsageValue(
  flatValue: number | undefined,
  usedValue: number | undefined,
  total: number | undefined
): number | undefined {
  if (usedValue !== undefined) {
    return usedValue;
  }

  if (flatValue === undefined || Number.isNaN(flatValue)) {
    return undefined;
  }

  // 真实宿主的 RPC2 latest status 会把 ram/disk/swap 平铺成已用字节数。
  if (total !== undefined && total > 0 && flatValue > 100) {
    return flatValue;
  }

  return undefined;
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

function normalizeNode(value: unknown, index: number): NodeMetadata | null {
  const record = asRecord(value);

  if (!record) {
    return null;
  }

  const uuid = readString(record, "uuid");
  if (!uuid) {
    return null;
  }

  // 解析实时指标样本（如果API返回中包含）
  const latestSample = normalizeMetricSample(record);

  return {
    uuid,
    name: readString(record, "name") ?? `Node ${index + 1}`,
    cpuName: readString(record, "cpu_name") ?? "",
    virtualization: readString(record, "virtualization") ?? "",
    architecture: readString(record, "arch") ?? "",
    cpuCores: readNumber(record, "cpu_cores"),
    operatingSystem: readString(record, "os") ?? "",
    kernelVersion: readString(record, "kernel_version") ?? "",
    gpuName: readString(record, "gpu_name") ?? "",
    region: readString(record, "region") ?? "",
    memoryTotal: readNumber(record, "mem_total"),
    swapTotal: readNumber(record, "swap_total"),
    diskTotal: readNumber(record, "disk_total"),
    weight: readNumber(record, "weight") ?? 0,
    price: readNumber(record, "price"),
    billingCycleDays: readNumber(record, "billing_cycle"),
    autoRenewal: readBoolean(record, "auto_renewal") ?? false,
    currency: readString(record, "currency") ?? "",
    expiredAt: coerceIsoDate(record.expired_at) ?? null,
    group: normalizeGroupKey(readString(record, "group")),
    tags: parseTagList(record.tags),
    publicRemark: readString(record, "public_remark") ?? "",
    hidden: readBoolean(record, "hidden") ?? false,
    trafficLimit: readNumber(record, "traffic_limit"),
    trafficLimitType: readString(record, "traffic_limit_type") ?? "",
    createdAt: coerceIsoDate(record.created_at) ?? null,
    updatedAt: coerceIsoDate(record.updated_at) ?? null,
    // 仅当解析到有效指标时才包含latestSample
    ...(Object.keys(latestSample).length > 0 && { latestSample })
  };
}

function normalizePingPoint(value: unknown): PingHistoryPoint | null {
  const record = asRecord(value);
  const taskId = readNumber(record, "task_id");

  if (!record || taskId === undefined) {
    return null;
  }

  return {
    taskId,
    recordedAt: coerceIsoDate(record.time) ?? new Date().toISOString(),
    valueMs: readNumber(record, "value")
  };
}

function normalizePingTask(value: unknown): PingTask | null {
  const record = asRecord(value);
  const id = readNumber(record, "id");

  if (!record || id === undefined) {
    return null;
  }

  return {
    id,
    intervalSeconds: readNumber(record, "interval"),
    lossPercent: readNumber(record, "loss"),
    name: readString(record, "name") ?? `Task ${id}`
  };
}

function readBoolean(
  record: Record<string, unknown> | null | undefined,
  key: string
): boolean | undefined {
  return record ? coerceBoolean(record[key]) : undefined;
}
