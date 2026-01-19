/**
 * ZendFi SDK
 * Zero-config TypeScript SDK for crypto payments
 *
 * @example
 * ```typescript
 * import { zendfi } from '@zendfi/sdk';
 *
 * const payment = await zendfi.createPayment({
 *   amount: 50,
 *   description: 'Premium subscription',
 * });
 *
 * console.log(payment.payment_url); // Send customer here
 * ```
 */

export { ZendFiClient, zendfi } from './client';
export * from './types';
export { ConfigLoader, RateLimiter, generateIdempotencyKey, sleep } from './utils';
export * from './webhooks';

// Embedded Checkout
export { ZendFiEmbeddedCheckout } from './embedded-checkout';
export type { 
  EmbeddedCheckoutConfig, 
  CheckoutTheme, 
  PaymentSuccessData, 
  CheckoutError 
} from './embedded-checkout';

// Error handling
export {
  ZendFiError,
  AuthenticationError,
  PaymentError,
  ValidationError,
  NetworkError,
  RateLimitError,
  ApiError,
  WebhookError,
  createZendFiError,
  isZendFiError,
  ERROR_CODES,
  type ZendFiErrorType,
  type ZendFiErrorData,
} from './errors';

// Interceptors
export {
  type RequestConfig,
  type ResponseData,
  type RequestInterceptor,
  type ResponseInterceptor,
  type ErrorInterceptor,
  type Interceptors,
  InterceptorManager,
} from './interceptors';

export {
  processWebhook,
  type WebhookHandlers,
  type WebhookHandlerConfig,
  type WebhookResult,
  type WebhookEventHandler,
} from './webhook-handler';

// Optional Helpers (tree-shakeable utilities)
export * from './helpers';
