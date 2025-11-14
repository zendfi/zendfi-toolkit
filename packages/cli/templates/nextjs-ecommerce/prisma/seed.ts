import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: adminPassword,
      role: 'admin',
    },
  });
  console.log('Created admin user:', admin.email);

  // Create sample products
  const products = [
    {
      id: 'prod_001',
      name: 'Premium Headphones',
      description: 'High-quality wireless headphones with active noise cancellation and 30-hour battery life',
      price: 299.99,
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
      category: 'Electronics',
      stock: 50,
      active: true,
    },
    {
      id: 'prod_002',
      name: 'Smart Watch Pro',
      description: 'Feature-rich smartwatch with health tracking, GPS, and water resistance',
      price: 399.99,
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
      category: 'Electronics',
      stock: 30,
      active: true,
    },
    {
      id: 'prod_003',
      name: 'Ergonomic Laptop Stand',
      description: 'Premium aluminum laptop stand with adjustable height and angle',
      price: 79.99,
      image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800',
      category: 'Accessories',
      stock: 100,
      active: true,
    },
    {
      id: 'prod_004',
      name: 'Mechanical Keyboard RGB',
      description: 'Premium mechanical keyboard with customizable RGB lighting and hot-swappable switches',
      price: 149.99,
      image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800',
      category: 'Electronics',
      stock: 75,
      active: true,
    },
    {
      id: 'prod_005',
      name: 'Wireless Gaming Mouse',
      description: 'High-precision wireless mouse with 20000 DPI and customizable buttons',
      price: 89.99,
      image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=800',
      category: 'Electronics',
      stock: 60,
      active: true,
    },
    {
      id: 'prod_006',
      name: 'USB-C Hub Pro',
      description: '10-in-1 USB-C hub with 4K HDMI, 100W PD charging, and SD card readers',
      price: 69.99,
      image: 'https://images.unsplash.com/photo-1625948515291-69613efd103f?w=800',
      category: 'Accessories',
      stock: 120,
      active: true,
    },
    {
      id: 'prod_007',
      name: 'Portable SSD 1TB',
      description: 'Ultra-fast portable SSD with USB-C 3.2 Gen 2 and shock resistance',
      price: 129.99,
      image: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800',
      category: 'Storage',
      stock: 45,
      active: true,
    },
    {
      id: 'prod_008',
      name: 'Webcam 4K Pro',
      description: '4K webcam with auto-focus, dual microphones, and LED ring light',
      price: 179.99,
      image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800',
      category: 'Electronics',
      stock: 35,
      active: true,
    },
    {
      id: 'prod_009',
      name: 'Desk Pad XXL',
      description: 'Extra-large premium desk pad with stitched edges and non-slip base',
      price: 39.99,
      image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800',
      category: 'Accessories',
      stock: 200,
      active: true,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: {},
      create: product,
    });
  }
  console.log(`Created ${products.length} products`);

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
