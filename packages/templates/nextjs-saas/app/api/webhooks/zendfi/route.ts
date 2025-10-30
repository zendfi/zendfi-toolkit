import { NextRequest, NextResponse } from 'next/server';
import { verifyNextWebhook } from '@zendfi/sdk';
import { createSubscription, cancelSubscription } from '@/lib/subscriptions';

export async function POST(request: NextRequest) {
  // Verify webhook signature
  const payload = await verifyNextWebhook(request);

  if (!payload) {
    return NextResponse.json(
      { error: 'Invalid webhook signature' },
      { status: 401 }
    );
  }

  console.log('✅ Webhook verified:', payload.event);

  // Handle different event types
  switch (payload.event) {
    case 'payment.confirmed':
      console.log('💰 Payment confirmed:', payload.data);
      
      // Create or renew subscription
      if (payload.data.metadata?.subscriptionType === 'recurring') {
        const userId = 'user_123'; // In production, extract from payment data
        const planId = payload.data.metadata.planId;
        
        if (planId) {
          createSubscription(userId, planId);
          console.log(`✅ Subscription created for user ${userId} on plan ${planId}`);
        }
      }
      break;

    case 'payment.failed':
      console.log('❌ Payment failed:', payload.data);
      
      // Mark subscription as past_due
      if (payload.data.metadata?.subscriptionType === 'recurring') {
        console.log('⚠️  Subscription payment failed - marking as past_due');
        // In production: Update subscription status to 'past_due'
      }
      break;

    case 'subscription.canceled':
      console.log('🚫 Subscription cancelled:', payload.data);
      
      const userId = 'user_123'; // In production, extract from payload
      cancelSubscription(userId);
      console.log(`✅ Subscription cancelled for user ${userId}`);
      break;

    case 'payment.created':
      console.log('⏳ Payment created:', payload.data);
      break;

    case 'payment.expired':
      console.log('⏰ Payment expired:', payload.data);
      break;

    default:
      console.log('ℹ️  Unhandled event:', payload.event);
  }

  return NextResponse.json({ received: true });
}
