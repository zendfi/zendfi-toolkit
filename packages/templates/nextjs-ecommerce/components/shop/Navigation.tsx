"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShoppingCart, Store } from "lucide-react";

export function Navigation() {
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const updateCartCount = () => {
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      const totalItems = cart.reduce(
        (sum: number, item: any) => sum + item.quantity,
        0
      );
      setCartCount(totalItems);
    };

    updateCartCount();

    // Listen for cart updates
    window.addEventListener("cart-updated", updateCartCount);
    return () => window.removeEventListener("cart-updated", updateCartCount);
  }, []);

  return (
    <nav className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#5B6EE8] to-[#4C5FD5] shadow-lg shadow-blue-500/20 transition-transform group-hover:scale-105">
              <Store className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">
              ZendFi Store
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-gray-300 hover:text-white transition-colors font-medium"
            >
              Shop
            </Link>
            <Link
              href="/cart"
              className="relative flex items-center gap-2 text-gray-300 hover:text-white transition-colors font-medium"
            >
              <ShoppingCart className="h-5 w-5" />
              <span>Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#5B6EE8] to-[#4C5FD5] text-xs font-bold text-white shadow-lg">
                  {cartCount}
                </span>
              )}
            </Link>
            <Link
              href="/auth/signin"
              className="text-gray-300 hover:text-white transition-colors font-medium"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
