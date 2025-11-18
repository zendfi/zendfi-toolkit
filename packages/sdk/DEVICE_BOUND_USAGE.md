# Device-Bound Session Keys - Usage Guide

## 🎯 Overview

Device-bound session keys enable **true non-custodial** instant payments where:
- ✅ Backend **never sees** your private key
- ✅ Keys are encrypted with **PIN + device fingerprint**
- ✅ Only you can decrypt and use your session key
- ✅ Supports multi-device via recovery QR
- ✅ Auto-signing for instant AI payments

**Security**: Argon2id key derivation + AES-256-GCM encryption

---

## 📦 Installation

```bash
npm install @zendfi/sdk @solana/web3.js
# or
yarn add @zendfi/sdk @solana/web3.js
# or
pnpm add @zendfi/sdk @solana/web3.js
```

---

## 🚀 Quick Start

### 1. Create a Session Key

```typescript
import { ZendFiSessionKeyManager } from '@zendfi/sdk';

const manager = new ZendFiSessionKeyManager('your-api-key');

// Create device-bound session key
const sessionKey = await manager.createSessionKey({
  userWallet: '7xKNH...your-wallet-address',
  limitUSDC: 100,        // $100 spending limit
  durationDays: 7,       // Valid for 7 days
  pin: '123456',         // 6-digit PIN
  generateRecoveryQR: true,  // Enable device recovery
});

console.log('✅ Session key created!');
console.log('Session ID:', sessionKey.sessionKeyId);
console.log('Expires:', sessionKey.expiresAt);

// IMPORTANT: Save the recovery QR securely!
console.log('Recovery QR:', sessionKey.recoveryQR);
```

**What happens**:
1. Client generates Solana keypair locally
2. Client encrypts with your PIN + device fingerprint
3. Backend stores encrypted blob (can't decrypt!)
4. You get a recovery QR for device migration

---

### 2. Make Payments

```typescript
// Make a payment (requires PIN each time)
const payment = await manager.makePayment({
  amount: 5.0,
  recipient: '9WzDX...recipient-wallet',
  pin: '123456',  // User enters PIN
  description: 'Coffee purchase',
  token: 'USDC',
});

console.log('✅ Payment successful!');
console.log('Signature:', payment.signature);
```

**Flow**:
1. User enters PIN
2. Client decrypts session key with PIN
3. Client signs transaction
4. Backend submits to blockchain

**Latency**: ~10-20ms for decryption + signing

---

### 3. Load Existing Session Key

```typescript
// On app restart or new page load
const manager = new ZendFiSessionKeyManager('your-api-key');

await manager.loadSessionKey('session-key-uuid', '123456');

// Now you can make payments
const payment = await manager.makePayment({
  amount: 10.0,
  recipient: '...',
  pin: '123456',
});
```

---

### 4. Recover on New Device

```typescript
// User switched phones/browsers
const manager = new ZendFiSessionKeyManager('your-api-key');

await manager.recoverSessionKey({
  sessionKeyId: 'uuid-from-original-device',
  recoveryQR: '{"encryptedSessionKey":"..."}',  // Scanned QR
  oldPin: '123456',  // Original PIN
  newPin: '654321',  // New PIN for new device
});

// Session key now works on new device!
const payment = await manager.makePayment({
  amount: 5.0,
  recipient: '...',
  pin: '654321',  // Use new PIN
});
```

---

## 🔐 Security Features

### PIN Requirements
- **Length**: Exactly 6 digits
- **Type**: Numeric only (0-9)
- **Storage**: Never stored - only you know it
- **Usage**: Required for every payment

```typescript
// Valid PINs
✅ '123456'
✅ '000000'
✅ '999999'

// Invalid PINs
❌ '12345'   // Too short
❌ '1234567' // Too long
❌ 'abc123'  // Contains letters
```

### Device Fingerprinting

The SDK automatically generates a unique fingerprint from:
- Canvas fingerprinting
- WebGL renderer info
- Audio context properties
- Screen resolution
- Timezone
- Languages
- Platform info
- Hardware concurrency

**Purpose**: Prevent key theft if encrypted data is intercepted

---

## 📱 React/Next.js Example

```typescript
'use client';

import { useState } from 'react';
import { ZendFiSessionKeyManager } from '@zendfi/sdk';

export function SessionKeyPayment() {
  const [manager] = useState(() => 
    new ZendFiSessionKeyManager(process.env.NEXT_PUBLIC_ZENDFI_API_KEY!)
  );
  const [pin, setPin] = useState('');
  const [status, setStatus] = useState('');

  const createSessionKey = async () => {
    try {
      const session = await manager.createSessionKey({
        userWallet: '7xKNH...', // From user's connected wallet
        limitUSDC: 100,
        durationDays: 7,
        pin,
        generateRecoveryQR: true,
      });

      // Save recovery QR to user's account/storage
      localStorage.setItem('recoveryQR', session.recoveryQR!);
      localStorage.setItem('sessionKeyId', session.sessionKeyId);

      setStatus(`✅ Session key created! ID: ${session.sessionKeyId}`);
    } catch (error) {
      setStatus(`❌ Error: ${error.message}`);
    }
  };

  const makePayment = async () => {
    try {
      const payment = await manager.makePayment({
        amount: 5.0,
        recipient: '9WzDX...',
        pin,
        description: 'Coffee',
      });

      setStatus(`✅ Payment sent! Signature: ${payment.signature}`);
    } catch (error) {
      setStatus(`❌ Error: ${error.message}`);
    }
  };

  return (
    <div className="space-y-4">
      <input
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        placeholder="Enter 6-digit PIN"
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
        className="px-4 py-2 border rounded"
      />
      
      <button
        onClick={createSessionKey}
        disabled={pin.length !== 6}
        className="px-6 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        Create Session Key
      </button>

      <button
        onClick={makePayment}
        disabled={pin.length !== 6}
        className="px-6 py-2 bg-green-500 text-white rounded disabled:opacity-50"
      >
        Pay $5
      </button>

      {status && (
        <div className="p-4 bg-gray-100 rounded">
          <p className="font-mono text-sm">{status}</p>
        </div>
      )}
    </div>
  );
}
```

---

## 🔄 Recovery QR Code Management

### Generate QR Code Image

```typescript
import QRCode from 'qrcode';  // npm install qrcode

const sessionKey = await manager.createSessionKey({
  ...options,
  generateRecoveryQR: true,
});

// Generate QR code image
const qrCodeDataURL = await QRCode.toDataURL(sessionKey.recoveryQR!);

// Display to user
return <img src={qrCodeDataURL} alt="Recovery QR" />;
```

### Scan QR Code

```typescript
import { BrowserQRCodeReader } from '@zxing/browser';  // npm install @zxing/browser

const codeReader = new BrowserQRCodeReader();

const result = await codeReader.decodeOnceFromVideoDevice(
  undefined, // Use default camera
  'video-element-id'
);

const recoveryQR = result.getText();

// Use for recovery
await manager.recoverSessionKey({
  sessionKeyId: '...',
  recoveryQR,
  oldPin: '123456',
  newPin: '654321',
});
```

---

## 🎨 UI Best Practices

### PIN Entry

```typescript
// Good PIN input
<input
  type="password"          // Hide digits
  inputMode="numeric"      // Show numeric keyboard on mobile
  pattern="[0-9]*"         // Allow only numbers
  maxLength={6}            // Limit to 6 digits
  autoComplete="off"       // Don't suggest
  placeholder="••••••"
/>
```

### Biometric Unlock (Optional)

```typescript
// Use Web Authentication API for biometric unlock
const credential = await navigator.credentials.get({
  publicKey: {
    challenge: new Uint8Array(32),
    rpId: 'your-domain.com',
    userVerification: 'required',
  }
});

if (credential) {
  // User verified with biometrics
  // Decrypt PIN from secure storage
  const pin = await decryptPinWithBiometric(credential);
  
  await manager.makePayment({ ..., pin });
}
```

---

## ⚡ Performance Optimization

### PIN Caching (In-Memory Only)

```typescript
class SecurePinCache {
  private pin: string | null = null;
  private timeout: NodeJS.Timeout | null = null;

  set(pin: string, ttlMs: number = 5 * 60 * 1000) {
    this.pin = pin;
    
    // Clear after TTL
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = setTimeout(() => {
      this.pin = null;
    }, ttlMs);
  }

  get(): string | null {
    return this.pin;
  }

  clear() {
    this.pin = null;
    if (this.timeout) clearTimeout(this.timeout);
  }
}

// Usage
const pinCache = new SecurePinCache();

// User enters PIN once
pinCache.set(userPin, 5 * 60 * 1000);  // Cache for 5 minutes

// Make multiple payments without re-entering PIN
for (const payment of payments) {
  const pin = pinCache.get();
  if (!pin) {
    // PIN expired, prompt user
    pin = await promptForPin();
    pinCache.set(pin);
  }
  
  await manager.makePayment({ ...payment, pin });
}
```

---

## 🔧 Advanced Usage

### Custom Device Fingerprint

```typescript
import { DeviceFingerprintGenerator } from '@zendfi/sdk';

// Get detailed fingerprint info
const fingerprint = await DeviceFingerprintGenerator.generate();

console.log('Fingerprint:', fingerprint.fingerprint);
console.log('Components:', fingerprint.components);

// Use for analytics/fraud detection
if (fingerprint.components.webgl?.includes('NVIDIA')) {
  // User has NVIDIA GPU
}
```

### Manual Encryption/Decryption

```typescript
import { SessionKeyCrypto } from '@zendfi/sdk';
import { Keypair } from '@solana/web3.js';

// Generate keypair
const keypair = Keypair.generate();

// Encrypt with PIN
const encrypted = await SessionKeyCrypto.encrypt(
  keypair,
  '123456',
  'device-fingerprint-hash'
);

console.log('Encrypted:', encrypted.encryptedData);
console.log('Nonce:', encrypted.nonce);

// Decrypt later
const decrypted = await SessionKeyCrypto.decrypt(
  encrypted,
  '123456',
  'device-fingerprint-hash'
);

console.log('Public key:', decrypted.publicKey.toBase58());
```

---

## 🐛 Error Handling

```typescript
try {
  await manager.makePayment({ ... });
} catch (error) {
  if (error.message.includes('PIN must be exactly 6')) {
    // Invalid PIN format
    showError('Please enter a 6-digit PIN');
  } else if (error.message.includes('Device fingerprint mismatch')) {
    // Wrong device
    showError('Use recovery QR to migrate to this device');
  } else if (error.message.includes('Decryption failed')) {
    // Wrong PIN
    showError('Incorrect PIN. Please try again.');
  } else if (error.message.includes('Session key not loaded')) {
    // Need to load session key first
    await manager.loadSessionKey(sessionKeyId, pin);
  } else {
    // Unknown error
    showError('Payment failed. Please try again.');
  }
}
```

---

## 📊 Status Monitoring

```typescript
// Check session key status
const status = await manager.getStatus();

console.log('Active:', status.isActive);
console.log('Remaining:', `$${status.remainingUsdc}`);
console.log('Used:', `$${status.usedAmountUsdc}`);
console.log('Days left:', status.daysUntilExpiry);

// Show in UI
if (status.daysUntilExpiry < 2) {
  showWarning('Session key expires soon!');
}

if (status.remainingUsdc < 10) {
  showWarning('Low balance - top up recommended');
}
```

---

## 🔒 Security Checklist

### ✅ Do's
- ✅ Use strong 6-digit PINs (avoid 123456, 000000)
- ✅ Save recovery QR securely (encrypted cloud storage)
- ✅ Clear PIN from memory after use
- ✅ Validate user input (6 digits only)
- ✅ Show loading states during encryption/decryption
- ✅ Log security events (wrong PIN attempts)
- ✅ Implement rate limiting on PIN entry

### ❌ Don'ts
- ❌ Store PIN in localStorage/sessionStorage
- ❌ Send PIN to backend
- ❌ Log PIN to console
- ❌ Share recovery QR publicly
- ❌ Reuse same PIN across services
- ❌ Allow unlimited PIN attempts

---

## 🚀 Production Deployment

### Environment Variables

```bash
# .env.local (Next.js)
NEXT_PUBLIC_ZENDFI_API_KEY=zai_live_...
NEXT_PUBLIC_ZENDFI_BASE_URL=https://api.zendfi.com

# .env.production
NEXT_PUBLIC_ZENDFI_API_KEY=zai_live_...
NEXT_PUBLIC_ZENDFI_BASE_URL=https://api.zendfi.com
```

### Build Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler"
  }
}
```

### Bundle Size Optimization

The device-bound SDK adds:
- **~15KB gzipped** for crypto functions
- **~8KB gzipped** for device fingerprinting
- **Total: ~23KB gzipped** (minimal impact!)

---

## 📝 TypeScript Support

Full TypeScript support with type inference:

```typescript
import { 
  ZendFiSessionKeyManager,
  type SessionKeyPaymentRequest,
  type CreateDeviceBoundSessionKeyResponse 
} from '@zendfi/sdk';

const manager = new ZendFiSessionKeyManager(apiKey);

// Type-safe payment request
const request: SessionKeyPaymentRequest = {
  amount: 5.0,
  recipient: '...',
  pin: '123456',
  token: 'USDC',  // Autocomplete works!
};

const payment = await manager.makePayment(request);
payment.signature;  // TypeScript knows this exists!
```

---

## 🎯 What's Next?

1. **Integration Guide**: See backend API integration
2. **Security Audit**: Review cryptography implementation
3. **Testing**: Write comprehensive test suite
4. **Examples**: Check example projects

---

## 💬 Support

- **Documentation**: https://docs.zendfi.com
- **Discord**: https://discord.gg/zendfi
- **Email**: support@zendfi.com

---

**Happy building! 🚀**
