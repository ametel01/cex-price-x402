/**
 * Quote compositor
 * Generates composite price quotes from cached venue data
 * Supports single and multi-venue aggregation with spread-aware weighting
 */

import type { Quote, Pair, VenueMid } from "../types";
import type { MemoryCache } from "../cache/memory";
import { calculateMid, calculateSpreadBps, calculateWeightedAverage } from "../utils/decimal";

const MAX_STALENESS_MS = 2000; // 2 seconds

interface CompositorOptions {
  /**
   * Minimum number of venues required for a valid quote
   * Default: 1 (single venue is acceptable)
   */
  minVenues?: number;

  /**
   * Maximum staleness in milliseconds
   * Default: 2000ms
   */
  maxStaleness?: number;
}

/**
 * Quote compositor for aggregating venue data
 */
export class Compositor {
  private cache: MemoryCache;
  private options: Required<CompositorOptions>;

  constructor(cache: MemoryCache, options: CompositorOptions = {}) {
    this.cache = cache;
    this.options = {
      minVenues: options.minVenues ?? 1,
      maxStaleness: options.maxStaleness ?? MAX_STALENESS_MS,
    };
  }

  /**
   * Generate a quote for a specific pair
   * Returns null if insufficient data or data is too stale
   */
  getQuote(pair: Pair): Quote | null {
    // Get all fresh ticks for this pair
    const ticks = this.cache.getByPair(pair);

    if (ticks.length < this.options.minVenues) {
      return null;
    }

    // Filter out ticks without bid/ask
    const validTicks = ticks.filter(
      (t): t is typeof t & { bid: number; ask: number } => t.bid != null && t.ask != null
    );

    if (validTicks.length < this.options.minVenues) {
      return null;
    }

    // Calculate venue mids and metadata
    const venueMids: VenueMid[] = validTicks.map((tick) => {
      const mid = calculateMid(tick.bid, tick.ask);
      const spreadBps = calculateSpreadBps(tick.bid, tick.ask);
      const ageMs = this.cache.getStaleness(tick.venue, tick.pair) || 0;

      return {
        name: tick.venue,
        mid,
        spread_bps: spreadBps,
        w: 0, // Will be calculated below
        age_ms: ageMs,
      };
    });

    // Check staleness
    const maxStaleness = Math.max(...venueMids.map((v) => v.age_ms));
    if (maxStaleness > this.options.maxStaleness) {
      return null;
    }

    // Calculate weights based on inverse of spread (tighter spread = higher weight)
    const weights = this.calculateWeights(venueMids);

    // Assign weights to venue mids
    venueMids.forEach((v, i) => {
      const weight = weights[i];
      if (weight !== undefined) {
        v.w = weight;
      }
    });

    // Calculate weighted average price
    const mids = venueMids.map((v) => v.mid);
    const weightedMid = calculateWeightedAverage(mids, weights);

    // Calculate overall bid/ask from weighted mid
    // For now, use the tightest spread as reference
    const tightestSpreadBps = Math.min(...venueMids.map((v) => v.spread_bps));
    const { bid, ask } = this.calculateBidAsk(weightedMid, tightestSpreadBps);

    // Calculate VWAP (for now, same as weighted mid; will be enhanced with trade data)
    const vwap30s = weightedMid;

    return {
      pair,
      price: weightedMid,
      bid,
      ask,
      vwap_30s: vwap30s,
      source_count: venueMids.length,
      staleness_ms: maxStaleness,
      venues: venueMids,
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Calculate weights for venues based on spread
   * Tighter spreads get higher weights
   */
  private calculateWeights(venueMids: VenueMid[]): number[] {
    // Use inverse of spread as weight (tighter spread = higher weight)
    // Add 1 to avoid division by zero for very tight spreads
    const inverseSpreads = venueMids.map((v) => 1 / (v.spread_bps + 1));

    // Normalize weights to sum to 1
    const totalWeight = inverseSpreads.reduce((sum, w) => sum + w, 0);
    return inverseSpreads.map((w) => w / totalWeight);
  }

  /**
   * Calculate bid/ask from mid price and spread
   */
  private calculateBidAsk(mid: string, spreadBps: number): { bid: string; ask: string } {
    const midNum = parseFloat(mid);
    const spreadFraction = spreadBps / 10000; // Convert bps to fraction
    const halfSpread = (midNum * spreadFraction) / 2;

    const bid = (midNum - halfSpread).toFixed(8);
    const ask = (midNum + halfSpread).toFixed(8);

    return { bid, ask };
  }

  /**
   * Get quotes for multiple pairs
   */
  getQuotes(pairs: Pair[]): Quote[] {
    const quotes: Quote[] = [];

    for (const pair of pairs) {
      const quote = this.getQuote(pair);
      if (quote) {
        quotes.push(quote);
      }
    }

    return quotes;
  }

  /**
   * Get all available quotes from the cache
   */
  getAllQuotes(): Quote[] {
    // Extract unique pairs from cache
    const pairs = new Set<Pair>();
    const allTicks = this.cache.getByVenue("binance"); // TODO: support multi-venue

    for (const tick of allTicks) {
      pairs.add(tick.pair);
    }

    return this.getQuotes(Array.from(pairs));
  }
}
