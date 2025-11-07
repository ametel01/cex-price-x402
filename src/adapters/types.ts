/**
 * Types for venue adapters
 */

import type { NormalizedTick } from "../types";

/**
 * Callback function for normalized ticks
 */
export type TickCallback = (tick: NormalizedTick) => void;

/**
 * Base adapter interface
 */
export interface VenueAdapter {
  connect(): Promise<void>;
  disconnect(): void;
  isConnected(): boolean;
}

/**
 * Adapter statistics
 */
export interface AdapterStats {
  connected: boolean;
  reconnectAttempts: number;
  messagesReceived: number;
  lastMessageTime: number;
  errors: number;
}
