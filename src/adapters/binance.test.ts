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
});
