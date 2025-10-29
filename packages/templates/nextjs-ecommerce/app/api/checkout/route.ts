import { NextRequest, NextResponse } from 'next/server';
import { zendfi } from '@/lib/zendfi';
import { calculateCartTotal, type CartItem } from '@/lib/cart';

export async function POST(request: NextRequest) {
  try {
    const { items } = await request.json() as { items: CartItem[] };

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Cart is empty' },
        { status: 400 }
      );
    }

    // Calculate total
    const total = calculateCartTotal(items);

    // Create payment link with ZendFi
    const paymentLink = await zendfi.createPaymentLink({
      amount: total,
      currency: 'USD',
      token: 'USDC',
      description: `Order for ${items.length} item(s)`,
      metadata: {
        items: JSON.stringify(items.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        }))),
        orderDate: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      paymentUrl: paymentLink.url,
      paymentId: paymentLink.id,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout' },
      { status: 500 }
    );
  }
}
