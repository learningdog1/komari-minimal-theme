export interface ThemeRuntimeConfig {
  apiBasePath: string;
  origin: string;
  realtimePath: string;
  reservedRoutePrefixes: string[];
}

const RESERVED_ROUTE_PREFIXES = ["/admin", "/terminal"];

export function isReservedRoutePath(pathname: string): boolean {
  return RESERVED_ROUTE_PREFIXES.some((prefix) => {
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}

export function resolveThemeRuntimeConfig(
  locationLike: Pick<Location, "origin" | "pathname">
): ThemeRuntimeConfig {
  return {
    apiBasePath: "/api",
    origin: locationLike.origin,
    realtimePath: "/api/clients",
    reservedRoutePrefixes: [...RESERVED_ROUTE_PREFIXES]
  };
}
