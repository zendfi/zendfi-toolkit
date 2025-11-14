import { NextRequest, NextResponse } from 'next/server';
import { zendfi } from '@/lib/zendfi';
import { getPlan } from '@/lib/plans';
import { createSubscription } from '@/lib/subscriptions';

export async function POST(request: NextRequest) {
  try {
    const { planId } = await request.json();

    if (!planId) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }

    const plan = getPlan(planId);
    if (!plan) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      );
    }

    // For free plan, just create subscription
    if (plan.price === 0) {
      const userId = 'user_123'; // In production, get from auth
      createSubscription(userId, planId);
      return NextResponse.json({ success: true });
    }

    // Create payment link for paid plans
    const paymentLink = await zendfi.createPaymentLink({
      amount: plan.price,
      currency: plan.currency,
      token: 'USDC',
      description: `${plan.name} Subscription - ${plan.interval}ly`,
      metadata: {
        planId,
        planName: plan.name,
        interval: plan.interval,
        subscriptionType: 'recurring',
      },
    });

    return NextResponse.json({
      paymentUrl: paymentLink.url,
      paymentId: paymentLink.id,
    });
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}
