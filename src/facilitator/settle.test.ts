/**
 * Tests for x402 payment settlement endpoint
 */

import { test, expect, describe, beforeEach } from "bun:test";
import { handleSettleRequest } from "./settle";

describe("handleSettleRequest", () => {
  const validPayload = {
    scheme: "ERC-7682",
    network: "base-sepolia",
    payload: {
      authorization: {
        from: "0x1234567890123456789012345678901234567890",
        amount: "10000",
        validAfter: "0",
        validBefore: "9999999999",
        nonce: "0x1234567890abcdef",
      },
      token: "0xUSDC",
      to: "0x0987654321098765432109876543210987654321",
    },
    signature: "0xabcdef",
  };

  const validRequirements = {
    network: "base-sepolia",
    token: "USDC",
    maxAmountRequired: "10000",
    receiver: "0x0987654321098765432109876543210987654321",
    id: "test-id-123",
  };

  beforeEach(() => {
    process.env.PRIVATE_KEY = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  test("returns error on invalid JSON", async () => {
    const req = new Request("http://localhost/facilitator/settle", {
      method: "POST",
      body: "invalid json",
    });

    const response = await handleSettleRequest(req);
    expect(response.status).toBe(400);

    const data = (await response.json()) as any;
    expect(data.success).toBe(false);
    expect(data.errorReason).toBe("invalid_payload");
  });

  test("returns error when network is missing", async () => {
    const req = new Request("http://localhost/facilitator/settle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentPayload: validPayload,
        paymentRequirements: {},
      }),
    });

    const response = await handleSettleRequest(req);
    expect(response.status).toBe(400);

    const data = (await response.json()) as any;
    expect(data.success).toBe(false);
    expect(data.errorReason).toBe("invalid_network");
  });

  test("returns error when private key is missing for EVM network", async () => {
    delete process.env.PRIVATE_KEY;

    const req = new Request("http://localhost/facilitator/settle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentPayload: validPayload,
        paymentRequirements: validRequirements,
      }),
    });

    const response = await handleSettleRequest(req);
    expect(response.status).toBe(400);

    const data = (await response.json()) as any;
    expect(data.success).toBe(false);
    expect(data.errorReason).toBe("invalid_network");
  });

  test("returns error when private key is missing for Solana network", async () => {
    delete process.env.SOLANA_PRIVATE_KEY;

    const solanaRequirements = {
      ...validRequirements,
      network: "solana-devnet",
    };

    const solanaPayload = {
      ...validPayload,
      network: "solana-devnet",
    };

    const req = new Request("http://localhost/facilitator/settle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentPayload: solanaPayload,
        paymentRequirements: solanaRequirements,
      }),
    });

    const response = await handleSettleRequest(req);
    expect(response.status).toBe(400);

    const data = (await response.json()) as any;
    expect(data.success).toBe(false);
    expect(data.errorReason).toBe("invalid_network");
  });

  test("returns error when signer creation fails", async () => {
    process.env.PRIVATE_KEY = "invalid-key";

    const req = new Request("http://localhost/facilitator/settle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentPayload: validPayload,
        paymentRequirements: validRequirements,
      }),
    });

    const response = await handleSettleRequest(req);
    expect(response.status).toBe(500);

    const data = (await response.json()) as any;
    expect(data.success).toBe(false);
    expect(data.errorReason).toBe("invalid_network");
  });

  test("returns error when payment payload is invalid", async () => {
    const req = new Request("http://localhost/facilitator/settle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentPayload: null, // Completely invalid
        paymentRequirements: validRequirements,
      }),
    });

    const response = await handleSettleRequest(req);
    expect(response.status).toBe(400);

    const data = (await response.json()) as any;
    expect(data.success).toBe(false);
    expect(data.errorReason).toBe("invalid_payload");
  });

  test("returns error when payment requirements are invalid", async () => {
    const req = new Request("http://localhost/facilitator/settle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentPayload: null, // Invalid payload triggers first error
        paymentRequirements: null, // Also invalid - missing network
      }),
    });

    const response = await handleSettleRequest(req);
    expect(response.status).toBe(400);

    const data = (await response.json()) as any;
    expect(data.success).toBe(false);
    // Network check happens first
    expect(data.errorReason).toBe("invalid_network");
  });

  // Note: Testing the actual settle() call would require mocking the x402 library
  // The error paths are covered by the tests above
});
