/**
 * Tests for API endpoints
 */

import { test, expect, describe } from "bun:test";
import { handleHealthRequest } from "./health";
import { handleSymbolsRequest } from "./symbols";

describe("API endpoints", () => {
  describe("Health endpoint", () => {
    test("returns ok status", async () => {
      const response = handleHealthRequest();
      expect(response.status).toBe(200);

      const data = (await response.json()) as any;
      expect(data.status).toBe("ok");
      expect(data).toHaveProperty("timestamp");
      expect(data).toHaveProperty("uptime");
    });

    test("timestamp is recent", async () => {
      const response = handleHealthRequest();
      const data = (await response.json()) as any;

      const now = Date.now();
      const diff = now - data.timestamp;

      // Timestamp should be within last second
      expect(diff).toBeLessThan(1000);
      expect(diff).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Symbols endpoint", () => {
    test("returns list of symbols", async () => {
      const response = handleSymbolsRequest();
      expect(response.status).toBe(200);

      const data = (await response.json()) as any;
      expect(data).toHaveProperty("symbols");
      expect(data).toHaveProperty("count");
      expect(Array.isArray(data.symbols)).toBe(true);
    });

    test("includes expected symbols", async () => {
      const response = handleSymbolsRequest();
      const data = (await response.json()) as any;

      expect(data.symbols).toContain("BTC-USD");
      expect(data.symbols).toContain("ETH-USD");
      expect(data.count).toBeGreaterThan(0);
    });

    test("count matches symbols array length", async () => {
      const response = handleSymbolsRequest();
      const data = (await response.json()) as any;

      expect(data.count).toBe(data.symbols.length);
    });
  });
});
