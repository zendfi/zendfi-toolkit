/**
 * ZendFi SDK Instance
 * 
 * This file creates and exports a configured ZendFi SDK instance.
 * The SDK is automatically configured from environment variables.
 * 
 * Uses lazy initialization to avoid requiring API keys during build time.
 */

import { ZendFiClient } from '@zendfi/sdk';

let _zendfiInstance: ZendFiClient | null = null;

/**
 * Get ZendFi client instance (lazy initialized)
 * Automatically reads ZENDFI_API_KEY and ZENDFI_ENVIRONMENT from env
 */
export function getZendFi(): ZendFiClient {
  if (!_zendfiInstance) {
    _zendfiInstance = new ZendFiClient();
  }
  return _zendfiInstance;
}

// Backwards compatibility - export as `zendfi` but with lazy getter
export const zendfi = new Proxy({} as ZendFiClient, {
  get(target, prop) {
    return getZendFi()[prop as keyof ZendFiClient];
  }
});

// Export types for use in your app
export type { PaymentLink, WebhookPayload } from '@zendfi/sdk';
