/**
 * Payment requirements builder for x402 middleware
 */

import type { PaymentRequirements } from "x402/types";
import type { RoutePattern } from "./types";
import { getConfig } from "../config/env";

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
 * Build payment requirements from route pattern
 */
export function buildPaymentRequirements(
  route: RoutePattern,
  walletAddress: string,
  resource: string
): PaymentRequirements {
  const config = getConfig();
  const routeConfig = route.config;

  // Parse price to atomic units (USDC has 6 decimals)
  let maxAmountRequired: string;
  let price = routeConfig.price;

  if (typeof price === "string") {
    // Handle "$0.01" format
    if (price.startsWith("$")) {
      price = price.substring(1);
    }
    const priceNum = parseFloat(price);
    maxAmountRequired = Math.floor(priceNum * 1_000_000).toString();
  } else {
    // Handle numeric format (e.g., 0.01)
    maxAmountRequired = Math.floor(price * 1_000_000).toString();
  }

  // Get USDC address for the network (this is a simplified version)
  // In production, you'd use the x402 SDK's getDefaultAsset function
  const asset = getUsdcAddressForNetwork(config.network);

  // Get USDC contract metadata for EIP-712 domain
  const usdcMetadata = getUsdcMetadata(config.network);

  return {
    scheme: "exact",
    network: config.network as SupportedNetwork,
    maxAmountRequired,
    resource,
    description: routeConfig.description || `Access to ${resource}`,
    mimeType: routeConfig.mimeType || "application/json",
    payTo: walletAddress,
    maxTimeoutSeconds: 60,
    asset: asset,
    // Include USDC contract metadata so client and server use same EIP-712 domain
    extra: usdcMetadata,
  };
}

/**
 * Get USDC address for network
 * This is a simplified mapping - in production use x402 SDK's getUsdcChainConfigForChain
 */
function getUsdcAddressForNetwork(network: string): string {
  const usdcAddresses: Record<string, string> = {
    "base-sepolia": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "polygon-amoy": "0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582",
    polygon: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    avalanche: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    "avalanche-fuji": "0x5425890298aed601595a70AB815c96711a31Bc65",
  };

  return usdcAddresses[network] ?? "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
}

/**
 * Get USDC contract metadata for EIP-712 domain
 * These values MUST match what's on-chain for signature verification to work
 */
function getUsdcMetadata(network: string): { name: string; version: string } {
  // These values come from calling name() and version() on the USDC contracts
  const metadata: Record<string, { name: string; version: string }> = {
    "base-sepolia": {
      name: "USDC",
      version: "2",
    },
    base: {
      name: "USD Coin",
      version: "2",
    },
    "polygon-amoy": {
      name: "USDC",
      version: "2",
    },
    polygon: {
      name: "USD Coin",
      version: "2",
    },
    avalanche: {
      name: "USD Coin",
      version: "1",
    },
    "avalanche-fuji": {
      name: "USD Coin",
      version: "1",
    },
  };

  return metadata[network] ?? { name: "USDC", version: "2" };
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
