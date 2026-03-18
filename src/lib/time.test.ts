import { describe, it, expect } from 'vitest';
import {
  timeRangeToMs,
  timeRangeToHours,
  filterRecordsByTimeRange,
  getAvailableTimeRange,
  aggregatePingData,
  generateHoverHitIntervals,
  findHoverHitAtPosition,
  getOptimalBucketSize,
  type RawPingPoint
} from './time';

describe('time range helpers', () => {
  describe('timeRangeToMs', () => {
    it('converts time ranges to milliseconds', () => {
      const hourMs = 60 * 60 * 1000;
      expect(timeRangeToMs('1h')).toBe(hourMs);
      expect(timeRangeToMs('6h')).toBe(6 * hourMs);
      expect(timeRangeToMs('24h')).toBe(24 * hourMs);
      expect(timeRangeToMs('7d')).toBe(7 * 24 * hourMs);
    });
  });

  describe('timeRangeToHours', () => {
    it('converts time ranges to hours', () => {
      expect(timeRangeToHours('1h')).toBe(1);
      expect(timeRangeToHours('6h')).toBe(6);
      expect(timeRangeToHours('24h')).toBe(24);
      expect(timeRangeToHours('7d')).toBe(168);
    });
  });

  describe('filterRecordsByTimeRange', () => {
    it('filters records within the specified time range', () => {
      const now = Date.now();
      const records: RawPingPoint[] = [
        { recordedAt: new Date(now - 1800000).toISOString(), valueMs: 10, taskId: 1 },
        { recordedAt: new Date(now - 7200000).toISOString(), valueMs: 20, taskId: 1 },
      ];
      const result = filterRecordsByTimeRange(records, '1h', now);
      expect(result).toHaveLength(1);
      expect(result[0]!.valueMs).toBe(10);
    });

    it('returns empty array when no records match', () => {
      const result = filterRecordsByTimeRange([], '1h');
      expect(result).toHaveLength(0);
    });

    it('returns all records when range is large enough', () => {
      const now = Date.now();
      const records: RawPingPoint[] = [
        { recordedAt: new Date(now - 1000).toISOString(), valueMs: 10, taskId: 1 },
      ];
      const result = filterRecordsByTimeRange(records, '7d');
      expect(result).toHaveLength(1);
    });
  });
});

describe('getAvailableTimeRange', () => {
  it('returns preferred range when preserve hours are sufficient', () => {
    const range = getAvailableTimeRange('6h', 24);
    expect(range).toBe('6h');
  });

  it('downgrades range when preserve hours are insufficient', () => {
    const range = getAvailableTimeRange('24h', 6);
    expect(range).toBe('6h');
  });

  it('returns 1h as minimum range', () => {
    const range = getAvailableTimeRange('6h', 0.5);
    expect(range).toBe('1h');
  });
});

describe('aggregatePingData', () => {
  const hourMs = 60 * 60 * 1000;
  const minuteMs = 60 * 1000;

  it('keeps original points for 1h with <= 120 records', () => {
    const records = Array.from({ length: 100 }, (_, i) => ({
      recordedAt: new Date(Date.now() - i * minuteMs).toISOString(),
      valueMs: i,
      taskId: 1
    }));
    const result = aggregatePingData(records, '1h');
    expect(result).toHaveLength(100);
    expect(result[0]!.isAggregated).toBe(false);
  });

  it('aggregates 6h data into 5-minute buckets', () => {
    const records = Array.from({ length: 10 }, (_, i) => ({
      recordedAt: new Date(Date.now() - i * minuteMs).toISOString(),
      valueMs: 10,
      taskId: 1
    }));
    const result = aggregatePingData(records, '6h');
    expect(result.length).toBeLessThan(10);
    expect(result[0]!.isAggregated).toBe(true);
  });

  it('aggregates 24h data into 15-minute buckets', () => {
    const baseTime = Math.floor(Date.now() / (15 * 60 * 1000)) * (15 * 60 * 1000);
    const records = [
      { recordedAt: new Date(baseTime + 1000).toISOString(), valueMs: 10, taskId: 1 },
      { recordedAt: new Date(baseTime + 2000).toISOString(), valueMs: 20, taskId: 1 }
    ];
    const result = aggregatePingData(records, '24h');
    expect(result).toHaveLength(1);
  });

  it('aggregates 7d data into 1-hour buckets', () => {
    const baseTime = Math.floor(Date.now() / (60 * 60 * 1000)) * (60 * 60 * 1000);
    const records = [
      { recordedAt: new Date(baseTime + 1000).toISOString(), valueMs: 10, taskId: 1 },
      { recordedAt: new Date(baseTime + 2000).toISOString(), valueMs: 20, taskId: 1 }
    ];
    const result = aggregatePingData(records, '7d');
    expect(result).toHaveLength(1);
  });

  it('returns empty array for empty input', () => {
    expect(aggregatePingData([], '6h')).toHaveLength(0);
  });

  it('filters out records with undefined valueMs', () => {
    const records = [{ recordedAt: new Date().toISOString(), valueMs: undefined, taskId: 1 }] as any;
    expect(aggregatePingData(records, '6h')).toHaveLength(0);
  });

  it('provides correct aggregation statistics', () => {
    const baseTime = Math.floor(Date.now() / hourMs) * hourMs;
    const records = [
      { recordedAt: new Date(baseTime + 100).toISOString(), valueMs: 10, taskId: 1 },
      { recordedAt: new Date(baseTime + 200).toISOString(), valueMs: 20, taskId: 1 },
      { recordedAt: new Date(baseTime + 300).toISOString(), valueMs: 30, taskId: 1 },
    ];
    // Use large bucket to force all into one
    const result = aggregatePingData(records, '6h', hourMs);
    expect(result).toHaveLength(1);
    const point = result[0]!;
    expect(point.sampleCount).toBe(3);
    expect(point.minMs).toBe(10);
    expect(point.maxMs).toBe(30);
    expect(point.avgMs).toBe(20);
  });
});

describe('chart interaction helpers', () => {
  const points = [
    { bucketStartAt: '2024-01-01T00:00:00Z', bucketEndAt: '2024-01-01T00:05:00Z', valueMs: 50, minMs: 40, maxMs: 60, sampleCount: 10 },
    { bucketStartAt: '2024-01-01T00:05:00Z', bucketEndAt: '2024-01-01T00:10:00Z', valueMs: 20, minMs: 15, maxMs: 25, sampleCount: 10 },
    { bucketStartAt: '2024-01-01T00:10:00Z', bucketEndAt: '2024-01-01T00:15:00Z', valueMs: 80, minMs: 70, maxMs: 90, sampleCount: 10 }
  ];

  it('generates hit intervals for chart points', () => {
    const intervals = generateHoverHitIntervals(points, 100, 0);
    expect(intervals).toHaveLength(3);
    expect(intervals[0]!.hitInterval.startX).toBe(0);
    expect(intervals[0]!.hitInterval.endX).toBe(33);
  });

  it('returns empty array for empty points', () => {
    expect(generateHoverHitIntervals([], 100)).toHaveLength(0);
  });

  it('finds hit at exact position', () => {
    const intervals = generateHoverHitIntervals(points, 100, 0);
    const hit = findHoverHitAtPosition(intervals, 50);
    expect(hit?.data.valueMs).toBe(20);
  });

  it('returns null for position outside intervals', () => {
    const intervals = generateHoverHitIntervals(points, 100, 0);
    const hit = findHoverHitAtPosition(intervals, 150);
    expect(hit).toBeNull();
  });

  it('returns null for empty intervals', () => {
    const hit = findHoverHitAtPosition([], 50);
    expect(hit).toBeNull();
  });
});

describe('getOptimalBucketSize', () => {
  it('calculates bucket size for narrow chart (300px)', () => {
    const bucketSize = getOptimalBucketSize('6h', 300);
    expect(bucketSize).toBeGreaterThanOrEqual(60 * 1000);
  });

  it('calculates bucket size for medium chart (600px)', () => {
    const bucketSize = getOptimalBucketSize('6h', 600);
    expect(bucketSize).toBeGreaterThanOrEqual(60 * 1000);
  });

  it('calculates bucket size for wide chart (1200px)', () => {
    const bucketSize = getOptimalBucketSize('6h', 1200);
    expect(bucketSize).toBeGreaterThanOrEqual(60 * 1000);
  });

  it('returns minimum 1 minute bucket size', () => {
    const bucketSize = getOptimalBucketSize('1h', 3000);
    expect(bucketSize).toBe(60 * 1000);
  });

  it('handles different time ranges', () => {
    const bucket1h = getOptimalBucketSize('1h', 600);
    const bucket24h = getOptimalBucketSize('24h', 600);
    const bucket7d = getOptimalBucketSize('7d', 600);
    expect(bucket7d).toBeGreaterThan(bucket24h);
    expect(bucket24h).toBeGreaterThan(bucket1h);
  });

  it('falls back to default for invalid parameters', () => {
    const bucketSizeZero = getOptimalBucketSize('6h', 0);
    const bucketSizeNegative = getOptimalBucketSize('6h', -100);
    expect(bucketSizeZero).toBeGreaterThan(0);
    expect(bucketSizeNegative).toBeGreaterThan(0);
  });

  it('respects custom point width', () => {
    const bucketSize5px = getOptimalBucketSize('6h', 600, 5);
    const bucketSize3px = getOptimalBucketSize('6h', 600, 3);
    expect(bucketSize5px).toBeGreaterThan(bucketSize3px);
  });
});

describe('aggregatePingData backward compatibility', () => {
  const minuteMs = 60 * 1000;
  const records = [
    { recordedAt: new Date().toISOString(), valueMs: 10, taskId: 1 },
    { recordedAt: new Date(Date.now() - minuteMs).toISOString(), valueMs: 20, taskId: 1 },
    { recordedAt: new Date(Date.now() - 2 * minuteMs).toISOString(), valueMs: 30, taskId: 1 },
  ];

  it('works without custom bucket size (backward compatible)', () => {
    const result = aggregatePingData(records, '6h');
    expect(result.length).toBeGreaterThan(0);
  });

  it('uses custom bucket size when provided', () => {
    const result = aggregatePingData(records, '6h', 2 * minuteMs);
    expect(result.length).toBeGreaterThan(0);
  });

  it('produces different aggregation with different bucket sizes', () => {
    const res1 = aggregatePingData(records, '7d', 10 * minuteMs);
    const res2 = aggregatePingData(records, '7d', 60 * minuteMs);
    expect(res1).toBeDefined();
    expect(res2).toBeDefined();
  });
});
