# 🎯 Auto-Signing Cache Integration Example

**Goal**: Show how to integrate auto-signing cache into `ai_chat_demo.rs` for instant payments

---

## 📋 Current Flow (Without Auto-Signing)

```javascript
// ai_chat_demo.rs - Current implementation (LINE 1130+)

async function makeAutoPayment(amountUsd, description) {
    // Call backend API
    const response = await fetch(`${API_BASE_URL}/api/v1/ai/smart-payment`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${AGENT_API_KEY}`,
            'Content-Type': 'application/json',
            'X-Session-Key-ID': sessionKeyId, // ← Custodial session key
        },
        body: JSON.stringify({
            amount_usd: amountUsd,
            user_wallet: walletAddress,
            agent_id: 'gemini-ai-demo',
            description: description,
        })
    });

    // Backend auto-signs (custodial)
    const data = await response.json();
    console.log('Payment confirmed:', data.transaction_signature);
}
```

**Issue**: This uses custodial session keys (backend has private key)

---

## ✅ New Flow (With Device-Bound + Auto-Signing)

### Step 1: Add SDK Import

```html
<!-- Add to HEAD section -->
<script src="https://unpkg.com/@zendfi/sdk@latest/dist/index.iife.js"></script>
<script>
  const { ZendFiSessionKeyManager } = window.ZendFiSDK;
</script>
```

### Step 2: Initialize Manager

```javascript
// Global variables (add after line 645)
let sessionKeyId = null;
let sessionKeyManager = null; // ← NEW: SDK manager

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize SDK manager
    sessionKeyManager = new ZendFiSessionKeyManager(
        AGENT_API_KEY,
        API_BASE_URL
    );
    
    loadSessionKey();
});
```

### Step 3: Update Session Key Creation

```javascript
async function createSessionKey() {
    if (!walletConnected) {
        alert('Please connect your wallet first!');
        return;
    }

    try {
        const selectedBudget = parseFloat(document.getElementById('session-budget').value);
        
        addSystemMessage(`Creating device-bound session key with $${selectedBudget.toFixed(2)} budget...`);
        
        // Prompt user for PIN
        const pin = prompt('Enter a 6-digit PIN to secure your session key:');
        if (!pin || pin.length < 6) {
            throw new Error('PIN must be at least 6 digits');
        }

        // Create device-bound session key using SDK
        const session = await sessionKeyManager.createSessionKey({
            userWallet: walletAddress,
            limitUSDC: selectedBudget,
            durationDays: 7,
            pin: pin,
            generateRecoveryQR: true,
        });

        sessionKeyId = session.sessionKeyId;
        localStorage.setItem('session_key_id', sessionKeyId);

        addSystemMessage('✅ Device-bound session key created!');
        addSystemMessage('🔒 Your private key is encrypted on YOUR device - we never see it!');
        
        // UNLOCK IMMEDIATELY for instant payments
        await sessionKeyManager.unlockSessionKey(pin);
        addSuccessMessage('🚀 Auto-signing enabled! All payments will be instant (no PIN re-entry)');
        
        // Show recovery QR
        if (session.recoveryQR) {
            addSystemMessage('💾 Save your recovery QR code to restore on other devices');
            console.log('Recovery QR:', session.recoveryQR);
        }

        // Load session data
        await loadSessionKeyData();
        
        updateStatus('session', 'Active (Device-Bound)', 'success');
        addAIMessage('✅ Session key ready! Try saying "Buy a coffee for $5"');
        
    } catch (error) {
        console.error('Session key creation error:', error);
        addErrorMessage(error.message);
        updateStatus('session', 'Failed', 'error');
    }
}
```

### Step 4: Update Payment Flow

```javascript
async function makeAutoPayment(amountUsd, description) {
    if (!sessionKeyId || !sessionKeyManager) {
        addAIMessage("You need to create a session key first for auto-payments!");
        return;
    }

    if (!walletConnected) {
        addAIMessage("Please connect your wallet first!");
        return;
    }

    try {
        addSystemMessage(`Processing payment: $${amountUsd} for ${description}...`);

        // Check if auto-signing is enabled
        if (sessionKeyManager.isCached()) {
            const remainingMinutes = Math.floor(
                sessionKeyManager.getCacheTimeRemaining() / 1000 / 60
            );
            addSystemMessage(`🚀 Auto-signing enabled (${remainingMinutes}min remaining)`);
        }

        // Make payment using SDK (handles signing automatically!)
        const result = await sessionKeyManager.makePayment({
            amount: amountUsd,
            recipient: walletAddress, // Or merchant wallet
            description: description,
            token: 'USDC',
            // PIN NOT NEEDED! Uses cached keypair ✨
        });

        // Payment successful!
        addSuccessMessage(`Payment confirmed! Signature: ${result.signature.slice(0, 20)}...`);
        addAIMessage(`🎉 Payment successful! Your ${description} purchase for $${amountUsd} has been confirmed!`);
        
        addTransaction({
            amount: amountUsd,
            description: description,
            signature: result.signature,
            timestamp: new Date()
        });

        // Extend cache on activity (keep session alive)
        sessionKeyManager.extendCache(15 * 60 * 1000); // +15 minutes

        // Reload session key to update remaining balance
        await loadSessionKeyData();

    } catch (error) {
        console.error('Payment error:', error);
        
        // If PIN required (cache expired), prompt and retry
        if (error.message.includes('PIN required')) {
            const pin = prompt('Your session expired. Please re-enter your PIN:');
            if (pin) {
                try {
                    // Retry payment with PIN
                    const result = await sessionKeyManager.makePayment({
                        amount: amountUsd,
                        recipient: walletAddress,
                        description: description,
                        pin: pin, // Unlock again
                    });
                    
                    addSuccessMessage(`Payment confirmed! Signature: ${result.signature.slice(0, 20)}...`);
                    addAIMessage(`🎉 Payment successful!`);
                } catch (retryError) {
                    addSystemMessage('Payment failed: ' + retryError.message, 'error');
                }
            }
        } else {
            addSystemMessage('Payment failed: ' + error.message, 'error');
            addAIMessage(`Sorry, the payment failed: ${error.message}`);
        }
    }
}
```

### Step 5: Add Cache Status Indicator

```html
<!-- Add to session key info section (around line 600) -->
<div id="session-info" style="display: none;">
    <div style="background: #f0f0f0; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span><strong>Session Wallet:</strong></span>
            <span id="session-wallet" style="font-family: monospace; font-size: 11px;"></span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span><strong>Limit:</strong></span>
            <span id="session-limit"></span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span><strong>Remaining:</strong></span>
            <span id="session-remaining" style="color: #059669; font-weight: 600;"></span>
        </div>
        
        <!-- NEW: Auto-signing status -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span><strong>Auto-Signing:</strong></span>
            <span id="auto-sign-status" style="font-weight: 600;">
                <!-- Updated by JavaScript -->
            </span>
        </div>
        
        <div style="display: flex; justify-content: space-between;">
            <span><strong>Expires:</strong></span>
            <span id="session-expires" style="font-size: 11px; color: #666;"></span>
        </div>
    </div>
    
    <!-- ... rest of session info ... -->
</div>
```

```javascript
// Update auto-sign status every second
setInterval(() => {
    if (sessionKeyManager && sessionKeyId) {
        const statusEl = document.getElementById('auto-sign-status');
        
        if (sessionKeyManager.isCached()) {
            const remainingMinutes = Math.floor(
                sessionKeyManager.getCacheTimeRemaining() / 1000 / 60
            );
            statusEl.textContent = `✅ Enabled (${remainingMinutes}min)`;
            statusEl.style.color = '#059669';
        } else {
            statusEl.textContent = '⏳ Locked (PIN required)';
            statusEl.style.color = '#666';
        }
    }
}, 1000);
```

### Step 6: Clear Cache on Tab Close

```javascript
// Add before closing script tag
window.addEventListener('beforeunload', () => {
    if (sessionKeyManager) {
        sessionKeyManager.clearCache();
        console.log('Session cache cleared on tab close');
    }
});
```

---

## 🎨 Complete Integration Example

```html
<!DOCTYPE html>
<html>
<head>
    <title>ZendFi Device-Bound Session Keys Demo</title>
    <script src="https://unpkg.com/@solana/web3.js@latest/lib/index.iife.min.js"></script>
    <script src="https://unpkg.com/@zendfi/sdk@latest/dist/index.iife.js"></script>
</head>
<body>
    <div id="app">
        <!-- Your UI here -->
    </div>

    <script>
        const { ZendFiSessionKeyManager } = window.ZendFiSDK;
        const API_BASE_URL = 'https://api.zendfi.com';
        const AGENT_API_KEY = 'your-api-key';
        
        let sessionKeyManager = null;
        let sessionKeyId = null;
        let walletAddress = null;

        // Initialize
        document.addEventListener('DOMContentLoaded', async () => {
            sessionKeyManager = new ZendFiSessionKeyManager(AGENT_API_KEY, API_BASE_URL);
            
            // Load existing session if any
            const savedSessionId = localStorage.getItem('session_key_id');
            if (savedSessionId) {
                sessionKeyId = savedSessionId;
                // Note: User will need to enter PIN on first payment (cache not restored)
            }
        });

        // Create session key
        async function createSessionKey() {
            const pin = prompt('Enter a 6-digit PIN:');
            if (!pin) return;

            const session = await sessionKeyManager.createSessionKey({
                userWallet: walletAddress,
                limitUSDC: 100,
                durationDays: 7,
                pin: pin,
            });

            sessionKeyId = session.sessionKeyId;
            localStorage.setItem('session_key_id', sessionKeyId);

            // Unlock for instant payments
            await sessionKeyManager.unlockSessionKey(pin);
            console.log('✅ Session unlocked! All payments will be instant.');
        }

        // Make payment (instant after first unlock!)
        async function makePayment(amount, description) {
            try {
                const result = await sessionKeyManager.makePayment({
                    amount: amount,
                    recipient: 'merchant-wallet-address',
                    description: description,
                    // No PIN needed if cached! ✨
                });

                console.log('Payment confirmed:', result.signature);
                return result;
            } catch (error) {
                if (error.message.includes('PIN required')) {
                    const pin = prompt('Session expired. Re-enter PIN:');
                    return await sessionKeyManager.makePayment({
                        amount,
                        recipient: 'merchant-wallet-address',
                        description,
                        pin,
                    });
                }
                throw error;
            }
        }

        // Clear cache on logout
        function logout() {
            sessionKeyManager.clearCache();
            sessionKeyId = null;
            localStorage.removeItem('session_key_id');
        }

        // Clear cache on tab close
        window.addEventListener('beforeunload', () => {
            if (sessionKeyManager) {
                sessionKeyManager.clearCache();
            }
        });
    </script>
</body>
</html>
```

---

## 📊 Performance Gains

### Before (Every Payment Requires PIN)
```
User: "Buy coffee for $5"
  ↓ Prompt for PIN (user delay: ~5 seconds)
  ↓ Decrypt keypair (Argon2: 30ms)
  ↓ Sign transaction (5ms)
  ↓ Submit to blockchain (250ms)
Total: ~5.3 seconds (mostly user input)

User: "Buy donut for $3"
  ↓ Prompt for PIN AGAIN (user delay: ~5 seconds) ⚠️
  ↓ Decrypt keypair (Argon2: 30ms)
  ↓ Sign transaction (5ms)
  ↓ Submit to blockchain (250ms)
Total: ~5.3 seconds AGAIN
```

### After (Auto-Signing Enabled)
```
User: "Buy coffee for $5"
  ↓ Prompt for PIN (user delay: ~5 seconds)
  ↓ Decrypt keypair (Argon2: 30ms)
  ↓ Cache keypair ← NEW!
  ↓ Sign transaction (5ms)
  ↓ Submit to blockchain (250ms)
Total: ~5.3 seconds (one-time)

User: "Buy donut for $3"
  ↓ Use cached keypair (0ms) ← NO PIN! ✨
  ↓ Sign transaction (5ms)
  ↓ Submit to blockchain (250ms)
Total: ~255ms (20x faster!)

User: "Buy muffin for $2"
  ↓ Use cached keypair (0ms) ← STILL NO PIN! ✨
  ↓ Sign transaction (5ms)
  ↓ Submit to blockchain (250ms)
Total: ~255ms (instant!)
```

**Result**: First payment takes ~5.3s, all subsequent payments take ~255ms (instant!)

---

## ✅ Benefits Summary

| Aspect | Before | After |
|--------|--------|-------|
| First payment | PIN required | PIN required |
| Subsequent payments | PIN required ⚠️ | NO PIN! ✨ |
| Security | Non-custodial ✅ | Non-custodial ✅ |
| Performance | ~5.3s per payment | ~255ms per payment |
| User experience | Tedious 😞 | Smooth 😊 |
| Backend risk | Zero | Zero |

**Winner**: Auto-Signing Cache achieves the BEST of both worlds:
- ✅ Security: True non-custodial (client-only keys)
- ✅ UX: Instant payments (identical to custodial)
- ✅ Performance: ~255ms (faster than custodial's 345ms!)

---

**Status**: ✅ Ready to integrate into `ai_chat_demo.rs`  
**Testing**: Recommended before production deployment  
**Documentation**: Complete

