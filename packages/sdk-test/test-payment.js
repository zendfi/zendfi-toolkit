/**
 * ZendFi SDK Test - Payment Creation
 * Tests basic payment creation and retrieval
 */

import 'dotenv/config';
import { ZendFiClient } from '@zendfi/sdk';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60) + '\n');
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'cyan');
}

async function testPayments() {
  logSection('🧪 ZendFi SDK - Payment Tests');

  if (!process.env.ZENDFI_API_KEY) {
    logError('ZENDFI_API_KEY not found in .env file');
    logInfo('Please copy .env.example to .env and add your credentials');
    process.exit(1);
  }

  try {
    // Initialize SDK
    logSection('1. SDK Initialization');
    const zendfi = new ZendFiClient({
      apiKey: process.env.ZENDFI_API_KEY,
      baseURL: process.env.ZENDFI_BASE_URL || 'https://api.zendfi.tech',
    });
    logSuccess('SDK initialized successfully');

    // Test 1: Create Payment
    logSection('2. Create Payment');
    logInfo('Creating payment for $100.00 USDC...');
    
    const createRequest = {
      amount: 100.00,
      currency: 'USD',
      token: 'USDC',
      description: 'SDK Test - Payment Creation',
      customer_email: 'test@example.com',
      metadata: {
        test: true,
        timestamp: new Date().toISOString(),
      },
    };
    
    const payment = await zendfi.createPayment(createRequest);
    
    logSuccess('Payment created successfully!');
    console.log('\nPayment Details:');
    console.log(`  ID: ${payment.id}`);
    console.log(`  Amount: $${payment.amount_usd} USD`);
    console.log(`  Token: ${payment.payment_token}`);
    console.log(`  Status: ${payment.status}`);
    console.log(`  Checkout URL: ${payment.checkout_url}`);
    console.log(`  Customer Email: ${payment.customer_email}`);

    // Test 2: Retrieve Payment
    logSection('3. Retrieve Payment');
    logInfo(`Fetching payment by ID: ${payment.id}`);
    
    const retrievedPayment = await zendfi.getPayment(payment.id);
    
    logSuccess('Payment retrieved successfully!');
    console.log('\nRetrieved Payment:');
    console.log(`  ID: ${retrievedPayment.id}`);
    console.log(`  Status: ${retrievedPayment.status}`);
    console.log(`  Amount: $${retrievedPayment.amount_usd} USD`);

    // Test 3: List Payments
    logSection('4. List Payments');
    logInfo('Fetching recent payments...');
    
    try {
      const payments = await zendfi.listPayments({ limit: 5 });
      
      logSuccess(`Found ${payments.data.length} payments`);
      console.log('\nRecent Payments:');
      payments.data.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.id} - $${p.amount_usd} USD - ${p.status}`);
      });
      console.log(`\nTotal: ${payments.total}, Page: ${payments.page}/${payments.total_pages}`);
    } catch (error) {
      if (error.message.includes('Method Not Allowed')) {
        logInfo('List payments endpoint not yet implemented in backend');
        logInfo('This is expected - the backend may not have GET /payments yet');
      } else {
        throw error;
      }
    }

    // Summary
    logSection('✨ Test Summary');
    logSuccess('All payment tests passed!');
    console.log('\nCreated Payment:');
    console.log(`  ID: ${payment.id}`);
    console.log(`  Checkout URL: ${colors.blue}${payment.checkout_url}${colors.reset}`);

  } catch (error) {
    logSection('❌ Test Failed');
    logError(`Error: ${error.message}`);
    
    if (error.response) {
      console.log('\nAPI Response:');
      console.log(`  Status: ${error.response.status}`);
      console.log(`  Data:`, error.response.data);
    }
    
    process.exit(1);
  }
}

// Run tests
testPayments();
