/**
 * Webhook Controller
 * 
 * ✅ Auto-verified webhook handler with type-safe event routing
 * Uses ZendFi SDK webhook handler for automatic signature verification
 */

import { Request, Response, RequestHandler } from 'express';
import { createExpressWebhookHandler } from '@zendfi/sdk/express';

// Export the webhook handler as Express middleware
export const handleZendFiWebhook: RequestHandler = createExpressWebhookHandler({
  secret: process.env.ZENDFI_WEBHOOK_SECRET!,
  handlers: {
  'payment.confirmed': async (payment: any) => {
    // Payment successfully completed
    console.log('💰 Payment confirmed:', payment.payment_id);
    
    // TODO: Implement your business logic
    // - Update order status in database
    // - Send confirmation email
    // - Trigger fulfillment process
    // - Update analytics
    // Example:
    // await db.order.update({
    //   where: { paymentId: payment.payment_id },
    //   data: { status: 'confirmed' }
    // });
    // await sendConfirmationEmail(payment.customer.email);
  },
  
  'payment.failed': async (payment: any) => {
    // Payment failed
    console.log('❌ Payment failed:', payment.payment_id);
    
    // TODO: Implement your business logic
    // - Update order status to failed
    // - Send failure notification
    // - Log for manual review
    // Example:
    // await db.order.update({
    //   where: { paymentId: payment.payment_id },
    //   data: { status: 'failed' }
    // });
    // await sendFailureEmail(payment.customer.email);
  },
  
  'payment.created': async (payment: any) => {
    // Payment initiated (pending)
    console.log('⏳ Payment created:', payment.payment_id);
    
    // TODO: Optional - track pending payments
  },
  
  'payment.expired': async (payment: any) => {
    // Payment link or session expired
    console.log('⏰ Payment expired:', payment.payment_id);
    
    // TODO: Optional - clean up expired payment records
  },
  
  'refund.completed': async (refund: any) => {
    // Refund successfully processed
    console.log('💸 Refund completed:', refund.refund_id);
    
    // TODO: Implement your business logic
    // - Reverse order in database
    // - Update inventory
    // - Send refund confirmation
    // Example:
    // await db.order.update({
    //   where: { paymentId: refund.payment_id },
    //   data: { status: 'refunded' }
    // });
  },
  }
});
