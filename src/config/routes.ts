/**
 * Protected routes configuration for x402 middleware
 */

import type { RoutesConfig } from "../middleware";

/**
 * Routes that require x402 payment
 */
export const protectedRoutes: RoutesConfig = {
  // Single price quote - $0.01
  "GET /v1/price": {
    price: "$0.01",
    description: "Get real-time price for a single trading pair",
    mimeType: "application/json",
  },

  // Multiple quotes - $0.02
  "GET /v1/quotes": {
    price: "$0.02",
    description: "Get real-time prices for multiple trading pairs",
    mimeType: "application/json",
  },

  // Future: WebSocket streaming would be here
  // Note: WebSocket upgrades need special handling
};
