/**
 * x402 Payment Middleware for Bun.serve
 * Protects routes with micropayment requirements
 */

import type { RoutesConfig, X402MiddlewareOptions, RoutePattern } from "./types";
import { computeRoutePatterns, findMatchingRoute } from "./route-matcher";
import { buildPaymentRequirements } from "./payment-requirements";
import { safeBase64Decode } from "x402/shared";

/**
 * Creates x402 middleware for Bun.serve
 */
export function createX402Middleware(
  walletAddress: string,
  routes: RoutesConfig,
  options: X402MiddlewareOptions
) {
  const routePatterns = computeRoutePatterns(routes);

  return async (req: Request, pathname: string, method: string): Promise<Response | null> => {
    const matchingRoute = findMatchingRoute(routePatterns, pathname, method);

    if (!matchingRoute) {
      // Not a protected route
      return null;
    }

    // Check for X-PAYMENT header
    const paymentHeader = req.headers.get("X-PAYMENT");

    if (!paymentHeader) {
      // No payment provided, return 402 with payment requirements
      return create402Response(matchingRoute, walletAddress, req.url);
    }

    // Verify payment with facilitator
    const isValid = await verifyPayment(
      paymentHeader,
      matchingRoute,
      walletAddress,
      req.url,
      options
    );

    if (!isValid) {
      return new Response(
        JSON.stringify({
          x402Version: 1,
          error: "invalid_payment",
          accepts: [buildPaymentRequirements(matchingRoute, walletAddress, req.url)],
        }),
        {
          status: 402,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Payment valid, allow request to continue
    return null;
  };
}

/**
 * Create a 402 Payment Required response
 */
function create402Response(route: RoutePattern, walletAddress: string, url: string): Response {
  const paymentRequirements = buildPaymentRequirements(route, walletAddress, url);

  return new Response(
    JSON.stringify({
      x402Version: 1,
      error: "payment_required",
      accepts: [paymentRequirements],
    }),
    {
      status: 402,
      headers: { "Content-Type": "application/json" },
    }
  );
}

/**
 * Verify and settle payment with facilitator
 */
async function verifyPayment(
  paymentHeader: string,
  route: RoutePattern,
  walletAddress: string,
  url: string,
  options: X402MiddlewareOptions
): Promise<boolean> {
  try {
    console.log("[x402] Verifying payment...");

    // Decode payment header
    const decoded = safeBase64Decode(paymentHeader);
    const paymentPayload = JSON.parse(decoded);
    console.log("[x402] Payment payload decoded");

    // Build payment requirements
    const paymentRequirements = buildPaymentRequirements(route, walletAddress, url);
    console.log("[x402] Payment requirements:", JSON.stringify(paymentRequirements, null, 2));

    // Call facilitator verify endpoint
    console.log("[x402] Calling facilitator at:", `${options.facilitatorUrl}/verify`);
    const verifyResponse = await fetch(`${options.facilitatorUrl}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentPayload,
        paymentRequirements,
      }),
    });

    console.log("[x402] Facilitator verify response status:", verifyResponse.status);

    if (!verifyResponse.ok) {
      const errorBody = await verifyResponse.text();
      console.error("[x402] Facilitator verify failed:", verifyResponse.status, errorBody);
      return false;
    }

    const verifyResult = (await verifyResponse.json()) as { isValid: boolean; invalidReason?: string };
    console.log("[x402] Verification result:", verifyResult);

    if (!verifyResult.isValid) {
      return false;
    }

    // IMPORTANT: Settle the payment on-chain to actually claim the funds
    console.log("[x402] Payment verified, settling on-chain...");
    const settleResponse = await fetch(`${options.facilitatorUrl}/settle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentPayload,
        paymentRequirements,
      }),
    });

    console.log("[x402] Facilitator settle response status:", settleResponse.status);

    if (!settleResponse.ok) {
      const errorBody = await settleResponse.text();
      console.error("[x402] Facilitator settle failed:", settleResponse.status, errorBody);
      return false;
    }

    const settleResult = (await settleResponse.json()) as {
      success: boolean;
      errorReason?: string;
      transaction?: string;
      payer?: string;
    };
    console.log("[x402] Settlement result:", settleResult);

    if (!settleResult.success) {
      console.error("[x402] Settlement failed:", settleResult.errorReason);
      return false;
    }

    console.log("[x402] ✅ Payment settled! TX:", settleResult.transaction);
    return true;
  } catch (error) {
    console.error("[x402] Error verifying/settling payment:", error);
    return false;
  }
}
