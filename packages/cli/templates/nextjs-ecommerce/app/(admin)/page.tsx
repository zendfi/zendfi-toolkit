import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StatsOverview } from "@/components/admin/StatsOverview";
import { Suspense } from "react";

// Force dynamic rendering (don't pre-render during build)
export const dynamic = 'force-dynamic';

async function getStats() {
  // Get total revenue from paid orders
  const orders = await prisma.order.findMany({
    where: {
      status: "PAID",
    },
    select: {
      total: true,
    },
  });
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);

  // Get total orders count
  const totalOrders = await prisma.order.count();

  // Get total products count
  const totalProducts = await prisma.product.count({
    where: {
      active: true,
    },
  });

  // Get total customers count
  const totalCustomers = await prisma.user.count({
    where: {
      role: "CUSTOMER",
    },
  });

  // Calculate changes (mock data for now - in production, compare with last month)
  const revenueChange = 12.5;
  const ordersChange = 8.3;

  return {
    totalRevenue,
    totalOrders,
    totalProducts,
    totalCustomers,
    revenueChange,
    ordersChange,
  };
}

async function RecentOrders() {
  const recentOrders = await prisma.order.findMany({
    take: 5,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  return (
    <div className="rounded-xl bg-gradient-to-br from-gray-900 to-gray-950 p-6 shadow-xl border border-gray-800">
      <h2 className="text-lg font-bold text-white mb-4">Recent Orders</h2>
      <div className="space-y-3">
        {recentOrders.length === 0 ? (
          <p className="text-sm text-gray-400">No orders yet</p>
        ) : (
          recentOrders.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between rounded-lg bg-gray-800/50 p-3 transition-colors hover:bg-gray-800"
            >
              <div>
                <p className="text-sm font-medium text-white">
                  #{order.orderNumber}
                </p>
                <p className="text-xs text-gray-400">
                  {order.user?.email || order.customerEmail}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white">
                  ${order.total.toFixed(2)}
                </p>
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    order.status === "PAID"
                      ? "bg-green-500/10 text-green-500"
                      : order.status === "PENDING"
                      ? "bg-yellow-500/10 text-yellow-500"
                      : "bg-gray-500/10 text-gray-400"
                  }`}
                >
                  {order.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  const stats = await getStats();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-gray-400">
          Welcome back, {session?.user?.email}
        </p>
      </div>

      {/* Stats */}
      <Suspense fallback={<div className="text-gray-400">Loading stats...</div>}>
        <StatsOverview stats={stats} />
      </Suspense>

      {/* Recent Orders */}
      <Suspense fallback={<div className="text-gray-400">Loading orders...</div>}>
        <RecentOrders />
      </Suspense>
    </div>
  );
}
