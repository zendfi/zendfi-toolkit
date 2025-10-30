import { NextRequest, NextResponse } from 'next/server';
import { verifyNextWebhook } from '@zendfi/sdk';

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
      // TODO: Mark order as paid, send confirmation email, etc.
      break;

    case 'payment.failed':
      console.log('❌ Payment failed:', payload.data);
      // TODO: Handle failed payment
      break;

    case 'payment.created':
      console.log('⏳ Payment created:', payload.data);
      // TODO: Handle new payment
      break;

    default:
      console.log('ℹ️  Unhandled event:', payload.event);
  }

  return NextResponse.json({ received: true });
}
