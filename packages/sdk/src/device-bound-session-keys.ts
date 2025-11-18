/**
 * Device-Bound Session Keys - SDK Integration
 * 
 * High-level API for managing non-custodial session keys
 * Integrates with ZendFi backend API
 * 
 * @module device-bound-session-keys
 */

import {
  DeviceBoundSessionKey,
  DeviceFingerprintGenerator,
  SessionKeyCrypto,
  RecoveryQRGenerator,
  type EncryptedSessionKey,
  type DeviceBoundSessionKeyOptions,
  type RecoveryQR,
} from './device-bound-crypto';
import { Transaction } from '@solana/web3.js';

// ============================================
// API Types (matching backend)
// ============================================

export interface CreateDeviceBoundSessionKeyRequest {
  userWallet: string;
  limitUsdc: number;
  durationDays: number;
  encryptedSessionKey: string;
  nonce: string;
  sessionPublicKey: string;
  deviceFingerprint: string;
  recoveryQrData?: string;
}

export interface CreateDeviceBoundSessionKeyResponse {
  sessionKeyId: string;
  mode: 'device_bound';
  isCustodial: false;
  userWallet: string;
  sessionWallet: string;
  limitUsdc: number;
  expiresAt: string;
  requiresClientSigning: true;
  securityInfo: {
    encryptionType: string;
    deviceBound: boolean;
    backendCanDecrypt: boolean;
    recoveryQrSaved: boolean;
  };
}

export interface GetEncryptedSessionKeyRequest {
  sessionKeyId: string;
  deviceFingerprint: string;
}

export interface GetEncryptedSessionKeyResponse {
  encryptedSessionKey: string;
  nonce: string;
  deviceFingerprintValid: boolean;
}

export interface RecoverSessionKeyRequest {
  recoveryQrData: string;
  newDeviceFingerprint: string;
  newEncryptedSessionKey: string;
  newNonce: string;
}

export interface SessionKeyPaymentRequest {
  amount: number;
  recipient: string;
  token?: string;
  description?: string;
  pin?: string; // Optional - only required if keypair not cached
  enableAutoSign?: boolean; // Whether to cache keypair for future payments (default: true)
}

// ============================================
// Session Key Manager (High-Level API)
// ============================================

export class ZendFiSessionKeyManager {
  private baseURL: string;
  private apiKey: string;
  private sessionKey: DeviceBoundSessionKey | null = null;
  private sessionKeyId: string | null = null;

  constructor(apiKey: string, baseURL: string = 'https://api.zendfi.com') {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
  }

  /**
   * Create a new device-bound session key
   * 
   * @example
   * ```typescript
   * const manager = new ZendFiSessionKeyManager('your-api-key');
   * 
   * const sessionKey = await manager.createSessionKey({
   *   userWallet: '7xKNH....',
   *   limitUSDC: 100,
   *   durationDays: 7,
   *   pin: '123456',
   *   generateRecoveryQR: true,
   * });
   * 
   * console.log('Session key created:', sessionKey.sessionKeyId);
   * console.log('Recovery QR:', sessionKey.recoveryQR);
   * ```
   */
  async createSessionKey(options: {
    userWallet: string;
    limitUSDC: number;
    durationDays: number;
    pin: string;
    generateRecoveryQR?: boolean;
  }): Promise<{
    sessionKeyId: string;
    sessionWallet: string;
    expiresAt: string;
    recoveryQR?: string;
    limitUsdc: number;
  }> {
    // Create device-bound session key (client-side)
    const sessionKey = await DeviceBoundSessionKey.create({
      pin: options.pin,
      limitUSDC: options.limitUSDC,
      durationDays: options.durationDays,
      userWallet: options.userWallet,
      generateRecoveryQR: options.generateRecoveryQR,
    });

    // Get encrypted data
    const encrypted = sessionKey.getEncryptedData();

    // Generate recovery QR if requested
    let recoveryQR: string | undefined;
    if (options.generateRecoveryQR) {
      const qr = RecoveryQRGenerator.generate(encrypted);
      recoveryQR = RecoveryQRGenerator.encode(qr);
    }

    // Prepare request for backend
    const request: CreateDeviceBoundSessionKeyRequest = {
      userWallet: options.userWallet,
      limitUsdc: options.limitUSDC,
      durationDays: options.durationDays,
      encryptedSessionKey: encrypted.encryptedData,
      nonce: encrypted.nonce,
      sessionPublicKey: encrypted.publicKey,
      deviceFingerprint: sessionKey.getDeviceFingerprint(),
      recoveryQrData: recoveryQR,
    };

    // Call backend API
    const response = await this.request<CreateDeviceBoundSessionKeyResponse>(
      'POST',
      '/api/v1/ai/session-keys/device-bound/create',
      request
    );

    // Store session key locally
    this.sessionKey = sessionKey;
    this.sessionKeyId = response.sessionKeyId;
    sessionKey.setSessionKeyId(response.sessionKeyId);

    return {
      sessionKeyId: response.sessionKeyId,
      sessionWallet: response.sessionWallet,
      expiresAt: response.expiresAt,
      recoveryQR,
      limitUsdc: response.limitUsdc,
    };
  }

  /**
   * Load an existing session key from backend
   * Requires PIN to decrypt
   */
  async loadSessionKey(sessionKeyId: string, pin: string): Promise<void> {
    // Get current device fingerprint
    const deviceInfo = await DeviceFingerprintGenerator.generate();

    // Fetch encrypted session key from backend
    const response = await this.request<GetEncryptedSessionKeyResponse>(
      'POST',
      '/api/v1/ai/session-keys/device-bound/get-encrypted',
      {
        sessionKeyId,
        deviceFingerprint: deviceInfo.fingerprint,
      }
    );

    if (!response.deviceFingerprintValid) {
      throw new Error(
        'Device fingerprint mismatch - this session key was created on a different device. Use recovery QR to migrate.'
      );
    }

    // Reconstruct encrypted session key
    const encrypted: EncryptedSessionKey = {
      encryptedData: response.encryptedSessionKey,
      nonce: response.nonce,
      publicKey: '', // Will be populated after decryption
      deviceFingerprint: deviceInfo.fingerprint,
      version: 'argon2id-aes256gcm-v1',
    };

    // Verify we can decrypt it (validates PIN)
    const keypair = await SessionKeyCrypto.decrypt(encrypted, pin, deviceInfo.fingerprint);
    encrypted.publicKey = keypair.publicKey.toBase58();

    // Create session key instance
    this.sessionKey = new DeviceBoundSessionKey();
    (this.sessionKey as any).encrypted = encrypted;
    (this.sessionKey as any).deviceFingerprint = deviceInfo;
    this.sessionKey.setSessionKeyId(sessionKeyId);
    this.sessionKeyId = sessionKeyId;
  }

  /**
   * Make a payment using the session key
   * 
   * First payment: Requires PIN to decrypt session key
   * Subsequent payments: Uses cached keypair (no PIN needed!) ✨
   * 
   * @example
   * ```typescript
   * // First payment: requires PIN
   * const result1 = await manager.makePayment({
   *   amount: 5.0,
   *   recipient: '7xKNH....',
   *   pin: '123456',
   *   description: 'Coffee purchase',
   * });
   * 
   * // Second payment: NO PIN NEEDED! Instant signing!
   * const result2 = await manager.makePayment({
   *   amount: 3.0,
   *   recipient: '7xKNH....',
   *   description: 'Donut purchase',
   * }); // <- No PIN! Uses cached keypair
   * 
   * console.log('Payment signature:', result2.signature);
   * 
   * // Disable auto-signing for single payment
   * const result3 = await manager.makePayment({
   *   amount: 100.0,
   *   recipient: '7xKNH....',
   *   pin: '123456',
   *   enableAutoSign: false, // Will require PIN every time
   * });
   * ```
   */
  async makePayment(options: SessionKeyPaymentRequest): Promise<{
    paymentId: string;
    signature: string;
    status: string;
  }> {
    if (!this.sessionKey || !this.sessionKeyId) {
      throw new Error('No session key loaded. Call createSessionKey() or loadSessionKey() first.');
    }

    const enableAutoSign = options.enableAutoSign !== false; // Default true

    // Check if we need PIN
    const needsPin = !this.sessionKey.isCached();
    if (needsPin && !options.pin) {
      throw new Error(
        'PIN required: no cached keypair available. Please provide PIN or call unlockSessionKey() first.'
      );
    }

    // Call smart payment endpoint (returns unsigned transaction)
    const paymentResponse = await this.request<{
      paymentId: string;
      status: string;
      unsigned_transaction?: string;
      requires_signature: boolean;
    }>('POST', '/api/v1/ai/smart-payment', {
      amount_usd: options.amount,
      user_wallet: options.recipient,
      token: options.token || 'USDC',
      description: options.description,
    }, {
      'X-Session-Key-ID': this.sessionKeyId,
    });

    // If backend auto-signed (shouldn't happen for device-bound), return directly
    if (!paymentResponse.requires_signature && paymentResponse.status === 'confirmed') {
      return {
        paymentId: paymentResponse.paymentId,
        signature: '', // Backend signed
        status: paymentResponse.status,
      };
    }

    // Otherwise, we need to sign client-side
    if (!paymentResponse.unsigned_transaction) {
      throw new Error('Backend did not return unsigned transaction');
    }

    // Decode transaction
    const transactionBuffer = Buffer.from(paymentResponse.unsigned_transaction, 'base64');
    const transaction = Transaction.from(transactionBuffer);

    // Sign with session key (uses cached keypair if available!)
    const signedTransaction = await this.sessionKey.signTransaction(
      transaction,
      options.pin || '', // PIN only needed if not cached
      enableAutoSign // Cache for future payments
    );

    // Submit signed transaction
    const submitResponse = await this.request<{
      signature: string;
      status: string;
    }>('POST', `/api/v1/ai/payments/${paymentResponse.paymentId}/submit-signed`, {
      signed_transaction: signedTransaction.serialize().toString('base64'),
    });

    return {
      paymentId: paymentResponse.paymentId,
      signature: submitResponse.signature,
      status: submitResponse.status,
    };
  }

  /**
   * Recover session key on new device
   * Requires recovery QR and PIN from original device
   * 
   * @example
   * ```typescript
   * const recovered = await manager.recoverSessionKey({
   *   sessionKeyId: 'uuid...',
   *   recoveryQR: '{"encryptedSessionKey":"..."}',
   *   oldPin: '123456',
   *   newPin: '654321',
   * });
   * ```
   */
  async recoverSessionKey(options: {
    sessionKeyId: string;
    recoveryQR: string;
    oldPin: string;
    newPin: string;
  }): Promise<void> {
    // Decode recovery QR
    const recoveryData = RecoveryQRGenerator.decode(options.recoveryQR);

    // Get old device fingerprint (stored in QR or provided)
    // For simplicity, we'll use a dummy - in production, store in QR
    const oldDeviceFingerprint = 'recovery-mode';

    // Get new device fingerprint
    const newDeviceInfo = await DeviceFingerprintGenerator.generate();

    // Re-encrypt for new device
    const newEncrypted = await RecoveryQRGenerator.reEncryptForNewDevice(
      recoveryData,
      options.oldPin,
      oldDeviceFingerprint,
      options.newPin,
      newDeviceInfo.fingerprint
    );

    // Call backend recovery endpoint
    await this.request('POST', `/api/v1/ai/session-keys/device-bound/${options.sessionKeyId}/recover`, {
      recoveryQrData: options.recoveryQR,
      newDeviceFingerprint: newDeviceInfo.fingerprint,
      newEncryptedSessionKey: newEncrypted.encryptedData,
      newNonce: newEncrypted.nonce,
    });

    // Load recovered session key
    await this.loadSessionKey(options.sessionKeyId, options.newPin);
  }

  /**
   * Revoke session key
   */
  async revokeSessionKey(sessionKeyId?: string): Promise<void> {
    const keyId = sessionKeyId || this.sessionKeyId;
    if (!keyId) {
      throw new Error('No session key ID provided');
    }

    await this.request('POST', '/api/v1/ai/session-keys/revoke', {
      session_key_id: keyId,
    });

    // Clear local state if it was our active key
    if (keyId === this.sessionKeyId) {
      this.sessionKey = null;
      this.sessionKeyId = null;
    }
  }

  /**
   * Unlock session key with PIN and cache for auto-signing
   * Call this after creating/loading session key to enable instant payments
   * 
   * @example
   * ```typescript
   * // Create session key
   * await manager.createSessionKey({...});
   * 
   * // Unlock with PIN (one-time)
   * await manager.unlockSessionKey('123456');
   * 
   * // Now all payments are instant (no PIN!)
   * await manager.makePayment({amount: 5, ...}); // Instant!
   * await manager.makePayment({amount: 3, ...}); // Instant!
   * ```
   */
  async unlockSessionKey(pin: string, cacheTTL?: number): Promise<void> {
    if (!this.sessionKey) {
      throw new Error('No session key loaded');
    }

    await this.sessionKey.unlockWithPin(pin, cacheTTL);
  }

  /**
   * Clear cached keypair
   * Should be called on logout or when session ends
   * 
   * @example
   * ```typescript
   * // Clear on logout
   * manager.clearCache();
   * 
   * // Or auto-clear on tab close
   * window.addEventListener('beforeunload', () => {
   *   manager.clearCache();
   * });
   * ```
   */
  clearCache(): void {
    if (this.sessionKey) {
      this.sessionKey.clearCache();
    }
  }

  /**
   * Check if keypair is cached (auto-signing enabled)
   */
  isCached(): boolean {
    return this.sessionKey?.isCached() || false;
  }

  /**
   * Get time remaining until cache expires (in milliseconds)
   */
  getCacheTimeRemaining(): number {
    return this.sessionKey?.getCacheTimeRemaining() || 0;
  }

  /**
   * Extend cache expiry time
   * Useful to keep session active during user activity
   */
  extendCache(additionalTTL: number): void {
    if (!this.sessionKey) {
      throw new Error('No session key loaded');
    }
    this.sessionKey.extendCache(additionalTTL);
  }

  /**
   * Get session key status
   */
  async getStatus(sessionKeyId?: string): Promise<{
    isActive: boolean;
    isApproved: boolean;
    limitUsdc: number;
    usedAmountUsdc: number;
    remainingUsdc: number;
    expiresAt: string;
    daysUntilExpiry: number;
  }> {
    const keyId = sessionKeyId || this.sessionKeyId;
    if (!keyId) {
      throw new Error('No session key ID provided');
    }

    return await this.request('POST', '/api/v1/ai/session-keys/status', {
      session_key_id: keyId,
    });
  }

  // ============================================
  // Private HTTP Helper
  // ============================================

  private async request<T = any>(
    method: string,
    path: string,
    body?: any,
    additionalHeaders?: Record<string, string>
  ): Promise<T> {
    const url = `${this.baseURL}${path}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      ...additionalHeaders,
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`API Error: ${error.error || response.statusText}`);
    }

    return await response.json();
  }
}

// ============================================
// Exports
// ============================================

export {
  DeviceBoundSessionKey,
  DeviceFingerprintGenerator,
  SessionKeyCrypto,
  RecoveryQRGenerator,
  type EncryptedSessionKey,
  type DeviceBoundSessionKeyOptions,
  type RecoveryQR,
};
