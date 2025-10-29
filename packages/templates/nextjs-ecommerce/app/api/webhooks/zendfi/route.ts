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
    case 'payment.completed':
      console.log('💰 Payment completed:', payload.data);
      // TODO: Mark order as paid, send confirmation email, etc.
      break;

    case 'payment.failed':
      console.log('❌ Payment failed:', payload.data);
      // TODO: Handle failed payment
      break;

    case 'payment.pending':
      console.log('⏳ Payment pending:', payload.data);
      // TODO: Handle pending payment
      break;

    default:
      console.log('ℹ️  Unhandled event:', payload.event);
  }

  return NextResponse.json({ received: true });
}
