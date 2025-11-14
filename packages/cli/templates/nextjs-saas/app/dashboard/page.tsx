'use client';

import { useEffect, useState } from 'react';
import { plans, getPlan, formatPrice } from '@/lib/plans';
import { getSubscription, getUsageStats, type Subscription, type UsageStats } from '@/lib/subscriptions';
import { TrendingUp, Users, Database, CreditCard } from 'lucide-react';

export default function DashboardPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);

  useEffect(() => {
    // Mock user ID (in production, get from auth)
    const userId = 'user_123';
    
    const sub = getSubscription(userId);
    const stats = getUsageStats(userId);
    
    setSubscription(sub);
    setUsage(stats);
  }, []);

  const plan = subscription ? getPlan(subscription.planId) : plans[0];

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

        {/* Current Plan */}
        <div className="bg-accent rounded-xl p-8 text-white mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 mb-2">Current Plan</p>
              <h2 className="text-4xl font-bold mb-2">{plan?.name}</h2>
              <p className="text-xl">
                {plan?.price ? formatPrice(plan.price) + '/' + plan.interval : 'Free'}
              </p>
            </div>
            <div>
              {subscription && (
                <div className="text-right">
                  <p className="text-purple-100 mb-1">Status</p>
                  <span className={`inline-block px-4 py-2 rounded-full font-bold ${
                    subscription.status === 'active' 
                      ? 'bg-green-500' 
                      : 'bg-yellow-500'
                  }`}>
                    {subscription.status.toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>
          {!subscription && (
            <div className="mt-6">
              <a
                href="/pricing"
                className="inline-block bg-white text-purple-600 px-6 py-3 rounded-lg font-bold hover:bg-gray-100 transition-colors"
              >
                Upgrade Plan
              </a>
            </div>
          )}
        </div>

        {/* Usage Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-700">API Calls</h3>
              <TrendingUp className="text-purple-600" size={24} />
            </div>
            <p className="text-3xl font-bold mb-2">{usage?.apiCalls.toLocaleString()}</p>
            <p className="text-sm text-gray-600">
              of {plan?.limits.apiCalls.toLocaleString()} this month
            </p>
            <div className="mt-4 bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full"
                style={{
                  width: `${((usage?.apiCalls || 0) / (plan?.limits.apiCalls || 1)) * 100}%`,
                }}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-700">Storage Used</h3>
              <Database className="text-blue-600" size={24} />
            </div>
            <p className="text-3xl font-bold mb-2">{usage?.storageUsed}</p>
            <p className="text-sm text-gray-600">
              of {plan?.limits.storage}
            </p>
            <div className="mt-4 bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '45%' }} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-700">Team Members</h3>
              <Users className="text-green-600" size={24} />
            </div>
            <p className="text-3xl font-bold mb-2">{usage?.users}</p>
            <p className="text-sm text-gray-600">
              of {plan?.limits.users} allowed
            </p>
            <div className="mt-4 bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{
                  width: `${((usage?.users || 0) / (plan?.limits.users || 1)) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Recent Activity</h2>
            <CreditCard className="text-purple-600" size={24} />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <p className="font-bold">API Request</p>
                <p className="text-sm text-gray-600">2 minutes ago</p>
              </div>
              <span className="text-green-600 font-bold">Success</span>
            </div>
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <p className="font-bold">File Upload</p>
                <p className="text-sm text-gray-600">15 minutes ago</p>
              </div>
              <span className="text-green-600 font-bold">Success</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold">User Invited</p>
                <p className="text-sm text-gray-600">1 hour ago</p>
              </div>
              <span className="text-blue-600 font-bold">Pending</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
