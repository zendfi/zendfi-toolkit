/**
 * ZendFi SDK - Webhook Handler Tests
 * Tests the new auto-verification webhook handler
 */

import { processWebhook } from '@zendfi/sdk';
import crypto from 'crypto';

const WEBHOOK_SECRET = 'whsec_test_secret_key_12345';

console.log('\n============================================================');
console.log(' ZendFi SDK - Webhook Handler Auto-Verification Tests');
console.log('============================================================\n');

function generateSignature(payload, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(typeof payload === 'string' ? payload : JSON.stringify(payload));
  return hmac.digest('hex');
}

console.log('\n============================================================');
console.log('1. Test Auto-Verification with Valid Signature');
console.log('============================================================\n');

try {
  const payload = {
    event: 'payment.confirmed',
    webhook_id: 'wh_test_001',
    merchant_id: 'test_merchant_123',
    timestamp: new Date().toISOString(),
    data: {
      payment_id: 'payment_123456',
      amount: 100,
      currency: 'USD',
      status: 'confirmed',
    },
  };

  const body = JSON.stringify(payload);
  const signature = generateSignature(body, WEBHOOK_SECRET);

  console.log('ℹ Creating webhook with auto-verification...');
  console.log(`Signature: ${signature.substring(0, 20)}...`);

  let handlerCalled = false;
  let receivedPayment = null;

  const result = await processWebhook({
    signature,
    body,
    handlers: {
      'payment.confirmed': async (payment) => {
        handlerCalled = true;
        receivedPayment = payment;
        console.log(' Handler called with payment:', payment.payment_id);
      },
    },
    config: {
      webhookSecret: WEBHOOK_SECRET,
    },
  });

  if (result.success && handlerCalled) {
    console.log('✓ Auto-verification passed! ✓');
    console.log('✓ Handler executed successfully!');
    console.log(`  Payment ID: ${receivedPayment.payment_id}`);
    console.log(`  Amount: $${receivedPayment.amount} ${receivedPayment.currency}`);
  } else {
    throw new Error('Test failed: Handler not called or verification failed');
  }
} catch (error) {
  console.error('✗ Test failed:', error.message);
  process.exit(1);
}

console.log('\n============================================================');
console.log('2. Test Auto-Verification Rejects Invalid Signature');
console.log('============================================================\n');

try {
  const payload = {
    event: 'payment.confirmed',
    webhook_id: 'wh_test_002',
    merchant_id: 'test_merchant_123',
    timestamp: new Date().toISOString(),
    data: {
      payment_id: 'payment_789',
      amount: 50,
      status: 'confirmed',
    },
  };

  const body = JSON.stringify(payload);
  const invalidSignature = 'invalid_signature_12345';

  console.log('ℹ Testing with invalid signature...');

  let handlerCalled = false;

  const result = await processWebhook({
    signature: invalidSignature,
    body,
    handlers: {
      'payment.confirmed': async (payment) => {
        handlerCalled = true;
      },
    },
    config: {
      webhookSecret: WEBHOOK_SECRET,
    },
  });

  if (!result.success && !handlerCalled && result.statusCode === 401) {
    console.log('✓ Invalid signature correctly rejected! ✓');
    console.log(`  Status Code: ${result.statusCode}`);
    console.log(`  Error: ${result.error}`);
  } else {
    throw new Error('Test failed: Invalid signature was not rejected');
  }
} catch (error) {
  console.error('✗ Test failed:', error.message);
  process.exit(1);
}

console.log('\n============================================================');
console.log('3. Test Multiple Event Handlers');
console.log('============================================================\n');

try {
  const events = [
    { type: 'payment.created', id: 'payment_001' },
    { type: 'payment.confirmed', id: 'payment_002' },
    { type: 'payment.failed', id: 'payment_003' },
    { type: 'subscription.created', id: 'sub_001' },
  ];

  const handlerResults = {};

  console.log('ℹ Testing multiple event types...');

  for (const event of events) {
    const payload = {
      event: event.type,
      webhook_id: `wh_${event.id}`,
      merchant_id: 'test_merchant_123',
      timestamp: new Date().toISOString(),
      data: {
        id: event.id,
        status: 'active',
      },
    };

    const body = JSON.stringify(payload);
    const signature = generateSignature(body, WEBHOOK_SECRET);

    const result = await processWebhook({
      signature,
      body,
      handlers: {
        'payment.created': async (payment) => {
          handlerResults['payment.created'] = payment.id;
        },
        'payment.confirmed': async (payment) => {
          handlerResults['payment.confirmed'] = payment.id;
        },
        'payment.failed': async (payment) => {
          handlerResults['payment.failed'] = payment.id;
        },
        'subscription.created': async (subscription) => {
          handlerResults['subscription.created'] = subscription.id;
        },
      },
      config: {
        webhookSecret: WEBHOOK_SECRET,
      },
    });

    if (!result.success) {
      throw new Error(`Failed to process ${event.type}`);
    }
  }

  console.log('✓ All event handlers executed successfully!');
  for (const [eventType, id] of Object.entries(handlerResults)) {
    console.log(`  ✓ ${eventType}: ${id}`);
  }
} catch (error) {
  console.error('✗ Test failed:', error.message);
  process.exit(1);
}

console.log('\n============================================================');
console.log('4. Test Deduplication');
console.log('============================================================\n');

try {
  const payload = {
    event: 'payment.confirmed',
    webhook_id: 'wh_duplicate_test',
    merchant_id: 'test_merchant_123',
    timestamp: new Date().toISOString(),
    data: {
      payment_id: 'payment_999',
      amount: 75,
      status: 'confirmed',
    },
  };

  const body = JSON.stringify(payload);
  const signature = generateSignature(body, WEBHOOK_SECRET);

  const processedWebhooks = new Set();

  console.log('ℹ Testing deduplication...');

  let callCount = 0;
  const result1 = await processWebhook({
    signature,
    body,
    handlers: {
      'payment.confirmed': async (payment) => {
        callCount++;
      },
    },
    config: {
      webhookSecret: WEBHOOK_SECRET,
      enableDeduplication: true,
      checkDuplicate: async (webhookId) => {
        return processedWebhooks.has(webhookId);
      },
      markProcessed: async (webhookId) => {
        processedWebhooks.add(webhookId);
      },
    },
  });

  const result2 = await processWebhook({
    signature,
    body,
    handlers: {
      'payment.confirmed': async (payment) => {
        callCount++;
      },
    },
    config: {
      webhookSecret: WEBHOOK_SECRET,
      enableDeduplication: true,
      checkDuplicate: async (webhookId) => {
        return processedWebhooks.has(webhookId);
      },
      markProcessed: async (webhookId) => {
        processedWebhooks.add(webhookId);
      },
    },
  });

  if (result1.success && !result2.success && callCount === 1) {
    console.log('✓ Deduplication working correctly! ✓');
    console.log(`  First call: Processed (${result1.statusCode})`);
    console.log(`  Second call: Rejected as duplicate (${result2.statusCode})`);
    console.log(`  Handler called: ${callCount} time (expected: 1)`);
  } else {
    throw new Error(`Deduplication failed - handler called ${callCount} times`);
  }
} catch (error) {
  console.error('✗ Test failed:', error.message);
  process.exit(1);
}

console.log('\n============================================================');
console.log('5. Test Unhandled Event Type');
console.log('============================================================\n');

try {
  const payload = {
    event: 'unknown.event',
    webhook_id: 'wh_unknown',
    merchant_id: 'test_merchant_123',
    timestamp: new Date().toISOString(),
    data: {
      id: 'test_123',
    },
  };

  const body = JSON.stringify(payload);
  const signature = generateSignature(body, WEBHOOK_SECRET);

  console.log('ℹ Testing unhandled event type...');

  const result = await processWebhook({
    signature,
    body,
    handlers: {
      'payment.confirmed': async (payment) => {
        // This should not be called
      },
    },
    config: {
      webhookSecret: WEBHOOK_SECRET,
    },
  });

  if (result.success && result.statusCode === 200) {
    console.log('✓ Unhandled event gracefully ignored! ✓');
    console.log(`  Status: ${result.statusCode} (webhook acknowledged)`);
  } else {
    throw new Error('Unhandled event was not processed correctly');
  }
} catch (error) {
  console.error('✗ Test failed:', error.message);
  process.exit(1);
}

console.log('\n============================================================');
console.log('6. Test Handler Error Handling');
console.log('============================================================\n');

try {
  const payload = {
    event: 'payment.confirmed',
    webhook_id: 'wh_error_test',
    merchant_id: 'test_merchant_123',
    timestamp: new Date().toISOString(),
    data: {
      payment_id: 'payment_error',
      amount: 100,
      status: 'confirmed',
    },
  };

  const body = JSON.stringify(payload);
  const signature = generateSignature(body, WEBHOOK_SECRET);

  console.log('ℹ Testing handler error handling...');

  const result = await processWebhook({
    signature,
    body,
    handlers: {
      'payment.confirmed': async (payment) => {
        throw new Error('Simulated handler error');
      },
    },
    config: {
      webhookSecret: WEBHOOK_SECRET,
    },
  });

  if (!result.success && result.statusCode === 500) {
    console.log('✓ Handler errors properly caught! ✓');
    console.log(`  Status: ${result.statusCode}`);
    console.log(`  Error contained: ${result.error.includes('handler error')}`);
  } else {
    throw new Error('Handler error was not caught properly');
  }
} catch (error) {
  console.error('✗ Test failed:', error.message);
  process.exit(1);
}

console.log('\n============================================================');
console.log('✨ Test Summary');
console.log('============================================================\n');
console.log('✓ All webhook handler tests passed!\n');
console.log('Webhook Handler Features Tested:');
console.log('  ✓ Automatic signature verification');
console.log('  ✓ Invalid signature rejection');
console.log('  ✓ Multiple event type routing');
console.log('  ✓ Deduplication support');
console.log('  ✓ Unhandled event graceful handling');
console.log('  ✓ Handler error catching\n');
console.log('Webhook Handler Auto-Verification Ready! 🎉\n');
