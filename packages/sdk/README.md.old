# @zendfi/sdk

> Zero-config TypeScript SDK for ZendFi crypto payments

[![npm version](https://img.shields.io/npm/v/@zendfi/sdk.svg)](https://www.npmjs.com/package/@zendfi/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **Zero Configuration** — Auto-detects environment and works with sensible defaults
- **Type-Safe** — Full TypeScript types for payments, payment links, subscriptions, escrows, invoices and webhook payloads
- **Auto-Retry** — Built-in retry logic with exponential backoff for network/server errors
- **Idempotency** — Automatic idempotency key generation for safe retries
- **Webhook Helpers** — Auto-verified handlers with optional deduplication and framework adapters

## Installation

```bash
npm install @zendfi/sdk
# or
pnpm add @zendfi/sdk
```

## Quick Start

### 1. Set your API key

```bash
# .env.local or .env

# For development (uses Solana devnet)
ZENDFI_API_KEY=zfi_test_your_test_api_key_here

# For production (uses Solana mainnet)
# ZENDFI_API_KEY=zfi_live_your_live_api_key_here
```

**API Key Modes:**
- `zfi_test_*` keys route to **Solana Devnet** (free test SOL, no real money)
- `zfi_live_*` keys route to **Solana Mainnet** (real crypto transactions)

The SDK automatically detects the mode from your API key prefix.

### 2. Create a payment

```typescript
import { zendfi } from '@zendfi/sdk';

// Singleton auto-configured from environment
const payment = await zendfi.createPayment({
  amount: 50,
  description: 'Premium subscription',
});

console.log(payment.checkout_url); // Send this to your customer
```

### 3. Or use an explicit client (recommended for server code)

```typescript
import { ZendFiClient } from '@zendfi/sdk';

const client = new ZendFiClient({ 
  apiKey: process.env.ZENDFI_API_KEY 
});

const payment = await client.createPayment({
  amount: 99.99,
  currency: 'USD',
  description: 'Annual subscription',
});
```

That's it! The SDK handles everything else automatically. 🎉

## Test vs Live Mode

ZendFi provides separate API keys for testing and production:

| Mode | API Key Prefix | Network | Purpose |
|------|---------------|---------|---------|
| **Test** | `zfi_test_` | Solana Devnet | Development & testing with fake SOL |
| **Live** | `zfi_live_` | Solana Mainnet | Production with real crypto |

### Getting Test SOL

For testing on devnet:
1. Use your `zfi_test_` API key
2. Get free devnet SOL from [sol-faucet.com](https://www.sol-faucet.com/) or `solana airdrop`
3. All transactions use test tokens (no real value)

### Going Live

When ready for production:
1. Switch to your `zfi_live_` API key
2. All transactions will use real crypto on mainnet
3. Customers pay with real SOL/USDC/USDT

The SDK automatically routes to the correct network based on your API key prefix!

## Usage

### Payments

#### Create a Payment

```typescript
const payment = await zendfi.createPayment({
  amount: 99.99,
  currency: 'USD', // Optional, defaults to 'USD'
  token: 'USDC', // Optional, defaults to 'USDC'
  description: 'Annual subscription',
  customer_email: 'customer@example.com',
  redirect_url: 'https://yourapp.com/success',
  metadata: {
    orderId: 'ORD-123',
    customerId: 'CUST-456',
  },
});

// Redirect customer to checkout
window.location.href = payment.checkout_url;
```

### Payment Links

```typescript
const client = new ZendFiClient({ 
  apiKey: process.env.ZENDFI_API_KEY 
});

// Create a payment link
const link = await client.createPaymentLink({
  amount: 20,
  currency: 'USD',
  description: 'Product purchase',
});

console.log(link.hosted_page_url);

// List all payment links
const links = await client.listPaymentLinks();
console.log(`Total links: ${links.length}`);
```

> **Note:** If you get a 405 error when calling `listPaymentLinks()` in tests, confirm that `ZENDFI_API_URL` / `baseURL` and your API key point to a server that exposes `GET /api/v1/payment-links`.

## Webhooks

The SDK includes robust webhook processing with signature verification, optional deduplication, and typed handler dispatch.

### Next.js App Router (Recommended)

```typescript
// app/api/webhooks/zendfi/route.ts
import { createNextWebhookHandler } from '@zendfi/sdk/next';

export const POST = createNextWebhookHandler({
  secret: process.env.ZENDFI_WEBHOOK_SECRET!,
  handlers: {
    'payment.confirmed': async (payment) => {
      // Payment is already verified and typed
      await db.orders.update({
        where: { id: payment.metadata.orderId },
        data: { status: 'paid' },
      });
    },
  },
});
```

### Next.js Pages Router (Legacy)

```typescript
// pages/api/webhooks/zendfi.ts
import { createPagesWebhookHandler } from '@zendfi/sdk/next';

export default createPagesWebhookHandler({
  secret: process.env.ZENDFI_WEBHOOK_SECRET!,
  handlers: {
    'payment.confirmed': async (payment) => {
      await fulfillOrder(payment.metadata.orderId);
    },
  },
});

// Important: Disable body parser for signature verification
export const config = {
  api: { bodyParser: false },
};
```

### Express

```typescript
import express from 'express';
import { createExpressWebhookHandler } from '@zendfi/sdk/express';

const app = express();

app.post(
  '/api/webhooks/zendfi',
  express.raw({ type: 'application/json' }), // Preserve raw body
  createExpressWebhookHandler({
    secret: process.env.ZENDFI_WEBHOOK_SECRET!,
    handlers: {
      'payment.confirmed': async (payment) => {
        // Handle confirmed payment
      },
    },
  })
);
```

### Webhook Deduplication

By default, the handler uses an in-memory Set for deduplication (suitable for development). For production, supply `isProcessed` and `onProcessed` hooks (or the aliases `checkDuplicate` / `markProcessed`) backed by Redis or your database:

```typescript
export const POST = createNextWebhookHandler({
  secret: process.env.ZENDFI_WEBHOOK_SECRET!,
  isProcessed: async (eventId) => {
    return await redis.exists(`webhook:${eventId}`);
  },
  onProcessed: async (eventId) => {
    await redis.set(`webhook:${eventId}`, '1', 'EX', 86400);
  },
  handlers: {
    'payment.confirmed': async (payment) => {
      // Handle payment
    },
  },
});
```

When deduplication is enabled, duplicate requests are rejected with HTTP 409.

### Manual Webhook Verification

If you prefer manual verification:

```typescript
import { verifyNextWebhook } from '@zendfi/sdk/webhooks';

export async function POST(request: Request) {
  const payload = await verifyNextWebhook(request);
  if (!payload) {
    return new Response('Invalid signature', { status: 401 });
  }

  // Handle verified payload
  return new Response('OK');
}
```

**Available helpers:**
- `verifyNextWebhook(request, secret?)` — Next.js App Router
- `verifyExpressWebhook(req, secret?)` — Express
- `verifyWebhookSignature(payload, signature, secret)` — Low-level verifier

## Configuration & Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ZENDFI_API_KEY` | Yes* | Your ZendFi API key (*unless passed to `ZendFiClient`) |
| `ZENDFI_WEBHOOK_SECRET` | No | Used by webhook adapters for auto-verification |
| `ZENDFI_API_URL` | No | Override API base URL (useful for local testing) |
| `ZENDFI_ENVIRONMENT` | No | Optional environment override |

## Error Handling

The SDK throws typed errors that you can import and check with `instanceof`:

```typescript
import { 
  AuthenticationError, 
  ValidationError, 
  NetworkError 
} from '@zendfi/sdk';

try {
  await zendfi.createPayment({ amount: 50 });
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Handle authentication error
  } else if (error instanceof ValidationError) {
    // Handle validation error
  }
}
```

## Troubleshooting

**Webhook verification failures:**
- Ensure you're using `express.raw({ type: 'application/json' })` for Express
- For Next.js Pages Router, set `export const config = { api: { bodyParser: false } }`
- Middleware consuming the raw body will break signature verification

**405 errors on `listPaymentLinks()`:**
- Verify your `ZENDFI_API_URL` is correct
- Confirm your API server exposes `GET /api/v1/payment-links`

**tsup warnings about types condition:**
- This is a packaging order issue that doesn't affect runtime behavior

## Contributing

Run the SDK build and tests locally before opening a PR:

```bash
cd packages/sdk
pnpm install
pnpm run build
pnpm test
```

## Support

- **Documentation:** https://docs.zendfi.tech
- **API Reference:** https://docs.zendfi.tech/api
- **GitHub Issues:** https://github.com/zendfi/zendfi-toolkit/issues
- **Email:** dev@zendfi.tech

## License

MIT © ZendFi
