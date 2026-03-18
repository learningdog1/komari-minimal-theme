export type UnknownRecord = Record<string, unknown>;

export function asRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

export function ensureArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function pickFirstDefined<T>(
  ...values: Array<T | null | undefined>
): T | undefined {
  for (const value of values) {
    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return undefined;
}

export function readArray(value: unknown, key: string): unknown[] | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return Array.isArray(value[key]) ? (value[key] as unknown[]) : undefined;
}

export function readBoolean(value: unknown, key: string): boolean | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return coerceBoolean(value[key]);
}

export function readNumber(value: unknown, key: string): number | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return coerceNumber(value[key]);
}

export function readObject(
  value: unknown,
  key: string
): UnknownRecord | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return asRecord(value[key]) ?? undefined;
}

export function readString(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return coerceString(value[key]);
}

export function readNestedNumber(
  value: unknown,
  path: string[]
): number | undefined {
  return coerceNumber(readPath(value, path));
}

export function readNestedString(
  value: unknown,
  path: string[]
): string | undefined {
  return coerceString(readPath(value, path));
}

export function readPath(value: unknown, path: string[]): unknown {
  let current = value;

  for (const segment of path) {
    if (!isRecord(current)) {
      return undefined;
    }

    current = current[segment];
  }

  return current;
}

export function clampNumber(
  value: number | undefined,
  minimum: number,
  maximum: number,
  fallback: number
): number {
  if (value === undefined || Number.isNaN(value)) {
    return fallback;
  }

  return Math.min(maximum, Math.max(minimum, value));
}

export function coerceBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value === "true") {
      return true;
    }

    if (value === "false") {
      return false;
    }
  }

  return undefined;
}

export function coerceIsoDate(value: unknown): string | undefined {
  const raw = coerceString(value);

  if (!raw) {
    return undefined;
  }

  const date = new Date(raw);
  return Number.isNaN(date.valueOf()) ? raw : date.toISOString();
}

export function coerceNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

export function coerceString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  return undefined;
}

export function parseTagList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => coerceString(item))
      .filter((item): item is string => Boolean(item));
  }

  if (typeof value === "string") {
    return value
      .split(/[;,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}
