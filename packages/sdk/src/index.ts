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
 * console.log(payment.checkout_url);
 * ```
 */

export { ZendFiClient, zendfi } from './client';
export * from './types';
export { ConfigLoader } from './utils';
export * from './webhooks';

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
