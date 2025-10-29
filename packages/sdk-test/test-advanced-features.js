/**
 * ZendFi SDK - Advanced Features Test
 * Tests payment splits, installment plans, escrow, and invoices
 */

import { ZendFiClient } from '@zendfi/sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const zendfi = new ZendFiClient({
  apiKey: process.env.ZENDFI_API_KEY,
  baseURL: 'https://api.zendfi.tech',
});

console.log('\n🧪 ZendFi SDK - Advanced Features Test\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test wallets (example Solana addresses)
const SELLER_WALLET = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
const PLATFORM_WALLET = '8yKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsV';
const AFFILIATE_WALLET = '9zKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsW';
const BUYER_WALLET = 'AxKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsX';

let testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
};

/**
 * Test runner helper
 */
async function runTest(name, testFn) {
  try {
    console.log(`\n📋 ${name}`);
    await testFn();
    console.log(`✅ PASSED: ${name}`);
    testResults.passed++;
  } catch (error) {
    console.error(`❌ FAILED: ${name}`);
    console.error(`   Error: ${error.message}`);
    if (error.response) {
      console.error(`   Response: ${JSON.stringify(error.response, null, 2)}`);
    }
    testResults.failed++;
  }
}

// ===================================================================
// PAYMENT SPLITS TESTS
// ===================================================================

await runTest('Create Payment with Splits (Marketplace)', async () => {
  const payment = await zendfi.createPayment({
    amount: 100.00,
    currency: 'USD',
    token: 'USDC',
    description: 'Handmade Pottery - Order #12345',
    metadata: {
      order_id: '12345',
      product: 'Ceramic Vase',
      seller: 'ArtisanPottery',
    },
    split_recipients: [
      {
        recipient_wallet: SELLER_WALLET,
        recipient_name: 'Seller - ArtisanPottery',
        percentage: 85.0,
        split_order: 1,
      },
      {
        recipient_wallet: PLATFORM_WALLET,
        recipient_name: 'Platform Fee',
        percentage: 10.0,
        split_order: 2,
      },
      {
        recipient_wallet: AFFILIATE_WALLET,
        recipient_name: 'Payment Processor',
        percentage: 5.0,
        split_order: 3,
      },
    ],
  });

  console.log(`   Payment ID: ${payment.id}`);
  console.log(`   Amount: $${payment.amount || payment.amount_usd}`);
  console.log(`   Currency: ${payment.currency || payment.payment_token || 'USDC'}`);
  console.log(`   Splits: ${payment.split_ids?.length || 0} recipients`);
  console.log(`   Payment URL: ${payment.payment_url || payment.checkout_url}`);

  if (!payment.split_ids || payment.split_ids.length !== 3) {
    throw new Error('Expected 3 split IDs');
  }
});

await runTest('Create Payment with Fixed Amount Split (Affiliate)', async () => {
  const payment = await zendfi.createPayment({
    amount: 299.99,
    currency: 'USD',
    token: 'USDC',
    description: 'Premium Course - Web3 Development',
    metadata: {
      course_id: 'web3-101',
      affiliate_code: 'JOHN2024',
    },
    split_recipients: [
      {
        recipient_wallet: SELLER_WALLET,
        recipient_name: 'Course Creator',
        percentage: 70.0,
        split_order: 1,
      },
      {
        recipient_wallet: AFFILIATE_WALLET,
        recipient_name: 'Affiliate - John',
        fixed_amount_usd: 50.00,
        split_order: 2,
      },
      {
        recipient_wallet: PLATFORM_WALLET,
        recipient_name: 'Platform',
        percentage: 13.33,
        split_order: 3,
      },
    ],
  });

  console.log(`   Payment ID: ${payment.id}`);
  console.log(`   Amount: $${payment.amount || payment.amount_usd}`);
  console.log(`   Splits: ${payment.split_ids?.length || 0} recipients`);
});

// ===================================================================
// INSTALLMENT PLANS TESTS
// ===================================================================

await runTest('Create Installment Plan (3 Months)', async () => {
  const plan = await zendfi.createInstallmentPlan({
    customer_wallet: BUYER_WALLET,
    customer_email: 'customer@example.com',
    total_amount: 900.00,
    installment_count: 3,
    payment_frequency_days: 30,
    description: 'MacBook Pro - 3 Monthly Payments',
    late_fee_amount: 25.00,
    grace_period_days: 5,
    metadata: {
      product_id: 'macbook_pro_16',
      order_id: 'ORD-12345',
    },
  });

  console.log(`   Plan ID: ${plan.id || plan.plan_id}`);
  console.log(`   Status: ${plan.status}`);

  // Create response only has plan_id and status, not full details
  if (!plan.id && !plan.plan_id) {
    throw new Error('Expected plan ID');
  }
  if (!plan.status) {
    throw new Error('Expected status');
  }
});

await runTest('Get Installment Plan', async () => {
  // First create a plan
  const createdPlan = await zendfi.createInstallmentPlan({
    customer_wallet: BUYER_WALLET,
    customer_email: 'test@example.com',
    total_amount: 600.00,
    installment_count: 2,
    payment_frequency_days: 30,
    description: 'Test Plan',
  });

  // Then fetch it
  const plan = await zendfi.getInstallmentPlan(createdPlan.id);

  console.log(`   Plan ID: ${plan.id}`);
  console.log(`   Status: ${plan.status}`);
  console.log(`   Schedule: ${plan.payment_schedule.length} payments`);

  if (plan.id !== createdPlan.id) {
    throw new Error('Plan ID mismatch');
  }
});

await runTest('List Merchant Installment Plans', async () => {
  const plans = await zendfi.listInstallmentPlans({ limit: 10 });

  console.log(`   Found ${plans.length} plans`);
  if (plans.length > 0) {
    console.log(`   First plan: ${plans[0].id}`);
    console.log(`   Status: ${plans[0].status}`);
  }
});

await runTest('List Customer Installment Plans', async () => {
  const plans = await zendfi.listCustomerInstallmentPlans(BUYER_WALLET);

  console.log(`   Found ${plans.length} plans for customer`);
  if (plans.length > 0) {
    console.log(`   First plan: ${plans[0].id}`);
  }
});

// ===================================================================
// ESCROW TESTS
// ===================================================================

await runTest('Create Escrow (Milestone-Based)', async () => {
  const escrow = await zendfi.createEscrow({
    buyer_wallet: BUYER_WALLET,
    seller_wallet: SELLER_WALLET,
    amount: 2500.00,
    currency: 'USD',
    token: 'USDC',
    description: 'Website Development - Full Stack Project',
    release_conditions: {
      type: 'milestone',
      description: 'Website delivered and approved by client',
      approved: false,
    },
    metadata: {
      project_id: 'proj_12345',
      contract_url: 'https://example.com/contracts/12345',
    },
  });

  console.log(`   Escrow ID: ${escrow.id}`);
  console.log(`   Payment ID: ${escrow.payment_id}`);
  console.log(`   Amount: $${escrow.amount}`);
  console.log(`   Status: ${escrow.status}`);
  console.log(`   Payment URL: ${escrow.payment_url}`);

  if (escrow.status !== 'pending') {
    throw new Error('Expected pending status');
  }
});

await runTest('Create Escrow (Time-Based)', async () => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7); // 7 days from now

  const escrow = await zendfi.createEscrow({
    buyer_wallet: BUYER_WALLET,
    seller_wallet: SELLER_WALLET,
    amount: 500.00,
    currency: 'USD',
    token: 'USDC',
    description: 'Escrow with Auto-Release',
    release_conditions: {
      type: 'time_based',
      release_after: futureDate.toISOString(),
    },
  });

  console.log(`   Escrow ID: ${escrow.id}`);
  console.log(`   Auto-release after: ${escrow.release_conditions.release_after}`);
  console.log(`   Status: ${escrow.status}`);
});

await runTest('Get Escrow', async () => {
  // First create an escrow
  const createdEscrow = await zendfi.createEscrow({
    buyer_wallet: BUYER_WALLET,
    seller_wallet: SELLER_WALLET,
    amount: 1000.00,
    description: 'Test Escrow',
    release_conditions: {
      type: 'manual_approval',
      approver: BUYER_WALLET,
      approved: false,
    },
  });

  // Then fetch it
  const escrow = await zendfi.getEscrow(createdEscrow.id);

  console.log(`   Escrow ID: ${escrow.id}`);
  console.log(`   Status: ${escrow.status}`);
  console.log(`   Buyer: ${escrow.buyer_wallet.substring(0, 10)}...`);
  console.log(`   Seller: ${escrow.seller_wallet.substring(0, 10)}...`);

  if (escrow.id !== createdEscrow.id) {
    throw new Error('Escrow ID mismatch');
  }
});

await runTest('List Escrows', async () => {
  const escrows = await zendfi.listEscrows({ limit: 10 });

  console.log(`   Found ${escrows.length} escrows`);
  if (escrows.length > 0) {
    console.log(`   First escrow: ${escrows[0].id}`);
    console.log(`   Status: ${escrows[0].status}`);
  }
});

// ===================================================================
// INVOICES TESTS
// ===================================================================

await runTest('Create Invoice', async () => {
  const invoice = await zendfi.createInvoice({
    customer_email: 'client@example.com',
    customer_name: 'Acme Corp',
    amount: 3500.00,
    token: 'USDC',
    description: 'Web Development Services - Q4 2025',
    line_items: [
      {
        description: 'Frontend Development (React)',
        quantity: 40,
        unit_price: 50.00,
      },
      {
        description: 'Backend API Development',
        quantity: 30,
        unit_price: 50.00,
      },
      {
        description: 'UI/UX Design',
        quantity: 10,
        unit_price: 100.00,
      },
    ],
    due_date: '2025-11-15T23:59:59Z',
    metadata: {
      project_id: 'proj_q4_2025',
      po_number: 'PO-12345',
    },
  });

  console.log(`   Invoice ID: ${invoice.id}`);
  console.log(`   Invoice #: ${invoice.invoice_number}`);
  console.log(`   Customer: ${invoice.customer_name}`);
  console.log(`   Amount: $${invoice.amount_usd}`);
  console.log(`   Status: ${invoice.status}`);
  console.log(`   Line items: ${invoice.line_items?.length || 0}`);

  if (invoice.status !== 'draft') {
    throw new Error('Expected draft status');
  }
});

await runTest('Get Invoice', async () => {
  // First create an invoice
  const createdInvoice = await zendfi.createInvoice({
    customer_email: 'test@example.com',
    customer_name: 'Test Customer',
    amount: 500.00,
    description: 'Test Invoice',
  });

  // Then fetch it
  const invoice = await zendfi.getInvoice(createdInvoice.id);

  console.log(`   Invoice ID: ${invoice.id}`);
  console.log(`   Invoice #: ${invoice.invoice_number}`);
  console.log(`   Status: ${invoice.status}`);

  if (invoice.id !== createdInvoice.id) {
    throw new Error('Invoice ID mismatch');
  }
});

await runTest('List Invoices', async () => {
  const invoices = await zendfi.listInvoices();

  console.log(`   Found ${invoices.length} invoices`);
  if (invoices.length > 0) {
    console.log(`   First invoice: ${invoices[0].invoice_number}`);
    console.log(`   Status: ${invoices[0].status}`);
  }
});

await runTest('Send Invoice', async () => {
  // First create an invoice
  const createdInvoice = await zendfi.createInvoice({
    customer_email: 'recipient@example.com',
    customer_name: 'Invoice Recipient',
    amount: 250.00,
    description: 'Consulting Services - October 2025',
  });

  // Then send it
  const result = await zendfi.sendInvoice(createdInvoice.id);

  console.log(`   Invoice sent: ${result.success}`);
  console.log(`   Invoice #: ${result.invoice_number}`);
  console.log(`   Sent to: ${result.sent_to}`);
  console.log(`   Payment URL: ${result.payment_url}`);
  console.log(`   Status: ${result.status}`);

  if (!result.success) {
    throw new Error('Expected successful send');
  }
});

// ===================================================================
// TEST SUMMARY
// ===================================================================

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\n📊 Test Summary:\n');
console.log(`   ✅ Passed: ${testResults.passed}`);
console.log(`   ❌ Failed: ${testResults.failed}`);
console.log(`   ⏭️  Skipped: ${testResults.skipped}`);
console.log(`   📈 Total: ${testResults.passed + testResults.failed + testResults.skipped}`);

const successRate = ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1);
console.log(`\n   Success Rate: ${successRate}%`);

if (testResults.failed === 0) {
  console.log('\n   🎉 All tests passed!');
} else {
  console.log(`\n   ⚠️  ${testResults.failed} test(s) failed`);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

process.exit(testResults.failed > 0 ? 1 : 0);
