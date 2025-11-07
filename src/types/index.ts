/**
 * Core type definitions for the crypto pricing API
 * Based on SPECS.md requirements
 */

import { z } from "zod";

// Supported trading pairs
export type Pair = `${string}-${"USD" | "USDT" | "USDC"}`;

// Supported venues
export type Venue = "binance" | "coinbase" | "kraken";

// Venue-specific quote information
export interface VenueMid {
  name: string;
  mid: string;
  spread_bps: number;
  w: number; // weight in composite calculation
  age_ms: number;
}

// Composite quote response
export interface Quote {
  pair: Pair;
  price: string;
  bid: string;
  ask: string;
  vwap_30s: string;
  source_count: number;
  staleness_ms: number;
  venues: VenueMid[];
  updated_at: string;
}

// Normalized tick from adapters
export interface NormalizedTick {
  venue: Venue;
  pair: Pair;
  ts: number; // Unix timestamp in milliseconds
  bid?: string;
  ask?: string;
  last?: string;
  size?: string;
  side?: "b" | "s";
  type: "book" | "trade";
}

// Candle data structure
export interface Candle {
  pair: Pair;
  tf: "1s" | "5s" | "1m" | "5m";
  t: number; // open timestamp
  o: string; // open
  h: string; // high
  l: string; // low
  c: string; // close
  v: string; // volume
  vwap: string;
}

// Venue state for compositor
export interface VenueState {
  venue: Venue;
  pair: Pair;
  bid: string;
  ask: string;
  mid: string;
  spreadBps: number;
  ageMs: number;
  lastUpdate: number;
}

// Configuration types
export interface SymbolMapping {
  binance: string;
  coinbase: string;
  kraken: string;
}

export interface AppConfig {
  port: number;
  pairs: Pair[];
  spreadBpsMax: number;
  staleMs: number;
  walletAddress: string;
  privateKey?: string;
  network: string;
  facilitatorUrl: string;
}

// Zod schemas for validation
export const PairSchema = z.string().regex(/^[A-Z0-9]+-(?:USD|USDT|USDC)$/);

export const QuoteSchema = z.object({
  pair: PairSchema,
  price: z.string(),
  bid: z.string(),
  ask: z.string(),
  vwap_30s: z.string(),
  source_count: z.number(),
  staleness_ms: z.number(),
  venues: z.array(
    z.object({
      name: z.string(),
      w: z.number(),
      mid: z.string(),
      spread_bps: z.number(),
      age_ms: z.number(),
    })
  ),
  updated_at: z.string(),
});

export const NormalizedTickSchema = z.object({
  venue: z.enum(["binance", "coinbase", "kraken"]),
  pair: PairSchema,
  ts: z.number(),
  bid: z.string().optional(),
  ask: z.string().optional(),
  last: z.string().optional(),
  size: z.string().optional(),
  side: z.enum(["b", "s"]).optional(),
  type: z.enum(["book", "trade"]),
});

// Error types
export class StaleDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StaleDataError";
  }
}

export class InsufficientDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InsufficientDataError";
  }
}

export class VenueConnectionError extends Error {
  constructor(venue: Venue, message: string) {
    super(`[${venue}] ${message}`);
    this.name = "VenueConnectionError";
  }
}
