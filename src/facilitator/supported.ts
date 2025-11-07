/**
 * x402 Supported Payment Methods Endpoint
 * Returns the payment schemes and networks the facilitator supports
 */

import type { SupportedPaymentKindsResponse } from "x402/types";
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
 * Handles GET requests to list supported payment methods
 */
export function handleSupportedRequest(): Response {
  const config = getConfig();

  const response: SupportedPaymentKindsResponse = {
    kinds: [
      {
        x402Version: 1,
        scheme: "exact",
        network: config.network as SupportedNetwork,
      },
    ],
  };

  // Add Solana support if SOLANA_PRIVATE_KEY is configured
  if (process.env.SOLANA_PRIVATE_KEY) {
    response.kinds.push({
      x402Version: 1,
      scheme: "exact",
      network: "solana-devnet",
      extra: {
        feePayer: process.env.SOLANA_ADDRESS,
      },
    });
  }

  return Response.json(response);
}
