/**
 * ZendFi SDK Test Suite
 * Comprehensive test runner for all SDK functionality
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
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(70));
  log(title, 'bright');
  console.log('='.repeat(70) + '\n');
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

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

async function runAllTests() {
  logSection('🚀 ZendFi SDK - Comprehensive Test Suite');
  
  const startTime = Date.now();
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
  };

  // Check environment
  logSection('📋 Environment Check');
  const hasApiKey = !!process.env.ZENDFI_API_KEY;
  const hasBaseUrl = !!process.env.ZENDFI_BASE_URL;
  const hasWebhookSecret = !!process.env.ZENDFI_WEBHOOK_SECRET;

  console.log(`API Key: ${hasApiKey ? '✓ Configured' : '✗ Missing'}`);
  console.log(`Base URL: ${hasBaseUrl ? `✓ ${process.env.ZENDFI_BASE_URL}` : '⚠ Using default (http://localhost:8080)'}`);
  console.log(`Webhook Secret: ${hasWebhookSecret ? '✓ Configured' : '✗ Missing'}`);

  if (!hasApiKey) {
    logError('\nCannot run tests without ZENDFI_API_KEY');
    logInfo('Please copy .env.example to .env and configure your credentials');
    process.exit(1);
  }

  try {
    // Initialize SDK
    logSection('🔧 SDK Initialization Test');
    const zendfi = new ZendFiClient({
      apiKey: process.env.ZENDFI_API_KEY,
      baseURL: process.env.ZENDFI_BASE_URL || 'https://api.zendfi.tech',
      timeout: 10000,
    });
    logSuccess('SDK initialized successfully');
    results.total++;
    results.passed++;

    // Test Configuration
    logSection('⚙️  Configuration Tests');
    
    // Test 1: Check client properties
    if (zendfi) {
      logSuccess('SDK client instance created');
      results.total++;
      results.passed++;
    }

    // Test Payment Link Creation
    logSection('💳 Payment Link Creation Test');
    try {
      const paymentLink = await zendfi.createPaymentLink({
        amount: 25.00,
        currency: 'USD',
        token: 'USDC',
        description: 'SDK Test Suite - Payment Link',
        metadata: {
          test: true,
          suite: 'comprehensive',
          timestamp: new Date().toISOString(),
        },
      });

      logSuccess('Payment link created');
      console.log(`  Link Code: ${paymentLink.link_code}`);
      console.log(`  Amount: $${paymentLink.amount} ${paymentLink.currency}`);
      console.log(`  URL: ${paymentLink.url}`);
      results.total++;
      results.passed++;

      // Test Payment Link Retrieval
      logSection('🔍 Payment Link Retrieval Test');
      try {
        const retrieved = await zendfi.getPaymentLink(paymentLink.link_code);
        
        if (retrieved.id === paymentLink.id) {
          logSuccess('Payment link retrieved and verified');
          results.total++;
          results.passed++;
        } else {
          logError('Retrieved payment link ID mismatch');
          results.total++;
          results.failed++;
        }
      } catch (error) {
        logError(`Failed to retrieve payment link: ${error.message}`);
        results.total++;
        results.failed++;
      }

    } catch (error) {
      logError(`Failed to create payment link: ${error.message}`);
      if (error.response) {
        console.log(`  Status: ${error.response.status}`);
        console.log(`  Data:`, error.response.data);
      }
      results.total++;
      results.failed++;
    }

    // Test Webhook Verification
    logSection('🔐 Webhook Verification Test');
    if (hasWebhookSecret) {
      try {
        const crypto = await import('crypto');
        const payload = JSON.stringify({
          event: 'payment.confirmed',
          merchant_id: 'test_merchant_123',
          timestamp: new Date().toISOString(),
          data: { id: 'test_123', amount: 100.00 },
        });

        const signature = crypto
          .createHmac('sha256', process.env.ZENDFI_WEBHOOK_SECRET)
          .update(payload)
          .digest('hex');

        const isValid = verifyWebhookSignature(
          payload,
          signature,
          process.env.ZENDFI_WEBHOOK_SECRET
        );

        if (isValid) {
          logSuccess('Webhook signature verification working');
          results.total++;
          results.passed++;
        } else {
          logError('Webhook signature verification failed');
          results.total++;
          results.failed++;
        }

        // Test invalid signature rejection
        const isInvalid = verifyWebhookSignature(
          payload,
          'invalid_signature',
          process.env.ZENDFI_WEBHOOK_SECRET
        );

        if (!isInvalid) {
          logSuccess('Invalid signatures correctly rejected');
          results.total++;
          results.passed++;
        } else {
          logError('Invalid signature was incorrectly accepted');
          results.total++;
          results.failed++;
        }

      } catch (error) {
        logError(`Webhook verification test failed: ${error.message}`);
        results.total++;
        results.failed++;
      }
    } else {
      logWarning('Webhook secret not configured - skipping webhook tests');
      results.total += 2;
      results.skipped += 2;
    }

    // Test Error Handling
    logSection('🛡️  Error Handling Test');
    try {
      await zendfi.getPaymentLink('nonexistent_link_code_123');
      logError('Should have thrown error for non-existent link');
      results.total++;
      results.failed++;
    } catch (error) {
      logSuccess('Error handling working correctly');
      results.total++;
      results.passed++;
    }

  } catch (error) {
    logSection('❌ Fatal Error');
    logError(`Test suite failed: ${error.message}`);
    if (error.stack) {
      console.log('\nStack Trace:');
      console.log(error.stack);
    }
    process.exit(1);
  }

  // Final Report
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  logSection('📊 Test Results');
  console.log(`Total Tests: ${results.total}`);
  log(`Passed: ${results.passed}`, 'green');
  if (results.failed > 0) {
    log(`Failed: ${results.failed}`, 'red');
  }
  if (results.skipped > 0) {
    log(`Skipped: ${results.skipped}`, 'yellow');
  }
  console.log(`Duration: ${duration}s`);
  
  const passRate = ((results.passed / (results.total - results.skipped)) * 100).toFixed(1);
  console.log(`\nPass Rate: ${passRate}%`);

  if (results.failed === 0) {
    logSection('✨ All Tests Passed!');
    log('🎉 ZendFi SDK is ready for production!', 'green');
    process.exit(0);
  } else {
    logSection('⚠️  Some Tests Failed');
    log(`${results.failed} test(s) need attention`, 'red');
    process.exit(1);
  }
}

// Run all tests
runAllTests().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
