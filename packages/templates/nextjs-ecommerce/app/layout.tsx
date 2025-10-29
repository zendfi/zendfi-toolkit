import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ZendFi Store - Crypto E-commerce',
  description: 'Buy products with cryptocurrency using ZendFi',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] border-b border-[#E3E8EE]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-[#5B6EE8] to-[#4C5FD5] bg-clip-text text-transparent">
                  ZendFi Store
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <a href="/cart" className="text-gray-700 hover:text-[#5B6EE8] transition-colors font-medium">
                  🛒 Cart
                </a>
              </div>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
}
