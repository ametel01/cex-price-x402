/**
 * In-memory cache for normalized ticks
 * Stores the latest tick for each venue-pair combination
 * Implements staleness checks to reject outdated data
 */

import type { NormalizedTick, Venue, Pair } from "../types";

const STALENESS_THRESHOLD_MS = 2000; // 2 seconds

/**
 * Cache key format: "venue:pair" (e.g., "binance:BTC-USD")
 */
type CacheKey = string;

interface CacheEntry {
  tick: NormalizedTick;
  insertedAt: number;
}

/**
 * In-memory cache for real-time market data
 */
export class MemoryCache {
  private cache: Map<CacheKey, CacheEntry> = new Map();

  /**
   * Create cache key from venue and pair
   */
  private static createKey(venue: Venue, pair: Pair): CacheKey {
    return `${venue}:${pair}`;
  }

  /**
   * Add or update a tick in the cache
   */
  set(tick: NormalizedTick): void {
    const key = MemoryCache.createKey(tick.venue, tick.pair);
    this.cache.set(key, {
      tick,
      insertedAt: Date.now(),
    });
  }

  /**
   * Get the latest tick for a venue-pair combination
   * Returns null if not found or stale
   */
  get(venue: Venue, pair: Pair): NormalizedTick | null {
    const key = MemoryCache.createKey(venue, pair);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check staleness
    const age = Date.now() - entry.insertedAt;
    if (age > STALENESS_THRESHOLD_MS) {
      return null;
    }

    return entry.tick;
  }

  /**
   * Get all fresh ticks for a specific pair across all venues
   */
  getByPair(pair: Pair): NormalizedTick[] {
    const ticks: NormalizedTick[] = [];
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (key.endsWith(`:${pair}`)) {
        const age = now - entry.insertedAt;
        if (age <= STALENESS_THRESHOLD_MS) {
          ticks.push(entry.tick);
        }
      }
    }

    return ticks;
  }

  /**
   * Get all fresh ticks for a specific venue across all pairs
   */
  getByVenue(venue: Venue): NormalizedTick[] {
    const ticks: NormalizedTick[] = [];
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (key.startsWith(`${venue}:`)) {
        const age = now - entry.insertedAt;
        if (age <= STALENESS_THRESHOLD_MS) {
          ticks.push(entry.tick);
        }
      }
    }

    return ticks;
  }

  /**
   * Get staleness in milliseconds for a venue-pair combination
   * Returns null if not found
   */
  getStaleness(venue: Venue, pair: Pair): number | null {
    const key = MemoryCache.createKey(venue, pair);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    return Date.now() - entry.insertedAt;
  }

  /**
   * Check if a tick exists and is fresh
   */
  has(venue: Venue, pair: Pair): boolean {
    return this.get(venue, pair) !== null;
  }

  /**
   * Remove stale entries from the cache
   * Returns the number of entries removed
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.insertedAt;
      if (age > STALENESS_THRESHOLD_MS) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let freshCount = 0;
    let staleCount = 0;

    for (const entry of this.cache.values()) {
      const age = now - entry.insertedAt;
      if (age <= STALENESS_THRESHOLD_MS) {
        freshCount++;
      } else {
        staleCount++;
      }
    }

    return {
      totalEntries: this.cache.size,
      freshEntries: freshCount,
      staleEntries: staleCount,
    };
  }
}
