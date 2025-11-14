import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ZendFi SaaS - Crypto Subscriptions Made Easy',
  description: 'Accept recurring crypto payments for your SaaS business',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold bg-accent bg-clip-text text-transparent">
                  ZendFi SaaS
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <a href="/pricing" className="text-gray-700 hover:text-purple-600 transition-colors">
                  Pricing
                </a>
                <a href="/dashboard" className="text-gray-700 hover:text-purple-600 transition-colors">
                  Dashboard
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
