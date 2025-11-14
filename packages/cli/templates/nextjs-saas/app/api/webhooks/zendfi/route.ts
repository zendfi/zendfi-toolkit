import { createNextWebhookHandler } from '@zendfi/sdk/nextjs';
import { createSubscription, cancelSubscription } from '@/lib/subscriptions';

// ✅ Auto-verified webhook handler with type-safe event routing
export const POST = createNextWebhookHandler({
  secret: process.env.ZENDFI_WEBHOOK_SECRET!,
  handlers: {
    'payment.confirmed': async (payment: any) => {
    // Payment successfully completed
    console.log('💰 Payment confirmed:', payment.payment_id);
    
    // Create or renew subscription
    if (payment.metadata?.subscriptionType === 'recurring') {
      const userId = 'user_123'; // In production, extract from payment data
      const planId = payment.metadata.planId;
      
      if (planId) {
        createSubscription(userId, planId);
        console.log(`✅ Subscription created for user ${userId} on plan ${planId}`);
      }
    }
    
    // TODO: In production
    // - Extract userId from payment.metadata or customer_id
    // - Update user's subscription status in database
    // - Send confirmation email
  },
    
    'payment.failed': async (payment: any) => {
      // Payment failed
      console.log('❌ Payment failed:', payment.payment_id);
      
      // Mark subscription as past_due
      if (payment.metadata?.subscriptionType === 'recurring') {
        console.log('⚠️  Subscription payment failed - marking as past_due');
        
        // TODO: In production
        // - Update subscription status to 'past_due'
        // - Send payment failure notification
        // - Optionally restrict access after grace period
      }
    },
    
    'subscription.created': async (subscription: any) => {
      // New subscription created
      console.log('✅ Subscription created:', subscription.subscription_id);
      
      // TODO: In production
      // - Link subscription to user account
      // - Grant access to premium features
    },
    
    'subscription.canceled': async (subscription: any) => {
      // Subscription cancelled
      console.log('🚫 Subscription cancelled:', subscription.subscription_id);
      
      const userId = 'user_123'; // In production, extract from subscription data
      cancelSubscription(userId);
      console.log(`✅ Subscription cancelled for user ${userId}`);
      
      // TODO: In production
      // - Revoke access to premium features
      // - Send cancellation confirmation email
    },
    
    'subscription.renewed': async (subscription: any) => {
      // Subscription renewed (successful recurring payment)
      console.log('🔄 Subscription renewed:', subscription.subscription_id);
      
      // TODO: In production
      // - Update subscription end date
      // - Send renewal confirmation
    },
    
    'payment.created': async (payment: any) => {
      // Payment initiated (pending)
      console.log('⏳ Payment created:', payment.payment_id);
      
      // TODO: Optional - track pending payments
    },
    
    'payment.expired': async (payment: any) => {
      // Payment link or session expired
      console.log('⏰ Payment expired:', payment.payment_id);
      
      // TODO: Optional - handle expired subscription payment attempts
    },
  }
});
