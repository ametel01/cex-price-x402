/**
 * Types for x402 middleware and route configuration
 */

export interface RouteConfig {
  price: string | number; // "$0.01" or 0.01
  network?: string;
  description?: string;
  mimeType?: string;
}

export interface RoutePattern {
  verb: string; // HTTP method or "*"
  pattern: RegExp;
  config: RouteConfig;
}

export type RoutesConfig = Record<string, RouteConfig | string | number>;

export interface X402MiddlewareOptions {
  facilitatorUrl: string;
  walletAddress: string;
}
