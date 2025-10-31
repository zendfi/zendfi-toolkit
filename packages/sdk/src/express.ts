/**
 * Express Webhook Handler
 * 
 * @example
 * ```typescript
 * // src/routes/webhooks.ts
 * import express from 'express';
 * import { createExpressWebhookHandler } from '@zendfi/sdk/express';
 * 
 * const router = express.Router();
 * 
 * router.post('/zendfi', 
 *   express.raw({ type: 'application/json' }),
 *   createExpressWebhookHandler({
 *     secret: process.env.ZENDFI_WEBHOOK_SECRET!,
 *     handlers: {
 *       'payment.confirmed': async (payment) => {
 *         await Order.update({ status: 'paid' }, { where: { id: payment.metadata.orderId } });
 *       },
 *       'payment.failed': async (payment) => {
 *         await sendFailureEmail(payment);
 *       },
 *     },
 *   })
 * );
 * 
 * export default router;
 * ```
 */

import { createHmac, timingSafeEqual } from 'crypto';
import type { WebhookPayload } from './types';
import { processWebhook, type WebhookHandlers, type WebhookHandlerConfig } from './webhook-handler';

type Request = any;
type Response = any;

export interface ExpressWebhookHandlerConfig extends WebhookHandlerConfig {
  handlers: WebhookHandlers;
}

/**
 * Create an Express webhook handler
 * 
 * IMPORTANT: Must use express.raw() middleware before this handler:
 * app.post('/webhooks/zendfi', express.raw({ type: 'application/json' }), handler)
 */
export function createExpressWebhookHandler(config: ExpressWebhookHandlerConfig) {
  return async (req: Request, res: Response) => {
    try {
      const signature = req.headers['x-zendfi-signature'] as string;
      if (!signature) {
        return res.status(401).json({ error: 'Missing signature' });
      }

      let body: string;
      if (Buffer.isBuffer(req.body)) {
        body = req.body.toString('utf8');
      } else if (typeof req.body === 'string') {
        body = req.body;
      } else {
        return res.status(400).json({
          error: 'Raw body required. Use express.raw() middleware.',
        });
      }

      const computedSignature = createHmac('sha256', config.secret)
        .update(body, 'utf8')
        .digest('hex');

      const sigBuffer = Buffer.from(signature, 'utf8');
      const compBuffer = Buffer.from(computedSignature, 'utf8');

      if (sigBuffer.length !== compBuffer.length || !timingSafeEqual(sigBuffer, compBuffer)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }

      let payload: WebhookPayload;
      try {
        payload = JSON.parse(body);
      } catch {
        return res.status(400).json({ error: 'Invalid JSON' });
      }

      const result = await processWebhook(payload, config.handlers, config);

      if (!result.success) {
        return res.status(500).json({
          error: result.error || 'Webhook processing failed',
        });
      }

      return res.json({
        received: true,
        processed: result.processed,
        event: result.event,
      });
    } catch (error) {
      const err = error as Error;
      console.error('Webhook handler error:', err);

      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}
