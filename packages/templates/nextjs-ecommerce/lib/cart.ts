/**
 * Shopping Cart Utilities
 */

import { Product } from './products';

export interface CartItem extends Product {
  quantity: number;
}

export function calculateCartTotal(items: CartItem[]): number {
  return items.reduce((total, item) => total + (item.price * item.quantity), 0);
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
}
