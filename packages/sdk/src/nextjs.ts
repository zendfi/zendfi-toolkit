/**
 * Next.js-specific exports for ZendFi SDK
 * 
 * @example
 * ```typescript
 * // Import in Next.js project
 * import { createWebhookHandler } from '@zendfi/sdk/nextjs';
 * ```
 */

export {
  createWebhookHandler,
  createPagesWebhookHandler,
} from './frameworks/nextjs';
