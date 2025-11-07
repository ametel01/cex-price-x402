/**
 * Decimal utilities for precise financial calculations
 */

import Decimal from "decimal.js";

// Configure Decimal.js for financial precision
Decimal.set({
  precision: 38, // Enough for blockchain amounts
  rounding: Decimal.ROUND_HALF_UP,
});

/**
 * Calculate mid price from bid and ask
 */
export function calculateMid(bid: string, ask: string): string {
  const bidDecimal = new Decimal(bid);
  const askDecimal = new Decimal(ask);
  return bidDecimal.plus(askDecimal).div(2).toString();
}

/**
 * Calculate spread in basis points
 */
export function calculateSpreadBps(bid: string, ask: string): number {
  const bidDecimal = new Decimal(bid);
  const askDecimal = new Decimal(ask);
  const mid = bidDecimal.plus(askDecimal).div(2);

  if (mid.isZero()) {
    return 0;
  }

  const spread = askDecimal.minus(bidDecimal);
  return spread.div(mid).mul(10000).toNumber();
}

/**
 * Calculate weighted average
 */
export function calculateWeightedAverage(values: string[], weights: number[]): string {
  if (values.length !== weights.length) {
    throw new Error("Values and weights arrays must have same length");
  }

  if (values.length === 0) {
    throw new Error("Cannot calculate weighted average of empty array");
  }

  let sum = new Decimal(0);
  let weightSum = 0;

  for (let i = 0; i < values.length; i++) {
    const val = values[i];
    const wt = weights[i];
    if (val === undefined || wt === undefined) {
      throw new Error("Invalid array access");
    }
    const value = new Decimal(val);
    sum = sum.plus(value.mul(wt));
    weightSum += wt;
  }

  if (weightSum === 0) {
    throw new Error("Sum of weights cannot be zero");
  }

  return sum.div(weightSum).toString();
}

/**
 * Calculate VWAP (Volume-Weighted Average Price)
 */
export function calculateVWAP(prices: string[], volumes: string[]): string {
  if (prices.length !== volumes.length) {
    throw new Error("Prices and volumes arrays must have same length");
  }

  if (prices.length === 0) {
    throw new Error("Cannot calculate VWAP of empty arrays");
  }

  let totalValue = new Decimal(0);
  let totalVolume = new Decimal(0);

  for (let i = 0; i < prices.length; i++) {
    const priceStr = prices[i];
    const volumeStr = volumes[i];
    if (priceStr === undefined || volumeStr === undefined) {
      throw new Error("Invalid array access");
    }
    const price = new Decimal(priceStr);
    const volume = new Decimal(volumeStr);
    totalValue = totalValue.plus(price.mul(volume));
    totalVolume = totalVolume.plus(volume);
  }

  if (totalVolume.isZero()) {
    throw new Error("Total volume cannot be zero");
  }

  return totalValue.div(totalVolume).toString();
}

/**
 * Find minimum value
 */
export function min(...values: string[]): string {
  if (values.length === 0) {
    throw new Error("Cannot find min of empty array");
  }

  return Decimal.min(...values.map((v) => new Decimal(v))).toString();
}

/**
 * Find maximum value
 */
export function max(...values: string[]): string {
  if (values.length === 0) {
    throw new Error("Cannot find max of empty array");
  }

  return Decimal.max(...values.map((v) => new Decimal(v))).toString();
}

/**
 * Check if value is within tolerance
 */
export function isWithinTolerance(value: string, target: string, toleranceBps: number): boolean {
  const valueDecimal = new Decimal(value);
  const targetDecimal = new Decimal(target);

  if (targetDecimal.isZero()) {
    return valueDecimal.isZero();
  }

  const diff = valueDecimal.minus(targetDecimal).abs();
  const tolerance = targetDecimal.abs().mul(toleranceBps).div(10000);

  return diff.lte(tolerance);
}

/**
 * Format price for display (limited decimal places)
 */
export function formatPrice(price: string, decimals: number = 2): string {
  return new Decimal(price).toFixed(decimals);
}

/**
 * Convert to atomic units (multiply by 10^decimals)
 */
export function toAtomicUnits(amount: string, decimals: number): string {
  return new Decimal(amount).mul(new Decimal(10).pow(decimals)).toFixed(0);
}

/**
 * Convert from atomic units (divide by 10^decimals)
 */
export function fromAtomicUnits(amount: string, decimals: number): string {
  return new Decimal(amount).div(new Decimal(10).pow(decimals)).toString();
}

export { Decimal };
