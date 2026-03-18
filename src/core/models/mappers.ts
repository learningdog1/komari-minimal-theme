import type {
  MetricSample,
  NodeEntity,
  NodeMetadata,
  PingHistory
} from "@/types/domain";

export function createNodeEntity(meta: NodeMetadata): NodeEntity {
  return {
    meta,
    latest: undefined,
    recentHistory: [],
    loadHistory: [],
    pingHistory: {
      tasks: [],
      records: []
    },
    isOnline: false,
    lastUpdatedAt: meta.updatedAt
  };
}

export function mergeNodeEntities(
  existing: Record<string, NodeEntity>,
  nodes: NodeMetadata[]
): Record<string, NodeEntity> {
  return nodes.reduce<Record<string, NodeEntity>>((accumulator, meta) => {
    const previous = existing[meta.uuid];
    if (previous) {
      // 已有节点：只更新 metadata，不覆盖 latest（避免轮询覆盖 websocket 实时数据）
      accumulator[meta.uuid] = {
        ...previous,
        meta
      };
    } else {
      // 新节点：若存在latestSample，初始化到latest
      const newEntity = createNodeEntity(meta);
      if (meta.latestSample) {
        newEntity.latest = meta.latestSample;
        newEntity.lastUpdatedAt = meta.latestSample.updatedAt ?? meta.updatedAt;
      }
      accumulator[meta.uuid] = newEntity;
    }
    return accumulator;
  }, {});
}

export function mergeRealtimeSample(
  entity: NodeEntity,
  sample: MetricSample | undefined,
  online: boolean
): NodeEntity {
  if (!sample) {
    return {
      ...entity,
      isOnline: online
    };
  }

  return {
    ...entity,
    isOnline: online,
    latest: {
      ...entity.latest,
      ...sample
    },
    lastUpdatedAt: sample.updatedAt ?? entity.lastUpdatedAt
  };
}

export function withLoadHistory(
  entity: NodeEntity,
  history: NodeEntity["loadHistory"]
): NodeEntity {
  return {
    ...entity,
    loadHistory: history
  };
}

export function withPingHistory(entity: NodeEntity, history: PingHistory): NodeEntity {
  return {
    ...entity,
    pingHistory: history
  };
}

export function withRecentHistory(
  entity: NodeEntity,
  history: NodeEntity["recentHistory"]
): NodeEntity {
  return {
    ...entity,
    recentHistory: history
  };
}
