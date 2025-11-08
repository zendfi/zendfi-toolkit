// Force dynamic rendering (don't pre-render during build)
export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/db";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { Eye } from "lucide-react";

export default async function OrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      user: {
        select: {
          email: true,
        },
      },
      _count: {
        select: {
          items: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Orders</h1>
        <p className="mt-1 text-gray-400">
          Manage customer orders and payments
        </p>
      </div>

      {/* Orders Table */}
      <div className="overflow-hidden rounded-xl bg-gradient-to-br from-gray-900 to-gray-950 shadow-xl border border-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/50">
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Order #
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Customer
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Items
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Total
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                  Date
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <p className="text-gray-400">No orders yet</p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order.id}
                    className="transition-colors hover:bg-gray-800/50"
                  >
                    <td className="px-6 py-4">
                      <p className="font-mono text-sm font-medium text-white">
                        #{order.orderNumber}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-white">
                        {order.user?.email || order.customerEmail}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-400">
                        {order._count.items} items
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-white">
                        ${order.total.toFixed(2)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
                          order.status === "PAID"
                            ? "bg-green-500/10 text-green-500"
                            : order.status === "PENDING"
                            ? "bg-yellow-500/10 text-yellow-500"
                            : order.status === "SHIPPED"
                            ? "bg-blue-500/10 text-blue-500"
                            : order.status === "DELIVERED"
                            ? "bg-purple-500/10 text-purple-500"
                            : order.status === "CANCELLED"
                            ? "bg-red-500/10 text-red-500"
                            : "bg-gray-500/10 text-gray-400"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-400">
                        {formatDate(order.createdAt)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="inline-flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-1.5 text-sm text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
