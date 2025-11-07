# 🚀 ZendFi SDK v0.4.0 - New Features!

## ✨ Enhanced Developer Experience

### 1. Better Error Handling

```typescript
import { ZendFiClient, isZendFiError, ERROR_CODES } from '@zendfi/sdk';

const client = new ZendFiClient({
  apiKey: process.env.ZENDFI_API_KEY,
});

try {
  const payment = await client.createPayment({
    amount: 50,
    description: 'Premium subscription',
  });
} catch (error) {
  if (isZendFiError(error)) {
    console.error(`[${error.code}] ${error.message}`);
    
    if (error.suggestion) {
      console.log(`💡 Suggestion: ${error.suggestion}`);
    }
    
    console.log(`📚 Docs: ${error.docs_url}`);
    
    // Handle specific error types
    if (error.code === ERROR_CODES.INVALID_API_KEY) {
      // Redirect to API key setup
    }
  }
}
```

**Error Types:**
- `AuthenticationError` - Invalid/expired API keys
- `PaymentError` - Payment processing failures
- `ValidationError` - Invalid request data
- `NetworkError` - Connection issues
- `RateLimitError` - Too many requests
- `ApiError` - General API errors
- `WebhookError` - Webhook verification failures

---

### 2. Debug Mode 🐛

```typescript
const client = new ZendFiClient({
  apiKey: process.env.ZENDFI_API_KEY,
  debug: true, // Enable debug logging
});

// Creates payment
const payment = await client.createPayment({
  amount: 50,
  description: 'Test payment',
});

// Console output:
// ✓ ZendFi SDK initialized in test mode (devnet)
// [ZendFi] Debug mode enabled
// [ZendFi] POST /api/v1/payments
// [ZendFi] Request: {
//   "amount": 50,
//   "description": "Test payment",
//   "currency": "USD",
//   "token": "USDC"
// }
// [ZendFi] ✓ 201 Created (234ms)
// [ZendFi] Response: {
//   "payment_id": "pay_test_abc123",
//   "status": "pending",
//   ...
// }
```

---

### 3. Request/Response Interceptors 🎯

```typescript
const client = new ZendFiClient({
  apiKey: process.env.ZENDFI_API_KEY,
});

// Add custom headers to all requests
client.interceptors.request.use((config) => {
  config.headers['X-Custom-Header'] = 'my-value';
  config.headers['X-Request-ID'] = generateRequestId();
  return config;
});

// Log all responses
client.interceptors.response.use((response) => {
  console.log(`API call to ${response.config.url} took ${response.data.duration}ms`);
  return response;
});

// Handle errors globally
client.interceptors.error.use((error) => {
  // Send to error tracking service
  Sentry.captureException(error);
  
  // Add custom error message
  if (error.code === 'rate_limit_exceeded') {
    error.suggestion = 'Upgrade your plan for higher rate limits at https://app.zendfi.com/billing';
  }
  
  return error;
});
```

**Use Cases:**
- Add authentication headers
- Log request/response times
- Track API usage metrics
- Global error handling
- Request/response transformation
- Custom retry logic

---

### 4. Complete Example with All Features

```typescript
import { 
  ZendFiClient, 
  isZendFiError,
  ERROR_CODES,
  type RequestConfig,
  type ResponseData,
} from '@zendfi/sdk';

// Initialize with debug mode
const client = new ZendFiClient({
  apiKey: process.env.ZENDFI_API_KEY,
  debug: process.env.NODE_ENV === 'development',
  timeout: 30000,
  retries: 3,
});

// Add request interceptor for custom headers
client.interceptors.request.use((config: RequestConfig) => {
  // Add request ID for tracking
  config.headers['X-Request-ID'] = crypto.randomUUID();
  
  // Add user context
  if (currentUser) {
    config.headers['X-User-ID'] = currentUser.id;
  }
  
  return config;
});

// Add response interceptor for metrics
client.interceptors.response.use((response: ResponseData) => {
  // Track API latency
  metrics.track('api.latency', {
    endpoint: response.config.url,
    duration: response.data._meta?.duration || 0,
    status: response.status,
  });
  
  return response;
});

// Add error interceptor for monitoring
client.interceptors.error.use((error) => {
  // Send to error tracking
  if (error.type === 'payment_error') {
    analytics.track('payment_failed', {
      error_code: error.code,
      error_message: error.message,
    });
  }
  
  // Send to Sentry
  Sentry.captureException(error, {
    extra: {
      code: error.code,
      type: error.type,
      suggestion: error.suggestion,
    },
  });
  
  return error;
});

// Create payment with full error handling
async function processPayment(amount: number, userId: string) {
  try {
    const payment = await client.createPayment({
      amount,
      description: `Payment for user ${userId}`,
      customer_email: user.email,
      metadata: {
        user_id: userId,
        source: 'web_app',
      },
    });
    
    console.log(`✓ Payment created: ${payment.payment_id}`);
    console.log(`Checkout URL: ${payment.checkout_url}`);
    
    return payment;
  } catch (error) {
    if (isZendFiError(error)) {
      // Handle specific errors
      switch (error.code) {
        case ERROR_CODES.INVALID_API_KEY:
          console.error('API key is invalid or expired');
          // Trigger API key rotation
          await rotateApiKey();
          break;
          
        case ERROR_CODES.RATE_LIMIT_EXCEEDED:
          console.error('Rate limit exceeded');
          console.log(error.suggestion);
          // Implement queue/backoff
          await backoffAndRetry();
          break;
          
        case ERROR_CODES.INSUFFICIENT_BALANCE:
          console.error('Wallet has insufficient balance');
          console.log(error.suggestion);
          // Notify user
          await notifyUser(userId, 'insufficient_balance');
          break;
          
        default:
          console.error(`Payment failed: ${error.message}`);
          console.log(`📚 Learn more: ${error.docs_url}`);
      }
    } else {
      // Handle unexpected errors
      console.error('Unexpected error:', error);
    }
    
    throw error;
  }
}
```

---

## 🎯 Migration Guide

### From v0.3.x to v0.4.0

**No breaking changes!** All existing code continues to work.

**New features to adopt:**

1. **Enable debug mode in development:**
   ```typescript
   const client = new ZendFiClient({
     apiKey: process.env.ZENDFI_API_KEY,
     debug: process.env.NODE_ENV === 'development', // NEW
   });
   ```

2. **Use better error handling:**
   ```typescript
   import { isZendFiError } from '@zendfi/sdk'; // NEW
   
   try {
     await client.createPayment({...});
   } catch (error) {
     if (isZendFiError(error)) { // NEW
       console.log(error.suggestion); // NEW
       console.log(error.docs_url); // NEW
     }
   }
   ```

3. **Add interceptors for monitoring:**
   ```typescript
   client.interceptors.error.use((error) => { // NEW
     Sentry.captureException(error);
     return error;
   });
   ```

---

## 📊 Performance Impact

- Debug mode: +5-10ms per request (disabled in production)
- Interceptors: +1-2ms per request (minimal)
- Error handling: No performance impact

**Recommendation:** Enable debug mode in development, disable in production.

---

## 🔍 What's Next?

Coming in v0.5.0:
- React hooks package (`@zendfi/react`)
- CLI improvements (`zendfi init`, `zendfi test`)
- Webhook listener (`zendfi webhooks listen`)
- Better TypeScript types (discriminated unions)

---

## 💬 Feedback

Love these features? Have suggestions? Let us know:
- GitHub: https://github.com/zendfi/zendfi-sdk
- Discord: https://discord.gg/zendfi
- Email: developers@zendfi.com

