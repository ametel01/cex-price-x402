/**
 * Price endpoint handler
 * Returns real-time price quotes for trading pairs
 * Protected by x402 micropayments
 */

import type { Compositor } from "../compositor";
import type { Pair } from "../types";
import { PairSchema } from "../types";

/**
 * Handle GET /v1/price?pair=BTC-USD
 * Returns a single quote for the specified pair
 */
export function handlePriceRequest(
  req: Request,
  compositor: Compositor
): Response {
  const url = new URL(req.url);
  const pairParam = url.searchParams.get("pair");

  if (!pairParam) {
    return Response.json(
      { error: "Missing required parameter: pair" },
      { status: 400 }
    );
  }

  // Validate pair format
  const pairValidation = PairSchema.safeParse(pairParam);
  if (!pairValidation.success) {
    return Response.json(
      { error: "Invalid pair format. Expected format: BTC-USD, ETH-USD, etc." },
      { status: 400 }
    );
  }

  const pair = pairParam as Pair;

  // Get quote from compositor
  const quote = compositor.getQuote(pair);

  if (!quote) {
    return Response.json(
      {
        error: "No data available for pair",
        pair,
        reason: "Insufficient fresh data from venues",
      },
      { status: 503 }
    );
  }

  return Response.json(quote);
}

/**
 * Handle GET /v1/quotes?pairs=BTC-USD,ETH-USD
 * Returns quotes for multiple pairs
 */
export function handleQuotesRequest(
  req: Request,
  compositor: Compositor
): Response {
  const url = new URL(req.url);
  const pairsParam = url.searchParams.get("pairs");

  // If no pairs specified, return all available quotes
  if (!pairsParam) {
    const quotes = compositor.getAllQuotes();
    return Response.json({
      quotes,
      count: quotes.length,
    });
  }

  // Parse and validate pairs
  const pairStrings = pairsParam.split(",").map((p) => p.trim());
  const validPairs: Pair[] = [];
  const invalidPairs: string[] = [];

  for (const pairString of pairStrings) {
    const validation = PairSchema.safeParse(pairString);
    if (validation.success) {
      validPairs.push(pairString as Pair);
    } else {
      invalidPairs.push(pairString);
    }
  }

  if (invalidPairs.length > 0) {
    return Response.json(
      {
        error: "Invalid pair format",
        invalidPairs,
        message: "Expected format: BTC-USD, ETH-USD, etc.",
      },
      { status: 400 }
    );
  }

  // Get quotes for all valid pairs
  const quotes = compositor.getQuotes(validPairs);

  return Response.json({
    quotes,
    count: quotes.length,
    requested: validPairs.length,
  });
}
