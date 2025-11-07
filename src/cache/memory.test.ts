/**
 * Tests for memory cache
 */

import { test, expect, describe, beforeEach } from "bun:test";
import { MemoryCache } from "./memory";
import type { NormalizedTick } from "../types";

describe("MemoryCache", () => {
  let cache: MemoryCache;

  beforeEach(() => {
    cache = new MemoryCache();
  });

  const createTick = (
    venue: "binance" | "coinbase" | "kraken" = "binance",
    pair: string = "BTC-USD",
    bid = "50000",
    ask = "50010"
  ): NormalizedTick => ({
    venue,
    pair: pair as any,
    ts: Date.now(),
    bid,
    ask,
    type: "book",
  });

  describe("set and get", () => {
    test("stores and retrieves a tick", () => {
      const tick = createTick();
      cache.set(tick);

      const retrieved = cache.get("binance", "BTC-USD");
      expect(retrieved).toEqual(tick);
    });

    test("returns null for non-existent tick", () => {
      const retrieved = cache.get("binance", "BTC-USD");
      expect(retrieved).toBeNull();
    });

    test("updates existing tick", () => {
      const tick1 = createTick("binance", "BTC-USD", "50000", "50010");
      cache.set(tick1);

      const tick2 = createTick("binance", "BTC-USD", "51000", "51010");
      cache.set(tick2);

      const retrieved = cache.get("binance", "BTC-USD");
      expect(retrieved).toEqual(tick2);
    });

    test("handles multiple venues for same pair", () => {
      const binanceTick = createTick("binance", "BTC-USD");
      const coinbaseTick = createTick("coinbase", "BTC-USD");

      cache.set(binanceTick);
      cache.set(coinbaseTick);

      expect(cache.get("binance", "BTC-USD")).toEqual(binanceTick);
      expect(cache.get("coinbase", "BTC-USD")).toEqual(coinbaseTick);
    });

    test("handles multiple pairs for same venue", () => {
      const btcTick = createTick("binance", "BTC-USD");
      const ethTick = createTick("binance", "ETH-USD");

      cache.set(btcTick);
      cache.set(ethTick);

      expect(cache.get("binance", "BTC-USD")).toEqual(btcTick);
      expect(cache.get("binance", "ETH-USD")).toEqual(ethTick);
    });
  });

  describe("staleness", () => {
    test("returns null for stale data", async () => {
      const tick = createTick();
      cache.set(tick);

      // Wait for data to become stale (>2 seconds)
      await Bun.sleep(2100);

      const retrieved = cache.get("binance", "BTC-USD");
      expect(retrieved).toBeNull();
    });

    test("getStaleness returns correct age", async () => {
      const tick = createTick();
      cache.set(tick);

      await Bun.sleep(100);

      const staleness = cache.getStaleness("binance", "BTC-USD");
      expect(staleness).toBeGreaterThanOrEqual(100);
      expect(staleness).toBeLessThan(200);
    });

    test("getStaleness returns null for non-existent entry", () => {
      const staleness = cache.getStaleness("binance", "BTC-USD");
      expect(staleness).toBeNull();
    });
  });

  describe("getByPair", () => {
    test("returns all fresh ticks for a pair", () => {
      const binanceTick = createTick("binance", "BTC-USD");
      const coinbaseTick = createTick("coinbase", "BTC-USD");
      const ethTick = createTick("binance", "ETH-USD");

      cache.set(binanceTick);
      cache.set(coinbaseTick);
      cache.set(ethTick);

      const ticks = cache.getByPair("BTC-USD");
      expect(ticks).toHaveLength(2);
      expect(ticks).toContainEqual(binanceTick);
      expect(ticks).toContainEqual(coinbaseTick);
    });

    test("excludes stale ticks", async () => {
      const tick1 = createTick("binance", "BTC-USD");
      cache.set(tick1);

      await Bun.sleep(2100);

      const tick2 = createTick("coinbase", "BTC-USD");
      cache.set(tick2);

      const ticks = cache.getByPair("BTC-USD");
      expect(ticks).toHaveLength(1);
      expect(ticks[0]).toEqual(tick2);
    });

    test("returns empty array when no ticks exist", () => {
      const ticks = cache.getByPair("BTC-USD");
      expect(ticks).toEqual([]);
    });
  });

  describe("getByVenue", () => {
    test("returns all fresh ticks for a venue", () => {
      const btcTick = createTick("binance", "BTC-USD");
      const ethTick = createTick("binance", "ETH-USD");
      const coinbaseTick = createTick("coinbase", "BTC-USD");

      cache.set(btcTick);
      cache.set(ethTick);
      cache.set(coinbaseTick);

      const ticks = cache.getByVenue("binance");
      expect(ticks).toHaveLength(2);
      expect(ticks).toContainEqual(btcTick);
      expect(ticks).toContainEqual(ethTick);
    });

    test("excludes stale ticks", async () => {
      const tick1 = createTick("binance", "BTC-USD");
      cache.set(tick1);

      await Bun.sleep(2100);

      const tick2 = createTick("binance", "ETH-USD");
      cache.set(tick2);

      const ticks = cache.getByVenue("binance");
      expect(ticks).toHaveLength(1);
      expect(ticks[0]).toEqual(tick2);
    });

    test("returns empty array when no ticks exist", () => {
      const ticks = cache.getByVenue("binance");
      expect(ticks).toEqual([]);
    });
  });

  describe("has", () => {
    test("returns true for fresh tick", () => {
      const tick = createTick();
      cache.set(tick);

      expect(cache.has("binance", "BTC-USD")).toBe(true);
    });

    test("returns false for non-existent tick", () => {
      expect(cache.has("binance", "BTC-USD")).toBe(false);
    });

    test("returns false for stale tick", async () => {
      const tick = createTick();
      cache.set(tick);

      await Bun.sleep(2100);

      expect(cache.has("binance", "BTC-USD")).toBe(false);
    });
  });

  describe("cleanup", () => {
    test("removes stale entries", async () => {
      const tick1 = createTick("binance", "BTC-USD");
      cache.set(tick1);

      await Bun.sleep(2100);

      const tick2 = createTick("binance", "ETH-USD");
      cache.set(tick2);

      const removed = cache.cleanup();
      expect(removed).toBe(1);

      const stats = cache.getStats();
      expect(stats.totalEntries).toBe(1);
    });

    test("returns 0 when no stale entries", () => {
      const tick = createTick();
      cache.set(tick);

      const removed = cache.cleanup();
      expect(removed).toBe(0);
    });
  });

  describe("clear", () => {
    test("removes all entries", () => {
      cache.set(createTick("binance", "BTC-USD"));
      cache.set(createTick("coinbase", "BTC-USD"));
      cache.set(createTick("binance", "ETH-USD"));

      cache.clear();

      const stats = cache.getStats();
      expect(stats.totalEntries).toBe(0);
    });
  });

  describe("getStats", () => {
    test("returns correct statistics", async () => {
      const tick1 = createTick("binance", "BTC-USD");
      cache.set(tick1);

      await Bun.sleep(2100);

      const tick2 = createTick("binance", "ETH-USD");
      cache.set(tick2);

      const stats = cache.getStats();
      expect(stats.totalEntries).toBe(2);
      expect(stats.freshEntries).toBe(1);
      expect(stats.staleEntries).toBe(1);
    });

    test("returns zero stats for empty cache", () => {
      const stats = cache.getStats();
      expect(stats.totalEntries).toBe(0);
      expect(stats.freshEntries).toBe(0);
      expect(stats.staleEntries).toBe(0);
    });
  });
});
