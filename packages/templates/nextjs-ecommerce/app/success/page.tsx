'use client';

import { useEffect } from 'react';
import { CheckCircle } from 'lucide-react';

export default function SuccessPage() {
  useEffect(() => {
    // Clear cart after successful payment
    localStorage.removeItem('cart');
  }, []);

  return (
    <main className="min-h-screen bg-[#F6F9FC] flex items-center justify-center py-12">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-xl border border-[#E3E8EE] shadow-[0_8px_24px_rgba(0,0,0,0.12)] p-8 text-center animate-slideUp">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
              <CheckCircle size={40} className="text-green-500" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-4 text-gray-900">Payment Successful!</h1>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Thank you for your purchase. Your order has been confirmed and will be
            processed shortly.
          </p>
          <div className="space-y-3">
            <a
              href="/"
              className="block w-full bg-[#5B6EE8] text-white px-6 py-3 rounded-lg hover:bg-[#4C5FD5] transition-all duration-200 shadow-[0_2px_8px_rgba(91,110,232,0.25)] hover:shadow-[0_4px_12px_rgba(91,110,232,0.35)] font-medium"
            >
              Continue Shopping
            </a>
            <p className="text-sm text-gray-500">
              You will receive a confirmation email shortly.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
