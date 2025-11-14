'use client';

import { plans, formatPrice } from '@/lib/plans';
import { Check } from 'lucide-react';

export default function PricingPage() {
  const handleSubscribe = async (planId: string) => {
    if (planId === 'free') {
      alert('Free plan activated!');
      window.location.href = '/dashboard';
      return;
    }

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });

      const data = await response.json();
      
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        alert('Error creating subscription');
      }
    } catch (error) {
      console.error('Subscribe error:', error);
      alert('Error processing subscription');
    }
  };

  return (
    <main className="min-h-screen bg-[#F6F9FC] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600">
            Choose the perfect plan for your needs. Pay with crypto.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-xl border overflow-hidden hover:shadow-[0_8px_24px_rgba(0,0,0,0.15)] transition-all duration-300 hover:-translate-y-1 ${
                plan.recommended ? 'ring-2 ring-[#5B6EE8] border-[#5B6EE8] shadow-[0_8px_24px_rgba(91,110,232,0.2)]' : 'border-[#E3E8EE] shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
              }`}
            >
              {plan.recommended && (
                <div className="bg-[#5B6EE8] text-white text-center py-2 text-sm font-bold tracking-wide">
                  RECOMMENDED
                </div>
              )}
              <div className="p-8">
                <h3 className="text-2xl font-bold mb-2 text-gray-900">{plan.name}</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-5xl font-bold text-[#5B6EE8]">
                    {formatPrice(plan.price)}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-gray-600 text-lg">/{plan.interval}</span>
                  )}
                </div>
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  className={`w-full py-3 px-6 rounded-lg font-medium transition-all duration-200 ${
                    plan.recommended
                      ? 'bg-[#5B6EE8] text-white hover:bg-[#4C5FD5] shadow-[0_2px_8px_rgba(91,110,232,0.25)] hover:shadow-[0_4px_12px_rgba(91,110,232,0.35)]'
                      : 'bg-[#F6F9FC] text-gray-700 hover:bg-[#E3E8EE] border border-[#E3E8EE]'
                  }`}
                >
                  {plan.price === 0 ? 'Get Started' : 'Subscribe Now'}
                </button>
                <div className="mt-8 space-y-3">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Check className="text-green-500 flex-shrink-0" size={20} />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div>
              <h3 className="font-bold text-lg mb-2">
                What cryptocurrencies do you accept?
              </h3>
              <p className="text-gray-600">
                We accept BTC, ETH, USDC, USDT, and 20+ other cryptocurrencies through ZendFi.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-gray-600">
                Yes! You can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2">
                Do you offer refunds?
              </h3>
              <p className="text-gray-600">
                We offer a 30-day money-back guarantee for all paid plans. No questions asked.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2">
                How secure are payments?
              </h3>
              <p className="text-gray-600">
                All payments are processed through ZendFi's secure infrastructure with bank-grade encryption.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
