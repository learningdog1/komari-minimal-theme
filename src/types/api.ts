export interface ApiEnvelope<T = unknown> {
  status?: string;
  message?: string;
  data?: T;
  [key: string]: unknown;
}

export interface ApiRecordCollection<T = unknown, U = unknown> {
  count?: number;
  records?: T[];
  tasks?: U[];
  [key: string]: unknown;
}

export interface JsonRpcResponse<T = unknown> {
  id?: number | string | null;
  jsonrpc?: string;
  result?: T;
  error?: {
    code?: number;
    data?: unknown;
    message?: string;
  };
}

export type ThemeSettingPrimitive = boolean | number | string | null;
