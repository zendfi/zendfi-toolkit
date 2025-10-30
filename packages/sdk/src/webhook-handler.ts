/**
 * ZendFi Webhook Handlers
 * Type-safe webhook handlers with automatic verification and deduplication
 */

import type { WebhookPayload, WebhookEvent } from './types';

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
  // Clean up old entries (keep last 10000)
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
export async function processWebhook(
  payload: WebhookPayload,
  handlers: WebhookHandlers,
  config: WebhookHandlerConfig
): Promise<WebhookResult> {
  try {
    // Check for deduplication
    const webhookId = generateWebhookId(payload);
    const isProcessed = config.isProcessed || defaultIsProcessed;
    const onProcessed = config.onProcessed || defaultOnProcessed;

    if (await isProcessed(webhookId)) {
      return {
        success: true,
        processed: false,
        event: payload.event,
      };
    }

    // Find handler for this event
    const handler = handlers[payload.event];

    if (!handler) {
      // No handler registered - not an error, just skip
      return {
        success: true,
        processed: false,
        event: payload.event,
      };
    }

    // Execute handler
    await handler(payload.data, payload);

    // Mark as processed
    await onProcessed(webhookId);

    return {
      success: true,
      processed: true,
      event: payload.event,
    };
  } catch (error) {
    const err = error as Error;
    
    // Call error handler if provided
    if (config.onError) {
      await config.onError(err, payload?.event);
    }

    return {
      success: false,
      processed: false,
      error: err.message,
      event: payload?.event,
    };
  }
}
