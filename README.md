# ZendFi Toolkit

The easiest way to integrate crypto payments into your application.

## Packages

This monorepo contains:

### [@zendfi/sdk](./packages/sdk)
Zero-config TypeScript SDK for ZendFi payments
```bash
npm install @zendfi/sdk
```

### [create-zendfi-app](./packages/cli)
CLI tool to scaffold a working ZendFi integration in 2 minutes
```bash
npx create-zendfi-app my-app
```

### [Templates](./packages/templates)
Production-ready starter templates:
- Next.js E-commerce
- Next.js SaaS
- Express API

## Quick Start

### For New Projects
```bash
npx create-zendfi-app my-store
cd my-store
npm run dev
```

Your payment-enabled app is now running at `http://localhost:3000`! 🎉

### For Existing Projects
```bash
npm install @zendfi/sdk
```

```typescript
import { zendfi } from '@zendfi/sdk';

// That's it! Auto-configured from environment
const payment = await zendfi.payments.create({
  amount: 50,
  description: 'Premium subscription',
});

console.log(payment.checkout_url);
```

## Features

- **Zero Configuration** - Works out of the box
- **Auto Environment Detection** - Switches between test/prod automatically
- **Built-in Retries** - Handles transient errors gracefully
- **Idempotency** - Prevents duplicate payments automatically
- **Full TypeScript Support** - Complete type definitions
- **Production Ready** - Battle-tested best practices

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Development mode (watch)
pnpm dev
```

## Documentation

- [SDK Documentation](./packages/sdk/README.md)
- [CLI Documentation](./packages/cli/README.md)
- [API Reference](https://docs.zendfi.tech)
- [Integration Guides](https://docs.zendfi.tech/guides)

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## License

MIT © ZendFi

---

**Built with ❤️ by the ZendFi Team**
