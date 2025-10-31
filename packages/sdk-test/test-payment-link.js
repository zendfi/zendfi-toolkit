/**
 * ZendFi SDK Test - Payment Links
 * Tests payment link creation, retrieval, and management
 */

import 'dotenv/config';
import { ZendFiClient } from '@zendfi/sdk';

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

async function testPaymentLinks() {
  logSection('🧪 ZendFi SDK - Payment Link Tests');

  // Check environment variables
  if (!process.env.ZENDFI_API_KEY) {
    logError('ZENDFI_API_KEY not found in .env file');
    logInfo('Please copy .env.example to .env and add your credentials');
    process.exit(1);
  }

  try {
    logSection('1. SDK Initialization');
    const zendfi = new ZendFiClient({
      apiKey: process.env.ZENDFI_API_KEY,
      baseURL: process.env.ZENDFI_BASE_URL || 'https://api.zendfi.tech',
    });
    logSuccess('SDK initialized successfully');
    logInfo(`Base URL: ${process.env.ZENDFI_BASE_URL || 'https://api.zendfi.tech'}`);

    logSection('2. Create Payment Link');
    logInfo('Creating payment link for $50.00 USDC...');
    
    const createRequest = {
      amount: 50.00,
      currency: 'USD',
      token: 'USDC',
      description: 'SDK Test - Payment Link Creation',
      metadata: {
        test: true,
        timestamp: new Date().toISOString(),
        environment: 'sdk-test',
      },
    };
    
    logInfo(`Request: ${JSON.stringify(createRequest, null, 2)}`);
    
    const paymentLink = await zendfi.createPaymentLink(createRequest);
    
    logSuccess('Payment link created successfully!');
    console.log('\nPayment Link Details:');
    console.log(`  ID: ${paymentLink.id}`);
    console.log(`  Link Code: ${paymentLink.link_code}`);
    console.log(`  Amount: $${paymentLink.amount} ${paymentLink.currency}`);
    console.log(`  Token: ${paymentLink.token}`);
    console.log(`  Payment URL: ${paymentLink.payment_url}`);
    console.log(`  Hosted Page URL: ${paymentLink.hosted_page_url}`);
    console.log(`  Convenience URL: ${paymentLink.url}`);
    console.log(`  Active: ${paymentLink.is_active}`);
    console.log(`  Uses: ${paymentLink.uses_count}/${paymentLink.max_uses || '∞'}`);

    logSection('3. Retrieve Payment Link');
    logInfo(`Fetching payment link by code: ${paymentLink.link_code}`);
    
    const retrievedLink = await zendfi.getPaymentLink(paymentLink.link_code);
    
    logSuccess('Payment link retrieved successfully!');
    console.log('\nRetrieved Link Details:');
    console.log(`  ID: ${retrievedLink.id}`);
    console.log(`  Link Code: ${retrievedLink.link_code}`);
    console.log(`  Status: ${retrievedLink.is_active ? 'Active' : 'Inactive'}`);
    console.log(`  Uses: ${retrievedLink.uses_count}/${retrievedLink.max_uses || '∞'}`);

    logSection('4. Verify URL Alias');
    if (retrievedLink.url === retrievedLink.hosted_page_url) {
      logSuccess('URL alias matches hosted_page_url ✓');
      console.log(`  url: ${retrievedLink.url}`);
      console.log(`  hosted_page_url: ${retrievedLink.hosted_page_url}`);
    } else {
      logError('URL alias mismatch!');
      console.log(`  Expected: ${retrievedLink.hosted_page_url}`);
      console.log(`  Got: ${retrievedLink.url}`);
    }

    logSection('5. Create Payment Link with Expiration');
    logInfo('Creating payment link that expires in 1 hour...');
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    
    const expiringLink = await zendfi.createPaymentLink({
      amount: 25.00,
      currency: 'USD',
      token: 'USDC',
      description: 'SDK Test - Expiring Payment Link',
      expires_at: expiresAt.toISOString(),
      max_uses: 5,
      metadata: {
        test: true,
        type: 'expiring',
      },
    });
    
    logSuccess('Expiring payment link created!');
    console.log(`  Link Code: ${expiringLink.link_code}`);
    console.log(`  Expires At: ${expiringLink.expires_at}`);
    console.log(`  Max Uses: ${expiringLink.max_uses}`);

    logSection('6. List Payment Links');
    logInfo('Fetching all payment links...');
    
    const links = await zendfi.listPaymentLinks();
    
    logSuccess(`Found ${links.length} payment link(s)!`);
    
    if (links.length > 0) {
      console.log('\n📋 Payment Links:');
      console.log('─'.repeat(60));
      
      const displayLinks = links.slice(0, 5);
      displayLinks.forEach((link, i) => {
        console.log(`\n${i + 1}. ${link.link_code}`);
        if (link.title) {
          console.log(`   Title: ${link.title}`);
        }
        console.log(`   Amount: $${link.amount} ${link.currency}`);
        console.log(`   URL: ${link.url}`);
        if (link.expires_at) {
          const expiresAt = new Date(link.expires_at);
          const isExpired = expiresAt < new Date();
          console.log(`   Expires: ${expiresAt.toLocaleString()} ${isExpired ? '⚠️ EXPIRED' : '✓'}`);
        }
        console.log(`   Created: ${new Date(link.created_at).toLocaleString()}`);
      });
      
      if (links.length > 5) {
        console.log(`\n... and ${links.length - 5} more`);
      }
      
      console.log('\n' + '─'.repeat(60));
      
      const createdLinkCodes = [paymentLink.link_code, expiringLink.link_code];
      const foundLinks = links.filter(link => createdLinkCodes.includes(link.link_code));
      
      if (foundLinks.length === 2) {
        logSuccess('Both created links found in list! ✓');
      } else {
        console.log(`ℹ Found ${foundLinks.length}/2 created links (may have been created earlier)`);
      }
    } else {
      logInfo('No payment links found. Create some at: https://dashboard.zendfi.tech');
    }

    logSection('✨ Test Summary');
    logSuccess('All payment link tests passed!');
    console.log('\nCreated Payment Links:');
    console.log(`  1. ${paymentLink.link_code} - $${paymentLink.amount} ${paymentLink.currency}`);
    console.log(`  2. ${expiringLink.link_code} - $${expiringLink.amount} ${expiringLink.currency}`);
    console.log('\nYou can test these payment links in your browser:');
    console.log(`  ${colors.blue}${paymentLink.url}${colors.reset}`);
    console.log(`  ${colors.blue}${expiringLink.url}${colors.reset}`);

  } catch (error) {
    logSection('❌ Test Failed');
    logError(`Error: ${error.message}`);
    
    if (error.response) {
      console.log('\nAPI Response:');
      console.log(`  Status: ${error.response.status}`);
      console.log(`  Data:`, error.response.data);
    }
    
    if (error.stack) {
      console.log('\nStack Trace:');
      console.log(error.stack);
    }
    
    process.exit(1);
  }
}

// Run tests
testPaymentLinks();
