# {{PROJECT_NAME}}

A Next.js SaaS application with subscription management powered by ZendFi.

## Features

- 🎯 Subscription Plans (Free, Pro, Enterprise)
- 💳 Crypto Payments with ZendFi
- 📊 Usage Tracking
- 👤 User Dashboard
- 🔔 Webhook Handling
- 📈 Analytics Dashboard
- 🔐 Authentication Ready
- 💰 Payment History

## Getting Started

1. **Configure your environment**

   Update `.env`:
   ```bash
   ZENDFI_API_KEY=your_api_key_here
   ZENDFI_WEBHOOK_SECRET=your_webhook_secret_here
   ```

2. **Run the development server**

   ```bash
   npm run dev
   ```

3. **Configure webhooks**

   Set your webhook URL in the ZendFi dashboard:
   ```
   https://yourdomain.com/api/webhooks/zendfi
   ```

## Subscription Plans

### Free Tier
- $0/month
- Basic features
- Limited usage
- Community support

### Pro Tier
- $29/month (in crypto)
- Advanced features
- Increased limits
- Priority support

### Enterprise Tier
- $99/month (in crypto)
- All features
- Unlimited usage
- Dedicated support
- Custom integrations

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── subscribe/route.ts     # Create subscriptions
│   │   └── webhooks/
│   │       └── zendfi/route.ts    # Webhook handler
│   ├── dashboard/                  # User dashboard
│   ├── pricing/                    # Pricing page
│   └── page.tsx                    # Landing page
├── lib/
│   ├── zendfi.ts                  # ZendFi SDK
│   ├── plans.ts                   # Subscription plans
│   └── subscriptions.ts           # Subscription logic
└── components/                     # React components
```

## Webhooks

The webhook handler (`app/api/webhooks/zendfi/route.ts`) automatically handles:
- ✅ Subscription activation
- 🔄 Subscription renewal
- ⚠️ Payment failures
- ❌ Subscription cancellation

## Learn More

- [ZendFi Documentation](https://docs.zendfi.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [Join our Discord](https://discord.gg/zendfi)

## Deploy

Deploy to Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/{{PROJECT_NAME}})

Don't forget to add environment variables!
