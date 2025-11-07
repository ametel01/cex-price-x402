/**
 * x402 Payment Settlement Endpoint
 * Submits payment transaction on-chain
 */

import { settle } from "x402/facilitator";
import type { PaymentPayload, PaymentRequirements, SettleResponse } from "x402/types";
import {
  PaymentPayloadSchema,
  PaymentRequirementsSchema,
  SupportedEVMNetworks,
  SupportedSVMNetworks,
  createSigner,
} from "x402/types";

interface SettleRequest {
  paymentPayload: PaymentPayload;
  paymentRequirements: PaymentRequirements;
}

/**
 * Handles POST requests to settle x402 payments
 */
export async function handleSettleRequest(req: Request): Promise<Response> {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return Response.json(
      {
        success: false,
        errorReason: "invalid_payload",
        transaction: "",
        network: "base-sepolia",
      } as SettleResponse,
      { status: 400 }
    );
  }

  const typedBody = body as SettleRequest;
  const network = typedBody.paymentRequirements?.network;

  if (!network) {
    return Response.json(
      {
        success: false,
        errorReason: "invalid_network",
        transaction: "",
        network: "base-sepolia",
      } as SettleResponse,
      { status: 400 }
    );
  }

  // Get appropriate private key
  const privateKey = SupportedEVMNetworks.includes(network)
    ? process.env.PRIVATE_KEY
    : SupportedSVMNetworks.includes(network)
      ? process.env.SOLANA_PRIVATE_KEY
      : undefined;

  if (!privateKey) {
    console.error(`Missing private key for network: ${network}`);
    return Response.json(
      {
        success: false,
        errorReason: "invalid_network",
        transaction: "",
        network,
      } as SettleResponse,
      { status: 400 }
    );
  }

  // Create signer wallet
  let wallet;
  try {
    wallet = await createSigner(network, privateKey);
  } catch (error) {
    console.error("Failed to create signer:", error);
    return Response.json(
      {
        success: false,
        errorReason: "invalid_network",
        transaction: "",
        network,
      } as SettleResponse,
      { status: 500 }
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
        success: false,
        errorReason: "invalid_payload",
        transaction: "",
        network: typedBody.paymentPayload?.network || network,
      } as SettleResponse,
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
        success: false,
        errorReason: "invalid_payment_requirements",
        transaction: "",
        network: paymentPayload.network,
      } as SettleResponse,
      { status: 400 }
    );
  }

  // Settle the payment
  try {
    const result = await settle(wallet, paymentPayload, paymentRequirements);
    return Response.json(result);
  } catch (error) {
    console.error("Error settling payment:", error);
    return Response.json(
      {
        success: false,
        errorReason: "unexpected_settle_error",
        transaction: "",
        network: paymentPayload.network,
      } as SettleResponse,
      { status: 500 }
    );
  }
}

/**
 * Provides API documentation for the settle endpoint
 */
export function handleSettleGetRequest(): Response {
  return Response.json({
    endpoint: "/facilitator/settle",
    method: "POST",
    description: "Settle x402 payment on-chain",
    body: {
      paymentPayload: "PaymentPayload (x402 signed payment)",
      paymentRequirements: "PaymentRequirements (payment criteria)",
    },
    response: {
      success: "boolean",
      errorReason: "string (optional, error reason if failed)",
      transaction: "string (transaction hash)",
      network: "string (network name)",
      payer: "string (optional, payer address)",
    },
  });
}
