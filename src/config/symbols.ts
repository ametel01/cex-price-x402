/**
 * Symbol mapping configuration
 * Maps canonical symbols to venue-specific symbols
 */

import type { Pair, SymbolMapping } from "../types";

export const SYMBOL_MAP: Record<string, SymbolMapping> = {
  "BTC-USD": {
    binance: "BTCUSDT",
    coinbase: "BTC-USD",
    kraken: "XBT/USD",
  },
  "BTC-USDT": {
    binance: "BTCUSDT",
    coinbase: "BTC-USDT",
    kraken: "XBT/USDT",
  },
  "ETH-USD": {
    binance: "ETHUSDT",
    coinbase: "ETH-USD",
    kraken: "ETH/USD",
  },
  "ETH-USDT": {
    binance: "ETHUSDT",
    coinbase: "ETH-USDT",
    kraken: "ETH/USDT",
  },
  "SOL-USD": {
    binance: "SOLUSDT",
    coinbase: "SOL-USD",
    kraken: "SOL/USD",
  },
};

/**
 * Convert canonical pair to Binance symbol
 */
export function symbolToBinance(pair: string): string {
  const mapping = SYMBOL_MAP[pair];
  if (!mapping) {
    throw new Error(`Unknown pair: ${pair}`);
  }
  return mapping.binance;
}

/**
 * Convert Binance symbol to canonical pair
 */
export function binanceToSymbol(binanceSymbol: string): Pair {
  for (const [canonical, venues] of Object.entries(SYMBOL_MAP)) {
    if (venues.binance === binanceSymbol) {
      return canonical as Pair;
    }
  }
  throw new Error(`Unknown Binance symbol: ${binanceSymbol}`);
}

/**
 * Convert canonical pair to Coinbase symbol
 */
export function symbolToCoinbase(pair: string): string {
  const mapping = SYMBOL_MAP[pair];
  if (!mapping) {
    throw new Error(`Unknown pair: ${pair}`);
  }
  return mapping.coinbase;
}

/**
 * Convert Coinbase symbol to canonical pair
 */
export function coinbaseToSymbol(coinbaseSymbol: string): Pair {
  for (const [canonical, venues] of Object.entries(SYMBOL_MAP)) {
    if (venues.coinbase === coinbaseSymbol) {
      return canonical as Pair;
    }
  }
  throw new Error(`Unknown Coinbase symbol: ${coinbaseSymbol}`);
}

/**
 * Convert canonical pair to Kraken symbol
 */
export function symbolToKraken(pair: string): string {
  const mapping = SYMBOL_MAP[pair];
  if (!mapping) {
    throw new Error(`Unknown pair: ${pair}`);
  }
  return mapping.kraken;
}

/**
 * Convert Kraken symbol to canonical pair
 */
export function krakenToSymbol(krakenSymbol: string): Pair {
  for (const [canonical, venues] of Object.entries(SYMBOL_MAP)) {
    if (venues.kraken === krakenSymbol) {
      return canonical as Pair;
    }
  }
  throw new Error(`Unknown Kraken symbol: ${krakenSymbol}`);
}

/**
 * Get all supported pairs
 */
export function getSupportedPairs(): Pair[] {
  return Object.keys(SYMBOL_MAP) as Pair[];
}

/**
 * Check if a pair is supported
 */
export function isPairSupported(pair: string): boolean {
  return pair in SYMBOL_MAP;
}
