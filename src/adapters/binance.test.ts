/**
 * Tests for Binance adapter
 */

import { test, expect, describe } from "bun:test";
import { BinanceAdapter } from "./binance";
import type { NormalizedTick } from "../types";

describe("Binance Adapter", () => {
  test("creates adapter instance", () => {
    const ticks: NormalizedTick[] = [];
    const adapter = new BinanceAdapter(["BTC-USD"], (tick) => ticks.push(tick));

    expect(adapter).toBeDefined();
    expect(adapter.isConnected()).toBe(false);
  });

  test("adapter has required methods", () => {
    const adapter = new BinanceAdapter(["BTC-USD"], () => {});

    expect(typeof adapter.connect).toBe("function");
    expect(typeof adapter.disconnect).toBe("function");
    expect(typeof adapter.isConnected).toBe("function");
    expect(typeof adapter.getStats).toBe("function");
  });

  test("getStats returns statistics", () => {
    const adapter = new BinanceAdapter(["BTC-USD"], () => {});
    const stats = adapter.getStats();

    expect(stats).toHaveProperty("connected");
    expect(stats).toHaveProperty("reconnectAttempts");
    expect(stats).toHaveProperty("messagesReceived");
    expect(stats).toHaveProperty("lastMessageTime");
    expect(stats).toHaveProperty("errors");

    expect(stats.connected).toBe(false);
    expect(stats.messagesReceived).toBe(0);
  });

  test("disconnect is safe when not connected", () => {
    const adapter = new BinanceAdapter(["BTC-USD"], () => {});

    expect(() => {
      adapter.disconnect();
    }).not.toThrow();
  });

  test("handles valid message data", () => {
    const ticks: NormalizedTick[] = [];
    const adapter = new BinanceAdapter(["BTC-USD"], (tick) => ticks.push(tick));

    // Access private method for testing
    const handleMessage = (adapter as any).handleMessage.bind(adapter);

    const validMessage = JSON.stringify({
      stream: "btcusdt@bookTicker",
      data: {
        u: 123456789,
        s: "BTCUSDT",
        b: "50000.00",
        B: "1.5",
        a: "50001.00",
        A: "2.0",
      },
    });

    handleMessage(validMessage);

    expect(ticks.length).toBe(1);
    expect(ticks[0]?.venue).toBe("binance");
    expect(ticks[0]?.pair).toBe("BTC-USD");
    expect(ticks[0]?.bid).toBe("50000.00");
    expect(ticks[0]?.ask).toBe("50001.00");
    expect(ticks[0]?.type).toBe("book");

    const stats = adapter.getStats();
    expect(stats.messagesReceived).toBe(1);
    expect(stats.lastMessageTime).toBeGreaterThan(0);
  });

  test("handles invalid JSON gracefully", () => {
    const adapter = new BinanceAdapter(["BTC-USD"], () => {});
    const handleMessage = (adapter as any).handleMessage.bind(adapter);

    const initialStats = adapter.getStats();
    handleMessage("invalid json");

    const stats = adapter.getStats();
    expect(stats.errors).toBe(initialStats.errors + 1);
  });

  test("handles message with missing data", () => {
    const ticks: NormalizedTick[] = [];
    const adapter = new BinanceAdapter(["BTC-USD"], (tick) => ticks.push(tick));
    const handleMessage = (adapter as any).handleMessage.bind(adapter);

    const invalidMessage = JSON.stringify({
      stream: "test",
      data: null,
    });

    handleMessage(invalidMessage);

    // Should not add any ticks
    expect(ticks.length).toBe(0);
  });

  test("handles message with unknown symbol", () => {
    const ticks: NormalizedTick[] = [];
    const adapter = new BinanceAdapter(["BTC-USD"], (tick) => ticks.push(tick));
    const handleMessage = (adapter as any).handleMessage.bind(adapter);

    const unknownSymbol = JSON.stringify({
      stream: "unknown@bookTicker",
      data: {
        u: 123,
        s: "UNKNOWNPAIR",
        b: "1.0",
        B: "1.0",
        a: "1.0",
        A: "1.0",
      },
    });

    handleMessage(unknownSymbol);

    // Should not add any ticks for unknown symbols
    expect(ticks.length).toBe(0);
  });

  test("handles multiple pairs", () => {
    const adapter = new BinanceAdapter(["BTC-USD", "ETH-USD"], () => {});

    expect(adapter).toBeDefined();
    expect(adapter.isConnected()).toBe(false);
  });
});
