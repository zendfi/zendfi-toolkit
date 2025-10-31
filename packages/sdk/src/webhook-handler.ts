/**
 * ZendFi Webhook Handlers
 * Type-safe webhook handlers with automatic verification and deduplication
 */

import type { WebhookPayload, WebhookEvent } from './types';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Webhook handler configuration
 */
export interface WebhookHandlerConfig {
  /** Your webhook secret from ZendFi dashboard */
  secret: string;
  /** Optional: Path to store processed webhook IDs (for deduplication) */
  onProcessed?: (webhookId: string) => Promise<void>;
  /** Optional: Check if webhook was already processed */
  isProcessed?: (webhookId: string) => Promise<boolean>;
  /** Optional: Custom error handler */
  onError?: (error: Error, event?: WebhookEvent) => void | Promise<void>;
}

/**
 * Event handler function type
 */
export type WebhookEventHandler<T = any> = (
  data: T,
  event: WebhookPayload
) => void | Promise<void>;

/**
 * Webhook handlers map - type-safe event handlers
 */
export type WebhookHandlers = Partial<{
  'payment.created': WebhookEventHandler;
  'payment.confirmed': WebhookEventHandler;
  'payment.failed': WebhookEventHandler;
  'payment.expired': WebhookEventHandler;
  'subscription.created': WebhookEventHandler;
  'subscription.activated': WebhookEventHandler;
  'subscription.canceled': WebhookEventHandler;
  'subscription.payment_failed': WebhookEventHandler;
  'split.completed': WebhookEventHandler;
  'split.failed': WebhookEventHandler;
  'installment.due': WebhookEventHandler;
  'installment.paid': WebhookEventHandler;
  'installment.late': WebhookEventHandler;
  'escrow.funded': WebhookEventHandler;
  'escrow.released': WebhookEventHandler;
  'escrow.refunded': WebhookEventHandler;
  'escrow.disputed': WebhookEventHandler;
  'invoice.sent': WebhookEventHandler;
  'invoice.paid': WebhookEventHandler;
}>;

/**
 * Webhook processing result
 */
export interface WebhookResult {
  success: boolean;
  processed: boolean;
  error?: string;
  event?: WebhookEvent;
  statusCode?: number;
}

/**
 * In-memory deduplication cache (replace with Redis/DB in production)
 */
const processedWebhooks = new Set<string>();

/**
 * Default deduplication handlers
 */
const defaultIsProcessed = async (webhookId: string): Promise<boolean> => {
  return processedWebhooks.has(webhookId);
};

const defaultOnProcessed = async (webhookId: string): Promise<void> => {
  processedWebhooks.add(webhookId);
  if (processedWebhooks.size > 10000) {
    const iterator = processedWebhooks.values();
    for (let i = 0; i < 1000; i++) {
      const { value } = iterator.next();
      if (value) processedWebhooks.delete(value);
    }
  }
};

/**
 * Generate webhook ID for deduplication
 */
function generateWebhookId(payload: WebhookPayload): string {
  return `${payload.merchant_id}:${payload.event}:${payload.timestamp}`;
}

/**
 * Process webhook with handlers
 */
async function processPayload(
  payload: WebhookPayload,
  handlers: WebhookHandlers,
  config: WebhookHandlerConfig
): Promise<WebhookResult> {
  try {
    const webhookId = generateWebhookId(payload);

    // Support alternate option names for backward compatibility/tests
    const isProcessed =
      config.isProcessed || (config as any).checkDuplicate || defaultIsProcessed;
    const onProcessed =
      config.onProcessed || (config as any).markProcessed || defaultOnProcessed;

    const dedupEnabled =
      !!((config as any).enableDeduplication || config.isProcessed || (config as any).checkDuplicate);

    if (dedupEnabled && (await isProcessed(webhookId))) {
      // When deduplication is explicitly enabled, return a failure so callers
      // can know this webhook was already processed.
      return {
        success: false,
        processed: false,
        event: payload.event,
        error: 'Duplicate webhook',
        statusCode: 409,
      };
    }

    const handler = handlers[payload.event];

    if (!handler) {
      return {
        success: true,
        processed: false,
        event: payload.event,
        statusCode: 200,
      };
    }

    await handler(payload.data, payload);

    await onProcessed(webhookId);

    return {
      success: true,
      processed: true,
      event: payload.event,
    };
  } catch (error) {
    const err = error as Error;
    if (config?.onError) {
      await config.onError(err, (error as any)?.event);
    }

    return {
      success: false,
      processed: false,
      error: err.message,
      event: (error as any)?.event,
      statusCode: 500,
    };
  }
}

export async function processWebhook(
  a: any,
  b?: any,
  c?: any
): Promise<WebhookResult> {
  if (a && typeof a === 'object' && a.event && b && c) {
    return processPayload(a as WebhookPayload, b as WebhookHandlers, c as WebhookHandlerConfig);
  }

  const opts = a as {
    signature?: string;
    body?: string;
    handlers?: WebhookHandlers;
    config?: Partial<WebhookHandlerConfig> & { webhookSecret?: string; secret?: string };
  };

  if (!opts || (!opts.signature && !opts.body && !opts.handlers)) {
    return {
      success: false,
      processed: false,
      error: 'Invalid arguments to processWebhook',
      statusCode: 400,
    };
  }

  const signature = opts.signature;
  const body = opts.body;
  const handlers = opts.handlers || {};
  const cfg = (opts.config || {}) as WebhookHandlerConfig & { webhookSecret?: string; secret?: string };

  const secret = cfg.webhookSecret || cfg.secret;
  if (!secret) {
    return {
      success: false,
      processed: false,
      error: 'Webhook secret not provided',
      statusCode: 400,
    };
  }

  if (!signature || !body) {
    return {
      success: false,
      processed: false,
      error: 'Missing signature or body',
      statusCode: 400,
    };
  }

  try {
    // Support signatures that may be prefixed like `sha256=<hex>`
    const sig = typeof signature === 'string' && signature.startsWith('sha256=')
      ? signature.slice('sha256='.length)
      : String(signature);

    const hmac = createHmac('sha256', secret).update(body, 'utf8').digest('hex');

    // Compare raw hex bytes to avoid encoding differences
    let ok = false;
    try {
      const sigBuf = Buffer.from(sig, 'hex');
      const hmacBuf = Buffer.from(hmac, 'hex');
      if (sigBuf.length === hmacBuf.length) {
        ok = timingSafeEqual(sigBuf, hmacBuf);
      }
    } catch (e) {
      // If signature isn't valid hex, fall back to utf8-safe compare
      ok = timingSafeEqual(Buffer.from(String(sig), 'utf8'), Buffer.from(hmac, 'utf8'));
    }

    if (!ok) {
      return {
        success: false,
        processed: false,
        error: 'Invalid signature',
        statusCode: 401,
      };
    }

    const payload = JSON.parse(body) as WebhookPayload;

    const fullConfig: WebhookHandlerConfig & any = {
      secret,
      isProcessed: cfg.isProcessed,
      onProcessed: cfg.onProcessed,
      onError: cfg.onError,
      // Forward compatibility for alternate names and flags
      enableDeduplication: (cfg as any).enableDeduplication,
      checkDuplicate: (cfg as any).checkDuplicate,
      markProcessed: (cfg as any).markProcessed,
    };

    return await processPayload(payload, handlers, fullConfig);
  } catch (err: any) {
    return {
      success: false,
      processed: false,
      error: (err as Error).message,
      statusCode: 500,
    };
  }
}
