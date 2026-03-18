export class HttpError extends Error {
  readonly body: unknown;
  readonly status: number;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "HttpError";
    this.body = body;
    this.status = status;
  }
}

export interface JsonHttpClient {
  get<T>(path: string, query?: Record<string, string | number | undefined>): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
}

export interface JsonHttpClientOptions {
  baseUrl: string;
  credentials?: RequestCredentials;
}

export function createJsonHttpClient(
  options: JsonHttpClientOptions
): JsonHttpClient {
  return {
    get(path, query) {
      return request("GET", buildUrl(options.baseUrl, path, query), undefined, options);
    },
    post(path, body) {
      return request("POST", buildUrl(options.baseUrl, path), body, options);
    }
  };
}

function buildUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, number | string | undefined>
): string {
  const url = new URL(path, baseUrl);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined) {
        return;
      }

      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
}

async function request<T>(
  method: string,
  url: string,
  body: unknown,
  options: JsonHttpClientOptions
): Promise<T> {
  const response = await fetch(url, {
    method,
    credentials: options.credentials ?? "same-origin",
    headers:
      body === undefined
        ? undefined
        : {
            "Content-Type": "application/json"
          },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const text = await response.text();
  const payload = text ? safeParseJson(text) : null;

  if (!response.ok) {
    throw new HttpError(
      `HTTP ${response.status} while requesting ${url}`,
      response.status,
      payload ?? text
    );
  }

  return (payload ?? text) as T;
}

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
