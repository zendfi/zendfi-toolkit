# @zendfi/sdk

> Zero-config TypeScript SDK for ZendFi crypto payments

[![npm version](https://img.shields.io/npm/v/@zendfi/sdk.svg)](https://www.npmjs.com/package/@zendfi/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- **Zero Configuration** - Works out of the box, auto-detects environment
- **Type-Safe** - Full TypeScript support with complete type definitions
- **Auto-Retry** - Built-in retry logic with exponential backoff
- **Idempotency** - Automatic idempotency key generation
- **Environment Detection** - Automatically switches between test/production
- **Smart Defaults** - Sensible defaults for all options

## 📦 Installation

```bash
npm install @zendfi/sdk
# or
yarn add @zendfi/sdk
# or
pnpm add @zendfi/sdk
```

## 🚀 Quick Start

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

## 📖 Usage

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

#### Get Payment Status

```typescript
const payment = await zendfi.getPayment('payment_id');

console.log(payment.status); // 'pending' | 'confirmed' | 'failed' | 'expired'
```

#### List Payments

```typescript
const payments = await zendfi.listPayments({
  page: 1,
  limit: 10,
  status: 'confirmed',
  from_date: '2025-01-01',
  to_date: '2025-12-31',
});

console.log(payments.data); // Array of payments
console.log(payments.pagination); // Pagination info
```

### Subscriptions

#### Create a Plan

```typescript
const plan = await zendfi.createSubscriptionPlan({
  name: 'Pro Plan',
  description: 'Access to all premium features',
  amount: 29.99,
  interval: 'monthly',
  trial_days: 14,
});
```

#### Create a Subscription

```typescript
const subscription = await zendfi.createSubscription({
  plan_id: plan.id,
  customer_email: 'customer@example.com',
  metadata: {
    userId: 'user_123',
  },
});
```

#### Cancel a Subscription

```typescript
const canceled = await zendfi.cancelSubscription(subscription.id);
```

### Webhooks

#### Verify Webhook Signature

```typescript
import { zendfi } from '@zendfi/sdk';

// In your webhook handler (e.g., /api/webhooks/zendfi)
export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get('x-zendfi-signature');

  const isValid = zendfi.verifyWebhook({
    payload,
    signature,
    secret: process.env.ZENDFI_WEBHOOK_SECRET!,
  });

  if (!isValid) {
    return new Response('Invalid signature', { status: 401 });
  }

  const event = JSON.parse(payload);

  switch (event.event) {
    case 'payment.confirmed':
      // Handle payment confirmation
      break;
    case 'subscription.activated':
      // Handle subscription activation
      break;
  }

  return new Response('OK', { status: 200 });
}
```

## ⚙️ Configuration

### Environment Variables

The SDK automatically detects and uses these environment variables:

```bash
# API Key (required)
ZENDFI_API_KEY=zfi_test_...

# Or for Next.js
NEXT_PUBLIC_ZENDFI_API_KEY=zfi_test_...

# Or for Create React App
REACT_APP_ZENDFI_API_KEY=zfi_test_...

# Environment (optional, auto-detected)
ZENDFI_ENVIRONMENT=development # or staging, production

# Custom API URL (optional)
ZENDFI_API_URL=https://api.zendfi.tech
```

### Manual Configuration

```typescript
import { ZendFiClient } from '@zendfi/sdk';

const client = new ZendFiClient({
  apiKey: 'zfi_test_...',
  environment: 'development',
  timeout: 30000, // 30 seconds
  retries: 3,
  idempotencyEnabled: true,
});
```

## 🔧 Advanced Features

### Auto Environment Detection

The SDK automatically detects your environment:

| Environment | Detected When                          |
| ----------- | -------------------------------------- |
| Development | `localhost`, `127.0.0.1`, `NODE_ENV=development` |
| Staging     | `*.staging.*`, `*.vercel.app`, `NODE_ENV=staging` |
| Production  | `NODE_ENV=production`, production domains |

### Automatic Retries

The SDK retries failed requests automatically:

- **Server errors (5xx)**: Retries up to 3 times with exponential backoff
- **Network errors**: Retries up to 3 times
- **Client errors (4xx)**: No retry (fix your request)

```typescript
// This will retry automatically on network errors
const payment = await zendfi.createPayment({ amount: 50 });
```

### Idempotency Keys

Prevent duplicate payments with automatic idempotency:

```typescript
// SDK automatically adds: Idempotency-Key: zfi_idem_1234567890_abc123

const payment = await zendfi.createPayment({
  amount: 50,
});

// Safe to retry - won't create duplicate payments
```

## 🎯 TypeScript Support

Full type definitions included:

```typescript
import type {
  Payment,
  PaymentStatus,
  Subscription,
  SubscriptionPlan,
  WebhookEvent,
} from '@zendfi/sdk';

const payment: Payment = await zendfi.createPayment({
  amount: 50,
});

// IntelliSense for all fields
console.log(payment.id);
console.log(payment.status);
console.log(payment.checkout_url);
```

## 🛡️ Error Handling

```typescript
import { AuthenticationError, ValidationError, NetworkError } from '@zendfi/sdk';

try {
  const payment = await zendfi.createPayment({
    amount: 50,
  });
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Invalid API key');
  } else if (error instanceof ValidationError) {
    console.error('Invalid request:', error.details);
  } else if (error instanceof NetworkError) {
    console.error('Network error, will retry automatically');
  }
}
```

## 🌐 Framework Examples

### Next.js App Router

```typescript
// app/api/checkout/route.ts
import { zendfi } from '@zendfi/sdk';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { amount } = await request.json();

  const payment = await zendfi.createPayment({
    amount,
    redirect_url: `${process.env.NEXT_PUBLIC_URL}/success`,
  });

  return NextResponse.json({ url: payment.checkout_url });
}
```

### Express.js

```typescript
import express from 'express';
import { zendfi } from '@zendfi/sdk';

const app = express();

app.post('/api/checkout', async (req, res) => {
  const { amount } = req.body;

  const payment = await zendfi.createPayment({
    amount,
    redirect_url: 'https://yourapp.com/success',
  });

  res.json({ url: payment.checkout_url });
});
```

### React

```typescript
import { useState } from 'react';
import { zendfi } from '@zendfi/sdk';

function CheckoutButton() {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);

    const payment = await zendfi.createPayment({
      amount: 50,
    });

    window.location.href = payment.checkout_url;
  };

  return (
    <button onClick={handleCheckout} disabled={loading}>
      {loading ? 'Creating checkout...' : 'Pay with Crypto'}
    </button>
  );
}
```

## 📚 API Reference

### Methods

| Method                      | Description                |
| --------------------------- | -------------------------- |
| `createPayment()`           | Create a new payment       |
| `getPayment(id)`            | Get payment by ID          |
| `listPayments(options)`     | List all payments          |
| `createSubscriptionPlan()`  | Create subscription plan   |
| `getSubscriptionPlan(id)`   | Get plan by ID             |
| `createSubscription()`      | Create a subscription      |
| `getSubscription(id)`       | Get subscription by ID     |
| `cancelSubscription(id)`    | Cancel a subscription      |
| `verifyWebhook()`           | Verify webhook signature   |

See [full API documentation](https://docs.zendfi.tech/sdk) for detailed reference.

## 🐛 Debugging

Enable debug logs:

```bash
DEBUG=zendfi:* node your-app.js
```

## 🤝 Support

- [Documentation](https://docs.zendfi.tech)
- [API Reference](https://docs.zendfi.tech/api)
- [GitHub Issues](https://github.com/zendfi/zendfi-toolkit/issues)
- Email: dev@zendfi.tech

## 📄 License

MIT © ZendFi
