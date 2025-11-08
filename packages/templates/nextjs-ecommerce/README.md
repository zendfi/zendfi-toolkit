# {{PROJECT_NAME}}

> A production-ready Next.js e-commerce application powered by ZendFi for crypto payments.

Built with Next.js 14, Prisma, NextAuth, and Tailwind CSS. Accept crypto payments in minutes!

## Features

### Customer-Facing
- **Product Catalog** - Browse products with beautiful UI
- **Shopping Cart** - Add/remove items with real-time updates
- **Crypto Checkout** - Accept USDC, SOL, USDT via ZendFi
- **Order Confirmation** - Email receipts and updates
- **User Accounts** - Track orders and manage profile
- **Responsive Design** - Works perfectly on mobile

### Admin Dashboard
- **Product Management** - CRUD operations for products
- **Order Management** - View and update order status
- **Customer List** - View customer information
- **Analytics** - Revenue and sales tracking (coming soon)
- **Role-Based Access** - Admin-only protected routes

### Technical Features
- **Production-Ready** - Database, auth, payments all set up
- **Webhook Handling** - Automatic order updates on payment
- **Type-Safe** - Full TypeScript support
- **Database** - PostgreSQL with Prisma ORM
- **Authentication** - NextAuth.js with credentials provider

## Quick Start

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database (or use Neon, Supabase, Railway)
- ZendFi API key ([get one here](https://dashboard.zendfi.com))

### 1. Install Dependencies

```bash
npm install
# or
pnpm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update:

```bash
cp .env.example .env
```

**Required environment variables:**

```env
# ZendFi (get from https://dashboard.zendfi.com)
ZENDFI_API_KEY=zfi_test_your_key_here (use zfi_live_key in production only!)
ZENDFI_WEBHOOK_SECRET=your_webhook_secret

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-a-random-secret-here

# Email (optional, for order notifications)
RESEND_API_KEY=re_your_key_here
```

### 3. Setup Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed with sample data
npm run db:seed
```

This creates:
- Admin user: `admin@example.com` / `admin123`
- 9 sample products

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) - your store is live! 🎉

### 5. Access Admin Dashboard

Navigate to [http://localhost:3000/admin](http://localhost:3000/admin) and login with:
- Email: `admin@example.com`
- Password: `admin123`

⚠️ **Change the admin password in production!**

## 📁 Project Structure

```
├── app/
│   ├── (shop)/                         # Customer-facing pages
│   │   ├── page.tsx                    # Home (product grid)
│   │   ├── cart/page.tsx               # Shopping cart
│   │   └── success/page.tsx            # Order confirmation
│   ├── (admin)/                        # Admin dashboard
│   │   ├── layout.tsx                  # Admin layout with sidebar
│   │   ├── page.tsx                    # Dashboard home
│   │   ├── products/                   # Product management
│   │   │   ├── page.tsx                # Product list
│   │   │   ├── new/page.tsx            # Create product
│   │   │   └── [id]/page.tsx           # Edit product
│   │   └── orders/                     # Order management
│   │       ├── page.tsx                # Order list
│   │       └── [id]/page.tsx           # Order details
│   ├── api/
│   │   ├── auth/[...nextauth]/         # NextAuth endpoints
│   │   ├── products/                   # Product API
│   │   ├── orders/                     # Order API
│   │   ├── checkout/route.ts           # Create ZendFi payment
│   │   └── webhooks/zendfi/route.ts    # ZendFi webhook handler
│   └── auth/
│       ├── signin/page.tsx             # Sign in page
│       └── signup/page.tsx             # Sign up page
├── lib/
│   ├── db.ts                           # Prisma client
│   ├── auth.ts                         # NextAuth configuration
│   ├── zendfi.ts                       # ZendFi SDK instance
│   └── utils.ts                        # Utility functions
├── prisma/
│   ├── schema.prisma                   # Database schema
│   └── seed.ts                         # Seed script
└── components/                         # React components
```

## Customization

### Update Branding

1. **Logo & Colors** - Edit `app/layout.tsx` and `tailwind.config.ts`
2. **Product Categories** - Modify in `app/(shop)/page.tsx`
3. **Email Templates** - Update in `app/api/webhooks/zendfi/route.ts`

### Add More Products

**Option 1: Admin Dashboard**
- Go to `/admin/products/new`
- Fill in product details
- Upload image URL
- Set stock and price

**Option 2: Database Seeding**
- Edit `prisma/seed.ts`
- Add products to the array
- Run: `npm run db:seed`

### Configure Webhooks

1. Go to [ZendFi Dashboard](https://dashboard.zendfi.com)
2. Navigate to **Settings → Webhooks**
3. Add webhook URL: `https://yourdomain.com/api/webhooks/zendfi`
4. Copy webhook secret to `.env`

Webhook events handled:
- `payment.confirmed` - Updates order status to "paid"
- `payment.failed` - Updates order status to "cancelled"

## Deployment

### Deploy to Vercel

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin your-repo-url
   git push -u origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your repository
   - Add environment variables
   - Deploy!

3. **Setup Production Database**
   - Use [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Railway](https://railway.app)
   - Update `DATABASE_URL` in Vercel
   - Run migrations from Vercel dashboard

4. **Update ZendFi Webhook**
   - Set webhook URL to: `https://yourdomain.com/api/webhooks/zendfi`

### Environment Variables for Production

```env
# ZendFi (use LIVE keys for production)
ZENDFI_API_KEY=zfi_live_your_production_key
ZENDFI_WEBHOOK_SECRET=your_production_webhook_secret

# Database
DATABASE_URL=your_production_database_url

# NextAuth
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=generate_new_secret_for_production

# Email
RESEND_API_KEY=your_resend_key
```

## 🛠️ Development

### Database Commands

```bash
# Generate Prisma client
npm run db:generate

# Create/update database schema
npm run db:push

# Open Prisma Studio (database GUI)
npm run db:studio

# Seed database with sample data
npm run db:seed
```

### Testing Payments

1. Use test mode (`zfi_test_` API key)
2. Get free devnet SOL from [sol-faucet.com](https://www.sol-faucet.com/)
3. Use Phantom or Solflare wallet on devnet
4. Test full checkout flow

## Learn More

- **ZendFi Docs** - [docs.zendfi.com](https://docs.zendfi.com)
- **Next.js Docs** - [nextjs.org/docs](https://nextjs.org/docs)
- **Prisma Docs** - [prisma.io/docs](https://prisma.io/docs)
- **NextAuth Docs** - [next-auth.js.org](https://next-auth.js.org)

## Troubleshooting

### "Prisma Client not generated"
```bash
npm run db:generate
```

### "Database connection error"
- Check `DATABASE_URL` in `.env`
- Ensure PostgreSQL is running
- Verify connection string format

### "Webhook not receiving events"
- Check webhook URL is correct
- Verify webhook secret matches
- Check server logs for errors
- Use [ngrok](https://ngrok.com) for local testing

### "Admin login not working"
- Run `npm run db:seed` to create admin user
- Default credentials: `admin@example.com` / `admin123`

## License

MIT © ZendFi

---

**Need help?** Join our [Discord](https://discord.gg/zendfi) or email support@zendfi.tech
