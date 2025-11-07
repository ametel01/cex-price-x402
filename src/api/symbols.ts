/**
 * Symbols endpoint - returns supported trading pairs
 */

import { getSupportedPairs } from "../config/symbols";

export function handleSymbolsRequest(): Response {
  const pairs = getSupportedPairs();

  return Response.json({
    symbols: pairs,
    count: pairs.length,
  });
}
