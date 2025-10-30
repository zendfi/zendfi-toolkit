/**
 * Webhook Controller
 */

import { Request, Response } from 'express';
import { verifyExpressWebhook } from '@zendfi/sdk';
import type { ApiResponse } from '../types/index.js';

export async function handleZendFiWebhook(req: Request, res: Response) {
  try {
    // Verify webhook signature
    const payload = verifyExpressWebhook(req);

    if (!payload) {
      res.status(401);
      throw new Error('Invalid webhook signature');
    }

    console.log('✅ Webhook verified:', payload.event);

    // Handle different event types
    switch (payload.event) {
      case 'payment.confirmed':
        console.log('💰 Payment confirmed:', payload.data);
        // TODO: Update database, send confirmation email, etc.
        await handlePaymentCompleted(payload.data);
        break;

      case 'payment.failed':
        console.log('❌ Payment failed:', payload.data);
        // TODO: Handle failed payment
        await handlePaymentFailed(payload.data);
        break;

      case 'payment.created':
        console.log('⏳ Payment created:', payload.data);
        // TODO: Handle new payment
        break;

      case 'payment.expired':
        console.log('⏰ Payment expired:', payload.data);
        // TODO: Handle expired payment
        break;

      default:
        console.log('ℹ️  Unhandled event:', payload.event);
    }

    const response: ApiResponse = {
      success: true,
      data: { received: true },
    };

    res.json(response);
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500);
    throw error;
  }
}

async function handlePaymentCompleted(data: any) {
  // TODO: Implement your business logic
  // - Update order status in database
  // - Send confirmation email
  // - Trigger fulfillment process
  // - Update analytics
  console.log('Processing completed payment:', data.id);
}

async function handlePaymentFailed(data: any) {
  // TODO: Implement your business logic
  // - Update order status to failed
  // - Send failure notification
  // - Log for manual review
  console.log('Processing failed payment:', data.id);
}

async function handlePaymentRefunded(data: any) {
  // TODO: Implement your business logic
  // - Reverse order
  // - Update inventory
  // - Send refund confirmation
  console.log('Processing refund:', data.id);
}
