/**
 * Tests for payment requirements builder
 */

import { test, expect, describe } from "bun:test";
import { parsePrice } from "./payment-requirements";

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
});
