/**
 * Tests for payment requirements builder
 */

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { parsePrice, buildPaymentRequirements } from "./payment-requirements";
import type { RoutePattern } from "./types";

describe("Payment requirements", () => {
  describe("parsePrice", () => {
    test("parses dollar string format", () => {
      const result = parsePrice("$0.01");
      expect(result).toBe("10000"); // 0.01 * 1_000_000
    });

    test("parses plain string format", () => {
      const result = parsePrice("0.01");
      expect(result).toBe("10000");
    });

    test("parses numeric format", () => {
      const result = parsePrice(0.01);
      expect(result).toBe("10000");
    });

    test("handles larger amounts", () => {
      const result = parsePrice("$1.50");
      expect(result).toBe("1500000"); // 1.5 * 1_000_000
    });

    test("handles zero", () => {
      const result = parsePrice(0);
      expect(result).toBe("0");
    });

    test("handles fractional cents", () => {
      const result = parsePrice("$0.001");
      expect(result).toBe("1000"); // 0.001 * 1_000_000
    });

    test("floors to integer atomic units", () => {
      const result = parsePrice("$0.0015");
      expect(result).toBe("1500"); // 0.0015 * 1_000_000, floored
    });

    test("handles string without dollar sign", () => {
      const result = parsePrice("5.00");
      expect(result).toBe("5000000"); // 5 * 1_000_000
    });

    test("handles numeric with decimals", () => {
      const result = parsePrice(2.5);
      expect(result).toBe("2500000"); // 2.5 * 1_000_000
    });
  });

  describe("buildPaymentRequirements", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv, NETWORK: "base-sepolia" };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    test("builds payment requirements with string price", () => {
      const route: RoutePattern = {
        pattern: /^\/api\/test$/,
        verb: "GET",
        config: {
          price: "$0.01",
          description: "Test endpoint",
        },
      };

      const result = buildPaymentRequirements(
        route,
        "0x1234567890123456789012345678901234567890",
        "/api/test"
      );

      expect(result.network).toBe("base-sepolia");
      expect(result.token).toBe("USDC");
      expect(result.receiver).toBe("0x1234567890123456789012345678901234567890");
      expect(result.amount).toBe("10000"); // 0.01 * 1_000_000
      expect(result.description).toBe("Test endpoint");
      expect(result.id).toBeDefined();
      expect(result.id.length).toBeGreaterThan(0);
    });

    test("builds payment requirements with numeric price", () => {
      const route: RoutePattern = {
        pattern: /^\/api\/test$/,
        verb: "GET",
        config: {
          price: 0.05,
        },
      };

      const result = buildPaymentRequirements(
        route,
        "0x1234567890123456789012345678901234567890",
        "/api/test"
      );

      expect(result.amount).toBe("50000"); // 0.05 * 1_000_000
      expect(result.description).toBe("Access to /api/test");
    });

    test("builds payment requirements without description", () => {
      const route: RoutePattern = {
        pattern: /^\/api\/data$/,
        verb: "POST",
        config: {
          price: 1.0,
        },
      };

      const result = buildPaymentRequirements(
        route,
        "0x1234567890123456789012345678901234567890",
        "/api/data"
      );

      expect(result.description).toBe("Access to /api/data");
    });

    test("strips dollar sign from price", () => {
      const route: RoutePattern = {
        pattern: /^\/api\/test$/,
        verb: "GET",
        config: {
          price: "$2.50",
        },
      };

      const result = buildPaymentRequirements(
        route,
        "0x1234567890123456789012345678901234567890",
        "/api/test"
      );

      expect(result.amount).toBe("2500000"); // 2.50 * 1_000_000
    });

    test("generates unique IDs for each call", () => {
      const route: RoutePattern = {
        pattern: /^\/api\/test$/,
        verb: "GET",
        config: {
          price: 0.01,
        },
      };

      const result1 = buildPaymentRequirements(
        route,
        "0x1234567890123456789012345678901234567890",
        "/api/test"
      );
      const result2 = buildPaymentRequirements(
        route,
        "0x1234567890123456789012345678901234567890",
        "/api/test"
      );

      expect(result1.id).not.toBe(result2.id);
    });
  });
});
