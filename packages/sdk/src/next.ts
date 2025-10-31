/**
 * Next.js Webhook Handler for App Router
 * 
 * @example
 * ```typescript
 * // app/api/webhooks/zendfi/route.ts
 * import { createNextWebhookHandler } from '@zendfi/sdk/next';
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

import { type NextRequest } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import type { WebhookPayload } from './types';
import { processWebhook, type WebhookHandlers, type WebhookHandlerConfig } from './webhook-handler';

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
        return Response.json(
          { error: 'Missing signature' },
          { status: 401 }
        );
      }

      const body = await request.text();

      const computedSignature = createHmac('sha256', config.secret)
        .update(body, 'utf8')
        .digest('hex');

      const sigBuffer = Buffer.from(signature, 'utf8');
      const compBuffer = Buffer.from(computedSignature, 'utf8');

      if (sigBuffer.length !== compBuffer.length || !timingSafeEqual(sigBuffer, compBuffer)) {
        return Response.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }

      let payload: WebhookPayload;
      try {
        payload = JSON.parse(body);
      } catch {
        return Response.json(
          { error: 'Invalid JSON' },
          { status: 400 }
        );
      }

      const result = await processWebhook(payload, config.handlers, config);

      if (!result.success) {
        return Response.json(
          { error: result.error || 'Webhook processing failed' },
          { status: 500 }
        );
      }

      return Response.json({
        received: true,
        processed: result.processed,
        event: result.event,
      });
    } catch (error) {
      const err = error as Error;
      console.error('Webhook handler error:', err);

      return Response.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}
