"use client";

import { useEffect } from "react";
import { CheckCircle, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function SuccessPage() {
  useEffect(() => {
    // Clear cart after successful payment
    localStorage.removeItem("cart");
    
    // Trigger confetti or celebration animation here if desired
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center py-12 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 p-8 text-center shadow-2xl relative overflow-hidden">
          {/* Gradient Orbs */}
          <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-green-500/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl" />

          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="relative flex justify-center mb-6"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/50">
              <CheckCircle className="h-10 w-10 text-white" />
            </div>
          </motion.div>

          {/* Title */}
          <h1 className="text-3xl font-bold mb-4 text-white">
            Payment Successful!
          </h1>

          {/* Description */}
          <p className="text-gray-400 mb-8 leading-relaxed">
            Thank you for your purchase! Your order has been confirmed and will be
            processed shortly. You'll receive a confirmation email soon.
          </p>

          {/* Decorative Element */}
          <div className="flex items-center justify-center gap-2 mb-8 text-sm text-gray-500">
            <Sparkles className="h-4 w-4" />
            <span>Powered by ZendFi</span>
            <Sparkles className="h-4 w-4" />
          </div>

          {/* Actions */}
          <div className="space-y-3 relative">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 w-full rounded-lg bg-gradient-to-r from-[#5B6EE8] to-[#4C5FD5] px-6 py-4 text-white font-medium shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:shadow-blue-500/30"
            >
              Continue Shopping
              <ArrowRight className="h-4 w-4" />
            </Link>
            
            <Link
              href="/auth/signin"
              className="block w-full rounded-lg border border-gray-700 bg-gray-800/50 px-6 py-3 text-gray-300 font-medium transition-colors hover:bg-gray-800 hover:text-white"
            >
              Track Your Order
            </Link>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
