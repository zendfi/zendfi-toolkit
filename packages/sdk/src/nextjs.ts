/**
 * Next.js Webhook Handler for App Router
 * 
 * @example
 * ```typescript
 * import { createNextWebhookHandler } from '@zendfi/sdk/nextjs';
 * 
 * export const POST = createNextWebhookHandler({
 *   secret: process.env.ZENDFI_WEBHOOK_SECRET!,
 *   handlers: {
 *     'payment.confirmed': async (payment) => {
 *       await db.orders.update({
 *         where: { id: payment.metadata.orderId },
 *         data: { status: 'paid' },
 *       });
 *     },
 *     'payment.failed': async (payment) => {
 *       await sendFailureEmail(payment);
 *     },
 *   },
 * });
 * ```
 */

import { createHmac, timingSafeEqual } from 'crypto';
import type { WebhookPayload } from './types';
import { processWebhook, type WebhookHandlers, type WebhookHandlerConfig } from './webhook-handler';

type NextRequest = any;

export interface NextWebhookHandlerConfig extends WebhookHandlerConfig {
  handlers: WebhookHandlers;
}

/**
 * Create a Next.js App Router webhook handler
 */
export function createNextWebhookHandler(config: NextWebhookHandlerConfig) {
  return async (request: NextRequest) => {
    try {
      const signature = request.headers.get('x-zendfi-signature');
      if (!signature) {
        return new Response(
          JSON.stringify({ error: 'Missing signature' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const body = await request.text();

      const computedSignature = createHmac('sha256', config.secret)
        .update(body, 'utf8')
        .digest('hex');

      const sigBuffer = Buffer.from(signature, 'utf8');
      const compBuffer = Buffer.from(computedSignature, 'utf8');

      if (sigBuffer.length !== compBuffer.length || !timingSafeEqual(sigBuffer, compBuffer)) {
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }

      let payload: WebhookPayload;
      try {
        payload = JSON.parse(body);
      } catch {
        return new Response(
          JSON.stringify({ error: 'Invalid JSON' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const result = await processWebhook(payload, config.handlers, config);

      if (!result.success) {
        return new Response(
          JSON.stringify({ error: result.error || 'Webhook processing failed' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          received: true,
          processed: result.processed,
          event: result.event,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      const err = error as Error;
      console.error('Webhook handler error:', err);

      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  };
}
