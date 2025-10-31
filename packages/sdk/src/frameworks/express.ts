/**
 * ZendFi Express Webhook Handler
 * Auto-verified, type-safe webhook handler for Express.js
 */

import type { Request, Response, NextFunction } from 'express';
import { ZendFiClient } from '../client';
import type { WebhookHandlers, WebhookHandlerConfig } from '../webhook-handler';
import { processWebhook } from '../webhook-handler';

/**
 * Create Express webhook handler middleware
 * 
 * @example
 * ```typescript
 * // src/routes/webhooks.ts
 * import express from 'express';
 * import { createWebhookHandler } from '@zendfi/sdk/express';
 * 
 * const router = express.Router();
 * 
 * router.post('/zendfi', 
 *   express.raw({ type: 'application/json' }), // Important: raw body
 *   createWebhookHandler({
 *     secret: process.env.ZENDFI_WEBHOOK_SECRET!,
 *     handlers: {
 *       'payment.confirmed': async (payment) => {
 *         // ✅ Already verified
 *         // ✅ Already typed
 *         // ✅ Already deduplicated
 *         await updateOrder(payment.metadata.orderId, 'paid');
 *       },
 *       'subscription.canceled': async (subscription) => {
 *         await cancelUserSubscription(subscription.customer_email);
 *       }
 *     }
 *   })
 * );
 * 
 * export default router;
 * ```
 */
export function createWebhookHandler(
  config: WebhookHandlerConfig & { handlers: WebhookHandlers }
) {
  const client = new ZendFiClient();

  return async function webhookHandler(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      let body: string;
      
      if (Buffer.isBuffer(req.body)) {
        body = req.body.toString('utf8');
      } else if (typeof req.body === 'string') {
        body = req.body;
      } else if (typeof req.body === 'object') {
        body = JSON.stringify(req.body);
      } else {
        res.status(400).json({ error: 'Invalid request body' });
        return;
      }

      const signature = (req.headers['x-zendfi-signature'] || 
                        req.headers['x-webhook-signature'] ||
                        '') as string;

      if (!signature) {
        res.status(401).json({ error: 'Missing webhook signature' });
        return;
      }

      const isValid = client.verifyWebhook({
        payload: body,
        signature,
        secret: config.secret,
      });

      if (!isValid) {
        res.status(401).json({ error: 'Invalid webhook signature' });
        return;
      }

      const payload = JSON.parse(body);

      const result = await processWebhook(payload, config.handlers, config);

      if (!result.success) {
        res.status(500).json({ 
          error: result.error || 'Webhook processing failed' 
        });
        return;
      }

      res.status(200).json({
        received: true,
        processed: result.processed,
        event: result.event,
      });
    } catch (error) {
      const err = error as Error;
      
      if (config.onError) {
        await config.onError(err);
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Express webhook verification middleware
 * Use this if you want to verify webhooks manually
 * 
 * @example
 * ```typescript
 * router.post('/webhook',
 *   express.raw({ type: 'application/json' }),
 *   verifyWebhookMiddleware({
 *     secret: process.env.ZENDFI_WEBHOOK_SECRET!
 *   }),
 *   async (req, res) => {
 *     const payload = req.body.payload; // Verified payload
 *     // Handle manually
 *   }
 * );
 * ```
 */
export function verifyWebhookMiddleware(config: { secret: string }) {
  const client = new ZendFiClient();

  return async function verify(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      let body: string;
      
      if (Buffer.isBuffer(req.body)) {
        body = req.body.toString('utf8');
      } else if (typeof req.body === 'string') {
        body = req.body;
      } else {
        body = JSON.stringify(req.body);
      }

      const signature = (req.headers['x-zendfi-signature'] || 
                        req.headers['x-webhook-signature'] ||
                        '') as string;

      if (!signature) {
        res.status(401).json({ error: 'Missing webhook signature' });
        return;
      }

      const isValid = client.verifyWebhook({
        payload: body,
        signature,
        secret: config.secret,
      });

      if (!isValid) {
        res.status(401).json({ error: 'Invalid webhook signature' });
        return;
      }

      (req as any).webhookPayload = JSON.parse(body);
      next();
    } catch (error) {
      res.status(500).json({ error: 'Webhook verification failed' });
    }
  };
}
