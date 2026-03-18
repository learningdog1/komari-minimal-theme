/**
 * Ping 监控时段范围
 */
export type PingTimeRange = "1h" | "6h" | "24h" | "7d";

/**
 * 时段范围转换为毫秒
 */
export function timeRangeToMs(range: PingTimeRange): number {
  const hourMs = 60 * 60 * 1000;
  switch (range) {
    case "1h":
      return hourMs;
    case "6h":
      return 6 * hourMs;
    case "24h":
      return 24 * hourMs;
    case "7d":
      return 7 * 24 * hourMs;
    default:
      return 24 * hourMs;
  }
}

/**
 * 时段范围转换为小时数
 */
export function timeRangeToHours(range: PingTimeRange): number {
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

/**
 * 根据时段范围过滤记录
 * @param records 记录数组，每项需包含 recordedAt 字段
 * @param range 时段范围
 * @param now 当前时间（用于测试）
 */
export function filterRecordsByTimeRange<T extends { recordedAt: string }>(
  records: T[],
  range: PingTimeRange,
  now: number = Date.now()
): T[] {
  const cutoffMs = now - timeRangeToMs(range);
  return records.filter((record) => {
    const recordMs = new Date(record.recordedAt).getTime();
    return recordMs > cutoffMs;
  });
}

/**
 * 获取可用的最大时段范围
 * 当数据保留时长不足时，返回实际可用的最大范围
 */
export function getAvailableTimeRange(
  preferredRange: PingTimeRange,
  preserveHours: number
): PingTimeRange {
  const preferredHours = timeRangeToHours(preferredRange);
  if (preserveHours >= preferredHours) {
    return preferredRange;
  }

  // 降级到可用范围
  if (preserveHours >= 24) return "24h";
  if (preserveHours >= 6) return "6h";
  if (preserveHours >= 1) return "1h";
  return "1h"; // 最小范围
}

/**
 * 聚合后的Ping数据点
 */
export interface AggregatedPingPoint {
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

/**
 * 原始Ping数据点（用于聚合输入）
 */
export interface RawPingPoint {
  recordedAt: string;
  valueMs?: number;
  taskId: number;
}

/**
 * 根据时段范围获取聚合桶大小（毫秒）
 */
function getBucketSizeMs(range: PingTimeRange): number {
  const minuteMs = 60 * 1000;
  switch (range) {
    case "1h":
      // 1h保留原始精度，但设置最大保护（1分钟）
      return minuteMs;
    case "6h":
      // 6h使用5分钟聚合
      return 5 * minuteMs;
    case "24h":
      // 24h使用15分钟聚合
      return 15 * minuteMs;
    case "7d":
      // 7d使用1小时聚合
      return 60 * minuteMs;
    default:
      return 15 * minuteMs;
  }
}

/**
 * 根据图表像素宽度计算最优聚合桶大小
 * 用于根据实际显示宽度动态调整数据点密度
 *
 * @param timeRange 时段范围
 * @param chartWidthPx 图表宽度（像素）
 * @param pointWidthPx 每个数据点占用的像素宽度（默认3px）
 * @returns 最优聚合桶大小（毫秒）
 */
export function getOptimalBucketSize(
  timeRange: PingTimeRange,
  chartWidthPx: number,
  pointWidthPx: number = 3
): number {
  if (chartWidthPx <= 0 || pointWidthPx <= 0) {
    // 无效参数，回退到默认桶大小
    return getBucketSizeMs(timeRange);
  }

  const maxPoints = Math.floor(chartWidthPx / pointWidthPx);
  const totalMs = timeRangeToMs(timeRange);

  // 至少保留一个点
  const effectiveMaxPoints = Math.max(maxPoints, 1);
  const bucketSizeMs = Math.ceil(totalMs / effectiveMaxPoints);

  // 限制最小桶大小为1分钟（避免过度聚合导致数据失真）
  const minBucketSizeMs = 60 * 1000;
  return Math.max(bucketSizeMs, minBucketSizeMs);
}

/**
 * 聚合Ping数据
 * @param records 原始记录数组
 * @param timeRange 时段范围
 * @param bucketSizeMs 可选的自定义聚合桶大小（毫秒），不传则使用默认策略
 * @returns 聚合后的数据点数组（按时间升序）
 */
export function aggregatePingData(
  records: RawPingPoint[],
  timeRange: PingTimeRange,
  bucketSizeMs?: number
): AggregatedPingPoint[] {
  if (records.length === 0) {
    return [];
  }

  // 1h时段：保留原始点，但做最小保护（超过120个点时按1分钟聚合）
  // 注意：如果传入了自定义bucketSizeMs，则跳过原始点保留逻辑，使用自定义聚合
  if (timeRange === "1h" && records.length <= 120 && bucketSizeMs === undefined) {
    return records
      .filter((r) => r.valueMs !== undefined)
      .map((record) => ({
        bucketStartAt: record.recordedAt,
        bucketEndAt: record.recordedAt,
        recordedAt: record.recordedAt,
        valueMs: record.valueMs!,
        sampleCount: 1,
        minMs: record.valueMs!,
        maxMs: record.valueMs!,
        avgMs: record.valueMs!,
        isAggregated: false
      }))
      .sort((a, b) => new Date(a.bucketStartAt).getTime() - new Date(b.bucketStartAt).getTime());
  }

  // 使用自定义桶大小或默认桶大小
  const effectiveBucketSizeMs = bucketSizeMs ?? getBucketSizeMs(timeRange);

  // 按桶分组
  const buckets = new Map<number, number[]>();

  for (const record of records) {
    if (record.valueMs === undefined || Number.isNaN(record.valueMs)) {
      continue;
    }

    const recordMs = new Date(record.recordedAt).getTime();
    const bucketKey = Math.floor(recordMs / effectiveBucketSizeMs) * effectiveBucketSizeMs;

    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, []);
    }
    buckets.get(bucketKey)!.push(record.valueMs);
  }

  // 计算每个桶的聚合值
  const aggregated: AggregatedPingPoint[] = [];

  for (const [bucketKey, values] of buckets) {
    if (values.length === 0) continue;

    const minMs = Math.min(...values);
    const maxMs = Math.max(...values);
    const avgMs = values.reduce((sum, v) => sum + v, 0) / values.length;

    const bucketStartAt = new Date(bucketKey).toISOString();
    aggregated.push({
      bucketStartAt,
      bucketEndAt: new Date(bucketKey + effectiveBucketSizeMs).toISOString(),
      recordedAt: bucketStartAt,
      valueMs: Math.round(avgMs),
      sampleCount: values.length,
      minMs: Math.round(minMs),
      maxMs: Math.round(maxMs),
      avgMs: Math.round(avgMs),
      isAggregated: true
    });
  }

  // 按时间升序排序
  return aggregated.sort((a, b) => new Date(a.bucketStartAt).getTime() - new Date(b.bucketStartAt).getTime());
}

/**
 * 生成Hover命中区间
 * 用于稳定tooltip显示，将数据点映射到屏幕坐标区间
 * 
 * @param points 聚合后的数据点
 * @param chartWidth 图表宽度（像素）
 * @param chartPadding 图表左右边距（像素）
 * @returns Hover命中模型数组
 */
export function generateHoverHitIntervals(
  points: Array<{
    bucketStartAt: string;
    bucketEndAt: string;
    valueMs: number;
    minMs: number;
    maxMs: number;
    sampleCount: number;
  }>,
  chartWidth: number,
  chartPadding: number = 40
): Array<{
  hitInterval: {
    startX: number;
    endX: number;
    timestamp: string;
  };
  data: {
    valueMs: number;
    minMs: number;
    maxMs: number;
    sampleCount: number;
  };
  stableId: string;
}> {
  if (points.length === 0) {
    return [];
  }

  const effectiveWidth = chartWidth - 2 * chartPadding;
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const timeRange = {
    start: firstPoint ? new Date(firstPoint.bucketStartAt).getTime() : 0,
    lastEnd: lastPoint ? new Date(lastPoint.bucketEndAt).getTime() : 0
  };
  const totalDuration = timeRange.lastEnd - timeRange.start;

  if (totalDuration <= 0) {
    return [];
  }

  return points.map((point, index) => {
    const pointStartMs = new Date(point.bucketStartAt).getTime();
    const pointEndMs = new Date(point.bucketEndAt).getTime();

    // 计算屏幕坐标
    const startX = chartPadding + ((pointStartMs - timeRange.start) / totalDuration) * effectiveWidth;
    const endX = chartPadding + ((pointEndMs - timeRange.start) / totalDuration) * effectiveWidth;

    // 生成稳定ID（基于时间和索引）
    const stableId = `hit-${point.bucketStartAt}-${index}`;

    return {
      hitInterval: {
        startX: Math.round(startX),
        endX: Math.round(endX),
        timestamp: point.bucketStartAt
      },
      data: {
        valueMs: point.valueMs,
        minMs: point.minMs,
        maxMs: point.maxMs,
        sampleCount: point.sampleCount
      },
      stableId
    };
  });
}

/**
 * 查找鼠标位置对应的Hover命中项
 * 
 * @param hitIntervals Hover命中区间数组
 * @param mouseX 鼠标X坐标
 * @returns 命中的Hover项，未命中返回null
 */
export function findHoverHitAtPosition(
  hitIntervals: Array<{
    hitInterval: {
      startX: number;
      endX: number;
      timestamp: string;
    };
    data: {
      valueMs: number;
      minMs: number;
      maxMs: number;
      sampleCount: number;
    };
    stableId: string;
  }>,
  mouseX: number
): {
  hitInterval: {
    startX: number;
    endX: number;
    timestamp: string;
  };
  data: {
    valueMs: number;
    minMs: number;
    maxMs: number;
    sampleCount: number;
  };
  stableId: string;
} | null {
  // 找到包含鼠标位置的区间
  const hit = hitIntervals.find(
    (item) => mouseX >= item.hitInterval.startX && mouseX <= item.hitInterval.endX
  );

  return hit || null;
}
