# ZendFi SDK Test Environment

This directory contains test scripts to validate the ZendFi SDK functionality before publishing.

## Setup

1. Create a `.env` file with your ZendFi API credentials:

```env
ZENDFI_API_KEY=your_api_key_here
ZENDFI_BASE_URL=https://api.zendfi.tech
ZENDFI_WEBHOOK_SECRET=your_webhook_secret_here
```

2. Install dependencies:

```bash
npm install
```

## Running Tests

### Test All Functionality
```bash
npm run test:all
```

### Test Payment Creation
```bash
npm run test:payment
```

### Test Payment Links
```bash
npm run test:payment-link
```

### Test Webhook Verification
```bash
npm run test:webhook
```

## What Gets Tested

- ✅ SDK initialization
- ✅ Payment creation
- ✅ Payment retrieval
- ✅ Payment link creation
- ✅ Payment link retrieval
- ✅ Webhook signature verification
- ✅ Error handling
- ✅ Configuration validation

## Backend Configuration

The tests connect to the ZendFi production API:
- Production: `https://api.zendfi.tech`
- Endpoint: `/api/v1/payment-links`
- Requires: Valid API key from your ZendFi account

## Notes

- All tests use the local SDK package (`file:../sdk`)
- Tests will create real payment links on your backend
- Webhook tests use mock payloads for verification
