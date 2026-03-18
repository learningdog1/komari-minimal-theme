import type { JsonRpcClient } from "./rpc-client";
import type {
  LoadHistoryPoint,
  NodeMetadata,
  PingHistory,
  PublicInfo,
  RealtimeSnapshot,
  RecentHistoryPoint
} from "@/types/domain";
import type { ThemeRuntimeConfig } from "@/core/config/runtime";
import { createJsonHttpClient } from "./http-client";
import { createJsonRpcClient } from "./rpc-client";
import {
  normalizeLoadHistory,
  normalizeNodes,
  normalizeNodesLatestStatus,
  normalizePingHistory,
  normalizePublicInfo,
  normalizeRecentHistory
} from "@/core/models/normalizers";

export interface KomariApiClient {
  getLoadHistory(uuid: string, hours: number): Promise<LoadHistoryPoint[]>;
  getNodes(): Promise<NodeMetadata[]>;
  getNodesLatestStatus(): Promise<RealtimeSnapshot>;
  getPingHistory(uuid: string, hours: number): Promise<PingHistory>;
  getPublicInfo(): Promise<PublicInfo>;
  getRecentHistory(uuid: string): Promise<RecentHistoryPoint[]>;
  rpc: JsonRpcClient;
}

export function createKomariApiClient(
  runtime: ThemeRuntimeConfig
): KomariApiClient {
  const http = createJsonHttpClient({ baseUrl: runtime.origin });
  const rpc = createJsonRpcClient(runtime.origin, "/api/rpc2", http);

  return {
    async getLoadHistory(uuid, hours) {
      return normalizeLoadHistory(
        await http.get("/api/records/load", {
          hours,
          uuid
        })
      );
    },
    async getNodes() {
      return normalizeNodes(await http.get("/api/nodes"));
    },
    async getNodesLatestStatus() {
      return normalizeNodesLatestStatus(
        await rpc.call("common:getNodesLatestStatus")
      );
    },
    async getPingHistory(uuid, hours) {
      return normalizePingHistory(
        await http.get("/api/records/ping", {
          hours,
          uuid
        })
      );
    },
    async getPublicInfo() {
      return normalizePublicInfo(await http.get("/api/public"));
    },
    async getRecentHistory(uuid) {
      return normalizeRecentHistory(await http.get(`/api/recent/${uuid}`));
    },
    rpc
  };
}
