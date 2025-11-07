/**
 * x402 Supported Payment Methods Endpoint
 * Returns the payment schemes and networks the facilitator supports
 */

import type { SupportedPaymentKindsResponse } from "x402/types";
import { getConfig } from "../config/env";

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
        network: config.network as any,
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
