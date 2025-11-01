import { createNextWebhookHandler } from '@zendfi/sdk/nextjs';

// ✅ Auto-verified webhook handler with type-safe event routing
export const POST = createNextWebhookHandler({
  secret: process.env.ZENDFI_WEBHOOK_SECRET!,
  handlers: {
    'payment.confirmed': async (payment: any) => {
      // Payment successfully completed
      console.log('💰 Payment confirmed:', payment.payment_id);
      
      // TODO: Fulfill order
      // - Update order status in database
      // - Send confirmation email
      // - Update inventory
      // Example:
      // await db.order.update({
      //   where: { paymentId: payment.payment_id },
      //   data: { status: 'confirmed' }
      // });
    },
    
    'payment.failed': async (payment: any) => {
      // Payment failed
      console.log('❌ Payment failed:', payment.payment_id);
      
      // TODO: Handle failed payment
      // - Notify customer
      // - Update order status
    },
    
    'payment.created': async (payment: any) => {
      // Payment initiated (pending)
      console.log('⏳ Payment created:', payment.payment_id);
      
      // TODO: Optional - track pending payments
    },
    
    'payment.expired': async (payment: any) => {
      // Payment link or session expired
      console.log('⏱️  Payment expired:', payment.payment_id);
      
      // TODO: Optional - clean up expired payment records
    },
  }
});
