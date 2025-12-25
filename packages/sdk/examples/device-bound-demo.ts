/**
 * Device-Bound Session Keys - Agent-Scoped Example
 * 
 * This example shows how to use agent-scoped session keys
 * that work across multiple apps (no liquidity fragmentation!)
 */

import { ZendFiSessionKeyManager } from '../src/device-bound-session-keys';

async function main() {
  console.log('🔐 ZendFi Device-Bound Agent-Scoped Session Keys Demo\n');

  // Initialize manager
  const apiKey = process.env.ZENDFI_API_KEY || 'zai_test_your_key_here';
  const manager = new ZendFiSessionKeyManager(apiKey, 'https://api.zendfi.com');

  console.log('📝 Step 1: Create Agent-Scoped Session Key');
  console.log('━'.repeat(50));

  try {
    const sessionKey = await manager.createSessionKey({
      userWallet: '7xKNH6ttXQfJpAoDW1p7zGMKS7kGvXZ4XG7fCcUjU86Y',  // Example wallet
      agentId: 'shopping-assistant-v1',         // 🔑 Cross-app agent identifier
      agentName: 'AI Shopping Assistant',        // Human-readable name
      limitUSDC: 100,
      durationDays: 7,
      pin: '123456',
      generateRecoveryQR: true,
    });

    console.log('✅ Session key created successfully!');
    console.log(`   Session ID: ${sessionKey.sessionKeyId}`);
    console.log(`   Agent ID: ${sessionKey.agentId}`);
    console.log(`   Cross-App Compatible: ${sessionKey.crossAppCompatible ? '✅' : '❌'}`);
    console.log(`   Session Wallet: ${sessionKey.sessionWallet}`);
    console.log(`   Limit: $${sessionKey.limitUsdc}`);
    console.log(`   Expires: ${sessionKey.expiresAt}`);
    console.log(`   Recovery QR: ${sessionKey.recoveryQR?.substring(0, 50)}...`);
    
    if (sessionKey.crossAppCompatible) {
      console.log('\n💡 This session key works across ALL apps with agent "shopping-assistant-v1"!');
      console.log('   No re-authorization needed when using the same agent in different apps.');
    }
    console.log('');

    // Save session key ID for later
    const sessionKeyId = sessionKey.sessionKeyId;

    console.log('💰 Step 2: Make a Payment');
    console.log('━'.repeat(50));

    const payment = await manager.makePayment({
      amount: 5.0,
      recipient: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',  // Example recipient
      pin: '123456',
      description: 'Coffee purchase via AI',
      token: 'USDC',
    });

    console.log('✅ Payment successful!');
    console.log(`   Payment ID: ${payment.paymentId}`);
    console.log(`   Signature: ${payment.signature}`);
    console.log(`   Status: ${payment.status}`);
    console.log('');

    console.log('📊 Step 3: Check Status');
    console.log('━'.repeat(50));

    const status = await manager.getStatus(sessionKeyId);

    console.log('✅ Session key status:');
    console.log(`   Active: ${status.isActive}`);
    console.log(`   Limit: $${status.limitUsdc}`);
    console.log(`   Used: $${status.usedAmountUsdc}`);
    console.log(`   Remaining: $${status.remainingUsdc}`);
    console.log(`   Days until expiry: ${status.daysUntilExpiry}`);
    console.log('');

    console.log('🔄 Step 4: Load Existing Session Key');
    console.log('━'.repeat(50));

    // Simulate app restart
    const newManager = new ZendFiSessionKeyManager(apiKey);
    await newManager.loadSessionKey(sessionKeyId, '123456');

    console.log('✅ Session key loaded successfully!');
    console.log('   Can now make payments without re-creating\n');

    console.log('🎉 Demo Complete!');
    console.log('━'.repeat(50));
    console.log('✅ All operations successful');
    console.log('🔐 Backend never saw your private key');
    console.log('🚀 Ready for production use!');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('PIN')) {
      console.error('   💡 Tip: PIN must be exactly 6 numeric digits');
    } else if (error.message.includes('device fingerprint')) {
      console.error('   💡 Tip: Use recovery QR to migrate devices');
    } else if (error.message.includes('API')) {
      console.error('   💡 Tip: Check your API key and network connection');
    }
  }
}

// Run demo
if (require.main === module) {
  main().catch(console.error);
}

export { main };
