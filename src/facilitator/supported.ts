/**
 * x402 Supported Payment Methods Endpoint
 * Returns the payment schemes and networks the facilitator supports
 */

import { getConfig } from "../config/env";

/**
 * Payment method details
 */
interface PaymentMethod {
  network: string;
  token: string;
  address: string;
  min: string;
  max: string;
}

/**
 * Get USDC address for network
 */
function getUsdcAddressForNetwork(network: string): string {
  const usdcAddresses: Record<string, string> = {
    "base-sepolia": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "polygon-amoy": "0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582",
    polygon: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    avalanche: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    "avalanche-fuji": "0x5425890298aed601595a70AB815c96711a31Bc65",
  };

  return usdcAddresses[network] ?? "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
}

/**
 * Handles GET requests to list supported payment methods
 */
export function handleSupportedRequest(): Response {
  const config = getConfig();

  const methods: PaymentMethod[] = [
    {
      network: config.network,
      token: "USDC",
      address: getUsdcAddressForNetwork(config.network),
      min: "0.01",
      max: "1000000",
    },
  ];

  return Response.json({ methods });
}
