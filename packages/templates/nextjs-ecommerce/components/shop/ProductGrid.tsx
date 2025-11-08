"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShoppingCart, Sparkles } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@prisma/client";

interface ProductGridProps {
  products: Product[];
}

export function ProductGrid({ products }: ProductGridProps) {
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  const addToCart = (product: Product) => {
    setAddingToCart(product.id);

    // Get existing cart from localStorage
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");

    // Check if product already in cart
    const existingItemIndex = cart.findIndex(
      (item: any) => item.id === product.id
    );

    if (existingItemIndex >= 0) {
      cart[existingItemIndex].quantity += 1;
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: 1,
      });
    }

    localStorage.setItem("cart", JSON.stringify(cart));

    // Show feedback
    setTimeout(() => {
      setAddingToCart(null);
      // Dispatch custom event for cart update
      window.dispatchEvent(new Event("cart-updated"));
    }, 500);
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <Sparkles className="h-16 w-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          No products available
        </h3>
        <p className="text-gray-400">
          Check back soon for new arrivals!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product, index) => (
        <motion.div
          key={product.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className="group relative"
        >
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            {/* Product Image - Clickable */}
            <Link href={`/products/${product.id}`} className="block">
              <div className="relative h-64 bg-gray-800 overflow-hidden cursor-pointer">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Sparkles className="h-16 w-16 text-gray-600" />
                  </div>
                )}
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            </Link>

            {/* Product Info */}
            <div className="p-6">
              {/* Category Badge */}
              <div className="mb-3">
                <span className="inline-block rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-500 border border-blue-500/20">
                  {product.category}
                </span>
              </div>

              {/* Product Name - Clickable */}
              <Link href={`/products/${product.id}`}>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors cursor-pointer">
                  {product.name}
                </h3>
              </Link>

              {/* Description */}
              <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                {product.description}
              </p>

              {/* Price and Add to Cart */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-2xl font-bold text-white">
                    {formatPrice(Number(product.price))}
                  </span>
                  {product.stock < 10 && product.stock > 0 && (
                    <p className="text-xs text-yellow-500 mt-1">
                      Only {product.stock} left!
                    </p>
                  )}
                  {product.stock === 0 && (
                    <p className="text-xs text-red-500 mt-1">Out of stock</p>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    addToCart(product);
                  }}
                  disabled={product.stock === 0 || addingToCart === product.id}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#5B6EE8] to-[#4C5FD5] px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {addingToCart === product.id ? "Added!" : "Add"}
                </button>
              </div>
            </div>

            {/* Gradient accent */}
            <div className="absolute top-0 right-0 h-32 w-32 bg-gradient-to-br from-blue-500/10 to-transparent blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
