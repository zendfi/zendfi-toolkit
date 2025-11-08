"use client";

import { motion } from "framer-motion";
import {
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  icon: React.ElementType;
  trend: "up" | "down";
}

function StatCard({ title, value, change, icon: Icon, trend }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-900 to-gray-950 p-6 shadow-xl border border-gray-800"
    >
      {/* Gradient Accent */}
      <div className="absolute top-0 right-0 h-32 w-32 bg-gradient-to-br from-[#5B6EE8]/10 to-transparent blur-2xl" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          <div className="mt-2 flex items-center gap-1">
            <ArrowUpRight
              className={`h-4 w-4 ${
                trend === "up" ? "text-green-500" : "text-red-500 rotate-180"
              }`}
            />
            <span
              className={`text-sm font-medium ${
                trend === "up" ? "text-green-500" : "text-red-500"
              }`}
            >
              {change}
            </span>
            <span className="text-sm text-gray-500">vs last month</span>
          </div>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[#5B6EE8] to-[#4C5FD5] shadow-lg shadow-blue-500/20">
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </motion.div>
  );
}

interface StatsOverviewProps {
  stats: {
    totalRevenue: number;
    totalOrders: number;
    totalProducts: number;
    totalCustomers: number;
    revenueChange: number;
    ordersChange: number;
  };
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatChange = (change: number) => {
    return `${change > 0 ? "+" : ""}${change.toFixed(1)}%`;
  };

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Revenue"
        value={formatCurrency(stats.totalRevenue)}
        change={formatChange(stats.revenueChange)}
        icon={DollarSign}
        trend={stats.revenueChange > 0 ? "up" : "down"}
      />
      <StatCard
        title="Total Orders"
        value={stats.totalOrders.toString()}
        change={formatChange(stats.ordersChange)}
        icon={ShoppingCart}
        trend={stats.ordersChange > 0 ? "up" : "down"}
      />
      <StatCard
        title="Products"
        value={stats.totalProducts.toString()}
        change="+0.0%"
        icon={Package}
        trend="up"
      />
      <StatCard
        title="Customers"
        value={stats.totalCustomers.toString()}
        change="+0.0%"
        icon={Users}
        trend="up"
      />
    </div>
  );
}
