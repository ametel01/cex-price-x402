# CEX Price API with x402 Micropayments

[![CI](https://github.com/ametel01/cex-price-x402/actions/workflows/ci.yml/badge.svg)](https://github.com/ametel01/cex-price-x402/actions/workflows/ci.yml)

A real-time cryptocurrency pricing API that aggregates data from multiple exchanges and protects endpoints with x402 micropayments. Built with Bun, this API demonstrates how to monetize API access using the x402 protocol with ERC-3009 permit-based USDC payments on Base Sepolia.

## What is This?

This is a production-ready implementation of a cryptocurrency price API with built-in micropayments. The API:

1. **Connects to Exchange WebSockets**: Aggregates real-time price data from Binance (with support planned for Coinbase and Kraken)
2. **Computes Composite Prices**: Creates weighted average prices with spread awareness
3. **Protects Endpoints with x402**: Requires micropayments (starting at $0.01) for accessing price data
4. **Settles Payments On-Chain**: Uses ERC-3009 permits to settle USDC payments on Base Sepolia

## Features

- **Real-Time Data**: WebSocket connections to exchange APIs for live price updates
- **x402 Micropayments**: Pay-per-request access using the [x402 protocol](https://github.com/coinbase/x402)
- **ERC-3009 Permits**: Gasless USDC payments via transferWithAuthorization
- **Composite Pricing**: Spread-aware weighted average prices with staleness detection
- **Built with Bun**: Fast, modern JavaScript runtime with native WebSocket and TypeScript support
- **Type-Safe**: Full TypeScript implementation with Zod validation
- **Decimal Precision**: Uses decimal.js for accurate financial calculations

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) v1.3.1 or higher
- An Ethereum wallet address for receiving payments
- A private key with USDC on Base Sepolia (for settling payments)
- (Optional for testing) A funded wallet with USDC on Base Sepolia to make paid requests

### Installation

```bash
bun install
```

### Configuration

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
NODE_ENV=development
PORT=8080

# x402 Payment Configuration
# Your EVM wallet address for receiving payments
RESOURCE_WALLET_ADDRESS=0x1234567890123456789012345678901234567890

# Private key for settling payments (REQUIRED for accepting payments)
# IMPORTANT: Keep this secret! Never commit to version control
PRIVATE_KEY=0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890

# Network for x402 payments
NETWORK=base-sepolia

# Facilitator URL (where verify/settle endpoints are hosted)
FACILITATOR_URL=http://localhost:8080/facilitator

# Trading Configuration
# Comma-separated list of trading pairs to track
PAIRS=BTC-USD,ETH-USD

# Maximum acceptable spread in basis points (100 bps = 1%)
SPREAD_BPS_MAX=25

# Maximum staleness in milliseconds before data is rejected
STALE_MS=2000
```

### Running the Server

Development mode with hot reload:

```bash
bun run dev
```

Production mode:

```bash
bun start
```

You should see output like:

```
📡 Connecting to Binance...
✅ Binance connected
🚀 CEX Price API with x402 Micropayments
📡 Server running on http://localhost:8080
💰 Wallet: 0x1234...
🌐 Network: base-sepolia
📊 Tracking pairs: BTC-USD, ETH-USD

Endpoints:
  GET  /v1/health           - Health check (free)
  GET  /v1/symbols          - List trading pairs (free)
  GET  /v1/price?pair=...   - Get price ($0.01)
  GET  /v1/quotes?pairs=... - Get multiple quotes ($0.02)

Facilitator:
  POST /facilitator/verify    - Verify payment
  POST /facilitator/settle    - Settle payment
  GET  /facilitator/supported - List supported methods
```

### Docker Deployment

Run the API in Docker with a single command:

```bash
# Copy and configure environment file
cp .env.docker .env
# Edit .env with your wallet address

# Start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f
```

For detailed Docker instructions, including production deployment, health checks, and troubleshooting, see [DOCKER.md](DOCKER.md).

### Testing

Run all tests:

```bash
bun test
```

Watch mode:

```bash
bun run test:watch
```

Type checking:

```bash
bun run type-check
```

## Project Structure

```
/src
  /adapters      # WebSocket adapters for exchange connections
    binance.ts       - Binance WebSocket adapter with reconnection
    types.ts         - Common adapter interfaces
  /api           # REST API handlers
    health.ts        - Health check endpoint
    symbols.ts       - List available trading pairs
    price.ts         - Price quote endpoints (protected)
    index.ts         - Export all handlers
  /cache         # In-memory caching layer
    memory.ts        - Thread-safe cache for tick data
  /compositor    # Price aggregation and weighting
    index.ts         - Composite price calculations with spread awareness
  /config        # Configuration and mappings
    env.ts           - Environment variable loading
    routes.ts        - Protected route definitions with pricing
    symbols.ts       - Exchange symbol mappings
  /facilitator   # x402 payment verification
    verify.ts        - Payment verification endpoint
    settle.ts        - On-chain settlement endpoint
    supported.ts     - List supported payment methods
    index.ts         - Export all handlers
  /middleware    # x402 route protection
    x402.ts          - x402 middleware implementation
    route-matcher.ts - Route pattern matching
    payment-requirements.ts - Build payment requirements
    types.ts         - Middleware type definitions
  /types         # TypeScript type definitions
    index.ts         - Core types (Pair, Venue, Tick, Quote, etc.)
  /utils         # Utility functions
    decimal.ts       - Decimal math helpers

/index.ts        # Main server entry point
```

## How to Send Requests to the API

### Free Endpoints (No Payment Required)

These endpoints are always accessible without payment:

#### 1. Health Check

```bash
curl http://localhost:8080/v1/health
```

Response:

```json
{
  "status": "ok",
  "timestamp": 1234567890123
}
```

#### 2. List Supported Trading Pairs

```bash
curl http://localhost:8080/v1/symbols
```

Response:

```json
{
  "symbols": ["BTC-USD", "ETH-USD"],
  "count": 2
}
```

#### 3. List Supported Payment Methods

```bash
curl http://localhost:8080/facilitator/supported
```

Response:

```json
{
  "methods": [
    {
      "network": "base-sepolia",
      "token": "USDC",
      "address": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      "min": "0.01",
      "max": "1000000"
    }
  ]
}
```

### Protected Endpoints (x402 Payment Required)

Protected endpoints require micropayments using the x402 protocol. There are two ways to make paid requests:

#### Option 1: Using x402-fetch (Recommended)

The easiest way to make paid requests is using the `x402-fetch` library:

```typescript
import { wrapFetchWithPayment, createSigner } from "x402-fetch";

// Create a signer from your private key
const signer = await createSigner("base-sepolia", process.env.PRIVATE_KEY);

// Wrap native fetch with x402 payment logic
const x402fetch = wrapFetchWithPayment(
  fetch,
  signer,
  BigInt(1 * 10 ** 6), // Max 1 USDC per request
  undefined,
  { facilitatorUrl: "http://localhost:8080/facilitator" }
);

// Make a paid request - x402-fetch handles the 402 flow automatically
const response = await x402fetch("http://localhost:8080/v1/price?pair=BTC-USD");
const data = await response.json();
console.log(data);
```

The library automatically:

1. Detects 402 responses
2. Creates ERC-3009 permit signatures
3. Retries with the `X-PAYMENT` header

#### Option 2: Manual 402 Flow with curl

For testing or understanding the protocol, you can manually handle the 402 flow:

**Step 1**: Request without payment (receives 402):

```bash
curl -v http://localhost:8080/v1/price?pair=BTC-USD
```

Response (HTTP 402):

```json
{
  "x402Version": 1,
  "error": "payment_required",
  "accepts": [
    {
      "network": "base-sepolia",
      "token": "USDC",
      "receiver": "0x1234567890123456789012345678901234567890",
      "amount": "10000",
      "id": "unique-request-id",
      "description": "Get real-time price for a single trading pair"
    }
  ]
}
```

**Step 2**: Create and send payment (requires wallet with USDC):

This step requires creating an ERC-3009 permit signature. Use the `x402-fetch` library or implement the signing logic following the [x402 protocol specification](https://github.com/coinbase/x402).

### API Endpoints Reference

#### Protected Endpoints

##### Get Single Price Quote

```bash
# Cost: $0.01 (10,000 USDC units)
GET /v1/price?pair=BTC-USD
```

Response:

```json
{
  "pair": "BTC-USD",
  "price": "50005.00",
  "bid": "50000.00",
  "ask": "50010.00",
  "spread": "10.00",
  "spreadBps": 2,
  "venues": 1,
  "timestamp": 1234567890123
}
```

##### Get Multiple Price Quotes

```bash
# Cost: $0.02 (20,000 USDC units)
GET /v1/quotes?pairs=BTC-USD,ETH-USD

# Get all available quotes
GET /v1/quotes
```

Response:

```json
{
  "quotes": [
    {
      "pair": "BTC-USD",
      "price": "50005.00",
      "bid": "50000.00",
      "ask": "50010.00",
      "spread": "10.00",
      "spreadBps": 2,
      "venues": 1,
      "timestamp": 1234567890123
    },
    {
      "pair": "ETH-USD",
      "price": "3002.50",
      "bid": "3000.00",
      "ask": "3005.00",
      "spread": "5.00",
      "spreadBps": 17,
      "venues": 1,
      "timestamp": 1234567890124
    }
  ],
  "count": 2,
  "requested": 2
}
```

## How the x402 Payment Flow Works

The x402 protocol enables micropayments for API access using ERC-3009 USDC permits:

1. **Client requests a protected endpoint** without payment

   ```
   GET /v1/price?pair=BTC-USD
   ```

2. **Server responds with HTTP 402** and payment requirements

   ```json
   {
     "x402Version": 1,
     "error": "payment_required",
     "accepts": [{ "network": "base-sepolia", "amount": "10000", ... }]
   }
   ```

3. **Client creates an ERC-3009 permit signature**
   - Signs a transferWithAuthorization message
   - Authorizes the server to receive USDC payment
   - No gas fees required (gasless transaction)

4. **Client retries request** with `X-PAYMENT` header containing the signed permit

5. **Server verifies and settles payment**
   - Verifies the signature is valid
   - Submits the permit to the blockchain
   - Receives USDC payment
   - Returns the requested data

6. **Client receives data** after successful payment

## Architecture Overview

### Data Flow

```
┌─────────────┐
│   Binance   │───┐
│  WebSocket  │   │
└─────────────┘   │
                  ▼
              ┌────────┐      ┌────────────┐      ┌──────────┐
              │ Memory │─────▶│ Compositor │─────▶│ REST API │
              │ Cache  │      │  (Quotes)  │      │ Handler  │
              └────────┘      └────────────┘      └──────────┘
                                                         │
                                                         ▼
┌────────┐                                        ┌──────────┐
│ Client │◀──────────────────────────────────────│   x402   │
└────────┘                                        │ Middleware│
    │                                             └──────────┘
    │ X-PAYMENT                                         │
    ▼                                                   ▼
┌────────────┐                                   ┌────────────┐
│  ERC-3009  │                                   │Facilitator │
│   Permit   │──────────────────────────────────▶│  verify/   │
│ Signature  │                                   │  settle    │
└────────────┘                                   └────────────┘
                                                       │
                                                       ▼
                                                 ┌───────────┐
                                                 │ Base      │
                                                 │ Sepolia   │
                                                 │ Blockchain│
                                                 └───────────┘
```

### Key Components

1. **Adapters** (`/src/adapters`)
   - Connect to exchange WebSocket APIs
   - Normalize tick data into a common format
   - Handle reconnection and error recovery

2. **Cache** (`/src/cache`)
   - In-memory storage for real-time tick data
   - Thread-safe with Map-based implementation
   - Automatic staleness detection

3. **Compositor** (`/src/compositor`)
   - Aggregates data from multiple venues
   - Calculates weighted average prices
   - Validates spread and freshness requirements

4. **x402 Middleware** (`/src/middleware`)
   - Intercepts requests to protected endpoints
   - Returns 402 responses with payment requirements
   - Verifies and settles payments before granting access

5. **Facilitator** (`/src/facilitator`)
   - Verifies ERC-3009 permit signatures
   - Submits permits to blockchain for settlement
   - Returns transaction receipts

## Development Status

### Completed

- [x] Task 1: Project infrastructure setup
- [x] Task 2: x402 facilitator endpoints (verify, settle, supported)
- [x] Task 3: x402 middleware with route protection
- [x] Task 4: Basic API structure (health, symbols)
- [x] Task 5: Binance adapter with WebSocket connection
- [x] Task 6: Cache and compositor with spread awareness
- [x] Task 7: Protected price endpoints (/v1/price, /v1/quotes)
- [x] Task 8: End-to-end testing with real payments

### Planned

- [ ] Task 9: Coinbase adapter
- [ ] Task 10: Kraken adapter
- [ ] Task 11: WebSocket streaming endpoint
- [ ] Task 12: Observability (metrics, logging)

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for detailed roadmap.

## Testing the Application

### Run the Server

Start the server in development mode:

```bash
bun run dev
```

### Test Free Endpoints

```bash
# Health check
curl http://localhost:8080/v1/health

# List symbols
curl http://localhost:8080/v1/symbols

# List payment methods
curl http://localhost:8080/facilitator/supported
```

### Test Protected Endpoints (with x402-fetch)

Create a test file `test-request.ts`:

```typescript
import { wrapFetchWithPayment, createSigner } from "x402-fetch";

const signer = await createSigner("base-sepolia", process.env.PRIVATE_KEY);
const x402fetch = wrapFetchWithPayment(fetch, signer, BigInt(1 * 10 ** 6), undefined, {
  facilitatorUrl: "http://localhost:8080/facilitator",
});

const response = await x402fetch("http://localhost:8080/v1/price?pair=BTC-USD");
const data = await response.json();
console.log(data);
```

Run it:

```bash
PRIVATE_KEY=0x... bun test-request.ts
```

## Security Considerations

- **Never commit private keys**: Keep `.env` out of version control
- **Use testnet for development**: Start with Base Sepolia before going to mainnet
- **Validate all inputs**: The API uses Zod schemas for validation
- **Rate limiting**: Consider adding rate limiting for production use
- **CORS configuration**: Update CORS settings for production environments

## Troubleshooting

### Server won't start

- Check that port 8080 is available
- Verify `.env` file exists and is properly configured
- Ensure RESOURCE_WALLET_ADDRESS is a valid Ethereum address

### WebSocket connection fails

- Check internet connectivity
- Verify Binance WebSocket API is accessible
- Check for firewall or proxy issues

### Payment verification fails

- Ensure PRIVATE_KEY is set in `.env`
- Verify wallet has USDC on Base Sepolia
- Check that NETWORK matches your wallet's network
- Review server logs for detailed error messages

### Stale data errors

- Increase STALE_MS in `.env` if network is slow
- Check that WebSocket connection is stable
- Verify exchange is sending updates for the requested pairs

## Documentation

- [Implementation Plan](./IMPLEMENTATION_PLAN.md) - Detailed development roadmap
- [API Specification](./SPECS.md) - Technical requirements and API design
- [x402 Protocol](https://github.com/coinbase/x402) - Learn about x402 micropayments
- [Bun Documentation](https://bun.sh/docs) - Bun runtime and APIs

## Contributing

This is a demonstration project. Feel free to fork and modify for your own use cases.

## License

MIT

---

Built with [Bun](https://bun.sh) - A fast all-in-one JavaScript runtime
