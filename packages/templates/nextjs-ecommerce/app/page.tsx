import { prisma } from '@/lib/db';
import { ProductGrid } from '@/components/shop/ProductGrid';
import Link from 'next/link';

// Force dynamic rendering (don't pre-render during build)
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Fetch active products from database
  const products = await prisma.product.findMany({
    where: {
      active: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <main className="min-h-screen bg-gray-950">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#5B6EE8] to-[#4C5FD5] relative overflow-hidden">
        {/* Gradient Orb */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400 rounded-full filter blur-3xl opacity-20 animate-pulse" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-white">
            Pay with Crypto
          </h1>
          <p className="text-xl md:text-2xl text-blue-50 mb-8 max-w-2xl">
            Secure, fast, and easy cryptocurrency payments powered by ZendFi
          </p>
          <Link
            href="/cart"
            className="inline-flex items-center gap-2 bg-white text-[#5B6EE8] px-8 py-4 rounded-lg hover:bg-blue-50 transition-all duration-200 font-semibold shadow-xl"
          >
            View Cart
          </Link>
        </div>
      </div>

      {/* Products Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white">Featured Products</h2>
            <p className="text-gray-400 mt-2">Discover our latest collection</p>
          </div>
        </div>
        
        <ProductGrid products={products} />
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 mt-20">
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
              {' '}• Crypto payments made simple
            </p>
            <div className="mt-4 flex items-center justify-center gap-6">
              <Link href="/auth/signin" className="text-gray-400 hover:text-white transition-colors">
                Sign In
              </Link>
              <Link href="/auth/signup" className="text-gray-400 hover:text-white transition-colors">
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
