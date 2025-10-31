# @zendfi/sdk

> Zero-config TypeScript SDK for ZendFi crypto payments

[![npm version](https://img.shields.io/npm/v/@zendfi/sdk.svg)](https://www.npmjs.com/package/@zendfi/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **Zero Configuration** - Works out of the box, auto-detects environment
- **Type-Safe** - Full TypeScript support with complete type definitions
- **Auto-Retry** - Built-in retry logic with exponential backoff
- **Idempotency** - Automatic idempotency key generation
- **Environment Detection** - Automatically switches between test/production
- **Smart Defaults** - Sensible defaults for all options

## Installation

```bash
npm install @zendfi/sdk
# or
yarn add @zendfi/sdk
# or
pnpm add @zendfi/sdk
```

## Quick Start

### 1. Set your API key

```bash
# .env.local
ZENDFI_API_KEY=zfi_test_your_api_key_here
```

### 2. Create a payment

```typescript
import { zendfi } from '@zendfi/sdk';

const payment = await zendfi.createPayment({
  amount: 50,
  description: 'Premium subscription',
});

console.log(payment.checkout_url); // Send this to your customer
```

That's it! The SDK handles everything else automatically. 🎉

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
# @zendfi/sdk

Zero-config TypeScript SDK for ZendFi crypto payments.

[![npm version](https://img.shields.io/npm/v/@zendfi/sdk.svg)](https://www.npmjs.com/package/@zendfi/sdk)  
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What’s new

- Robust, auto-verifying webhook handler with optional deduplication and framework adapters (Next.js App Router + Express).  
- New `listPaymentLinks()` client method and expanded `PaymentLink` types.  
- Improved verify helpers: `verifyNextWebhook`, `verifyExpressWebhook`, and `verifyWebhookSignature`.  
- Zero-config `ZendFiClient` with retries, idempotency, and environment detection.

## Installation

```bash
npm install @zendfi/sdk
# or
pnpm add @zendfi/sdk
```

## Quick start

1) Configure your API key in the environment (or pass it to `ZendFiClient`):

```bash
```markdown
# @zendfi/sdk

> Zero-config TypeScript SDK for ZendFi crypto payments

[![npm version](https://img.shields.io/npm/v/@zendfi/sdk.svg)](https://www.npmjs.com/package/@zendfi/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- Zero Configuration — auto-detects environment and works with sensible defaults
- Type-Safe — full TypeScript types for payments, payment links, subscriptions, escrows, invoices and webhook payloads
- Auto-Retry — built-in retry logic with exponential backoff for network/server errors
- Idempotency — automatic idempotency key generation for safe retries
- Webhook helpers & adapters — auto-verified handlers + optional deduplication

## Installation

```bash
npm install @zendfi/sdk
# or
pnpm add @zendfi/sdk
```

## Quick Start

1) Set your API key (env or pass to client):

```bash
# .env.local
ZENDFI_API_KEY=zfi_test_your_api_key_here
```

2) Use the default singleton or create an explicit client:

```ts
import { zendfi, ZendFiClient } from '@zendfi/sdk';

// singleton auto-configured from environment
const payment = await zendfi.createPayment({ amount: 50 });

// or create an explicit client (recommended for server code)
const client = new ZendFiClient({ apiKey: process.env.ZENDFI_API_KEY });
const links = await client.listPaymentLinks();
```

## Usage examples

### Create a payment

```ts
const payment = await zendfi.createPayment({
  amount: 99.99,
  currency: 'USD',
  description: 'Annual subscription',
  customer_email: 'customer@example.com',
  redirect_url: 'https://yourapp.com/success',
  metadata: { orderId: 'ORD-123' },
});

// redirect customer
window.location.href = payment.checkout_url;
```

### Payment links

```ts
const client = new ZendFiClient({ apiKey: process.env.ZENDFI_API_KEY });
const created = await client.createPaymentLink({ amount: 20, currency: 'USD' });
console.log(created.hosted_page_url);

const links = await client.listPaymentLinks();
console.log(links.length, 'links total');
```

If you get a 405 when calling `listPaymentLinks()` in tests, confirm `ZENDFI_API_URL` / `baseURL` and the API key point to a server that exposes `GET /api/v1/payment-links`.

## Webhooks — recommended handlers

The SDK includes a robust webhook processing flow: signature verification, optional deduplication, and typed handler dispatch.

- Core: `processWebhook(payload, handlers, config)` (internal; used by adapters).
- Next.js App Router adapter: `createNextWebhookHandler(config)` — use as `export const POST = createNextWebhookHandler(...)`.
- Next.js Pages adapter: `createPagesWebhookHandler(config)` — use in `pages/api` with `export default` and set `export const config = { api: { bodyParser: false } }`.
- Express adapter: `createExpressWebhookHandler(config)` — use with `express.raw({ type: 'application/json' })`.

Examples (use the exact exported names shown):

Next.js App Router (App directory)

```ts
// app/api/webhooks/zendfi/route.ts
import { createNextWebhookHandler } from '@zendfi/sdk/next';

export const POST = createNextWebhookHandler({
  secret: process.env.ZENDFI_WEBHOOK_SECRET!,
  handlers: {
    'payment.confirmed': async (payment) => {
      // payment is already verified and typed
      await db.orders.update({ where: { id: payment.metadata.orderId }, data: { status: 'paid' } });
    },
  },
});
```

Next.js Pages Router (legacy)

```ts
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

export const config = {
  api: { bodyParser: false }, // Important: disable body parser so raw body is available
};
```

Express example

```ts
import express from 'express';
import { createExpressWebhookHandler } from '@zendfi/sdk/express';

const app = express();

app.post('/api/webhooks/zendfi',
  express.raw({ type: 'application/json' }), // preserve raw body for signature verification
  createExpressWebhookHandler({
    secret: process.env.ZENDFI_WEBHOOK_SECRET!,
    handlers: {
      'payment.confirmed': async (payment) => {
        // handle payment
      },
    },
  })
);
```

Deduplication

By default the handler uses an in-memory Set for deduplication (development). For production supply `isProcessed` and `onProcessed` hooks (or the aliases `checkDuplicate` / `markProcessed`) backed by Redis or your datastore. When deduplication is enabled duplicate requests will be rejected with HTTP 409 by the framework adapters.

## Manual verification helpers

If you prefer to verify manually:

- `verifyNextWebhook(request, secret?)` — Next.js App Router helper that returns parsed payload or null.  
- `verifyExpressWebhook(req, secret?)` — Express helper that returns parsed payload or null.  
- `verifyWebhookSignature(payload, signature, secret)` — low-level boolean verifier.

Example (manual Next.js usage):

```ts
import { verifyNextWebhook } from '@zendfi/sdk/webhooks';

export async function POST(request: Request) {
  const payload = await verifyNextWebhook(request);
  if (!payload) return new Response('Invalid signature', { status: 401 });

  // handle payload
  return new Response('OK');
}
```

## Errors & types

SDK throws typed errors you can import and check with `instanceof`: `AuthenticationError`, `ValidationError`, `NetworkError`, etc.

## Configuration & environment

- `ZENDFI_API_KEY` — required unless provided to `ZendFiClient`  
- `ZENDFI_WEBHOOK_SECRET` — used by adapters for auto-verification  
- `ZENDFI_API_URL` — override the API base URL (useful for local testing)  
- `ZENDFI_ENVIRONMENT` — optional environment override

## Troubleshooting

- If you see tsup warnings about the `types` condition in `package.json` exports, this is a packaging order issue that can be adjusted without changing runtime behavior.  
- Webhook verification failures are usually caused by middleware that consumes the raw body. Use `express.raw()` or disable Next.js body parsing for pages router.

## Contributing

Run the SDK build and tests locally before opening a PR:

```bash
cd packages/sdk
pnpm install
pnpm run build
pnpm test
```

## Support

- Documentation: https://docs.zendfi.tech
- API Reference: https://docs.zendfi.tech/api
- GitHub Issues: https://github.com/zendfi/zendfi-toolkit/issues
- Email: dev@zendfi.tech

## License

MIT © ZendFi

```
