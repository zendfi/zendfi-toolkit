import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/orders - List orders
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const where = session.user.role === 'admin'
      ? {} // Admin sees all orders
      : { userId: session.user.id }; // Customers see only their orders
    
    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

// POST /api/orders - Create a new order
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    
    const { items, customerEmail, customerName, shippingAddress } = body;
    
    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }
    
    if (!customerEmail) {
      return NextResponse.json({ error: 'Customer email is required' }, { status: 400 });
    }
    
    // Calculate order totals
    let subtotal = 0;
    const orderItems = [];
    
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.id },
      });
      
      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.id} not found` },
          { status: 404 }
        );
      }
      
      if (product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}` },
          { status: 400 }
        );
      }
      
      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;
      
      orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        price: product.price,
      });
    }
    
    const tax = subtotal * 0.08; // 8% tax
    const total = subtotal + tax;
    
    // Create order
    const order = await prisma.order.create({
      data: {
        userId: session?.user?.id,
        customerEmail,
        customerName,
        status: 'pending',
        subtotal,
        tax,
        total,
        shippingAddress,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
    
    // Decrement stock for each product
    for (const item of items) {
      await prisma.product.update({
        where: { id: item.id },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });
    }
    
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
