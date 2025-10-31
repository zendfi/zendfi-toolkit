/**
 * Test script for listPaymentLinks feature
 * 
 * Usage:
 *   ZENDFI_API_KEY=your_key pnpm tsx test-list-links.ts
 */

import { ZendFiClient } from './src/index.js';

const apiKey = process.env.ZENDFI_API_KEY;

if (!apiKey) {
  console.error('❌ Error: ZENDFI_API_KEY environment variable is required');
  console.log('\nUsage:');
  console.log('  ZENDFI_API_KEY=your_api_key pnpm tsx test-list-links.ts');
  process.exit(1);
}

async function testListPaymentLinks() {
  console.log('🧪 Testing listPaymentLinks feature\n');
  
  const client = new ZendFiClient({ 
    apiKey,
    baseURL: 'https://api.zendfi.tech' 
  });

  try {
    console.log('📡 Calling GET /api/v1/payment-links...');
    const links = await client.listPaymentLinks();
    
    console.log(`\n✅ Success! Found ${links.length} payment link(s)\n`);
    
    if (links.length === 0) {
      console.log('ℹ️  No payment links found. Create one at: https://dashboard.zendfi.tech');
    } else {
      console.log('Payment Links:');
      console.log('─────────────────────────────────────────────────────────────');
      
      links.forEach((link, index) => {
        console.log(`\n${index + 1}. ${link.title || 'Untitled'}`);
        console.log(`   Link Code: ${link.link_code}`);
        console.log(`   Amount: ${link.amount} ${link.currency}`);
        console.log(`   URL: ${link.url}`);
        console.log(`   Payment Methods: ${link.payment_methods?.join(', ') || 'All'}`);
        
        if (link.description) {
          console.log(`   Description: ${link.description}`);
        }
        
        if (link.expires_at) {
          const expiresAt = new Date(link.expires_at);
          const isExpired = expiresAt < new Date();
          console.log(`   Expires: ${expiresAt.toLocaleString()} ${isExpired ? '(Expired)' : ''}`);
        }
        
        if (link.redirect_url) {
          console.log(`   Redirect URL: ${link.redirect_url}`);
        }
        
        console.log(`   Created: ${new Date(link.created_at).toLocaleString()}`);
      });
      
      console.log('\n─────────────────────────────────────────────────────────────');
    }
    
    // Test that URL alias works
    const firstLink = links[0];
    if (firstLink) {
      console.log('\n✅ URL alias test:');
      console.log(`   link.url === link.hosted_page_url: ${firstLink.url === firstLink.hosted_page_url}`);
    }
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    process.exit(1);
  }
}

testListPaymentLinks();
