/**
 * Environment configuration loader
 * Validates and provides typed access to environment variables
 */

import { z } from "zod";
import type { AppConfig, Pair } from "../types";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("8080"),
  RESOURCE_WALLET_ADDRESS: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  PRIVATE_KEY: z
    .string()
    .regex(/^0x[0-9a-fA-F]{64}$/)
    .optional(),
  NETWORK: z.string().default("base-sepolia"),
  FACILITATOR_URL: z.string().url().default("http://localhost:8080/facilitator"),
  PAIRS: z.string().default("BTC-USD,ETH-USD"),
  SPREAD_BPS_MAX: z.string().default("25"),
  STALE_MS: z.string().default("2000"),
});

/**
 * Load and validate environment configuration
 */
export function loadConfig(): AppConfig {
  const env = EnvSchema.parse(process.env);

  const pairs = env.PAIRS.split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0) as Pair[];

  return {
    port: parseInt(env.PORT, 10),
    pairs,
    spreadBpsMax: parseInt(env.SPREAD_BPS_MAX, 10),
    staleMs: parseInt(env.STALE_MS, 10),
    walletAddress: env.RESOURCE_WALLET_ADDRESS,
    privateKey: env.PRIVATE_KEY,
    network: env.NETWORK,
    facilitatorUrl: env.FACILITATOR_URL,
  };
}

/**
 * Get config with error handling
 */
export function getConfig(): AppConfig {
  try {
    return loadConfig();
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Environment configuration error:");
      error.issues.forEach((err) => {
        console.error(`  - ${err.path.join(".")}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}
