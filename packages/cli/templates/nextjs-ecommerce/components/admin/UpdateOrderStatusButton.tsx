"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";

interface UpdateOrderStatusButtonProps {
  orderId: string;
  currentStatus: string;
  newStatus: string;
  icon: LucideIcon;
  label: string;
  variant?: "primary" | "danger";
  disabled?: boolean;
}

export function UpdateOrderStatusButton({
  orderId,
  currentStatus,
  newStatus,
  icon: Icon,
  label,
  variant = "primary",
  disabled = false,
}: UpdateOrderStatusButtonProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    if (!confirm(`Are you sure you want to update the order status to ${newStatus}?`)) {
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        router.refresh();
      } else {
        alert("Failed to update order status");
      }
    } catch (error) {
      alert("Failed to update order status");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <button
      onClick={handleUpdate}
      disabled={disabled || isUpdating}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        variant === "danger"
          ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
          : "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
      }`}
    >
      <Icon className="h-4 w-4" />
      {isUpdating ? "Updating..." : label}
    </button>
  );
}
