import type { JsonRpcResponse } from "@/types/api";
import { createJsonHttpClient, type JsonHttpClient } from "./http-client";

export class JsonRpcError extends Error {
  readonly code?: number;
  readonly data?: unknown;

  constructor(message: string, code?: number, data?: unknown) {
    super(message);
    this.name = "JsonRpcError";
    this.code = code;
    this.data = data;
  }
}

export interface JsonRpcClient {
  call<T>(method: string, params?: unknown): Promise<T>;
}

export function createJsonRpcClient(
  baseUrl: string,
  endpoint = "/api/rpc2",
  client: JsonHttpClient = createJsonHttpClient({ baseUrl })
): JsonRpcClient {
  let id = 0;

  return {
    async call<T>(method: string, params?: unknown): Promise<T> {
      const response = await client.post<JsonRpcResponse<T>>(endpoint, {
        jsonrpc: "2.0",
        id: ++id,
        method,
        params
      });

      if (response.error) {
        throw new JsonRpcError(
          response.error.message ?? `RPC ${method} failed`,
          response.error.code,
          response.error.data
        );
      }

      return response.result as T;
    }
  };
}
