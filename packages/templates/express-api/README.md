# {{PROJECT_NAME}}

Express.js API with ZendFi crypto payment integration.

## Features

- 🚀 Express.js REST API
- 💳 Crypto payment processing
- 🔔 Webhook handling with HMAC verification
- 🔐 CORS & Helmet security
- 📝 TypeScript
- 🔄 Hot reload in development
- ✅ Error handling middleware

## API Endpoints

### Payments
- `POST /api/payments/create` - Create a payment link
- `GET /api/payments/:id` - Get payment status
- `GET /api/payments` - List all payments

### Webhooks
- `POST /api/webhooks/zendfi` - ZendFi webhook handler (HMAC-verified)

### Health
- `GET /health` - Health check endpoint

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   
   Update `.env`:
   ```bash
   ZENDFI_API_KEY=your_api_key_here
   ZENDFI_WEBHOOK_SECRET=your_webhook_secret_here
   PORT=3000
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   npm start
   ```

## Project Structure

```
├── src/
│   ├── index.ts                    # Server entry point
│   ├── config/
│   │   └── zendfi.ts              # ZendFi SDK configuration
│   ├── routes/
│   │   ├── payments.ts            # Payment routes
│   │   └── webhooks.ts            # Webhook routes
│   ├── controllers/
│   │   ├── paymentController.ts   # Payment logic
│   │   └── webhookController.ts   # Webhook handling
│   ├── middleware/
│   │   └── errorHandler.ts        # Error handling
│   └── types/
│       └── index.ts               # TypeScript types
├── .env                            # Environment variables
├── package.json                    # Dependencies
└── tsconfig.json                   # TypeScript config
```

## Example Usage

### Create a Payment

```bash
curl -X POST http://localhost:3000/api/payments/create \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 99.99,
    "currency": "USD",
    "description": "Premium Plan Subscription"
  }'
```

Response:
```json
{
  "success": true,
  "payment": {
    "id": "pay_123",
    "url": "https://pay.zendfi.com/pay_123",
    "amount": 99.99,
    "currency": "USD"
  }
}
```

### Get Payment Status

```bash
curl http://localhost:3000/api/payments/pay_123
```

Response:
```json
{
  "success": true,
  "payment": {
    "id": "pay_123",
    "status": "completed",
    "amount": 99.99,
    "currency": "USD"
  }
}
```

## Webhook Configuration

1. Go to your ZendFi dashboard
2. Set your webhook URL: `https://yourdomain.com/api/webhooks/zendfi`
3. The handler will automatically verify HMAC signatures

## Security

- ✅ HMAC webhook verification
- ✅ CORS protection
- ✅ Helmet security headers
- ✅ Request validation
- ✅ Error handling

## Deploy

### Heroku
```bash
heroku create
git push heroku main
heroku config:set ZENDFI_API_KEY=your_key
```

### Docker
```bash
docker build -t {{PROJECT_NAME}} .
docker run -p 3000:3000 {{PROJECT_NAME}}
```

### Railway/Render
Deploy with one click using the deploy button.

## Learn More

- [ZendFi Documentation](https://docs.zendfi.com)
- [Express.js Guide](https://expressjs.com)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## License

MIT
