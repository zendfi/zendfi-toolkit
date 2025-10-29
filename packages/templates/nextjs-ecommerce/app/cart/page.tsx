'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { formatPrice, calculateCartTotal, type CartItem } from '@/lib/cart';
import { Trash2 } from 'lucide-react';

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCart(savedCart);
  }, []);

  const removeFromCart = (productId: string) => {
    const updatedCart = cart.filter(item => item.id !== productId);
    setCart(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
  };

  const updateQuantity = (productId: string, delta: number) => {
    const updatedCart = cart.map(item => {
      if (item.id === productId) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    });
    setCart(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
  };

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart }),
      });

      const data = await response.json();
      
      if (data.paymentUrl) {
        // Redirect to ZendFi payment page
        window.location.href = data.paymentUrl;
      } else {
        alert('Error creating checkout');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Error processing checkout');
    } finally {
      setLoading(false);
    }
  };

  const total = calculateCartTotal(cart);

  if (cart.length === 0) {
    return (
      <main className="min-h-screen bg-[#F6F9FC] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-8 text-gray-900">Shopping Cart</h1>
          <div className="bg-white rounded-xl border border-[#E3E8EE] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-8 text-center">
            <p className="text-gray-600 mb-4">Your cart is empty</p>
            <a
              href="/"
              className="inline-block bg-[#5B6EE8] text-white px-6 py-3 rounded-lg hover:bg-[#4C5FD5] transition-all duration-200 shadow-[0_2px_8px_rgba(91,110,232,0.25)]"
            >
              Continue Shopping
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F6F9FC] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-[#E3E8EE] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-6 flex gap-6 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-shadow"
              >
                <div className="relative w-24 h-24 flex-shrink-0 bg-[#F6F9FC] rounded-lg overflow-hidden">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-1 text-gray-900">{item.name}</h3>
                  <p className="text-gray-600 text-sm mb-2">{item.description}</p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-8 h-8 rounded-md border border-[#E3E8EE] hover:bg-[#F6F9FC] transition-colors font-medium"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-8 h-8 rounded-md border border-[#E3E8EE] hover:bg-[#F6F9FC] transition-colors font-medium"
                      >
                        +
                      </button>
                    </div>
                    <span className="font-bold text-[#5B6EE8]">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="text-red-500 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-[#E3E8EE] shadow-[0_2px_8px_rgba(0,0,0,0.08)] p-6 sticky top-4">
              <h2 className="text-xl font-bold mb-4 text-gray-900">Order Summary</h2>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-gray-700">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span className="text-gray-600">Shipping</span>
                  <span className="text-green-600 font-medium">Free</span>
                </div>
                <div className="border-t border-[#E3E8EE] pt-3 mt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-gray-900">Total</span>
                    <span className="text-[#5B6EE8]">{formatPrice(total)}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleCheckout}
                disabled={loading}
                className="w-full bg-[#5B6EE8] text-white px-6 py-3 rounded-lg hover:bg-[#4C5FD5] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_2px_8px_rgba(91,110,232,0.25)] hover:shadow-[0_4px_12px_rgba(91,110,232,0.35)] font-medium"
              >
                {loading ? 'Processing...' : 'Pay with Crypto'}
              </button>
              <p className="text-xs text-gray-500 text-center mt-4">
                Powered by ZendFi • Secure Crypto Payments
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
