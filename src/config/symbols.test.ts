/**
 * Tests for symbol mapping utilities
 */

import { test, expect, describe } from "bun:test";
import {
  symbolToBinance,
  binanceToSymbol,
  symbolToCoinbase,
  coinbaseToSymbol,
  symbolToKraken,
  krakenToSymbol,
  getSupportedPairs,
  isPairSupported,
} from "./symbols";

describe("Symbol mapping", () => {
  test("symbolToBinance converts correctly", () => {
    expect(symbolToBinance("BTC-USD")).toBe("BTCUSDT");
    expect(symbolToBinance("ETH-USD")).toBe("ETHUSDT");
  });

  test("binanceToSymbol converts correctly", () => {
    expect(binanceToSymbol("BTCUSDT")).toBe("BTC-USD");
    expect(binanceToSymbol("ETHUSDT")).toBe("ETH-USD");
  });

  test("symbolToCoinbase converts correctly", () => {
    expect(symbolToCoinbase("BTC-USD")).toBe("BTC-USD");
    expect(symbolToCoinbase("ETH-USD")).toBe("ETH-USD");
  });

  test("coinbaseToSymbol converts correctly", () => {
    expect(coinbaseToSymbol("BTC-USD")).toBe("BTC-USD");
    expect(coinbaseToSymbol("ETH-USD")).toBe("ETH-USD");
  });

  test("symbolToKraken converts correctly", () => {
    expect(symbolToKraken("BTC-USD")).toBe("XBT/USD");
    expect(symbolToKraken("ETH-USD")).toBe("ETH/USD");
  });

  test("krakenToSymbol converts correctly", () => {
    expect(krakenToSymbol("XBT/USD")).toBe("BTC-USD");
    expect(krakenToSymbol("ETH/USD")).toBe("ETH-USD");
  });

  test("getSupportedPairs returns array of pairs", () => {
    const pairs = getSupportedPairs();
    expect(pairs.length).toBeGreaterThan(0);
    expect(pairs).toContain("BTC-USD");
    expect(pairs).toContain("ETH-USD");
  });

  test("isPairSupported returns true for supported pairs", () => {
    expect(isPairSupported("BTC-USD")).toBe(true);
    expect(isPairSupported("ETH-USD")).toBe(true);
  });

  test("isPairSupported returns false for unsupported pairs", () => {
    expect(isPairSupported("INVALID-PAIR")).toBe(false);
  });

  test("throws error for unknown pairs", () => {
    expect(() => symbolToBinance("UNKNOWN-PAIR")).toThrow();
    expect(() => symbolToCoinbase("UNKNOWN-PAIR")).toThrow();
    expect(() => symbolToKraken("UNKNOWN-PAIR")).toThrow();
  });

  test("throws error for unknown venue symbols", () => {
    expect(() => binanceToSymbol("INVALID")).toThrow();
    expect(() => coinbaseToSymbol("INVALID")).toThrow();
    expect(() => krakenToSymbol("INVALID")).toThrow();
  });

  test("bidirectional conversion works", () => {
    const canonical = "BTC-USD";
    const binance = symbolToBinance(canonical);
    const backToCanonical = binanceToSymbol(binance);
    expect(backToCanonical).toBe(canonical);
  });
});
