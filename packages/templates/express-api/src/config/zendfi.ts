/**
 * ZendFi SDK Configuration
 */

import { ZendFiClient } from '@zendfi/sdk';

export const zendfi = new ZendFiClient();

export type { PaymentLink, WebhookPayload } from '@zendfi/sdk';
