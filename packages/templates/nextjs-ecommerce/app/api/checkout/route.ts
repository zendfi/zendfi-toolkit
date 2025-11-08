import { NextRequest, NextResponse } from "next/server";
import { zendfi } from "@/lib/zendfi";
import { prisma } from "@/lib/db";

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

export async function POST(request: NextRequest) {
  try {
    const { items } = (await request.json()) as { items: CartItem[] };

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    // Calculate totals
    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const taxRate = 0.08; // 8% tax
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    // Create payment link with ZendFi
    const paymentLink = await zendfi.createPaymentLink({
      amount: total,
      currency: "USD",
      token: "USDC",
      description: `Order ${orderNumber}`,
      metadata: {
        orderNumber,
        items: JSON.stringify(
          items.map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          }))
        ),
        subtotal: subtotal.toString(),
        tax: taxAmount.toString(),
        total: total.toString(),
        orderDate: new Date().toISOString(),
      },
    });

    // Create pending order in database
    // The webhook will update this to PAID when payment is confirmed
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerEmail: "guest@example.com", // Will be updated by webhook if user is logged in
        status: "pending",
        subtotal: subtotal,
        tax: taxAmount,
        total: total,
        paymentId: paymentLink.id,
        paymentStatus: "pending",
        items: {
          create: items.map((item) => ({
            productId: item.id.toString(),
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
    });

    return NextResponse.json({
      paymentUrl: paymentLink.url,
      paymentId: paymentLink.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout" },
      { status: 500 }
    );
  }
}
