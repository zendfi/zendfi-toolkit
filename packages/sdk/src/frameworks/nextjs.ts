/**
 * ZendFi Next.js Webhook Handler
 * Auto-verified, type-safe webhook handler for Next.js App Router
 */

import { ZendFiClient } from '../client';
import type { WebhookHandlers, WebhookHandlerConfig } from '../webhook-handler';
import { processWebhook } from '../webhook-handler';

/**
 * Create a Next.js App Router webhook handler
 * 
 * @example
 * ```typescript
 * // app/api/webhooks/zendfi/route.ts
 * import { createWebhookHandler } from '@zendfi/sdk/nextjs';
 * 
 * export const POST = createWebhookHandler({
 *   secret: process.env.ZENDFI_WEBHOOK_SECRET!,
 *   handlers: {
 *     'payment.confirmed': async (payment) => {
 *       // ✅ Already verified
 *       // ✅ Already typed
 *       // ✅ Already deduplicated
 *       await db.orders.update({
 *         where: { id: payment.metadata.orderId },
 *         data: { status: 'paid' }
 *       });
 *     },
 *     'payment.failed': async (payment) => {
 *       await sendEmail({
 *         to: payment.customer_email,
 *         subject: 'Payment failed',
 *       });
 *     }
 *   }
 * });
 * ```
 */
export function createWebhookHandler(
  config: WebhookHandlerConfig & { handlers: WebhookHandlers }
) {
  const client = new ZendFiClient();

  return async function POST(request: any): Promise<any> {
    try {
      const body = await request.text();
      const signature = request.headers.get('x-zendfi-signature');

      if (!signature) {
        return Response.json(
          { error: 'Missing x-zendfi-signature header' },
          { status: 401 }
        );
      }

      const isValid = client.verifyWebhook({
        payload: body,
        signature,
        secret: config.secret,
      });

      if (!isValid) {
        return Response.json(
          { error: 'Invalid webhook signature' },
          { status: 401 }
        );
      }

      const payload = JSON.parse(body);
      const result = await processWebhook(payload, config.handlers, config);

      if (!result.success) {
        return Response.json(
          { error: result.error || 'Failed to process webhook' },
          { status: 500 }
        );
      }

      return Response.json({
        received: true,
        processed: result.processed,
        event: payload.event,
      });
    } catch (error) {
      console.error('Webhook handler error:', error);
      
      return Response.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Legacy Next.js Pages Router webhook handler
 * 
 * @example
 * ```typescript
 * // pages/api/webhooks/zendfi.ts
 * import { createPagesWebhookHandler } from '@zendfi/sdk/nextjs';
 * 
 * export default createPagesWebhookHandler({
 *   secret: process.env.ZENDFI_WEBHOOK_SECRET!,
 *   handlers: {
 *     'payment.confirmed': async (payment) => {
 *       await fulfillOrder(payment);
 *     }
 *   }
 * });
 * 
 * export const config = {
 *   api: {
 *     bodyParser: false, // Important: disable body parser
 *   },
 * };
 * ```
 */
export function createPagesWebhookHandler(
  config: WebhookHandlerConfig & { handlers: WebhookHandlers }
) {
  const client = new ZendFiClient();

  return async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const body = Buffer.concat(chunks).toString('utf8');

      const signature = req.headers['x-zendfi-signature'] || 
                       req.headers['x-webhook-signature'] ||
                       '';

      if (!signature) {
        return res.status(401).json({ error: 'Missing webhook signature' });
      }

      const isValid = client.verifyWebhook({
        payload: body,
        signature,
        secret: config.secret,
      });

      if (!isValid) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }

      const payload = JSON.parse(body);
      const result = await processWebhook(payload, config.handlers, config);

      if (!result.success) {
        return res.status(500).json({ 
          error: result.error || 'Webhook processing failed' 
        });
      }

      return res.status(200).json({
        received: true,
        processed: result.processed,
        event: result.event,
      });
    } catch (error) {
      const err = error as Error;
      
      if (config.onError) {
        await config.onError(err);
      }

      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}
