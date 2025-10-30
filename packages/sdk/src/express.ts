/**
 * Express-specific exports for ZendFi SDK
 * 
 * @example
 * ```typescript
 * // Import in Express project
 * import { createWebhookHandler } from '@zendfi/sdk/express';
 * ```
 */

export {
  createWebhookHandler,
  verifyWebhookMiddleware,
} from './frameworks/express';
