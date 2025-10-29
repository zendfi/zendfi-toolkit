/**
 * Product Data
 */

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
}

export const products: Product[] = [
  {
    id: 'prod_001',
    name: 'Premium Headphones',
    description: 'High-quality wireless headphones with noise cancellation',
    price: 299.99,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
    category: 'Electronics',
  },
  {
    id: 'prod_002',
    name: 'Smart Watch',
    description: 'Feature-rich smartwatch with health tracking',
    price: 399.99,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500',
    category: 'Electronics',
  },
  {
    id: 'prod_003',
    name: 'Laptop Stand',
    description: 'Ergonomic aluminum laptop stand',
    price: 79.99,
    image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500',
    category: 'Accessories',
  },
  {
    id: 'prod_004',
    name: 'Mechanical Keyboard',
    description: 'RGB mechanical keyboard with custom switches',
    price: 149.99,
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500',
    category: 'Electronics',
  },
  {
    id: 'prod_005',
    name: 'Wireless Mouse',
    description: 'Ergonomic wireless mouse with precision tracking',
    price: 59.99,
    image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=500',
    category: 'Electronics',
  },
  {
    id: 'prod_006',
    name: 'USB-C Hub',
    description: '7-in-1 USB-C hub with 4K HDMI and PD charging',
    price: 49.99,
    image: 'https://images.unsplash.com/photo-1625948515291-69613efd103f?w=500',
    category: 'Accessories',
  },
];

export function getProduct(id: string): Product | undefined {
  return products.find(p => p.id === id);
}

export function getProductsByCategory(category: string): Product[] {
  return products.filter(p => p.category === category);
}
