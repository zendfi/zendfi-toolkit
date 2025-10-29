/**
 * Webhook Verification Helpers
 * Convenience functions for common frameworks
 */

import { zendfi } from './client';
import type { WebhookPayload } from './types';

/**
 * Verify and parse webhook for Next.js API routes
 * 
 * @example
 * ```typescript
 * // app/api/webhooks/zendfi/route.ts
 * import { verifyNextWebhook } from '@zendfi/sdk/webhooks';
 * 
 * export async function POST(request: Request) {
 *   const webhook = await verifyNextWebhook(request);
 *   
 *   if (!webhook) {
 *     return new Response('Invalid signature', { status: 401 });
 *   }
 *   
 *   // Process webhook
 *   switch (webhook.event) {
 *     case 'payment.confirmed':
 *       // Handle payment
 *       break;
 *   }
 *   
 *   return new Response('OK');
 * }
 * ```
 */
export async function verifyNextWebhook(
  request: Request,
  secret?: string
): Promise<WebhookPayload | null> {
  try {
    const payload = await request.text();
    const signature = request.headers.get('x-zendfi-signature');

    if (!signature) {
      return null;
    }

    const webhookSecret = secret || process.env.ZENDFI_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error('ZENDFI_WEBHOOK_SECRET not configured');
    }

    const isValid = zendfi.verifyWebhook({
      payload,
      signature,
      secret: webhookSecret,
    });

    if (!isValid) {
      return null;
    }

    return JSON.parse(payload) as WebhookPayload;
  } catch {
    return null;
  }
}

/**
 * Verify and parse webhook for Express.js
 * 
 * @example
 * ```typescript
 * import { verifyExpressWebhook } from '@zendfi/sdk/webhooks';
 * 
 * app.post('/webhooks/zendfi', async (req, res) => {
 *   const webhook = await verifyExpressWebhook(req);
 *   
 *   if (!webhook) {
 *     return res.status(401).json({ error: 'Invalid signature' });
 *   }
 *   
 *   // Process webhook
 *   console.log('Event:', webhook.event);
 *   
 *   res.json({ received: true });
 * });
 * ```
 */
export async function verifyExpressWebhook(
  request: any,
  secret?: string
): Promise<WebhookPayload | null> {
  try {
    // Express should have raw body for signature verification
    const payload = request.rawBody || JSON.stringify(request.body);
    const signature = request.headers['x-zendfi-signature'];

    if (!signature) {
      return null;
    }

    const webhookSecret = secret || process.env.ZENDFI_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error('ZENDFI_WEBHOOK_SECRET not configured');
    }

    const isValid = zendfi.verifyWebhook({
      payload,
      signature,
      secret: webhookSecret,
    });

    if (!isValid) {
      return null;
    }

    return JSON.parse(payload) as WebhookPayload;
  } catch {
    return null;
  }
}

/**
 * Verify webhook signature manually
 * Use this for custom integrations
 * 
 * @example
 * ```typescript
 * import { verifyWebhookSignature } from '@zendfi/sdk/webhooks';
 * 
 * const isValid = verifyWebhookSignature(
 *   payloadString,
 *   signatureHeader,
 *   process.env.ZENDFI_WEBHOOK_SECRET
 * );
 * ```
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  return zendfi.verifyWebhook({
    payload,
    signature,
    secret,
  });
}
