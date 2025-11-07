/**
 * CEX Price API with x402 Micropayments
 * Main server entry point
 */

import { getConfig } from "./src/config/env";
import { protectedRoutes } from "./src/config/routes";
import { createX402Middleware } from "./src/middleware";
import {
  handleVerifyRequest,
  handleVerifyGetRequest,
  handleSettleRequest,
  handleSettleGetRequest,
  handleSupportedRequest,
} from "./src/facilitator";
import {
  handleHealthRequest,
  handleSymbolsRequest,
  handlePriceRequest,
  handleQuotesRequest,
} from "./src/api";
import { MemoryCache } from "./src/cache/memory";
import { Compositor } from "./src/compositor";
import { BinanceAdapter } from "./src/adapters";

// Load configuration
const config = getConfig();

// Initialize cache and compositor
const cache = new MemoryCache();
const compositor = new Compositor(cache, { minVenues: 1 });

// Initialize Binance adapter
const binanceAdapter = new BinanceAdapter(config.pairs, (tick) => {
  cache.set(tick);
});

// Start adapter connection
console.log("📡 Connecting to Binance...");
binanceAdapter
  .connect()
  .then(() => {
    console.log("✅ Binance connected");
  })
  .catch((error) => {
    console.error("❌ Failed to connect to Binance:", error);
  });

// Create x402 middleware
const x402Middleware = createX402Middleware(config.walletAddress, protectedRoutes, {
  facilitatorUrl: config.facilitatorUrl,
  walletAddress: config.walletAddress,
});

// Start server
const server = Bun.serve({
  port: config.port,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;
    const method = req.method;

    // CORS headers for development
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-PAYMENT",
    };

    // Handle preflight requests
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Facilitator endpoints (unprotected)
    if (pathname === "/facilitator/verify") {
      if (method === "POST") {
        const response = await handleVerifyRequest(req);
        return addCorsHeaders(response, corsHeaders);
      }
      if (method === "GET") {
        const response = handleVerifyGetRequest();
        return addCorsHeaders(response, corsHeaders);
      }
    }

    if (pathname === "/facilitator/settle") {
      if (method === "POST") {
        const response = await handleSettleRequest(req);
        return addCorsHeaders(response, corsHeaders);
      }
      if (method === "GET") {
        const response = handleSettleGetRequest();
        return addCorsHeaders(response, corsHeaders);
      }
    }

    if (pathname === "/facilitator/supported" && method === "GET") {
      const response = handleSupportedRequest();
      return addCorsHeaders(response, corsHeaders);
    }

    // Health check (unprotected)
    if (pathname === "/v1/health" && method === "GET") {
      const response = handleHealthRequest();
      return addCorsHeaders(response, corsHeaders);
    }

    // Symbols list (unprotected)
    if (pathname === "/v1/symbols" && method === "GET") {
      const response = handleSymbolsRequest();
      return addCorsHeaders(response, corsHeaders);
    }

    // Check x402 middleware for protected routes
    const middlewareResponse = await x402Middleware(req, pathname, method);
    if (middlewareResponse) {
      return addCorsHeaders(middlewareResponse, corsHeaders);
    }

    // Protected endpoints (after x402 verification)
    if (pathname === "/v1/price" && method === "GET") {
      const response = handlePriceRequest(req, compositor);
      return addCorsHeaders(response, corsHeaders);
    }

    if (pathname === "/v1/quotes" && method === "GET") {
      const response = handleQuotesRequest(req, compositor);
      return addCorsHeaders(response, corsHeaders);
    }

    // 404 for unknown routes
    const response = Response.json({ error: "Not Found" }, { status: 404 });
    return addCorsHeaders(response, corsHeaders);
  },
});

// Helper to add CORS headers to response
function addCorsHeaders(response: Response, corsHeaders: Record<string, string>): Response {
  const newHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

console.log(`🚀 CEX Price API with x402 Micropayments`);
console.log(`📡 Server running on http://localhost:${server.port}`);
console.log(`💰 Wallet: ${config.walletAddress}`);
console.log(`🌐 Network: ${config.network}`);
console.log(`📊 Tracking pairs: ${config.pairs.join(", ")}`);
console.log();
console.log(`Endpoints:`);
console.log(`  GET  /v1/health           - Health check (free)`);
console.log(`  GET  /v1/symbols          - List trading pairs (free)`);
console.log(`  GET  /v1/price?pair=...   - Get price ($0.01)`);
console.log(`  GET  /v1/quotes?pairs=... - Get multiple quotes ($0.02)`);
console.log();
console.log(`Facilitator:`);
console.log(`  POST /facilitator/verify    - Verify payment`);
console.log(`  POST /facilitator/settle    - Settle payment`);
console.log(`  GET  /facilitator/supported - List supported methods`);

// Cleanup on shutdown
function shutdown() {
  console.log("\n🛑 Shutting down...");

  // Stop accepting new connections
  server.stop();

  // Disconnect adapters
  binanceAdapter.disconnect();

  // Clear cache
  cache.clear();

  console.log("✅ Cleanup complete");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
