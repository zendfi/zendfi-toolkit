# create-zendfi-app

> Payments in 7 lines of code. Built for Solana e-commerce.

[![npm version](https://img.shields.io/npm/v/create-zendfi-app.svg)](https://www.npmjs.com/package/zendfi)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

This package includes **two powerful tools**:

1. **`create-zendfi-app`** - Scaffold new crypto payment apps
2. **`zendfi`** - CLI for payments, webhooks, and testing

**Why ZendFi?**
- 0.6% flat fee (vs. Stripe's 2.9% + 30¢) = 81% savings
- Accept SOL, USDC, USDT on Solana
- Production-ready templates with Next.js & Express

---

## Installation

### Quick Start (No Installation)

```bash
# Create a new app instantly
npx create-zendfi-app my-store
```

### Global Installation (Recommended)

```bash
# Install globally to get both tools
npm install -g create-zendfi-app

# Now you can use both commands:
create-zendfi-app my-app
zendfi init
```

---

## create-zendfi-app

Scaffold a new crypto payment application with production-ready templates.

### Usage

```bash
# Interactive mode (recommended)
npx create-zendfi-app my-store

# With template specified
npx create-zendfi-app my-store --template nextjs-ecommerce

# Skip prompts
npx create-zendfi-app my-store --template nextjs-saas --skip-install
```

### Available Templates

#### Next.js E-commerce (`nextjs-ecommerce`)

Full-featured online store built with Next.js 14 App Router:

- Product catalog with filtering
- Shopping cart with persistent state
- Crypto checkout (SOL, USDC, USDT)
- Order management system
- Admin dashboard
- Webhook handlers with signature verification
- Prisma database integration
- NextAuth.js authentication
- Tailwind CSS styling
- TypeScript throughout

**Perfect for:** E-commerce stores, digital product sales, NFT marketplaces

#### Next.js SaaS (`nextjs-saas`)

Modern SaaS application with subscription billing:

- User authentication & authorization
- Subscription plan management
- Recurring crypto payments
- Usage tracking & analytics
- Pricing page with multiple tiers
- Customer dashboard
- Webhook handlers for subscription events
- Automatic access control
- Responsive design

**Perfect for:** SaaS platforms, membership sites, premium content services

#### Express API (`express-api`)

Backend API server with crypto payment endpoints:

- RESTful API architecture
- Payment processing endpoints
- Webhook handling with verification
- Prisma ORM for database
- JWT authentication
- Rate limiting middleware
- Input validation
- Error handling
- Docker support
- TypeScript

**Perfect for:** Mobile apps, frontend-backend separation, microservices

### Command Options

```bash
create-zendfi-app [project-name] [options]

Options:
  --template <name>    Template to use (nextjs-ecommerce, nextjs-saas, express-api)
  --skip-install       Skip dependency installation
  --skip-git           Skip git initialization
  -h, --help           Display help
  -v, --version        Display version
```

---

## zendfi CLI

Manage your ZendFi integration from the command line.

### Installation

```bash
# Install globally
npm install -g create-zendfi-app

# Or use npx (no installation needed)
npx zendfi --help
```

### Core Commands

These are the commands you'll use for most payment integrations.

#### `zendfi init`

Add ZendFi to an existing project

```bash
# Interactive setup
zendfi init

# Specify framework
zendfi init --framework nextjs

# Skip dependency installation
zendfi init --skip-install
```

**What it does:**
- Installs `@zendfi/sdk`
- Creates `.env` file with configuration
- Adds example webhook handler
- Creates sample payment code

**Supported frameworks:** Next.js, Express, React

---

#### `zendfi payment create`

Create test payments for development

```bash
# Interactive mode
zendfi payment create

# Quick test payment
zendfi payment create --amount 50 --open

# Full options
zendfi payment create \
  --amount 100 \
  --description "Premium subscription" \
  --email customer@example.com \
  --open \
  --watch
```

**Options:**
- `--amount <number>` - Payment amount in USD
- `--description <text>` - Payment description
- `--email <email>` - Customer email
- `--open` - Open payment URL in browser
- `--watch` - Watch payment status in real-time

---

#### `zendfi payment status <payment-id>`

Check payment status in real-time

```bash
zendfi payment status pay_test_abc123xyz
```

**Output:**
```
Payment Status: pay_test_abc123xyz

Status: Confirmed
Amount: $50.00 USD
Currency: USDC
Customer: customer@example.com
Created: 2025-11-09 10:30:15 AM
Confirmed: 2025-11-09 10:31:42 AM

Transaction:
  Signature: 5x7yZ9...abc123
  Block: 12345678
  Network: Solana Devnet
```

---

#### `zendfi webhooks listen`

Listen for webhooks during local development

```bash
# Listen on default port (3000)
zendfi webhooks listen

# Custom port
zendfi webhooks listen --port 4000

# Forward to specific endpoint
zendfi webhooks listen --forward-to http://localhost:3000/api/webhooks
```

**Features:**
- Real-time webhook event display
- Signature verification testing
- Event payload inspection
- Automatic forwarding to your local server
- Support for all webhook events

**Output:**
```
Webhook listener started

Listening on: http://localhost:3000/webhooks
Forwarding to: http://localhost:3000/api/webhooks/zendfi

Waiting for webhooks...

[10:45:23] payment.confirmed
  Payment ID: pay_test_xyz789
  Amount: $25.00 USDC
  Customer: user@example.com
  ✓ Signature verified
  ✓ Forwarded to endpoint
```

---

#### `zendfi keys`

Manage your ZendFi API keys

##### List all API keys

```bash
zendfi keys list
```

**Output:**
```
API Keys:

Test Keys (Devnet)
  zfi_test_abc123... (My Dev Key)    Created: 2025-11-01  Last used: 2 hours ago
  zfi_test_xyz789... (Staging)       Created: 2025-10-15  Last used: Never

Live Keys (Mainnet)
  zfi_live_def456... (Production)    Created: 2025-09-20  Last used: 5 minutes ago
```

##### Create new API key

```bash
# Interactive
zendfi keys create

# With options
zendfi keys create --name "Production Key" --mode live
zendfi keys create --name "Development" --mode test
```

##### Rotate API key

```bash
zendfi keys rotate key_abc123xyz
```

**What it does:**
- Generates new key with same permissions
- Provides 24-hour grace period for old key
- Updates your `.env` file automatically
- Shows migration instructions

---

## Sub-Accounts

Manage merchant-controlled sub-accounts and delegation tokens from the CLI.

```bash
# Create sub-account
zendfi subaccounts create --label user_paschal_001 --spend-limit 500

# List sub-accounts
zendfi subaccounts list

# Inspect one sub-account
zendfi subaccounts get sa_xxxxx

# Get balances
zendfi subaccounts balance sa_xxxxx

# Mint delegated token
zendfi subaccounts token sa_xxxxx --scope withdraw_only --spend-limit 100 --ttl 900 --single-use

# Drain to merchant wallet
zendfi subaccounts drain sa_xxxxx --amount 25 --token Usdc --mode live --passkey-file ./passkey-signature.json

# Withdraw to external wallet (with optional delegated token)
zendfi subaccounts withdraw sa_xxxxx --to 7xKX...AsU --amount 10 --token Usdc --delegation-token satk_xxxxx --passkey-file ./passkey-signature.json

# Withdraw to bank with automated proxy-email OTP
zendfi subaccounts withdraw-bank sa_xxxxx --amount 25 --bank-id 9PSB7A2A2LJZ3H6Q4G8XJ6A4 --account-number 0123456789 --automation-token saatk_xxxxx --passkey-file ./passkey-signature.json

# Mint and revoke bounded automation token
zendfi subaccounts automation-token-mint --subaccount-id sa_xxxxx --ttl 3600 --max-uses 25 --total-limit 500 --per-tx-limit 50 --bank-ids 9PSB7A2A2LJZ3H6Q4G8XJ6A4 --account-numbers 0123456789
zendfi subaccounts automation-token-revoke 0f8fad5b-d9cb-469f-a165-70867728950e

# Freeze and close
zendfi subaccounts freeze sa_xxxxx --reason "fraud-review"
zendfi subaccounts close sa_xxxxx
```

Sensitive operations require WebAuthn proof payload file:

```bash
zendfi subaccounts drain sa_xxxxx --passkey-file ./passkey-signature.json
zendfi subaccounts withdraw sa_xxxxx --to <wallet> --amount 25 --passkey-file ./passkey-signature.json
zendfi subaccounts withdraw-bank sa_xxxxx --amount 25 --bank-id <bank_id> --account-number <acct> --passkey-file ./passkey-signature.json
```

Use either `--automation-token` or `--delegation-token` for `withdraw-bank`, not both.

Passkey payload file format:

```json
{
  "credential_id": "...",
  "authenticator_data": [1, 2, 3],
  "signature": [4, 5, 6],
  "client_data_json": [7, 8, 9]
}
```

---

## Payment Intents

Create payment intents for two-phase checkout flows (Stripe-like).

```bash
# Create a payment intent
zendfi intents create --amount 99.99

# Confirm an intent
zendfi intents confirm <intent-id> --wallet Hx7B...abc

# List all intents
zendfi intents list
```

---

## PPP Pricing

Purchasing Power Parity pricing for global reach.

```bash
# Get PPP factor for a country
zendfi ppp check BR --price 99.99

# List all PPP factors
zendfi ppp factors
```

**Output:**
```
PPP Factor Lookup

  🇧🇷 Brazil (BR)
  PPP Factor: 0.35
  Discount: 65%
  
  Example: $100 → $35.00
```

---

## Quick Start Guide

### 1. Create a New App

```bash
npx create-zendfi-app my-store
cd my-store
```

### 2. Get Your API Keys

Visit [dashboard.zendfi.tech](https://dashboard.zendfi.tech) - sign up takes 30 seconds.

### 3. Test Your Integration

```bash
# Create a test payment (uses free Solana devnet)
zendfi payment create --amount 10 --open

# Watch for webhooks
zendfi webhooks listen
```

### 4. Deploy to Production

```bash
# Switch to live API key in .env
ZENDFI_API_KEY=zfi_live_your_key_here

# Build and deploy
npm run build
npm start
```

**That's it!** You're accepting crypto payments.

---

## Template Features Comparison

| Feature | E-commerce | SaaS | Express API |
|---------|-----------|------|-------------|
| **Frontend** | Next.js | Next.js | API Only |
| **One-time Payments** | ✅ | ✅ | ✅ |
| **Subscriptions** | ❌ | ✅ | ✅ |
| **Shopping Cart** | ✅ | ❌ | ❌ |
| **Admin Dashboard** | ✅ | ✅ | ❌ |
| **Authentication** | NextAuth | NextAuth | JWT |
| **Database** | Prisma | Prisma | Prisma |
| **Webhooks** | ✅ | ✅ | ✅ |
| **Docker** | ❌ | ❌ | ✅ |
| **TypeScript** | ✅ | ✅ | ✅ |
| **Best For** | Stores, NFTs | SaaS, Memberships | Mobile, Microservices |

---

## Security Best Practices

### Webhook Verification

All templates include automatic webhook signature verification:

```typescript
// Auto-generated in your project
import { createNextWebhookHandler } from '@zendfi/sdk/nextjs';

export const POST = createNextWebhookHandler({
  secret: process.env.ZENDFI_WEBHOOK_SECRET!,
  handlers: {
    'payment.confirmed': async (payment) => {
      // Signature already verified
      // Payload already validated
      await fulfillOrder(payment.metadata.order_id);
    },
  },
});
```

### API Key Management

- Use `zfi_test_` keys for development (free devnet)
- Use `zfi_live_` keys for production (real mainnet)
- Never commit `.env` files to git
- Rotate keys regularly with `zendfi keys rotate`
- Use different keys for different environments

### Environment Variables

```env
# Good - Separate keys per environment
ZENDFI_TEST_API_KEY=zfi_test_...
ZENDFI_LIVE_API_KEY=zfi_live_...

# Bad - Same key everywhere
ZENDFI_API_KEY=zfi_live_...  # Don't use live keys in dev!
```

---

## Documentation

- **Main Docs:** [docs.zendfi.tech](https://docs.zendfi.tech)
- **SDK Reference:** [docs.zendfi.tech/sdk](https://docs.zendfi.tech/sdk)
- **API Reference:** [docs.zendfi.tech/api](https://docs.zendfi.tech/api)
- **Webhook Events:** [docs.zendfi.tech/webhooks](https://docs.zendfi.tech/webhooks)
- **Dashboard:** [dashboard.zendfi.tech](https://dashboard.zendfi.tech)

---

## Examples

### Create E-commerce Store

```bash
npx create-zendfi-app crypto-store --template nextjs-ecommerce
cd crypto-store
zendfi payment create --amount 50 --open
```

### Create SaaS Platform

```bash
npx create-zendfi-app my-saas --template nextjs-saas
cd my-saas
zendfi payment create --amount 29.99 --description "Pro Plan"
```

### Add ZendFi to Existing Next.js App

```bash
cd my-existing-app
zendfi init --framework nextjs
zendfi payment create --amount 100
```

### Build Payment API

```bash
npx create-zendfi-app payment-api --template express-api
cd payment-api
docker-compose up -d
zendfi payment create --amount 25
```

---

## Troubleshooting

### "API key invalid" error

**Solution:** Verify your API key format
```bash
# Test keys start with zfi_test_
# Live keys start with zfi_live_

# List your keys
zendfi keys list
```

### Payment stuck in "Pending"

**Solution:** Check if customer completed payment
```bash
# Check payment status
zendfi payment status pay_test_abc123

# Test mode uses free devnet - get test SOL at:
# https://sol-faucet.com
```

### Webhook signature verification fails

**Solution:** Check your webhook secret
```bash
# Make sure ZENDFI_WEBHOOK_SECRET is set correctly
echo $ZENDFI_WEBHOOK_SECRET

# Test webhooks locally
zendfi webhooks listen
```

---

## Contributing

We welcome contributions! Here's how:

```bash
# Clone the repo
git clone https://github.com/zendfi/zendfi-toolkit.git
cd zendfi-toolkit/packages/cli

# Install dependencies
pnpm install

# Make changes

# Build
pnpm build

# Test locally
node dist/index.js my-test-app
```

---

## License

MIT © ZendFi

---

## Support

Need help? We're here for you!

- **Discord:** [discord.gg/zendfi](https://discord.gg/zendfi)
- **Email:** support@zendfi.tech
- **Bug Reports:** [GitHub Issues](https://github.com/zendfi/zendfi-toolkit/issues)
- **Docs:** [docs.zendfi.tech](https://zendfi.tech/docs)

---

**Built with ❤️ by the ZendFi team**
