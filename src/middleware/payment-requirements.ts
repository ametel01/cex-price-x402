/**
 * Payment requirements builder for x402 middleware
 */

import type { RoutePattern } from "./types";
import { getConfig } from "../config/env";
import { randomUUID } from "crypto";

type SupportedNetwork =
  | "abstract"
  | "abstract-testnet"
  | "base-sepolia"
  | "base"
  | "avalanche-fuji"
  | "avalanche"
  | "sei"
  | "sei-testnet"
  | "polygon"
  | "polygon-amoy"
  | "peaq"
  | "iotex"
  | "solana-devnet"
  | "solana";

/**
 * Simplified payment requirements structure
 */
export interface SimplifiedPaymentRequirements {
  network: string;
  token: string;
  receiver: string;
  amount: string;
  id: string;
  description: string;
}

/**
 * Build payment requirements from route pattern
 */
export function buildPaymentRequirements(
  route: RoutePattern,
  walletAddress: string,
  resource: string
): SimplifiedPaymentRequirements {
  const config = getConfig();
  const routeConfig = route.config;

  // Parse price to atomic units (USDC has 6 decimals)
  let amount: string;
  let price = routeConfig.price;

  if (typeof price === "string") {
    // Handle "$0.01" format
    if (price.startsWith("$")) {
      price = price.substring(1);
    }
    const priceNum = parseFloat(price);
    amount = Math.floor(priceNum * 1_000_000).toString();
  } else {
    // Handle numeric format (e.g., 0.01)
    amount = Math.floor(price * 1_000_000).toString();
  }

  // Generate unique request ID
  const id = randomUUID();

  return {
    network: config.network as SupportedNetwork,
    token: "USDC",
    receiver: walletAddress,
    amount,
    id,
    description: routeConfig.description || `Access to ${resource}`,
  };
}

/**
 * Parse price from string or number to atomic units
 */
export function parsePrice(price: string | number): string {
  if (typeof price === "string") {
    // Handle "$0.01" format
    if (price.startsWith("$")) {
      price = price.substring(1);
    }
    const priceNum = parseFloat(price);
    return Math.floor(priceNum * 1_000_000).toString();
  }
  // Handle numeric format
  return Math.floor(price * 1_000_000).toString();
}
