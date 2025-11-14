/**
 * Subscription Management
 */

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'cancelled' | 'expired' | 'past_due';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

export interface UsageStats {
  apiCalls: number;
  storageUsed: string;
  users: number;
}

// Mock subscription storage (in production, use a database)
const subscriptions = new Map<string, Subscription>();

export function getSubscription(userId: string): Subscription | null {
  return subscriptions.get(userId) || null;
}

export function createSubscription(userId: string, planId: string): Subscription {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + 1);

  const subscription: Subscription = {
    id: `sub_${Date.now()}`,
    userId,
    planId,
    status: 'active',
    currentPeriodStart: now,
    currentPeriodEnd: endDate,
    cancelAtPeriodEnd: false,
  };

  subscriptions.set(userId, subscription);
  return subscription;
}

export function cancelSubscription(userId: string): void {
  const subscription = subscriptions.get(userId);
  if (subscription) {
    subscription.cancelAtPeriodEnd = true;
    subscriptions.set(userId, subscription);
  }
}

export function getUsageStats(userId: string): UsageStats {
  // Mock usage data (in production, query from database)
  return {
    apiCalls: 850,
    storageUsed: '45 MB',
    users: 1,
  };
}
