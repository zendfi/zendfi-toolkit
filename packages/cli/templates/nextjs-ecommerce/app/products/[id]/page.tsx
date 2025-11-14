// Force dynamic rendering (don't pre-render during build)
export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { formatPrice } from '@/lib/utils';
import { ArrowLeft, ShoppingCart, Package, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import AddToCartButton from '@/components/shop/AddToCartButton';

interface ProductPageProps {
  params: {
    id: string;
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await prisma.product.findUnique({
    where: {
      id: params.id,
      active: true,
    },
  });

  if (!product) {
    notFound();
  }

  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock > 0 && product.stock < 5;

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Back Button */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Products
          </Link>
        </div>
      </div>

      {/* Product Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Product Image */}
          <div className="space-y-4">
            <div className="aspect-square relative rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800">
              {product.image ? (
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Sparkles className="w-16 h-16 text-gray-700" />
                </div>
              )}
              
              {/* Stock Badge */}
              {isOutOfStock && (
                <div className="absolute top-4 right-4 px-4 py-2 rounded-lg bg-red-500/90 backdrop-blur-sm text-white font-medium">
                  Out of Stock
                </div>
              )}
              {isLowStock && (
                <div className="absolute top-4 right-4 px-4 py-2 rounded-lg bg-yellow-500/90 backdrop-blur-sm text-white font-medium">
                  Only {product.stock} left!
                </div>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Category */}
            {product.category && (
              <div>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
                  {product.category}
                </span>
              </div>
            )}

            {/* Title & Price */}
            <div>
              <h1 className="text-4xl font-bold text-white mb-4">
                {product.name}
              </h1>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-white">
                  {formatPrice(product.price)}
                </span>
                <span className="text-gray-500 text-lg">USD</span>
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div className="prose prose-invert max-w-none">
                <p className="text-lg text-gray-400 leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}

            {/* Stock Indicator */}
            <div className="flex items-center gap-3 text-sm">
              <Package className="w-5 h-5 text-gray-500" />
              {isOutOfStock ? (
                <span className="text-red-400">Out of stock</span>
              ) : isLowStock ? (
                <span className="text-yellow-400">Low stock - only {product.stock} remaining</span>
              ) : (
                <span className="text-green-400">In stock ({product.stock} available)</span>
              )}
            </div>

            {/* Add to Cart Button */}
            <div className="pt-6">
              <AddToCartButton product={product} />
            </div>

            {/* Additional Info */}
            <div className="pt-6 space-y-4 border-t border-gray-800">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#5B6EE8]/10 to-[#4C5FD5]/10 border border-[#5B6EE8]/20 flex items-center justify-center flex-shrink-0">
                  <ShoppingCart className="w-5 h-5 text-[#5B6EE8]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Secure Checkout</h3>
                  <p className="text-sm text-gray-400">
                    Pay with crypto (USDC, SOL, USDT) via ZendFi
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#5B6EE8]/10 to-[#4C5FD5]/10 border border-[#5B6EE8]/20 flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-[#5B6EE8]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">Fast Delivery</h3>
                  <p className="text-sm text-gray-400">
                    Ships within 2-3 business days
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
