import { describe, it, expect } from 'vitest';
import { normalizeMetricSample, normalizeNodesLatestStatus } from './normalizers';

describe('normalizeNodesLatestStatus', () => {
  it('should extract online status from each node record', () => {
    const rpcResponse = {
      'node-a': { client: 'node-a', online: true, cpu: 42, ram: 50 },
      'node-b': { client: 'node-b', online: false, cpu: 10, ram: 20 },
      'node-c': { client: 'node-c', online: true, cpu: 30, ram: 40 }
    };

    const result = normalizeNodesLatestStatus(rpcResponse);

    // 验证 onlineNodeIds 包含 online=true 的节点
    expect(result.onlineNodeIds).toContain('node-a');
    expect(result.onlineNodeIds).toContain('node-c');
    expect(result.onlineNodeIds).not.toContain('node-b');
    expect(result.onlineNodeIds).toHaveLength(2);
  });

  it('should use key as uuid when client field is missing', () => {
    const rpcResponse = {
      'uuid-123': { online: true, cpu: 25 },
      'uuid-456': { online: false, cpu: 15 }
    };

    const result = normalizeNodesLatestStatus(rpcResponse);

    expect(result.onlineNodeIds).toContain('uuid-123');
    expect(result.onlineNodeIds).not.toContain('uuid-456');
  });

  it('should prefer client field over key', () => {
    const rpcResponse = {
      'some-key': { client: 'actual-uuid', online: true, cpu: 60 }
    };

    const result = normalizeNodesLatestStatus(rpcResponse);

    expect(result.onlineNodeIds).toContain('actual-uuid');
    expect(result.onlineNodeIds).not.toContain('some-key');
  });

  it('should parse metric samples correctly', () => {
    const rpcResponse = {
      'node-1': {
        client: 'node-1',
        online: true,
        cpu: 45.5,
        ram: 60,
        disk: 70,
        net_in: 1000,
        net_out: 500,
        load: 1.5,
        uptime: 3600
      }
    };

    const result = normalizeNodesLatestStatus(rpcResponse);

    expect(result.samples['node-1']).toMatchObject({
      cpuUsage: 45.5,
      memoryUsagePercent: 60,
      diskUsagePercent: 70,
      networkDown: 1000,
      networkUp: 500,
      load: 1.5,
      uptimeSeconds: 3600
    });
  });

  it('treats flat rpc ram and disk values as used bytes when totals exist', () => {
    const sample = normalizeMetricSample({
      cpu: 2.5,
      ram: 891088896,
      ram_total: 2026565632,
      disk: 12581357056,
      disk_total: 23551077888
    });

    expect(sample.memoryUsed).toBe(891088896);
    expect(sample.memoryTotal).toBe(2026565632);
    expect(sample.memoryUsagePercent).toBeCloseTo(
      (891088896 / 2026565632) * 100,
      6
    );
    expect(sample.diskUsed).toBe(12581357056);
    expect(sample.diskTotal).toBe(23551077888);
    expect(sample.diskUsagePercent).toBeCloseTo(
      (12581357056 / 23551077888) * 100,
      6
    );
  });

  it('should skip non-object entries', () => {
    const rpcResponse = {
      'node-1': { client: 'node-1', online: true, cpu: 30 },
      'code': 200,  // 元数据，应该被跳过
      'message': 'success'  // 元数据，应该被跳过
    };

    const result = normalizeNodesLatestStatus(rpcResponse);

    expect(result.onlineNodeIds).toContain('node-1');
    expect(result.onlineNodeIds).toHaveLength(1);
  });

  it('should treat nodes without online field as offline', () => {
    const rpcResponse = {
      'node-1': { client: 'node-1', cpu: 30 },  // 没有online字段
      'node-2': { client: 'node-2', online: true, cpu: 40 }
    };

    const result = normalizeNodesLatestStatus(rpcResponse);

    expect(result.onlineNodeIds).not.toContain('node-1');
    expect(result.onlineNodeIds).toContain('node-2');
  });
});
