/**
 * ZendFi SDK Configuration
 */

import { ZendFiClient } from '@zendfi/sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const zendfi = new ZendFiClient();

export type { PaymentLink, WebhookPayload } from '@zendfi/sdk';
