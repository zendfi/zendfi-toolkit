/**
 * Database Seed Script
 * Run with: npx prisma db seed
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo user
  const hashedPassword = await bcrypt.hash('demo123456', 10);
  
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      password: hashedPassword,
      name: 'Demo User',
    },
  });

  console.log('✅ Created demo user:', user.email);

  // Create API key for demo user
  const apiKey = await prisma.apiKey.upsert({
    where: { key: 'zfi_test_demo123456789' },
    update: {},
    create: {
      userId: user.id,
      key: 'zfi_test_demo123456789',
      name: 'Development Key',
      environment: 'development',
    },
  });

  console.log('✅ Created API key:', apiKey.key);

  // Create sample payment
  const payment = await prisma.payment.create({
    data: {
      userId: user.id,
      zendfiPaymentId: 'pay_demo_123',
      amount: 50,
      currency: 'USD',
      token: 'USDC',
      description: 'Demo payment',
      status: 'confirmed',
      checkoutUrl: 'https://checkout.zendfi.com/demo',
      transactionSignature: 'demo_tx_signature',
      confirmedAt: new Date(),
    },
  });

  console.log('✅ Created sample payment:', payment.id);

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📝 Test credentials:');
  console.log('   Email: demo@example.com');
  console.log('   Password: demo123456');
  console.log('   API Key: zfi_test_demo123456789');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
