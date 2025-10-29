/**
 * ZendFi SDK Instance
 */

import { ZendFi } from '@zendfi/sdk';

export const zendfi = new ZendFi();

export type { PaymentLink, WebhookPayload } from '@zendfi/sdk';
