/**
 * Subscription Plans
 */

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  recommended?: boolean;
  limits: {
    apiCalls: number;
    storage: string;
    users: number;
  };
}

export const plans: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Perfect for trying out our platform',
    price: 0,
    currency: 'USD',
    interval: 'month',
    features: [
      '1,000 API calls/month',
      '100 MB storage',
      '1 user',
      'Community support',
      'Basic analytics',
    ],
    limits: {
      apiCalls: 1000,
      storage: '100 MB',
      users: 1,
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For growing teams and businesses',
    price: 29,
    currency: 'USD',
    interval: 'month',
    recommended: true,
    features: [
      '100,000 API calls/month',
      '10 GB storage',
      '5 users',
      'Priority support',
      'Advanced analytics',
      'Webhook events',
      'Custom branding',
    ],
    limits: {
      apiCalls: 100000,
      storage: '10 GB',
      users: 5,
    },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations',
    price: 99,
    currency: 'USD',
    interval: 'month',
    features: [
      'Unlimited API calls',
      'Unlimited storage',
      'Unlimited users',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee',
      'White-label solution',
      'On-premise option',
    ],
    limits: {
      apiCalls: Infinity,
      storage: 'Unlimited',
      users: Infinity,
    },
  },
];

export function getPlan(planId: string): SubscriptionPlan | undefined {
  return plans.find(p => p.id === planId);
}

export function formatPrice(price: number): string {
  if (price === 0) return 'Free';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
}
