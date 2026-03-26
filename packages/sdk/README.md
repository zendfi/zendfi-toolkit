# @zendfi/sdk

> The simplest crypto payment SDK for Solana

[![npm version](https://img.shields.io/npm/v/@zendfi/sdk.svg)](https://www.npmjs.com/package/@zendfi/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Accept **SOL, USDC, and USDT** payments in 7 lines of code. Built for e-commerce.

```typescript
import { zendfi } from '@zendfi/sdk';

const payment = await zendfi.createPayment({
  amount: 50,
  description: 'Premium subscription',
});

console.log(payment.payment_url); // Send customer here
```

**That's it.** Full type safety. Instant settlements. 0.6% fees.

---

## Why ZendFi?

| Feature | Stripe | PayPal | **ZendFi** |
|---------|--------|--------|------------|
| **Fees** | 2.9% + $0.30 | 3.5% + $0.49 | **0.6% flat** |
| **Settlement** | 7 days | 3-5 days | **Instant** |
| **Crypto Native** | Via 3rd party | Via 3rd party | **Built-in** |
| **Setup Time** | 30 min | 30 min | **5 min** |

**Save 81% on fees.** Get paid instantly.

---

## Features

### **Core Payments** (Start Here)
- **Embedded Checkout** — Drop-in checkout component for your website/app
- **Simple Payments** — QR codes, payment links, instant settlements
- **Payment Links** — Reusable checkout pages for social/email
- **Webhooks** — Real-time notifications with auto-verification
- **Test Mode** — Free devnet testing with no real money
- **Type-Safe** — Full TypeScript support with auto-completion

### **Scale Up** (When You Grow)
- **Subscriptions** — Recurring billing with trials
- **Installments** — Buy now, pay later flows
- **Invoices** — Professional invoicing with email
- **Payment Splits** — Revenue sharing for marketplaces

---

## Installation

```bash
npm install @zendfi/sdk
# or
pnpm add @zendfi/sdk
# or
yarn add @zendfi/sdk
```

---

## Quick Start

### 1. Get your API key

Sign up at [zendfi.tech](https://zendfi.tech) to get your API keys.

### 2. Set environment variables

```bash
# .env.local or .env

# For testing (free devnet SOL, no real money)
ZENDFI_API_KEY=zfi_test_your_test_key_here

# For production (real crypto on mainnet)
# ZENDFI_API_KEY=zfi_live_your_live_key_here
```

### 3. Create your first payment

```typescript
import { zendfi } from '@zendfi/sdk';

// That's it! Auto-configured from ZENDFI_API_KEY
const payment = await zendfi.createPayment({
  amount: 50,
  description: 'Premium subscription',
  customer_email: 'customer@example.com',
});

// Send customer to checkout
console.log(payment.payment_url);
// => https://pay.zendfi.tech/abc123...
```

**Response includes:**
```typescript
{
  id: "pay_abc123...",
  amount: 50,
  currency: "USD",
  status: "Pending",
  payment_url: "https://pay.zendfi.tech/abc123...",
  qr_code: "data:image/png;base64,...",
  expires_at: "2025-11-08T20:00:00Z",
  mode: "test", // or "live"
}
```

---

## Embedded Checkout

Skip redirects entirely—embed the checkout directly into your website or app. Perfect for seamless user experiences.

### Quick Example

```typescript
import { ZendFiEmbeddedCheckout } from '@zendfi/sdk';

const checkout = new ZendFiEmbeddedCheckout({
  linkCode: 'your-payment-link-code',
  containerId: 'checkout-container',
  mode: 'test',
  
  onSuccess: (payment) => {
    console.log('Payment successful!', payment.transactionSignature);
    // Redirect to success page or show confirmation
  },
  
  onError: (error) => {
    console.error('Payment failed:', error.message);
  },
});

// Mount the checkout
await checkout.mount();
```

### HTML Setup

```html
<div id="checkout-container"></div>
<script type="module">
  import { ZendFiEmbeddedCheckout } from '@zendfi/sdk';
  // ... (setup code above)
</script>
```

### Features

- **Drop-in Integration** — Works with React, Vue, Next.js, or vanilla JS
- **QR Code Generation** — Automatic mobile wallet support
- **Wallet Connect** — Phantom, Solflare, Backpack support
- **Real-time Updates** — Live payment confirmation polling
- **Gasless Transactions** — Optional backend-signed payments
- **Customizable Theme** — Match your brand colors & styles
- **TypeScript First** — Full type safety and autocomplete

### Complete Documentation

For comprehensive guides, React examples, theming, and advanced usage:

- **Quick Start:** [`EMBEDDED_CHECKOUT_QUICKSTART.md`](./EMBEDDED_CHECKOUT_QUICKSTART.md)
- **Full Guide:** [`EMBEDDED_CHECKOUT.md`](./EMBEDDED_CHECKOUT.md)
- **Implementation Details:** [`EMBEDDED_CHECKOUT_IMPLEMENTATION.md`](./EMBEDDED_CHECKOUT_IMPLEMENTATION.md)
- **React Example:** [`examples/embedded-checkout-react.tsx`](./examples/embedded-checkout-react.tsx)
- **Vanilla JS Example:** [`examples/embedded-checkout-vanilla.html`](./examples/embedded-checkout-vanilla.html)

---

## API Key Modes

ZendFi uses **smart API keys** that automatically route to the correct network:

| Mode | API Key Prefix | Network | Gas Costs | Purpose |
|------|---------------|---------|-----------|---------|
| **Test** | `zfi_test_` | Solana Devnet | Free | Development & testing |
| **Live** | `zfi_live_` | Solana Mainnet | ~$0.0001 | Production |

> **Pro Tip:** The SDK auto-detects the mode from your API key prefix. No configuration needed!

### Getting Test SOL

For devnet testing:
1. Use your `zfi_test_` API key
2. Get free SOL from [sol-faucet.com](https://www.sol-faucet.com/)
3. All transactions use test tokens (zero value)
4. Devnet SOL is NOT real SOL (zero value)
6. Use devnet-compatible wallets (Phantom, Solflare support devnet)
7. Switch network in wallet: Settings → Developer Settings → Change Network → Devnet

### Going Live

When ready for production:
1. Switch to your `zfi_live_` API key  
2. **That's it!** The SDK handles everything else automatically

---

## Pricing

**Platform Fee: 0.6%** (all-inclusive)

This covers:
- Network transaction fees (~$0.0001 per transaction)
- Payment processing
- Automatic settlements
- Webhook delivery
- No hidden costs

**Example:**
- Customer pays: $100 USDC
- You receive: $99.40 USDC
- ZendFi fee: $0.60 (covers all network fees + platform)

---

## Core API Reference

### API Methods

```typescript
import { zendfi, ZendFiEmbeddedCheckout } from '@zendfi/sdk';

// Embedded Checkout
const checkout = new ZendFiEmbeddedCheckout({...});

// Payments
zendfi.createPayment(...)
zendfi.getPayment(...)

// Payment Links
zendfi.createPaymentLink(...)

// Subscriptions
zendfi.createSubscription(...)
zendfi.cancelSubscription(...)

// Invoices
zendfi.createInvoice(...)
zendfi.sendInvoice(...)

// Sub-Accounts (merchant-controlled MPC wallets)
zendfi.createSubAccount(...)
zendfi.listSubAccounts(...)
zendfi.getSubAccount(...)
zendfi.getSubAccountBalance(...)
zendfi.mintSubAccountDelegationToken(...)
zendfi.freezeSubAccount(...)
zendfi.drainSubAccount(...)
zendfi.withdrawFromSubAccount(...)
zendfi.withdrawSubAccountToBank(...)
zendfi.createSubAccountAutomationToken(...)
zendfi.revokeSubAccountAutomationToken(...)
zendfi.closeSubAccount(...)
```

### Sub-Accounts

Create and manage merchant-controlled sub-accounts with dedicated MPC wallets and scoped delegation tokens.

```typescript
const sub = await zendfi.createSubAccount({
  label: 'user_paschal_001',
  spend_limit_usdc: 500,
  access_mode: 'delegated',
  yield_enabled: false,
});

const token = await zendfi.mintSubAccountDelegationToken(sub.id, {
  scope: 'withdraw_only',
  spend_limit_usdc: 50,
  expires_in_seconds: 900,
  whitelist: ['7xKm...4fVz'],
  single_use: true,
});
```

Sensitive sub-account operations such as `drainSubAccount`, `withdrawFromSubAccount`, and `withdrawSubAccountToBank` require `passkey_signature` payloads from your WebAuthn flow.

`withdrawSubAccountToBank` executes PAJ offramp with server-side proxy-email OTP automation (same pattern as split bank withdrawals), so your integration does not need to collect OTP manually.

For headless automation, mint bounded automation credentials with `createSubAccountAutomationToken`, then pass `automation_token` to `withdrawSubAccountToBank`.

Sub-account flows emit webhook lifecycle and transfer events:

- `SubAccountCreated`
- `SubAccountDelegationTokenMinted`
- `SubAccountFrozen`
- `SubAccountClosed`
- `WithdrawalInitiated` / `WithdrawalFailed` / `WithdrawalCompleted` (including scoped withdrawals)

### Payments

Create payments for your customers:

```typescript
// Create a simple payment
const payment = await zendfi.createPayment({
  amount: 50,
  description: 'Premium subscription',
  customer_email: 'customer@example.com',
});

// Get payment status
const status = await zendfi.getPayment(payment.id);
```

### Payment Links

Create reusable payment links:

```typescript
// Create a payment link
const link = await zendfi.createPaymentLink({
  amount: 99.99,
  description: 'Pro Plan',
  max_uses: 100,
});

console.log(link.url); // Share with customers
```

### Subscriptions

Set up recurring billing:

```typescript
// Create a subscription plan
const plan = await zendfi.createSubscriptionPlan({
  name: 'Pro Plan',
  amount: 29.99,
  interval: 'monthly',
  trial_days: 14,
});

// Subscribe a customer
const subscription = await zendfi.createSubscription({
  plan_id: plan.id,
  customer_email: 'customer@example.com',
});

// Cancel subscription
await zendfi.cancelSubscription(subscription.id);
```

---

## Optional Helper Utilities

Production-ready utilities to simplify common integration patterns. All helpers are **optional**, **tree-shakeable**, and **zero-config**.

```typescript
import { 
  WalletConnector,
  TransactionPoller,
  DevTools 
} from '@zendfi/sdk/helpers';
```

### Why Use Helpers?

- **Optional**: Import only what you need
- **Tree-shakeable**: Unused code eliminated by bundlers  
- **Zero config**: Sensible defaults, works out of the box
- **Pluggable**: Bring your own storage providers
- **Production-ready**: Full TypeScript types, error handling

### Available Helpers

| Helper | Purpose | Use Case |
|--------|---------|----------|
| `WalletConnector` | Detect & connect Solana wallets | Phantom, Solflare, Backpack |
| `TransactionPoller` | Poll for confirmations | Wait for on-chain finality |
| `RetryStrategy` | Exponential backoff retries | Handle network failures |
| `DevTools` | Debug mode & test utilities | Development & testing |

### Wallet Connector

Auto-detect and connect to Solana wallets:

```typescript
import { WalletConnector } from '@zendfi/sdk/helpers';

const wallet = await WalletConnector.detectAndConnect();
console.log(wallet.address);

const signedTx = await wallet.signTransaction(transaction);
```

### Transaction Polling

Wait for confirmations with exponential backoff:

```typescript
import { TransactionPoller } from '@zendfi/sdk/helpers';

const poller = new TransactionPoller({ connection: rpcConnection });
const result = await poller.waitForConfirmation(signature);
```

**Full documentation:** See [Helper Utilities Guide](https://docs.zendfi.tech/developer-tools/helper-utilities) for complete API reference and examples.

---

## Complete API Reference

### Payments

#### Create Payment

```typescript
const payment = await zendfi.createPayment({
  amount: 99.99,
  currency: 'USD', // Optional, defaults to 'USD'
  token: 'USDC', // 'SOL', 'USDC', or 'USDT'
  description: 'Annual subscription',
  customer_email: 'customer@example.com',
  redirect_url: 'https://yourapp.com/success',
  metadata: {
    orderId: 'ORD-123',
    userId: 'USR-456',
    tier: 'premium',
  },
});

// Redirect customer to payment page
window.location.href = payment.payment_url;
```

#### Get Payment Status

```typescript
const payment = await zendfi.getPayment('pay_abc123...');

console.log(payment.status);
// => "Pending" | "Confirmed" | "Failed" | "Expired"
```

---

### Payment Links

Create shareable checkout URLs that can be reused multiple times.

#### Create Payment Link

```typescript
const link = await zendfi.createPaymentLink({
  amount: 29.99,
  description: 'Premium Course',
  max_uses: 100, // Optional: limit usage
  expires_at: '2025-12-31T23:59:59Z', // Optional
  metadata: {
    product_id: 'course-123',
  },
});

// Share this URL with customers
console.log(link.hosted_page_url);
// => https://pay.zendfi.tech/link/abc123

// Or use the QR code
console.log(link.qr_code);
```

#### Get Payment Link

```typescript
const link = await zendfi.getPaymentLink('link_abc123');
console.log(`Used ${link.uses_count}/${link.max_uses} times`);
```

#### List Payment Links

```typescript
const links = await zendfi.listPaymentLinks();
links.forEach(link => {
  console.log(`${link.description}: ${link.hosted_page_url}`);
});
```

---

### Subscriptions

Recurring crypto payments made easy.

#### Create Subscription Plan

```typescript
const plan = await zendfi.createSubscriptionPlan({
  name: 'Pro Plan',
  description: 'Premium features + priority support',
  amount: 29.99,
  interval: 'monthly', // 'daily', 'weekly', 'monthly', 'yearly'
  interval_count: 1, // Bill every X intervals
  trial_days: 7, // Optional: free trial
  metadata: {
    features: ['analytics', 'api-access', 'priority-support'],
  },
});
```

#### Subscribe a Customer

```typescript
const subscription = await zendfi.createSubscription({
  plan_id: plan.id,
  customer_email: 'customer@example.com',
  customer_wallet: '6DSVnyAQrd9jUWGivzT18kvW5T2nsokmaBtEum63jovN',
  metadata: {
    user_id: '12345',
  },
});

console.log(subscription.current_period_end);
```

#### Cancel Subscription

```typescript
const cancelled = await zendfi.cancelSubscription(subscription.id);
console.log(`Cancelled. Active until ${cancelled.current_period_end}`);
```

---

### Installment Plans

Split large purchases into scheduled payments.

#### Create Installment Plan

```typescript
const plan = await zendfi.createInstallmentPlan({
  total_amount: 500,
  num_installments: 5, // 5 payments of $100 each
  interval_days: 30, // One payment every 30 days
  customer_email: 'customer@example.com',
  customer_wallet: '6DSVnyAQrd9jUWGivzT18kvW5T2nsokmaBtEum63jovN',
  description: 'MacBook Pro - Installment Plan',
  metadata: {
    product_id: 'macbook-pro-16',
  },
});

console.log(`Created plan with ${plan.num_installments} installments`);
```

#### Get Installment Plan

```typescript
const plan = await zendfi.getInstallmentPlan(plan.id);
console.log(`Status: ${plan.status}`);
// => "active" | "completed" | "defaulted" | "cancelled"
```

#### List Customer's Installment Plans

```typescript
const customerPlans = await zendfi.listCustomerInstallmentPlans(
  '6DSVnyAQrd9jUWGivzT18kvW5T2nsokmaBtEum63jovN'
);
```

#### Cancel Installment Plan

```typescript
await zendfi.cancelInstallmentPlan(plan.id);
```

---

### Invoices

Professional invoices with crypto payment options.

#### Create Invoice

```typescript
const invoice = await zendfi.createInvoice({
  customer_email: 'client@company.com',
  customer_name: 'Acme Corp',
  due_date: '2025-12-31',
  line_items: [
    {
      description: 'Website Design',
      quantity: 1,
      unit_price: 2500,
    },
    {
      description: 'Logo Design',
      quantity: 3,
      unit_price: 500,
    },
  ],
  notes: 'Payment due within 30 days',
  metadata: {
    project_id: 'proj-456',
  },
});

console.log(`Invoice #${invoice.invoice_number} created`);
```

#### Send Invoice via Email

```typescript
const sent = await zendfi.sendInvoice(invoice.id);
console.log(`Invoice sent to ${sent.sent_to}`);
console.log(`Payment URL: ${sent.payment_url}`);
```

#### List Invoices

```typescript
const invoices = await zendfi.listInvoices();
invoices.forEach(inv => {
  console.log(`${inv.invoice_number}: $${inv.total_amount} - ${inv.status}`);
});
```

---

## Webhooks

Get notified when payments are confirmed, subscriptions renew, etc.

### Supported Events

```typescript
'payment.created'
'payment.confirmed'
'payment.failed'
'payment.expired'
'subscription.created'
'subscription.activated'
'subscription.canceled'
'subscription.payment_failed'
'split.completed'
'split.failed'
'installment.due'
'installment.paid'
'installment.late'
'invoice.sent'
'invoice.paid'
```

### Next.js App Router (Recommended)

```typescript
// app/api/webhooks/zendfi/route.ts
import { createNextWebhookHandler } from '@zendfi/sdk/nextjs';

export const POST = createNextWebhookHandler({
  secret: process.env.ZENDFI_WEBHOOK_SECRET!,
  handlers: {
    'payment.confirmed': async (payment) => {
      // Payment is verified and typed!
      console.log(`💰 Payment confirmed: $${payment.amount}`);
      
      // Update your database
      await db.orders.update({
        where: { id: payment.metadata.orderId },
        data: { 
          status: 'paid',
          transaction_signature: payment.transaction_signature,
        },
      });
      
      // Send confirmation email
      await sendEmail({
        to: payment.customer_email,
        subject: 'Payment Confirmed!',
        template: 'payment-success',
      });
    },
    
    'subscription.activated': async (subscription) => {
      console.log(`Subscription activated for ${subscription.customer_email}`);
      await grantAccess(subscription.customer_email);
    },
  },
});
```

### Next.js Pages Router

```typescript
// pages/api/webhooks/zendfi.ts
import { createPagesWebhookHandler } from '@zendfi/sdk/nextjs';

export default createPagesWebhookHandler({
  secret: process.env.ZENDFI_WEBHOOK_SECRET!,
  handlers: {
    'payment.confirmed': async (payment) => {
      await fulfillOrder(payment.metadata.orderId);
    },
  },
});

// IMPORTANT: Disable body parser for webhook signature verification
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
  express.raw({ type: 'application/json' }), // Preserve raw body!
  createExpressWebhookHandler({
    secret: process.env.ZENDFI_WEBHOOK_SECRET!,
    handlers: {
      'payment.confirmed': async (payment) => {
        console.log('Payment confirmed:', payment.id);
      },
    },
  })
);
```

### Webhook Deduplication (Production)

The handlers use in-memory deduplication by default (fine for development). For production, use Redis or your database:

```typescript
import { createNextWebhookHandler } from '@zendfi/sdk/nextjs';
import { redis } from './lib/redis';

export const POST = createNextWebhookHandler({
  secret: process.env.ZENDFI_WEBHOOK_SECRET!,
  
  // Check if webhook was already processed
  isProcessed: async (eventId) => {
    const exists = await redis.exists(`webhook:${eventId}`);
    return exists === 1;
  },
  
  // Mark webhook as processed
  onProcessed: async (eventId) => {
    await redis.set(`webhook:${eventId}`, '1', 'EX', 86400); // 24h TTL
  },
  
  handlers: {
    'payment.confirmed': async (payment) => {
      // This will only run once, even if webhook retries
      await processPayment(payment);
    },
  },
});
```

### Manual Webhook Verification

For custom implementations:

```typescript
import { verifyNextWebhook } from '@zendfi/sdk/webhooks';

export async function POST(request: Request) {
  const payload = await verifyNextWebhook(request, process.env.ZENDFI_WEBHOOK_SECRET);
  
  if (!payload) {
    return new Response('Invalid signature', { status: 401 });
  }

  // Handle verified payload
  if (payload.event === 'payment.confirmed') {
    await handlePayment(payload.data);
  }
  
  return new Response('OK');
}
```

**Available verifiers:**
- `verifyNextWebhook(request, secret?)` — Next.js App Router
- `verifyExpressWebhook(req, secret?)` — Express
- `verifyWebhookSignature(payload, signature, secret)` — Low-level

---

## Configuration

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `ZENDFI_API_KEY` | Yes* | Your ZendFi API key | `zfi_test_abc123...` |
| `ZENDFI_WEBHOOK_SECRET` | For webhooks | Webhook signature verification | `whsec_abc123...` |
| `ZENDFI_API_URL` | No | Override base URL (for testing) | `http://localhost:3000` |
| `ZENDFI_ENVIRONMENT` | No | Force environment | `development` |

*Required unless you pass `apiKey` directly to `ZendFiClient`

### Custom Client Configuration

```typescript
import { ZendFiClient } from '@zendfi/sdk';

const client = new ZendFiClient({
  apiKey: 'zfi_test_abc123...',
  baseURL: 'https://api.zendfi.tech', // Optional
  timeout: 30000, // 30 seconds (default)
  retries: 3, // Auto-retry attempts (default)
  idempotencyEnabled: true, // Auto idempotency (default)
  debug: false, // Log requests/responses (default: false)
});

// Use custom client
const payment = await client.createPayment({
  amount: 50,
  description: 'Test payment',
});
```

### Using Multiple Clients (Test + Live)

```typescript
import { ZendFiClient } from '@zendfi/sdk';

// Test client for development
const testClient = new ZendFiClient({
  apiKey: process.env.ZENDFI_TEST_API_KEY,
});

// Live client for production
const liveClient = new ZendFiClient({
  apiKey: process.env.ZENDFI_LIVE_API_KEY,
});

// Use the appropriate client based on environment
const client = process.env.NODE_ENV === 'production' ? liveClient : testClient;
```

---

## Error Handling

The SDK throws typed errors that you can catch and handle appropriately:

```typescript
import { 
  ZendFiError,
  AuthenticationError, 
  ValidationError,
  PaymentError,
  NetworkError,
  RateLimitError,
} from '@zendfi/sdk';

try {
  const payment = await zendfi.createPayment({
    amount: 50,
    description: 'Test',
  });
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Invalid API key
    console.error('Authentication failed. Check your API key.');
  } else if (error instanceof ValidationError) {
    // Invalid request data
    console.error('Validation error:', error.message);
  } else if (error instanceof PaymentError) {
    // Payment-specific error
    console.error('Payment failed:', error.message);
  } else if (error instanceof NetworkError) {
    // Network/timeout error
    console.error('Network error. Retrying...');
    // SDK auto-retries by default
  } else if (error instanceof RateLimitError) {
    // Rate limit exceeded
    console.error('Rate limit hit. Please slow down.');
  } else {
    // Generic error
    console.error('Unexpected error:', error);
  }
}
```

### Error Types

| Error Type | When It Happens | How to Handle |
|------------|----------------|---------------|
| `AuthenticationError` | Invalid API key | Check your API key |
| `ValidationError` | Invalid request data | Fix request parameters |
| `PaymentError` | Payment processing failed | Show user-friendly message |
| `NetworkError` | Network/timeout issues | Retry automatically (SDK does this) |
| `RateLimitError` | Too many requests | Implement exponential backoff |
| `ApiError` | Generic API error | Log and investigate |

---

## Testing

### Using Test Mode

```typescript
// .env.local
ZENDFI_API_KEY=zfi_test_your_test_key

// Your code
const payment = await zendfi.createPayment({
  amount: 100,
  description: 'Test payment',
});

// Payment created on Solana devnet (free test SOL)
console.log(payment.mode); // "test"
```

### Getting Test SOL

1. Go to [sol-faucet.com](https://www.sol-faucet.com/)
2. Paste your Solana wallet address
3. Click "Airdrop" to get free devnet SOL
4. Use this wallet for testing payments

### Test Payment Flow

```typescript
// 1. Create payment
const payment = await zendfi.createPayment({
  amount: 10,
  description: 'Test $10 payment',
});

// 2. Open payment URL in browser (or send to customer)
console.log('Pay here:', payment.payment_url);

// 3. Customer pays with devnet SOL/USDC

// 4. Check status
const updated = await zendfi.getPayment(payment.id);
console.log('Status:', updated.status); // "Confirmed"

// 5. Webhook fires automatically
// Your webhook handler receives 'payment.confirmed' event
```

---

## Examples

### Embedded Checkout Integration

```typescript
import { ZendFiEmbeddedCheckout } from '@zendfi/sdk';

// React Component
function CheckoutPage({ linkCode }) {
  const containerRef = useRef(null);
  
  useEffect(() => {
    const checkout = new ZendFiEmbeddedCheckout({
      linkCode,
      containerId: 'checkout-container',
      mode: 'test',
      
      onSuccess: (payment) => {
        // Payment successful - redirect or show confirmation
        router.push(`/success?payment=${payment.paymentId}`);
      },
      
      onError: (error) => {
        // Handle errors
        setError(error.message);
      },
      
      theme: {
        primaryColor: '#8b5cf6',
        borderRadius: '16px',
      },
    });
    
    checkout.mount();
    return () => checkout.unmount();
  }, [linkCode]);
  
  return <div id="checkout-container" ref={containerRef} />;
}
```

### E-commerce Checkout

```typescript
// 1. Customer adds items to cart
const cart = {
  items: [
    { name: 'T-Shirt', price: 25 },
    { name: 'Hoodie', price: 45 },
  ],
  total: 70,
};

// 2. Create payment
const payment = await zendfi.createPayment({
  amount: cart.total,
  description: `Order: ${cart.items.map(i => i.name).join(', ')}`,
  customer_email: user.email,
  redirect_url: 'https://yourstore.com/orders/success',
  metadata: {
    cart_id: cart.id,
    user_id: user.id,
    items: cart.items,
  },
});

// 3. Redirect to checkout
window.location.href = payment.payment_url;

// 4. Handle webhook (payment.confirmed)
// - Mark order as paid
// - Send confirmation email
// - Trigger fulfillment
```

### SaaS Subscription

```typescript
// 1. Create subscription plan (one-time setup)
const plan = await zendfi.createSubscriptionPlan({
  name: 'Pro Plan',
  amount: 29.99,
  interval: 'monthly',
  trial_days: 14,
});

// 2. Subscribe user
const subscription = await zendfi.createSubscription({
  plan_id: plan.id,
  customer_email: user.email,
  customer_wallet: user.wallet,
  metadata: {
    user_id: user.id,
  },
});

// 3. Handle webhooks
// - subscription.activated → Grant access
// - subscription.payment_failed → Send reminder
// - subscription.canceled → Revoke access
```

---

## Troubleshooting

### "Authentication failed" error

**Problem:** Invalid API key

**Solution:**
```bash
# Check your .env file
cat .env | grep ZENDFI_API_KEY

# Make sure it starts with zfi_test_ or zfi_live_
# Get fresh API key from: https://dashboard.zendfi.tech
```

### Webhook signature verification fails

**Problem:** Body parser consuming raw request body

**Solutions:**

**Next.js App Router:** No action needed ✅

**Next.js Pages Router:**
```typescript
export const config = {
  api: { bodyParser: false }, // Add this!
};
```

**Express:**
```typescript
app.post(
  '/webhooks',
  express.raw({ type: 'application/json' }), // Use raw() not json()
  webhookHandler
);
```

### "Payment not found" error

**Problem:** Using test API key to query live payment (or vice versa)

**Solution:** Make sure your API key mode matches the payment's mode:
- Test payments: use `zfi_test_` key
- Live payments: use `zfi_live_` key

### Payments stuck in "Pending"

**Possible causes:**
1. Customer hasn't paid yet
2. Insufficient funds in customer wallet
3. Transaction failed on-chain

**Debug:**
```typescript
const payment = await zendfi.getPayment(payment_id);
console.log('Status:', payment.status);
console.log('Expires:', payment.expires_at);

// Payments expire after 15 minutes
// Check if it expired before customer paid
```

### TypeScript errors with imports

**Problem:** Module resolution issues

**Solution:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "bundler", // or "node16"
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  }
}
```

---

## Contributing

We welcome contributions! Here's how to get started:

```bash
# Clone the repo
git clone https://github.com/zendfi/zendfi-toolkit.git
cd zendfi-toolkit

# Install dependencies
pnpm install

# Build the SDK
cd packages/sdk
pnpm build

# Run tests (if available)
pnpm test

# Make your changes, then open a PR!
```

---

## Resources

- **Documentation:** [docs.zendfi.tech](https://docs.zendfi.tech)
- **API Reference:** [docs.zendfi.tech/api](https://docs.zendfi.tech/api)
- **Dashboard:** [dashboard.zendfi.tech](https://dashboard.zendfi.tech)
- **GitHub:** [github.com/zendfi/zendfi-toolkit](https://github.com/zendfi/zendfi-toolkit)
- **Discord:** [discord.gg/zendfi](https://discord.gg/zendfi)
- **Email:** dev@zendfi.tech

---

## License

MIT © ZendFi

---

## Support

Need help? We're here for you!

- **Discord:** [discord.gg/zendfi](https://discord.gg/zendfi)
- **Email:** dev@zendfi.tech  
- **Bug Reports:** [GitHub Issues](https://github.com/zendfi/zendfi-toolkit/issues)
- **Docs:** [docs.zendfi.tech](https://docs.zendfi.tech)

---

**Built with ❤️ by the ZendFi team**
