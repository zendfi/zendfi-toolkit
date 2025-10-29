/**
 * ZendFi SDK Instance
 * 
 * This file creates and exports a configured ZendFi SDK instance.
 * The SDK is automatically configured from environment variables.
 */

import { ZendFi } from '@zendfi/sdk';

// Create ZendFi client instance
// Automatically reads ZENDFI_API_KEY and ZENDFI_ENVIRONMENT from env
export const zendfi = new ZendFi();

// Export types for use in your app
export type { PaymentLink, WebhookPayload } from '@zendfi/sdk';
