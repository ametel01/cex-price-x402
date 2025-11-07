/**
 * x402 Payment Verification Endpoint
 * Verifies payment validity without submitting on-chain
 */

import { verify } from "x402/facilitator";
import type { PaymentPayload, PaymentRequirements, VerifyResponse } from "x402/types";
import {
  PaymentPayloadSchema,
  PaymentRequirementsSchema,
  SupportedEVMNetworks,
  SupportedSVMNetworks,
  createConnectedClient,
  createSigner,
} from "x402/types";
import { createPublicClient, http, type Chain } from "viem";
import { publicActions } from "viem";
import { baseSepolia, base, avalanche, avalancheFuji, polygon, polygonAmoy } from "viem/chains";

interface VerifyRequest {
  paymentPayload: PaymentPayload;
  paymentRequirements: PaymentRequirements;
}

/**
 * Get RPC URL for a given network from environment variables
 */
function getRpcUrl(network: string): string | undefined {
  const envKey = `${network.toUpperCase().replace(/-/g, "_")}_RPC_URL`;
  return process.env[envKey];
}

/**
 * Map network name to viem chain
 */
function getChain(network: string): Chain {
  switch (network) {
    case "base-sepolia":
      return baseSepolia;
    case "base":
      return base;
    case "avalanche":
      return avalanche;
    case "avalanche-fuji":
      return avalancheFuji;
    case "polygon":
      return polygon;
    case "polygon-amoy":
      return polygonAmoy;
    default:
      throw new Error(`Unsupported network: ${network}`);
  }
}

/**
 * Create a connected client with custom RPC URL if available
 */
function createClientWithRpc(network: string) {
  const rpcUrl = getRpcUrl(network);
  if (rpcUrl) {
    console.log(`[Facilitator] Using custom RPC URL for ${network}: ${rpcUrl}`);
    const chain = getChain(network);
    return createPublicClient({
      chain,
      transport: http(rpcUrl),
    }).extend(publicActions);
  }
  // Fall back to default client
  return createConnectedClient(network);
}

/**
 * Handles POST requests to verify x402 payments
 */
export async function handleVerifyRequest(req: Request): Promise<Response> {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return Response.json(
      {
        isValid: false,
        invalidReason: "invalid_payload",
      } as VerifyResponse,
      { status: 400 }
    );
  }

  const typedBody = body as VerifyRequest;
  const network = typedBody.paymentRequirements?.network;

  if (!network) {
    return Response.json(
      {
        isValid: false,
        invalidReason: "invalid_network",
      } as VerifyResponse,
      { status: 400 }
    );
  }

  // Create appropriate client based on network type
  let client;
  if (SupportedEVMNetworks.includes(network)) {
    // Use custom RPC URL if available in env
    client = createClientWithRpc(network);
  } else if (SupportedSVMNetworks.includes(network)) {
    const solanaKey = process.env.SOLANA_PRIVATE_KEY;
    if (!solanaKey) {
      return Response.json(
        {
          isValid: false,
          invalidReason: "invalid_network",
        } as VerifyResponse,
        { status: 400 }
      );
    }
    client = await createSigner(network, solanaKey);
  }

  if (!client) {
    return Response.json(
      {
        isValid: false,
        invalidReason: "invalid_network",
      } as VerifyResponse,
      { status: 400 }
    );
  }

  // Validate payment payload
  let paymentPayload: PaymentPayload;
  try {
    paymentPayload = PaymentPayloadSchema.parse(typedBody.paymentPayload);
  } catch (error) {
    console.error("Invalid payment payload:", error);
    return Response.json(
      {
        isValid: false,
        invalidReason: "invalid_payload",
        payer:
          typedBody.paymentPayload?.payload && "authorization" in typedBody.paymentPayload.payload
            ? typedBody.paymentPayload.payload.authorization.from
            : "",
      } as VerifyResponse,
      { status: 400 }
    );
  }

  // Validate payment requirements
  let paymentRequirements: PaymentRequirements;
  try {
    paymentRequirements = PaymentRequirementsSchema.parse(typedBody.paymentRequirements);
  } catch (error) {
    console.error("Invalid payment requirements:", error);
    return Response.json(
      {
        isValid: false,
        invalidReason: "invalid_payment_requirements",
        payer:
          "authorization" in paymentPayload.payload
            ? paymentPayload.payload.authorization.from
            : "",
      } as VerifyResponse,
      { status: 400 }
    );
  }

  // Verify the payment
  try {
    console.log("[Facilitator] Calling x402 verify() with:");
    console.log("  Network:", network);
    console.log("  Payment scheme:", paymentPayload.scheme);
    console.log("  Amount required:", paymentRequirements.maxAmountRequired);
    console.log("  Payment payload:", JSON.stringify(paymentPayload, null, 2));

    const result = await verify(client, paymentPayload, paymentRequirements);

    console.log("[Facilitator] Verify result:", JSON.stringify(result, null, 2));

    if (!result.isValid) {
      console.error("[Facilitator] Verification failed:", result.invalidReason);
      console.error("[Facilitator] Payer:", result.payer);
    }

    return Response.json(result);
  } catch (error) {
    console.error("[Facilitator] Error verifying payment:", error);
    if (error instanceof Error) {
      console.error("[Facilitator] Error message:", error.message);
      console.error("[Facilitator] Error stack:", error.stack);
    }
    return Response.json(
      {
        isValid: false,
        invalidReason: "unexpected_verify_error",
        payer:
          "authorization" in paymentPayload.payload
            ? paymentPayload.payload.authorization.from
            : "",
      } as VerifyResponse,
      { status: 500 }
    );
  }
}

/**
 * Provides API documentation for the verify endpoint
 */
export function handleVerifyGetRequest(): Response {
  return Response.json({
    endpoint: "/facilitator/verify",
    method: "POST",
    description: "Verify x402 payment validity without submitting on-chain",
    body: {
      paymentPayload: "PaymentPayload (x402 signed payment)",
      paymentRequirements: "PaymentRequirements (payment criteria)",
    },
    response: {
      isValid: "boolean",
      invalidReason: "string (optional, error reason if invalid)",
      payer: "string (optional, payer address)",
    },
  });
}
