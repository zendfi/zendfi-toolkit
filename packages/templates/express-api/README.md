# {{PROJECT_NAME}}

> Production-ready Express REST API with ZendFi crypto payments, authentication, and database persistence.

Built with Express, TypeScript, Prisma, PostgreSQL, and ZendFi SDK. Accept crypto payments via REST API in minutes!

## ✨ Features

### Core Features
- **🔐 Authentication** - JWT-based auth with bcrypt password hashing
- **🔑 API Keys** - Generate and manage API keys for third-party integrations
- **💳 Crypto Payments** - Accept USDC, SOL, USDT via ZendFi
- **📊 Database** - PostgreSQL with Prisma ORM for data persistence
- **🪝 Webhooks** - Automatic payment confirmation handling
- **⚡ Rate Limiting** - Protect API from abuse
- **🔒 Security** - Helmet, CORS, input validation with Zod
- **🐳 Docker** - Ready for containerized deployment

### API Endpoints

**Authentication:**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get session token
- `GET /api/auth/profile` - Get current user profile (protected)
- `POST /api/auth/api-keys` - Create API key (protected)
- `GET /api/auth/api-keys` - List API keys (protected)
- `DELETE /api/auth/api-keys/:id` - Revoke API key (protected)

**Payments:**
- `POST /api/payments/create` - Create payment (requires API key)
- `GET /api/payments/:id` - Get payment by ID
- `GET /api/payments` - List payments with pagination

**Webhooks:**
- `POST /api/webhooks/zendfi` - ZendFi webhook handler (auto-verified)

**Utilities:**
- `GET /health` - Health check endpoint
- `GET /api` - API documentation

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database (or use Docker)
- ZendFi API key ([get one here](https://dashboard.zendfi.com))

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update:

```bash
# ZendFi Configuration
ZENDFI_API_KEY=zfi_test_your_key_here
ZENDFI_WEBHOOK_SECRET=your_webhook_secret
ZENDFI_ENVIRONMENT=development

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/zendfi

# Server
PORT=3000
NODE_ENV=development

# Auth
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# CORS (Optional)
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### 3. Setup Database

```bash
# Push schema to database
npm run db:push

# Seed with demo data
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

Server will start at `http://localhost:3000`

---

## 🐳 Docker Deployment

### Quick Start with Docker Compose

```bash
# Build and start all services (API + PostgreSQL)
npm run docker:up

# View logs
npm run docker:logs

# Stop services
npm run docker:down
```

### Manual Docker Build

```bash
# Build image
docker build -t zendfi-api .

# Run container
docker run -p 3000:3000 --env-file .env zendfi-api
```

---

## 📖 API Usage Examples

### 1. Register a New User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "secure123456",
    "name": "John Doe"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clx123abc",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "token": "eyJhbGc..."
  }
}
```

### 2. Create API Key

```bash
curl -X POST http://localhost:3000/api/auth/api-keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{
    "name": "Production API Key",
    "environment": "production"
  }'
```

### 3. Create Payment (Using API Key)

```bash
curl -X POST http://localhost:3000/api/payments/create \
  -H "Content-Type: application/json" \
  -H "X-API-Key: zfi_live_abc123xyz789" \
  -d '{
    "amount": 50,
    "currency": "USD",
    "token": "USDC",
    "description": "Premium subscription",
    "metadata": {
      "order_id": "ORD-12345"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": "clx789ghi",
      "zendfiPaymentId": "pay_abc123",
      "url": "https://checkout.zendfi.com/pay_abc123",
      "amount": 50,
      "currency": "USD",
      "status": "pending"
    }
  }
}
```

### 4. Check Payment Status

```bash
curl http://localhost:3000/api/payments/pay_abc123
```

---

## 🪝 Webhook Setup

### Configure Webhook URL

In your ZendFi dashboard, set the webhook URL to:

```
https://yourdomain.com/api/webhooks/zendfi
```

### Events Handled

- `payment.confirmed` - Payment successfully completed → Updates database
- `payment.failed` - Payment failed → Marks as failed
- `payment.created` - Payment initiated → Logged for audit
- `payment.expired` - Payment expired → Updates status

All events are logged in the `WebhookEvent` table.

---

## 🗄️ Database Schema

### Models

- **User** - Users with authentication
- **ApiKey** - API keys for integrations
- **Payment** - Payment records
- **WebhookEvent** - Webhook event log

### View Schema

```bash
npm run db:studio
```

---

## 🔐 Security

- **Password Hashing**: Bcrypt with salt rounds = 10
- **Rate Limiting**: 100 req/15min globally, 5 req/15min for auth
- **Helmet**: Security headers enabled
- **Input Validation**: Zod schema validation
- **CORS**: Configurable allowed origins

---

## 📊 Monitoring

### Health Check

```bash
curl http://localhost:3000/health
```

### Database GUI

```bash
npm run db:studio
```

---

## 🚢 Deployment

### Railway/Render/Fly.io

1. Set environment variables
2. Connect PostgreSQL database
3. Deploy via Git

### Docker

```bash
docker build -t zendfi-api .
docker push your-registry/zendfi-api
```

---

## 🧪 Testing

### Demo Credentials

- **Email**: demo@example.com
- **Password**: demo123456
- **API Key**: zfi_test_demo123456789

### Test Flow

1. Register/login → Get session token
2. Create API key → Get API key
3. Create payment → Get checkout URL
4. Pay via checkout → Webhook confirms
5. Check status → Confirmed

---

## 📚 Resources

- [ZendFi Docs](https://docs.zendfi.com)
- [ZendFi Dashboard](https://dashboard.zendfi.com)
- [Prisma Docs](https://prisma.io/docs)

---

## 📄 License

MIT License

---

**Built with ❤️ by ZendFi**
