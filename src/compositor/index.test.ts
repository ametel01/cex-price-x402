/**
 * Tests for quote compositor
 */

import { test, expect, describe, beforeEach } from "bun:test";
import { Compositor } from "./index";
import { MemoryCache } from "../cache/memory";
import type { NormalizedTick, Pair } from "../types";

describe("Compositor", () => {
  let cache: MemoryCache;
  let compositor: Compositor;

  beforeEach(() => {
    cache = new MemoryCache();
    compositor = new Compositor(cache);
  });

  const createTick = (
    venue: "binance" | "coinbase" | "kraken" = "binance",
    pair: Pair = "BTC-USD",
    bid = "50000",
    ask = "50010"
  ): NormalizedTick => ({
    venue,
    pair,
    ts: Date.now(),
    bid,
    ask,
    type: "book",
  });

  describe("getQuote with single venue", () => {
    test("generates quote from single venue", () => {
      const tick = createTick("binance", "BTC-USD", "50000", "50010");
      cache.set(tick);

      const quote = compositor.getQuote("BTC-USD");

      expect(quote).not.toBeNull();
      expect(quote!.pair).toBe("BTC-USD");
      expect(quote!.source_count).toBe(1);
      expect(quote!.venues).toHaveLength(1);
      expect(quote!.venues[0]!.name).toBe("binance");
      expect(parseFloat(quote!.price)).toBeGreaterThan(0);
    });

    test("returns null when no data available", () => {
      const quote = compositor.getQuote("BTC-USD");
      expect(quote).toBeNull();
    });

    test("returns null when tick has no bid/ask", () => {
      const tick: NormalizedTick = {
        venue: "binance",
        pair: "BTC-USD",
        ts: Date.now(),
        type: "book",
      };
      cache.set(tick);

      const quote = compositor.getQuote("BTC-USD");
      expect(quote).toBeNull();
    });

    test("calculates mid price correctly", () => {
      const tick = createTick("binance", "BTC-USD", "50000", "50010");
      cache.set(tick);

      const quote = compositor.getQuote("BTC-USD");

      expect(quote).not.toBeNull();
      const expectedMid = (50000 + 50010) / 2;
      expect(parseFloat(quote!.price)).toBeCloseTo(expectedMid, 2);
    });

    test("includes venue metadata", () => {
      const tick = createTick("binance", "BTC-USD", "50000", "50010");
      cache.set(tick);

      const quote = compositor.getQuote("BTC-USD");

      expect(quote).not.toBeNull();
      const venueMid = quote!.venues[0]!;
      expect(venueMid.name).toBe("binance");
      expect(parseFloat(venueMid.mid)).toBeGreaterThan(0);
      expect(venueMid.spread_bps).toBeGreaterThan(0);
      expect(venueMid.age_ms).toBeGreaterThanOrEqual(0);
    });

    test("includes timestamp", () => {
      const tick = createTick("binance", "BTC-USD");
      cache.set(tick);

      const quote = compositor.getQuote("BTC-USD");

      expect(quote).not.toBeNull();
      expect(quote!.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe("getQuote with multiple venues", () => {
    test("generates quote from multiple venues", () => {
      const binanceTick = createTick("binance", "BTC-USD", "50000", "50010");
      const coinbaseTick = createTick("coinbase", "BTC-USD", "50005", "50015");

      cache.set(binanceTick);
      cache.set(coinbaseTick);

      const quote = compositor.getQuote("BTC-USD");

      expect(quote).not.toBeNull();
      expect(quote!.source_count).toBe(2);
      expect(quote!.venues).toHaveLength(2);
    });

    test("calculates weighted average based on spreads", () => {
      // Binance: tighter spread, should have higher weight
      const binanceTick = createTick("binance", "BTC-USD", "50000", "50005");
      // Coinbase: wider spread, should have lower weight
      const coinbaseTick = createTick("coinbase", "BTC-USD", "50010", "50030");

      cache.set(binanceTick);
      cache.set(coinbaseTick);

      const quote = compositor.getQuote("BTC-USD");

      expect(quote).not.toBeNull();
      const binanceMid = (50000 + 50005) / 2;
      const coinbaseMid = (50010 + 50030) / 2;

      // Weighted average should be closer to Binance (tighter spread)
      const price = parseFloat(quote!.price);
      expect(Math.abs(price - binanceMid)).toBeLessThan(
        Math.abs(price - coinbaseMid)
      );
    });

    test("excludes venues with missing bid/ask", () => {
      const validTick = createTick("binance", "BTC-USD", "50000", "50010");
      const invalidTick: NormalizedTick = {
        venue: "coinbase",
        pair: "BTC-USD",
        ts: Date.now(),
        type: "book",
      };

      cache.set(validTick);
      cache.set(invalidTick);

      const quote = compositor.getQuote("BTC-USD");

      expect(quote).not.toBeNull();
      expect(quote!.source_count).toBe(1);
      expect(quote!.venues[0]!.name).toBe("binance");
    });

    test("returns null when data is too stale", async () => {
      const tick = createTick("binance", "BTC-USD");
      cache.set(tick);

      // Wait for data to become stale
      await Bun.sleep(2100);

      const quote = compositor.getQuote("BTC-USD");
      expect(quote).toBeNull();
    });
  });

  describe("getQuote with minimum venues requirement", () => {
    test("requires minimum number of venues", () => {
      const compositorWithMin = new Compositor(cache, { minVenues: 2 });

      const tick = createTick("binance", "BTC-USD");
      cache.set(tick);

      const quote = compositorWithMin.getQuote("BTC-USD");
      expect(quote).toBeNull();
    });

    test("succeeds when minimum venues met", () => {
      const compositorWithMin = new Compositor(cache, { minVenues: 2 });

      cache.set(createTick("binance", "BTC-USD", "50000", "50010"));
      cache.set(createTick("coinbase", "BTC-USD", "50005", "50015"));

      const quote = compositorWithMin.getQuote("BTC-USD");
      expect(quote).not.toBeNull();
      expect(quote!.source_count).toBe(2);
    });
  });

  describe("getQuotes", () => {
    test("generates quotes for multiple pairs", () => {
      cache.set(createTick("binance", "BTC-USD", "50000", "50010"));
      cache.set(createTick("binance", "ETH-USD", "3000", "3005"));

      const quotes = compositor.getQuotes(["BTC-USD", "ETH-USD"]);

      expect(quotes).toHaveLength(2);
      expect(quotes[0]!.pair).toBe("BTC-USD");
      expect(quotes[1]!.pair).toBe("ETH-USD");
    });

    test("excludes pairs without data", () => {
      cache.set(createTick("binance", "BTC-USD", "50000", "50010"));

      const quotes = compositor.getQuotes(["BTC-USD", "ETH-USD"]);

      expect(quotes).toHaveLength(1);
      expect(quotes[0]!.pair).toBe("BTC-USD");
    });

    test("returns empty array when no data", () => {
      const quotes = compositor.getQuotes(["BTC-USD", "ETH-USD"]);
      expect(quotes).toEqual([]);
    });
  });

  describe("getAllQuotes", () => {
    test("generates quotes for all available pairs", () => {
      cache.set(createTick("binance", "BTC-USD", "50000", "50010"));
      cache.set(createTick("binance", "ETH-USD", "3000", "3005"));
      cache.set(createTick("binance", "SOL-USD", "100", "101"));

      const quotes = compositor.getAllQuotes();

      expect(quotes.length).toBeGreaterThan(0);
      expect(quotes.length).toBeLessThanOrEqual(3);
    });

    test("returns empty array when cache is empty", () => {
      const quotes = compositor.getAllQuotes();
      expect(quotes).toEqual([]);
    });
  });

  describe("spread calculation", () => {
    test("calculates spread in basis points correctly", () => {
      const tick = createTick("binance", "BTC-USD", "50000", "50010");
      cache.set(tick);

      const quote = compositor.getQuote("BTC-USD");

      expect(quote).not.toBeNull();
      const venueMid = quote!.venues[0]!;

      // Spread = (50010 - 50000) / 50005 * 10000 ≈ 2 bps
      expect(venueMid.spread_bps).toBeCloseTo(2, 0);
    });

    test("handles very tight spreads", () => {
      const tick = createTick("binance", "BTC-USD", "50000.00", "50000.50");
      cache.set(tick);

      const quote = compositor.getQuote("BTC-USD");

      expect(quote).not.toBeNull();
      const venueMid = quote!.venues[0]!;
      expect(venueMid.spread_bps).toBeCloseTo(0.1, 1);
    });

    test("handles wide spreads", () => {
      const tick = createTick("binance", "BTC-USD", "50000", "51000");
      cache.set(tick);

      const quote = compositor.getQuote("BTC-USD");

      expect(quote).not.toBeNull();
      const venueMid = quote!.venues[0]!;
      // Spread = 1000 / 50500 * 10000 ≈ 198 bps
      expect(venueMid.spread_bps).toBeCloseTo(198, 0);
    });
  });

  describe("staleness tracking", () => {
    test("tracks staleness correctly", async () => {
      const tick = createTick("binance", "BTC-USD");
      cache.set(tick);

      await Bun.sleep(100);

      const quote = compositor.getQuote("BTC-USD");

      expect(quote).not.toBeNull();
      expect(quote!.staleness_ms).toBeGreaterThanOrEqual(100);
      expect(quote!.staleness_ms).toBeLessThan(200);
    });

    test("uses max staleness across venues", async () => {
      const tick1 = createTick("binance", "BTC-USD");
      cache.set(tick1);

      await Bun.sleep(100);

      const tick2 = createTick("coinbase", "BTC-USD");
      cache.set(tick2);

      const quote = compositor.getQuote("BTC-USD");

      expect(quote).not.toBeNull();
      // Max staleness should be for the older tick
      expect(quote!.staleness_ms).toBeGreaterThanOrEqual(100);
    });
  });
});
