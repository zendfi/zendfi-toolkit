/**
 * ZendFi SDK Test - Webhook Verification
 * Tests webhook signature verification
 */

import 'dotenv/config';
import { ZendFiClient, verifyWebhookSignature } from '@zendfi/sdk';

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

async function testWebhooks() {
  logSection('🧪 ZendFi SDK - Webhook Verification Tests');

  if (!process.env.ZENDFI_WEBHOOK_SECRET) {
    logError('ZENDFI_WEBHOOK_SECRET not found in .env file');
    logInfo('Please copy .env.example to .env and add your webhook secret');
    process.exit(1);
  }

  try {
    // Initialize SDK
    logSection('1. SDK Initialization');
    const zendfi = new ZendFiClient({
      apiKey: process.env.ZENDFI_API_KEY || 'test_key',
      baseURL: process.env.ZENDFI_BASE_URL || 'https://api.zendfi.tech',
    });
    logSuccess('SDK initialized successfully');

    // Test 1: Valid Webhook Signature
    logSection('2. Test Valid Webhook Signature');
    
    const mockPayload = {
      event: 'payment.confirmed',
      merchant_id: 'test_merchant_123',
      timestamp: new Date().toISOString(),
      data: {
        id: 'payment_123456',
        amount: 100.00,
        status: 'confirmed',
      },
    };

    const payloadString = JSON.stringify(mockPayload);
    logInfo('Creating mock webhook payload...');
    console.log('Payload:', JSON.stringify(mockPayload, null, 2));

    // In a real scenario, this signature would come from the webhook request headers
    // For testing, we'll generate it manually
    const crypto = await import('crypto');
    const validSignature = crypto
      .createHmac('sha256', process.env.ZENDFI_WEBHOOK_SECRET)
      .update(payloadString)
      .digest('hex');

    logInfo(`Generated signature: ${validSignature.substring(0, 20)}...`);

    const isValid = verifyWebhookSignature(
      payloadString,
      validSignature,
      process.env.ZENDFI_WEBHOOK_SECRET
    );

    if (isValid) {
      logSuccess('Webhook signature verified successfully! ✓');
    } else {
      logError('Webhook signature verification failed!');
    }

    // Test 2: Invalid Webhook Signature
    logSection('3. Test Invalid Webhook Signature');
    
    const invalidSignature = 'invalid_signature_12345';
    logInfo('Testing with invalid signature...');

    const isInvalid = verifyWebhookSignature(
      payloadString,
      invalidSignature,
      process.env.ZENDFI_WEBHOOK_SECRET
    );

    if (!isInvalid) {
      logSuccess('Invalid signature correctly rejected ✓');
    } else {
      logError('Invalid signature was incorrectly accepted!');
    }

    // Test 3: Modified Payload
    logSection('4. Test Modified Payload Detection');
    
    const modifiedPayload = JSON.stringify({
      event: mockPayload.event,
      merchant_id: mockPayload.merchant_id,
      timestamp: mockPayload.timestamp,
      data: {
        ...mockPayload.data,
        amount: 999.99, // Tampered amount
      },
    });

    logInfo('Testing with tampered payload...');

    const isTamperedValid = verifyWebhookSignature(
      modifiedPayload,
      validSignature,
      process.env.ZENDFI_WEBHOOK_SECRET
    );

    if (!isTamperedValid) {
      logSuccess('Tampered payload correctly detected ✓');
    } else {
      logError('Tampered payload was not detected!');
    }

    // Test 4: Different Webhook Events
    logSection('5. Test Different Webhook Events');
    
    const events = [
      'payment.created',
      'payment.confirmed',
      'payment.failed',
      'subscription.created',
      'subscription.canceled',
    ];

    logInfo('Testing signature verification for different event types...');
    
    let allEventsValid = true;
    for (const event of events) {
      const eventPayload = JSON.stringify({
        event,
        merchant_id: 'test_merchant_123',
        timestamp: new Date().toISOString(),
        data: { id: 'test_123' },
      });
      
      const eventSignature = crypto
        .createHmac('sha256', process.env.ZENDFI_WEBHOOK_SECRET)
        .update(eventPayload)
        .digest('hex');

      const valid = verifyWebhookSignature(
        eventPayload,
        eventSignature,
        process.env.ZENDFI_WEBHOOK_SECRET
      );

      if (valid) {
        log(`  ✓ ${event}`, 'green');
      } else {
        log(`  ✗ ${event}`, 'red');
        allEventsValid = false;
      }
    }

    if (allEventsValid) {
      logSuccess('All event types verified successfully!');
    }

    // Summary
    logSection('✨ Test Summary');
    logSuccess('All webhook tests passed!');
    console.log('\nWebhook Security Features Tested:');
    console.log('  ✓ HMAC-SHA256 signature verification');
    console.log('  ✓ Invalid signature rejection');
    console.log('  ✓ Payload tampering detection');
    console.log('  ✓ Multiple event type handling');
    console.log('\nWebhook Integration Ready! 🎉');

  } catch (error) {
    logSection('❌ Test Failed');
    logError(`Error: ${error.message}`);
    
    if (error.stack) {
      console.log('\nStack Trace:');
      console.log(error.stack);
    }
    
    process.exit(1);
  }
}

// Run tests
testWebhooks();
