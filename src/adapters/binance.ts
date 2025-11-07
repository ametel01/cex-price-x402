/**
 * Binance WebSocket Adapter
 * Connects to Binance Spot WebSocket API and normalizes market data
 */

import type { NormalizedTick, Pair, Venue } from "../types";
import type { TickCallback, VenueAdapter, AdapterStats } from "./types";
import { symbolToBinance, binanceToSymbol } from "../config/symbols";

// Try alternative endpoints if primary fails
// data-stream.binance.vision works best (no TLS handshake issues)
const BINANCE_WS_URLS = [
  "wss://data-stream.binance.vision/stream",
  "wss://stream.binance.com:9443/stream",
  "wss://stream.binance.com:443/stream",
];
const MAX_RECONNECT_DELAY = 30000; // 30 seconds
const INITIAL_RECONNECT_DELAY = 1000; // 1 second

interface BinanceBookTickerMessage {
  stream: string;
  data: {
    u: number; // order book updateId
    s: string; // symbol
    b: string; // best bid price
    B: string; // best bid qty
    a: string; // best ask price
    A: string; // best ask qty
  };
}

/**
 * Binance WebSocket adapter for real-time market data
 */
export class BinanceAdapter implements VenueAdapter {
  private ws: WebSocket | null = null;
  private pairs: Pair[];
  private onTick: TickCallback;
  private reconnectAttempts = 0;
  private reconnectTimeout: Timer | null = null;
  private shouldReconnect = true;
  private currentUrlIndex = 0;
  private stats: AdapterStats = {
    connected: false,
    reconnectAttempts: 0,
    messagesReceived: 0,
    lastMessageTime: 0,
    errors: 0,
  };

  constructor(pairs: Pair[], onTick: TickCallback) {
    this.pairs = pairs;
    this.onTick = onTick;
  }

  /**
   * Connect to Binance WebSocket
   */
  async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log("[Binance] Already connected");
      return;
    }

    try {
      // Build stream names for all pairs
      const streams = this.pairs
        .map((pair) => {
          try {
            const binanceSymbol = symbolToBinance(pair);
            return `${binanceSymbol.toLowerCase()}@bookTicker`;
          } catch {
            console.warn(`[Binance] Skipping unsupported pair: ${pair}`);
            return null;
          }
        })
        .filter((s) => s !== null)
        .join("/");

      if (!streams) {
        throw new Error("No valid streams to subscribe to");
      }

      const baseUrl = BINANCE_WS_URLS[this.currentUrlIndex];
      const url = `${baseUrl}?streams=${streams}`;
      console.log(`[Binance] Connecting to ${streams.split("/").length} streams via ${baseUrl}...`);

      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log("[Binance] ✅ Connected");
        this.reconnectAttempts = 0;
        this.stats.connected = true;
        this.stats.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (error) => {
        console.error("[Binance] ❌ Error:", error);
        this.stats.errors++;
      };

      this.ws.onclose = () => {
        console.log("[Binance] 🔌 Disconnected");
        this.stats.connected = false;

        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      };

      // Wait for connection to open
      await new Promise<void>((resolve, reject) => {
        if (!this.ws) {
          reject(new Error("WebSocket failed to initialize"));
          return;
        }

        const ws = this.ws;
        const timeout = setTimeout(() => {
          reject(new Error("Connection timeout"));
        }, 10000);

        ws.addEventListener("open", () => {
          clearTimeout(timeout);
          resolve();
        });

        ws.addEventListener("error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    } catch (error) {
      console.error("[Binance] Failed to connect:", error);
      this.stats.errors++;
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
      throw error;
    }
  }

  /**
   * Disconnect from Binance WebSocket
   */
  disconnect(): void {
    console.log("[Binance] Disconnecting...");
    this.shouldReconnect = false;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.stats.connected = false;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get adapter statistics
   */
  getStats(): AdapterStats {
    return { ...this.stats };
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data) as BinanceBookTickerMessage;

      if (!message.data || !message.data.s) {
        return;
      }

      const ticker = message.data;
      const binanceSymbol = ticker.s;

      // Convert Binance symbol to canonical pair
      let pair: Pair;
      try {
        pair = binanceToSymbol(binanceSymbol);
      } catch {
        // Unknown symbol, skip
        return;
      }

      // Create normalized tick
      const tick: NormalizedTick = {
        venue: "binance" as Venue,
        pair,
        ts: Date.now(),
        bid: ticker.b,
        ask: ticker.a,
        type: "book",
      };

      this.stats.messagesReceived++;
      this.stats.lastMessageTime = tick.ts;

      // Emit normalized tick
      this.onTick(tick);
    } catch (error) {
      console.error("[Binance] Error parsing message:", error);
      this.stats.errors++;
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      return;
    }

    // Try next URL after 3 failed attempts with current URL
    if (this.reconnectAttempts > 0 && this.reconnectAttempts % 3 === 0) {
      this.currentUrlIndex = (this.currentUrlIndex + 1) % BINANCE_WS_URLS.length;
      console.log(
        `[Binance] Trying alternative endpoint: ${BINANCE_WS_URLS[this.currentUrlIndex]}`
      );
    }

    const delay = Math.min(
      INITIAL_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts),
      MAX_RECONNECT_DELAY
    );

    this.reconnectAttempts++;
    this.stats.reconnectAttempts = this.reconnectAttempts;

    console.log(`[Binance] 🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect().catch((error) => {
        console.error("[Binance] Reconnection failed:", error);
      });
    }, delay);
  }
}
