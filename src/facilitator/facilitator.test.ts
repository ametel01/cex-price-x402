/**
 * Tests for x402 facilitator endpoints
 */

import { test, expect, describe } from "bun:test";
import { handleVerifyGetRequest, handleSettleGetRequest, handleSupportedRequest } from "./index";

describe("Facilitator endpoints", () => {
  test("handleVerifyGetRequest returns documentation", () => {
    const response = handleVerifyGetRequest();
    expect(response.status).toBe(200);
  });

  test("handleSettleGetRequest returns documentation", () => {
    const response = handleSettleGetRequest();
    expect(response.status).toBe(200);
  });

  test("handleSupportedRequest returns supported payment methods", async () => {
    const response = handleSupportedRequest();
    expect(response.status).toBe(200);

    const data = (await response.json()) as any;
    expect(data).toHaveProperty("methods");
    expect(Array.isArray(data.methods)).toBe(true);
    expect(data.methods.length).toBeGreaterThan(0);

    const firstMethod = data.methods[0];
    expect(firstMethod).toHaveProperty("network");
    expect(firstMethod).toHaveProperty("token");
    expect(firstMethod).toHaveProperty("address");
    expect(firstMethod).toHaveProperty("min");
    expect(firstMethod).toHaveProperty("max");
    expect(firstMethod.token).toBe("USDC");
    expect(firstMethod.address).toMatch(/^0x[a-fA-F0-9]{40}$/); // Valid Ethereum address
  });

  test("handleVerifyGetRequest structure", async () => {
    const response = handleVerifyGetRequest();
    const data = (await response.json()) as any;

    expect(data).toHaveProperty("endpoint");
    expect(data).toHaveProperty("method");
    expect(data).toHaveProperty("description");
    expect(data).toHaveProperty("body");
    expect(data.method).toBe("POST");
  });

  test("handleSettleGetRequest structure", async () => {
    const response = handleSettleGetRequest();
    const data = (await response.json()) as any;

    expect(data).toHaveProperty("endpoint");
    expect(data).toHaveProperty("method");
    expect(data).toHaveProperty("description");
    expect(data).toHaveProperty("body");
    expect(data.method).toBe("POST");
  });
});
