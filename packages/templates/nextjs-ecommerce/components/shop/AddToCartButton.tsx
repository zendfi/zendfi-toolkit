'use client';

import { useState } from 'react';
import { ShoppingCart, Check } from 'lucide-react';
import { Product } from '@prisma/client';

interface AddToCartButtonProps {
  product: Product;
}

export default function AddToCartButton({ product }: AddToCartButtonProps) {
  const [added, setAdded] = useState(false);
  const isOutOfStock = product.stock === 0;

  const handleAddToCart = () => {
    // Get existing cart
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    // Check if product already in cart
    const existingItemIndex = cart.findIndex((item: any) => item.id === product.id);
    
    if (existingItemIndex > -1) {
      // Increment quantity
      cart[existingItemIndex].quantity += 1;
    } else {
      // Add new item
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: 1,
        stock: product.stock,
      });
    }
    
    // Save to localStorage
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Dispatch event for cart updates
    window.dispatchEvent(new Event('cart-updated'));
    
    // Show feedback
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <button
      onClick={handleAddToCart}
      disabled={isOutOfStock || added}
      className={`
        w-full flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-semibold text-lg
        transition-all duration-200
        ${
          isOutOfStock
            ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
            : added
            ? 'bg-green-500 text-white'
            : 'bg-gradient-to-r from-[#5B6EE8] to-[#4C5FD5] text-white hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5'
        }
      `}
    >
      {added ? (
        <>
          <Check className="w-6 h-6" />
          Added to Cart!
        </>
      ) : (
        <>
          <ShoppingCart className="w-6 h-6" />
          {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
        </>
      )}
    </button>
  );
}
