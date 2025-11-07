/**
 * Tests for route matching utilities
 */

import { test, expect, describe } from "bun:test";
import { computeRoutePatterns, findMatchingRoute } from "./route-matcher";
import type { RoutesConfig } from "./types";

describe("Route matcher", () => {
  describe("computeRoutePatterns", () => {
    test("converts simple route with string price", () => {
      const routes: RoutesConfig = {
        "/v1/price": "$0.01",
      };

      const patterns = computeRoutePatterns(routes);
      expect(patterns).toHaveLength(1);
      expect(patterns[0]!.verb).toBe("*");
      expect(patterns[0]!.config.price).toBe("$0.01");
    });

    test("converts route with numeric price", () => {
      const routes: RoutesConfig = {
        "/v1/price": 0.01,
      };

      const patterns = computeRoutePatterns(routes);
      expect(patterns).toHaveLength(1);
      expect(patterns[0]!.config.price).toBe(0.01);
    });

    test("converts route with full config", () => {
      const routes: RoutesConfig = {
        "/v1/price": {
          price: "$0.01",
          description: "Get price",
          network: "base-sepolia",
        },
      };

      const patterns = computeRoutePatterns(routes);
      expect(patterns).toHaveLength(1);
      expect(patterns[0]!.config.price).toBe("$0.01");
      expect(patterns[0]!.config.description).toBe("Get price");
      expect(patterns[0]!.config.network).toBe("base-sepolia");
    });

    test("handles HTTP verb prefix", () => {
      const routes: RoutesConfig = {
        "GET /v1/price": "$0.01",
        "POST /v1/price": "$0.02",
      };

      const patterns = computeRoutePatterns(routes);
      expect(patterns).toHaveLength(2);
      expect(patterns[0]!.verb).toBe("GET");
      expect(patterns[1]!.verb).toBe("POST");
    });

    test("handles wildcard patterns", () => {
      const routes: RoutesConfig = {
        "/v1/*": "$0.01",
      };

      const patterns = computeRoutePatterns(routes);
      expect(patterns).toHaveLength(1);
      expect(patterns[0]!.pattern.test("/v1/price")).toBe(true);
      expect(patterns[0]!.pattern.test("/v1/quotes")).toBe(true);
      expect(patterns[0]!.pattern.test("/v2/price")).toBe(false);
    });

    test("handles path parameters", () => {
      const routes: RoutesConfig = {
        "/v1/user/[id]": "$0.01",
      };

      const patterns = computeRoutePatterns(routes);
      expect(patterns).toHaveLength(1);
      expect(patterns[0]!.pattern.test("/v1/user/123")).toBe(true);
      expect(patterns[0]!.pattern.test("/v1/user/abc")).toBe(true);
      expect(patterns[0]!.pattern.test("/v1/user/")).toBe(false);
    });

    test("handles pattern with trailing space", () => {
      const routes: RoutesConfig = {
        "GET ": "$0.01",
      };

      const patterns = computeRoutePatterns(routes);
      expect(patterns).toHaveLength(1);
      // When there's no path after the verb, it uses the verb as the path
      expect(patterns[0]!.verb).toBe("GET");
    });
  });

  describe("findMatchingRoute", () => {
    const routes: RoutesConfig = {
      "/v1/price": "$0.01",
      "GET /v1/quotes": "$0.02",
      "POST /v1/quotes": "$0.03",
      "/v1/user/[id]": "$0.05",
      "/v1/*": "$0.10",
    };

    const patterns = computeRoutePatterns(routes);

    test("matches exact path with any method", () => {
      const match = findMatchingRoute(patterns, "/v1/price", "GET");
      expect(match).toBeDefined();
      expect(match!.config.price).toBe("$0.01");
    });

    test("matches path with specific method", () => {
      const match = findMatchingRoute(patterns, "/v1/quotes", "GET");
      expect(match).toBeDefined();
      expect(match!.config.price).toBe("$0.02");
    });

    test("matches different method on same path", () => {
      const match = findMatchingRoute(patterns, "/v1/quotes", "POST");
      expect(match).toBeDefined();
      expect(match!.config.price).toBe("$0.03");
    });

    test("matches parameterized path", () => {
      const match = findMatchingRoute(patterns, "/v1/user/123", "GET");
      expect(match).toBeDefined();
      expect(match!.config.price).toBe("$0.05");
    });

    test("matches wildcard pattern", () => {
      const match = findMatchingRoute(patterns, "/v1/other", "GET");
      expect(match).toBeDefined();
      expect(match!.config.price).toBe("$0.10");
    });

    test("prefers more specific route", () => {
      const match = findMatchingRoute(patterns, "/v1/price", "GET");
      expect(match).toBeDefined();
      expect(match!.config.price).toBe("$0.01"); // Not the wildcard
    });

    test("returns undefined for non-matching path", () => {
      const match = findMatchingRoute(patterns, "/v2/price", "GET");
      expect(match).toBeUndefined();
    });

    test("handles query parameters", () => {
      const match = findMatchingRoute(patterns, "/v1/price?pair=BTC-USD", "GET");
      expect(match).toBeDefined();
      expect(match!.config.price).toBe("$0.01");
    });

    test("handles trailing slashes", () => {
      const match = findMatchingRoute(patterns, "/v1/price/", "GET");
      expect(match).toBeDefined();
      expect(match!.config.price).toBe("$0.01");
    });

    test("handles case insensitive methods", () => {
      const match = findMatchingRoute(patterns, "/v1/quotes", "get");
      expect(match).toBeDefined();
      expect(match!.config.price).toBe("$0.02");
    });

    test("returns undefined for invalid URL encoding", () => {
      const match = findMatchingRoute(patterns, "/v1/price%", "GET");
      expect(match).toBeUndefined();
    });
  });
});
