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

  test("handleSupportedRequest returns supported payment kinds", async () => {
    const response = handleSupportedRequest();
    expect(response.status).toBe(200);

    const data = (await response.json()) as any;
    expect(data).toHaveProperty("kinds");
    expect(Array.isArray(data.kinds)).toBe(true);
    expect(data.kinds.length).toBeGreaterThan(0);

    const firstKind = data.kinds[0];
    expect(firstKind).toHaveProperty("x402Version");
    expect(firstKind).toHaveProperty("scheme");
    expect(firstKind).toHaveProperty("network");
    expect(firstKind.x402Version).toBe(1);
    expect(firstKind.scheme).toBe("exact");
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
