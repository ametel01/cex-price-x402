/**
 * Tests for environment configuration
 */

import { test, expect, describe, beforeEach, afterEach, mock } from "bun:test";
import { loadConfig, getConfig } from "./env";

describe("Environment configuration", () => {
  const originalEnv = process.env;
  const originalExit = process.exit;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    process.exit = originalExit;
  });

  test("loadConfig returns valid configuration", () => {
    process.env.RESOURCE_WALLET_ADDRESS = "0x1234567890123456789012345678901234567890";
    process.env.PRIVATE_KEY = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    process.env.NETWORK = "base-sepolia";
    process.env.FACILITATOR_URL = "http://localhost:8080/facilitator";
    process.env.PAIRS = "BTC-USD,ETH-USD";

    const config = loadConfig();

    expect(config.port).toBe(8080);
    expect(config.walletAddress).toBe("0x1234567890123456789012345678901234567890");
    expect(config.privateKey).toBe(
      "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
    );
    expect(config.network).toBe("base-sepolia");
    expect(config.facilitatorUrl).toBe("http://localhost:8080/facilitator");
    expect(config.pairs).toEqual(["BTC-USD", "ETH-USD"]);
    expect(config.spreadBpsMax).toBe(25);
    expect(config.staleMs).toBe(2000);
  });

  test("loadConfig uses default values", () => {
    process.env.RESOURCE_WALLET_ADDRESS = "0x1234567890123456789012345678901234567890";

    const config = loadConfig();

    expect(config.port).toBe(8080);
    expect(config.network).toBe("base-sepolia");
    expect(config.facilitatorUrl).toBe("http://localhost:8080/facilitator");
    expect(config.spreadBpsMax).toBe(25);
    expect(config.staleMs).toBe(2000);
  });

  test("getConfig handles ZodError and exits", () => {
    process.env.RESOURCE_WALLET_ADDRESS = "invalid-address"; // Invalid format

    const mockExit = mock(() => {});
    process.exit = mockExit as any;

    const consoleErrorMock = mock(() => {});
    const originalConsoleError = console.error;
    console.error = consoleErrorMock as any;

    try {
      getConfig();
    } catch {
      // May throw or exit
    }

    expect(mockExit).toHaveBeenCalledWith(1);
    expect(consoleErrorMock).toHaveBeenCalled();

    console.error = originalConsoleError;
  });

  test("getConfig returns valid config normally", () => {
    process.env.RESOURCE_WALLET_ADDRESS = "0x1234567890123456789012345678901234567890";

    expect(() => {
      // This should work normally
      const config = getConfig();
      expect(config).toBeDefined();
    }).not.toThrow();
  });
});
