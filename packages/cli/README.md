# create-zendfi-app

🚀 Create a ZendFi-powered crypto payment app in seconds.

## Usage

```bash
npx create-zendfi-app my-store
```

Or with options:

```bash
npx create-zendfi-app my-store --template nextjs-ecommerce --env production
```

## Templates

### Next.js E-commerce (`nextjs-ecommerce`)
Full-featured online store with:
- Product catalog page
- Shopping cart
- Crypto checkout with ZendFi
- Order confirmation
- Webhook handler
- Admin dashboard integration

### Next.js SaaS (`nextjs-saas`) - Coming Soon
SaaS application template with:
- User authentication
- Subscription management
- Usage tracking
- Payment history
- Admin portal

### Express API (`express-api`) - Coming Soon
Backend API template with:
- REST API endpoints
- Payment processing
- Webhook handling
- Database integration
- Authentication middleware

## Options

- `--template <template>` - Choose a template (default: interactive prompt)
- `--env <environment>` - Set environment (development/production)
- `--skip-install` - Skip dependency installation
- `--skip-git` - Skip git initialization

## Quick Start

1. **Create your app**
   ```bash
   npx create-zendfi-app my-store
   ```

2. **Navigate to your project**
   ```bash
   cd my-store
   ```

3. **Add your ZendFi credentials**
   
   Update `.env`:
   ```env
   ZENDFI_API_KEY=your_api_key_here
   ZENDFI_WEBHOOK_SECRET=your_webhook_secret_here
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Visit [http://localhost:3000](http://localhost:3000)

## Features

✨ **Zero Configuration** - Works out of the box with ZendFi SDK  
🔐 **Production Ready** - HMAC webhook verification included  
💳 **Multiple Cryptocurrencies** - Accept BTC, ETH, USDC, and more  
📱 **Mobile Responsive** - Beautiful UI on all devices  
🚀 **Fast Setup** - From zero to accepting payments in 2 minutes  
📊 **Admin Dashboard** - Embedded ZendFi dashboard for managing payments  

## Documentation

- [ZendFi Documentation](https://docs.zendfi.com)
- [SDK Reference](https://docs.zendfi.com/sdk)
- [Webhook Guide](https://docs.zendfi.com/webhooks)
- [API Reference](https://docs.zendfi.com/api)

## Support

- 📖 [Documentation](https://docs.zendfi.com)
- 💬 [Discord Community](https://discord.gg/zendfi)
- 🐛 [Report Issues](https://github.com/zendfi/zendfi-toolkit/issues)
- ✉️ [Email Support](mailto:support@zendfi.com)

## License

MIT © ZendFi

---

Built with ❤️ by the ZendFi team
