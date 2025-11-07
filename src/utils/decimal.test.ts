/**
 * Tests for decimal utility functions
 */

import { test, expect, describe } from "bun:test";
import {
  calculateMid,
  calculateSpreadBps,
  calculateWeightedAverage,
  min,
  max,
  isWithinTolerance,
  formatPrice,
  toAtomicUnits,
  fromAtomicUnits,
} from "./decimal";

describe("Decimal utilities", () => {
  test("calculateMid returns correct mid price", () => {
    const mid = calculateMid("100", "102");
    expect(mid).toBe("101");
  });

  test("calculateSpreadBps returns spread in basis points", () => {
    const spreadBps = calculateSpreadBps("100", "101");
    expect(spreadBps).toBeCloseTo(99.5, 1); // ~1% spread = ~99.5 bps
  });

  test("calculateSpreadBps handles zero mid price", () => {
    const spreadBps = calculateSpreadBps("0", "0");
    expect(spreadBps).toBe(0);
  });

  test("calculateWeightedAverage with equal weights", () => {
    const avg = calculateWeightedAverage(["100", "200"], [0.5, 0.5]);
    expect(avg).toBe("150");
  });

  test("calculateWeightedAverage with unequal weights", () => {
    const avg = calculateWeightedAverage(["100", "200"], [0.25, 0.75]);
    expect(avg).toBe("175");
  });

  test("calculateWeightedAverage throws on mismatched arrays", () => {
    expect(() => {
      calculateWeightedAverage(["100"], [0.5, 0.5]);
    }).toThrow();
  });

  test("min returns smallest value", () => {
    const result = min("100", "50", "200");
    expect(result).toBe("50");
  });

  test("max returns largest value", () => {
    const result = max("100", "50", "200");
    expect(result).toBe("200");
  });

  test("isWithinTolerance returns true for values within tolerance", () => {
    const result = isWithinTolerance("100", "101", 100); // 1% tolerance
    expect(result).toBe(true);
  });

  test("isWithinTolerance returns false for values outside tolerance", () => {
    const result = isWithinTolerance("100", "110", 100); // 1% tolerance, 10% diff
    expect(result).toBe(false);
  });

  test("formatPrice formats to specified decimals", () => {
    const formatted = formatPrice("123.456789", 2);
    expect(formatted).toBe("123.46");
  });

  test("toAtomicUnits converts correctly", () => {
    const atomic = toAtomicUnits("1.5", 6); // 1.5 USDC
    expect(atomic).toBe("1500000");
  });

  test("fromAtomicUnits converts correctly", () => {
    const amount = fromAtomicUnits("1500000", 6); // 1.5 USDC
    expect(amount).toBe("1.5");
  });

  test("toAtomicUnits and fromAtomicUnits are inverse operations", () => {
    const original = "12.345678";
    const atomic = toAtomicUnits(original, 6);
    const back = fromAtomicUnits(atomic, 6);
    expect(back).toBe(original);
  });
});
