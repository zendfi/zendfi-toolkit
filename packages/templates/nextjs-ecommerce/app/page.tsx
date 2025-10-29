'use client';

import Image from 'next/image';
import { products } from '@/lib/products';
import { formatPrice } from '@/lib/cart';
import { ShoppingCart } from 'lucide-react';

export default function HomePage() {
  const addToCart = (productId: string) => {
    // Get existing cart from localStorage
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    // Check if product already in cart
    const existingItem = cart.find((item: any) => item.id === productId);
    
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      const product = products.find(p => p.id === productId);
      if (product) {
        cart.push({ ...product, quantity: 1 });
      }
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    alert('Added to cart!');
  };

  return (
    <main className="min-h-screen bg-[#F6F9FC]">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#5B6EE8] to-[#4C5FD5] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 animate-fadeIn">
            Pay with Crypto
          </h1>
          <p className="text-xl md:text-2xl text-blue-50 opacity-90">
            Secure, fast, and easy cryptocurrency payments powered by ZendFi
          </p>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-3xl font-bold mb-8">Featured Products</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-xl border border-[#E3E8EE] overflow-hidden hover:shadow-[0_8px_16px_rgba(0,0,0,0.12)] transition-all duration-300 hover:-translate-y-1"
            >
              <div className="relative h-64 bg-[#F6F9FC]">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <div className="text-sm text-[#5B6EE8] font-semibold mb-2 uppercase tracking-wide">
                  {product.category}
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900">{product.name}</h3>
                <p className="text-gray-600 mb-4 text-sm leading-relaxed">{product.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-[#5B6EE8]">
                    {formatPrice(product.price)}
                  </span>
                  <button
                    onClick={() => addToCart(product.id)}
                    className="bg-[#5B6EE8] text-white px-5 py-2.5 rounded-lg hover:bg-[#4C5FD5] transition-all duration-200 flex items-center gap-2 shadow-[0_2px_8px_rgba(91,110,232,0.25)] hover:shadow-[0_4px_12px_rgba(91,110,232,0.35)]"
                  >
                    <ShoppingCart size={20} />
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#1F2937] text-white mt-20 border-t border-[#374151]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <p className="text-gray-400">
              Powered by{' '}
              <a
                href="https://zendfi.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#5B6EE8] hover:text-[#4C5FD5] transition-colors font-medium"
              >
                ZendFi
              </a>
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
