/**
 * Tests for x402 payment verification endpoint
 */

import { test, expect, describe, beforeEach } from "bun:test";
import { handleVerifyRequest } from "./verify";

describe("handleVerifyRequest", () => {
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
    const req = new Request("http://localhost/facilitator/verify", {
      method: "POST",
      body: "invalid json",
    });

    const response = await handleVerifyRequest(req);
    expect(response.status).toBe(400);

    const data = (await response.json()) as any;
    expect(data.isValid).toBe(false);
    expect(data.invalidReason).toBe("invalid_payload");
  });

  test("returns error when network is missing", async () => {
    const req = new Request("http://localhost/facilitator/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentPayload: validPayload,
        paymentRequirements: {},
      }),
    });

    const response = await handleVerifyRequest(req);
    expect(response.status).toBe(400);

    const data = (await response.json()) as any;
    expect(data.isValid).toBe(false);
    expect(data.invalidReason).toBe("invalid_network");
  });

  test("returns error when SOLANA_PRIVATE_KEY is missing for Solana network", async () => {
    delete process.env.SOLANA_PRIVATE_KEY;

    const solanaRequirements = {
      ...validRequirements,
      network: "solana-devnet",
    };

    const solanaPayload = {
      ...validPayload,
      network: "solana-devnet",
    };

    const req = new Request("http://localhost/facilitator/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentPayload: solanaPayload,
        paymentRequirements: solanaRequirements,
      }),
    });

    const response = await handleVerifyRequest(req);
    expect(response.status).toBe(400);

    const data = (await response.json()) as any;
    expect(data.isValid).toBe(false);
    expect(data.invalidReason).toBe("invalid_network");
  });

  test("returns error when client creation fails (unsupported network)", async () => {
    const unsupportedRequirements = {
      ...validRequirements,
      network: "unsupported-network",
    };

    const unsupportedPayload = {
      ...validPayload,
      network: "unsupported-network",
    };

    const req = new Request("http://localhost/facilitator/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentPayload: unsupportedPayload,
        paymentRequirements: unsupportedRequirements,
      }),
    });

    const response = await handleVerifyRequest(req);
    expect(response.status).toBe(400);

    const data = (await response.json()) as any;
    expect(data.isValid).toBe(false);
    expect(data.invalidReason).toBe("invalid_network");
  });

  test("returns error when payment payload is completely invalid", async () => {
    const req = new Request("http://localhost/facilitator/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentPayload: null, // Completely invalid
        paymentRequirements: validRequirements,
      }),
    });

    const response = await handleVerifyRequest(req);
    expect(response.status).toBe(400);

    const data = (await response.json()) as any;
    expect(data.isValid).toBe(false);
    expect(data.invalidReason).toBe("invalid_payload");
  });

  test("returns error when payment requirements are invalid", async () => {
    const req = new Request("http://localhost/facilitator/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentPayload: validPayload,
        paymentRequirements: { network: "base-sepolia", invalid: "data" },
      }),
    });

    const response = await handleVerifyRequest(req);
    expect(response.status).toBe(400);

    const data = (await response.json()) as any;
    expect(data.isValid).toBe(false);
    // Payload validation happens first, so we get invalid_payload
    expect(data.invalidReason).toBe("invalid_payload");
  });

  // Note: Testing the actual verify() call would require creating valid x402 payloads
  // which is complex. The main error paths are covered by the tests above.
});
