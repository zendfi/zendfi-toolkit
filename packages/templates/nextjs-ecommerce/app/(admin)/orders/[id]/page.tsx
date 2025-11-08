// Force dynamic rendering (don't pre-render during build)
export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package, Truck, CheckCircle, XCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { UpdateOrderStatusButton } from "@/components/admin/UpdateOrderStatusButton";

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const order = await prisma.order.findUnique({
    where: {
      id: params.id,
    },
    include: {
      user: {
        select: {
          email: true,
        },
      },
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/orders"
          className="rounded-lg bg-gray-800 p-2 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white">
            Order #{order.orderNumber}
          </h1>
          <p className="mt-1 text-gray-400">
            Placed on {formatDate(order.createdAt)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Order Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="rounded-xl bg-gradient-to-br from-gray-900 to-gray-950 p-6 shadow-xl border border-gray-800">
            <h2 className="text-lg font-bold text-white mb-4">Order Items</h2>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 rounded-lg bg-gray-800/50 p-4"
                >
                  {item.product.image && (
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-white">
                      {item.product.name}
                    </p>
                    <p className="text-sm text-gray-400">
                      Quantity: {item.quantity} × ${item.price.toFixed(2)}
                    </p>
                  </div>
                  <p className="font-bold text-white">
                    ${(item.quantity * item.price).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="mt-6 space-y-2 border-t border-gray-800 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Subtotal</span>
                <span className="text-white">
                  ${order.subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Tax</span>
                <span className="text-white">${order.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-800 pt-2 text-base font-bold">
                <span className="text-white">Total</span>
                <span className="text-white">
                  ${order.total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          {order.shippingAddress && (
            <div className="rounded-xl bg-gradient-to-br from-gray-900 to-gray-950 p-6 shadow-xl border border-gray-800">
              <h2 className="text-lg font-bold text-white mb-4">
                Shipping Address
              </h2>
              <div className="space-y-1 text-sm">
                <p className="text-white">
                  {(order.shippingAddress as any).name}
                </p>
                <p className="text-gray-400">
                  {(order.shippingAddress as any).street}
                </p>
                <p className="text-gray-400">
                  {(order.shippingAddress as any).city},{" "}
                  {(order.shippingAddress as any).state}{" "}
                  {(order.shippingAddress as any).zip}
                </p>
                <p className="text-gray-400">
                  {(order.shippingAddress as any).country}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Order Status & Actions */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="rounded-xl bg-gradient-to-br from-gray-900 to-gray-950 p-6 shadow-xl border border-gray-800">
            <h2 className="text-lg font-bold text-white mb-4">Order Status</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-400 mb-2">Current Status</p>
                <span
                  className={`inline-block rounded-full px-3 py-1.5 text-sm font-medium ${
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
              </div>

              {/* Update Status Buttons */}
              <div>
                <p className="text-sm text-gray-400 mb-3">Update Status</p>
                <div className="space-y-2">
                  <UpdateOrderStatusButton
                    orderId={order.id.toString()}
                    currentStatus={order.status}
                    newStatus="SHIPPED"
                    icon={Truck}
                    label="Mark as Shipped"
                    disabled={
                      order.status === "SHIPPED" ||
                      order.status === "DELIVERED" ||
                      order.status === "CANCELLED"
                    }
                  />
                  <UpdateOrderStatusButton
                    orderId={order.id.toString()}
                    currentStatus={order.status}
                    newStatus="DELIVERED"
                    icon={CheckCircle}
                    label="Mark as Delivered"
                    disabled={
                      order.status === "DELIVERED" ||
                      order.status === "CANCELLED"
                    }
                  />
                  <UpdateOrderStatusButton
                    orderId={order.id.toString()}
                    currentStatus={order.status}
                    newStatus="CANCELLED"
                    icon={XCircle}
                    label="Cancel Order"
                    variant="danger"
                    disabled={
                      order.status === "DELIVERED" ||
                      order.status === "CANCELLED"
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="rounded-xl bg-gradient-to-br from-gray-900 to-gray-950 p-6 shadow-xl border border-gray-800">
            <h2 className="text-lg font-bold text-white mb-4">
              Customer Information
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-400">Email</p>
                <p className="text-white">
                  {order.user?.email || order.customerEmail}
                </p>
              </div>
              {order.paymentId && (
                <div>
                  <p className="text-sm text-gray-400">Payment ID</p>
                  <p className="font-mono text-xs text-white break-all">
                    {order.paymentId}
                  </p>
                </div>
              )}
              {order.transactionSig && (
                <div>
                  <p className="text-sm text-gray-400">Transaction</p>
                  <a
                    href={`https://solscan.io/tx/${order.transactionSig}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-blue-500 hover:text-blue-400 break-all"
                  >
                    {order.transactionSig}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
