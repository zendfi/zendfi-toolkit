# {{PROJECT_NAME}}

A Next.js e-commerce application powered by ZendFi for crypto payments.

## Features

- 🛍️ Product catalog
- 🛒 Shopping cart
- 💳 Crypto checkout with ZendFi
- ✅ Order confirmation
- 🔔 Webhook handling
- 📊 Admin dashboard (embedded)

## Getting Started

1. **Configure your environment**

   Update `.env` with your ZendFi credentials:
   ```bash
   ZENDFI_API_KEY=your_api_key_here
   ZENDFI_WEBHOOK_SECRET=your_webhook_secret_here
   ```

2. **Run the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to see your store.

3. **Configure webhooks**

   - Go to the ZendFi dashboard
   - Set your webhook URL: `https://yourdomain.com/api/webhooks/zendfi`
   - The webhook handler is already implemented in `app/api/webhooks/zendfi/route.ts`

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── checkout/route.ts      # Create payment links
│   │   └── webhooks/
│   │       └── zendfi/route.ts    # Webhook handler
│   ├── products/                   # Product pages
│   ├── cart/                       # Shopping cart
│   └── page.tsx                    # Home page
├── lib/
│   ├── zendfi.ts                  # ZendFi SDK instance
│   ├── products.ts                # Product data
│   └── cart.ts                    # Cart utilities
└── components/                     # React components
```

## Learn More

- [ZendFi Documentation](https://docs.zendfi.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [Join our Discord](https://discord.gg/zendfi)

## Deploy

Deploy to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/{{PROJECT_NAME}})

Don't forget to add your environment variables in the Vercel dashboard!
