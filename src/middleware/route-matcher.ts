/**
 * Route matching utilities for x402 middleware
 */

import type { RouteConfig, RoutePattern, RoutesConfig } from "./types";

/**
 * Computes route patterns from routes config
 */
export function computeRoutePatterns(routes: RoutesConfig): RoutePattern[] {
  const normalizedRoutes = Object.fromEntries(
    Object.entries(routes).map(([pattern, value]) => [
      pattern,
      typeof value === "string" || typeof value === "number"
        ? ({ price: value } as RouteConfig)
        : (value as RouteConfig),
    ])
  );

  return Object.entries(normalizedRoutes).map(([pattern, routeConfig]) => {
    // Split pattern into verb and path, defaulting to "*" for verb if not specified
    const parts = pattern.includes(" ") ? pattern.split(/\s+/) : ["*", pattern];
    const verb = parts[0] || "*";
    const path = parts[1] || parts[0];

    if (!path) {
      throw new Error(`Invalid route pattern: ${pattern}`);
    }
    return {
      verb: verb.toUpperCase(),
      pattern: new RegExp(
        `^${
          path
            // First escape all special regex characters except * and []
            .replace(/[$()+.?^{|}]/g, "\\$&")
            // Then handle our special pattern characters
            .replace(/\*/g, ".*?") // Make wildcard non-greedy and optional
            .replace(/\[([^\]]+)\]/g, "[^/]+") // Convert [param] to regex capture
            .replace(/\//g, "\\/") // Escape slashes
        }$`,
        "i"
      ),
      config: routeConfig,
    };
  });
}

/**
 * Finds the matching route pattern for the given path and method
 */
export function findMatchingRoute(
  routePatterns: RoutePattern[],
  path: string,
  method: string
): RoutePattern | undefined {
  // Normalize the path
  let normalizedPath: string;
  try {
    // First split off query parameters and hash fragments
    const pathWithoutQuery = path.split(/[?#]/)[0] || "/";

    // Then decode the path
    const decodedPath = decodeURIComponent(pathWithoutQuery);

    // Normalize the path (just clean up slashes)
    normalizedPath = decodedPath
      .replace(/\\/g, "/") // replace backslashes
      .replace(/\/+/g, "/") // collapse slashes
      .replace(/(.+?)\/+$/, "$1"); // trim trailing slashes
  } catch {
    // If decoding fails, return undefined
    return undefined;
  }

  // Find matching route pattern
  const matchingRoutes = routePatterns.filter(({ pattern, verb }) => {
    const matchesPath = pattern.test(normalizedPath);
    const upperMethod = method.toUpperCase();
    const matchesVerb = verb === "*" || upperMethod === verb;

    return matchesPath && matchesVerb;
  });

  if (matchingRoutes.length === 0) {
    return undefined;
  }

  // Use the most specific route (longest path pattern)
  const matchingRoute = matchingRoutes.reduce((a, b) =>
    b.pattern.source.length > a.pattern.source.length ? b : a
  );

  return matchingRoute;
}
