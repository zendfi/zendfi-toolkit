/**
 * Session Keys API - Device-Bound Non-Custodial Session Keys
 *
 * TRUE non-custodial session keys where:
 * - Client generates keypair (backend NEVER sees private key)
 * - Client encrypts with PIN + device fingerprint (Argon2id + AES-256-GCM)
 * - Backend stores encrypted blob (cannot decrypt!)
 * - Client decrypts and signs for each payment
 *
 * This is the ONLY supported mode. Custodial session keys are deprecated.
 *
 * @example
 * ```typescript
 * // Create a session key with PIN encryption
 * const result = await zendfi.sessionKeys.create({
 *   userWallet: '7xKNH...',
 *   agentId: 'shopping-assistant-v1',
 *   agentName: 'AI Shopping Assistant',
 *   limitUSDC: 100,
 *   durationDays: 7,
 *   pin: '123456',
 *   generateRecoveryQR: true,
 * });
 *
 * console.log(`Session key: ${result.sessionKeyId}`);
 * console.log(`Works across all apps with agent: ${result.agentId}`);
 *
 * // Unlock for auto-signing (one-time PIN entry)
 * await zendfi.sessionKeys.unlock(result.sessionKeyId, '123456');
 *
 * // Make payments without PIN (instant!)
 * const payment = await zendfi.sessionKeys.makePayment({
 *   sessionKeyId: result.sessionKeyId,
 *   amount: 5.0,
 *   recipient: '8xYZA...',
 *   description: 'Coffee purchase',
 * });
 * ```
 *
 * @module aip/session-keys
 */

import {
  DeviceBoundSessionKey,
  DeviceFingerprintGenerator,
  SessionKeyCrypto,
  RecoveryQRGenerator,
  encryptKeypairWithLit,
  type EncryptedSessionKey,
  type LitEncryptionResult,
} from '../device-bound-crypto';
import { Transaction } from '@solana/web3.js';

export type RequestFn = <T>(method: string, endpoint: string, data?: any) => Promise<T>;

// ============================================
// API Request/Response Types (Backend API)
// ============================================

interface BackendCreateRequest {
  user_wallet: string;
  agent_id: string;
  agent_name?: string;
  limit_usdc: number;
  duration_days: number;
  encrypted_session_key: string;
  nonce: string;
  session_public_key: string;
  device_fingerprint: string;
  recovery_qr_data?: string;
  
  // Lit Protocol encryption for autonomous signing
  lit_encrypted_keypair?: string;
  lit_data_hash?: string;
}

interface BackendCreateResponse {
  session_key_id: string;
  mode: 'device_bound';
  is_custodial: false;
  user_wallet: string;
  agent_id: string;
  agent_name?: string;
  session_wallet: string;
  limit_usdc: number;
  expires_at: string;
  requires_client_signing: true;
  cross_app_compatible: boolean;
  security_info: {
    encryption_type: string;
    device_bound: boolean;
    backend_can_decrypt: boolean;
    recovery_qr_saved: boolean;
  };
}

interface GetEncryptedResponse {
  encrypted_session_key: string;
  nonce: string;
  device_fingerprint_valid: boolean;
}

// ============================================
// High-Level SDK Types (Developer Facing)
// ============================================

export interface CreateSessionKeyOptions {
  /** User's main wallet address */
  userWallet: string;
  /** Agent identifier for cross-app compatibility (e.g., "shopping-assistant-v1") */
  agentId: string;
  /** Human-readable agent name (e.g., "AI Shopping Assistant") */
  agentName?: string;
  /** Spending limit in USDC */
  limitUSDC: number;
  /** Duration in days (1-30) */
  durationDays: number;
  /** 6-digit numeric PIN for encryption */
  pin: string;
  /** Generate recovery QR code (recommended) */
  generateRecoveryQR?: boolean;
  
  /** Enable Lit Protocol for true autonomous signing (default: true) */
  enableLitProtocol?: boolean;
  /** Lit Protocol network (default: 'datil-dev') */
  litNetwork?: 'datil' | 'datil-dev' | 'datil-test';
}

export interface SessionKeyResult {
  /** UUID of the created session key */
  sessionKeyId: string;
  /** Agent identifier */
  agentId: string;
  /** Agent name (if provided) */
  agentName?: string;
  /** Session wallet public key */
  sessionWallet: string;
  /** Spending limit in USDC */
  limitUsdc: number;
  /** Expiration timestamp */
  expiresAt: string;
  /** Recovery QR code data (if generated) */
  recoveryQR?: string;
  /** True if this session key works across multiple apps with same agent_id */
  crossAppCompatible: boolean;
}

export interface MakePaymentOptions {
  /** Session key ID to pay from */
  sessionKeyId: string;
  /** Payment amount in USD */
  amount: number;
  /** Recipient wallet address */
  recipient: string;
  /** Token to pay with (default: USDC) */
  token?: string;
  /** Payment description */
  description?: string;
  /** PIN (only required if session key not unlocked) */
  pin?: string;
  /** Whether to cache keypair for future payments (default: true) */
  enableAutoSign?: boolean;
}

export interface PaymentResult {
  paymentId: string;
  signature: string;
  status: string;
}

export interface SessionKeyInfo {
  sessionKeyId: string;
  isActive: boolean;
  isApproved: boolean;
  limitUsdc: number;
  usedAmountUsdc: number;
  remainingUsdc: number;
  expiresAt: string;
  daysUntilExpiry: number;
}

// ============================================
// Session Keys API (Device-Bound Only)
// ============================================

export class SessionKeysAPI {
  private sessionKeys: Map<string, DeviceBoundSessionKey> = new Map();
  private sessionMetadata: Map<string, { agentId: string; agentName?: string }> = new Map();
  private requestFn: RequestFn;
  private debugMode: boolean = false;

  constructor(request: RequestFn) {
    this.requestFn = request;
  }

  /**
   * Enable debug logging
   */
  private debug(...args: any[]): void {
    if (this.debugMode && typeof console !== 'undefined') {
      console.log('[ZendFi SessionKeys]', ...args);
    }
  }

  /**
   * Create a new device-bound session key
   *
   * The keypair is generated client-side and encrypted with your PIN.
   * The backend NEVER sees your private key.
   *
   * @param options - Session key configuration
   * @returns Created session key info with optional recovery QR
   *
   * @example
   * ```typescript
   * const result = await zendfi.sessionKeys.create({
   *   userWallet: '7xKNH...',
   *   agentId: 'shopping-assistant-v1',
   *   agentName: 'AI Shopping Assistant',
   *   limitUSDC: 100,
   *   durationDays: 7,
   *   pin: '123456',
   *   generateRecoveryQR: true,
   * });
   *
   * console.log(`Session key: ${result.sessionKeyId}`);
   * console.log(`Recovery QR: ${result.recoveryQR}`);
   * ```
   */
  async create(options: CreateSessionKeyOptions): Promise<SessionKeyResult> {
    // Validate PIN
    if (!options.pin || options.pin.length < 4) {
      throw new Error('PIN must be at least 4 characters');
    }

    // Create device-bound session key (client-side keypair generation)
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

    // Encrypt with Lit Protocol for autonomous signing (default: enabled)
    let litEncryption: LitEncryptionResult | undefined;
    const enableLit = options.enableLitProtocol !== false; // Default true
    
    if (enableLit) {
      // Retry Lit encryption with exponential backoff (RPC can be flaky)
      const maxRetries = 3;
      let lastError: Error | undefined;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          this.debug(`Encrypting session key with Lit Protocol (attempt ${attempt}/${maxRetries})...`);
          
          litEncryption = await encryptKeypairWithLit(sessionKey.getKeypair(), {
            // CRITICAL: Must match backend LIT_NETWORK (Datil = mainnet)
            // datil-dev encryption cannot be decrypted by datil backend!
            network: options.litNetwork || 'datil',
            debug: this.debugMode,
          });
          
          this.debug('Lit Protocol encryption successful - autonomous signing enabled');
          break; // Success! Exit retry loop
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          if (attempt < maxRetries) {
            // Exponential backoff: 500ms, 1000ms, 2000ms
            const delayMs = 500 * Math.pow(2, attempt - 1);
            this.debug(`Lit encryption attempt ${attempt} failed, retrying in ${delayMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          } else {
            // All retries exhausted
            const errorMsg = lastError.message;
            this.debug('Lit encryption failed after 3 attempts, continuing without autonomous mode:', errorMsg);
            console.warn('[ZendFi SDK] Lit Protocol encryption failed after retries:', errorMsg);
            // Continue without Lit (fallback to device-bound only)
            // This is non-fatal - session key still works with client signing
          }
        }
      }
    } else {
      this.debug('ℹ️  Lit Protocol disabled - autonomous signing not available');
    }

    // Prepare backend request
    const request: BackendCreateRequest = {
      user_wallet: options.userWallet,
      agent_id: options.agentId,
      agent_name: options.agentName,
      limit_usdc: options.limitUSDC,
      duration_days: options.durationDays,
      encrypted_session_key: encrypted.encryptedData,
      nonce: encrypted.nonce,
      session_public_key: encrypted.publicKey,
      device_fingerprint: sessionKey.getDeviceFingerprint(),
      recovery_qr_data: recoveryQR,
      
      // Include Lit encryption if available
      lit_encrypted_keypair: litEncryption?.ciphertext,
      lit_data_hash: litEncryption?.dataHash,
    };

    // Call backend API
    const response = await this.requestFn<BackendCreateResponse>(
      'POST',
      '/api/v1/ai/session-keys/device-bound/create',
      request
    );

    // Store session key locally for signing
    sessionKey.setSessionKeyId(response.session_key_id);
    this.sessionKeys.set(response.session_key_id, sessionKey);
    
    // Store metadata (agentId) for this session key
    this.sessionMetadata.set(response.session_key_id, {
      agentId: response.agent_id,
      agentName: response.agent_name,
    });

    return {
      sessionKeyId: response.session_key_id,
      agentId: response.agent_id,
      agentName: response.agent_name,
      sessionWallet: response.session_wallet,
      limitUsdc: response.limit_usdc,
      expiresAt: response.expires_at,
      recoveryQR,
      crossAppCompatible: response.cross_app_compatible,
    };
  }

  /**
   * Load an existing session key from backend
   *
   * Fetches the encrypted session key and decrypts it with your PIN.
   * Use this when resuming a session on the same device.
   *
   * @param sessionKeyId - UUID of the session key
   * @param pin - PIN to decrypt the session key
   *
   * @example
   * ```typescript
   * // Resume session on same device
   * await zendfi.sessionKeys.load('uuid-of-session-key', '123456');
   *
   * // Now you can make payments
   * await zendfi.sessionKeys.makePayment({...});
   * ```
   */
  async load(sessionKeyId: string, pin: string): Promise<void> {
    // Get current device fingerprint
    const deviceInfo = await DeviceFingerprintGenerator.generate();

    // Fetch encrypted session key from backend
    const response = await this.requestFn<GetEncryptedResponse>(
      'POST',
      '/api/v1/ai/session-keys/device-bound/get-encrypted',
      {
        session_key_id: sessionKeyId,
        device_fingerprint: deviceInfo.fingerprint,
      }
    );

    if (!response.device_fingerprint_valid) {
      throw new Error(
        'Device fingerprint mismatch - this session key was created on a different device. Use recover() to migrate.'
      );
    }

    // Reconstruct encrypted session key
    const encrypted: EncryptedSessionKey = {
      encryptedData: response.encrypted_session_key,
      nonce: response.nonce,
      publicKey: '', // Will be populated after decryption
      deviceFingerprint: deviceInfo.fingerprint,
      version: 'argon2id-aes256gcm-v1',
    };

    // Verify we can decrypt it (validates PIN)
    const keypair = await SessionKeyCrypto.decrypt(encrypted, pin, deviceInfo.fingerprint);
    encrypted.publicKey = keypair.publicKey.toBase58();

    // Create session key instance
    const sessionKey = new DeviceBoundSessionKey();
    (sessionKey as any).encrypted = encrypted;
    (sessionKey as any).deviceFingerprint = deviceInfo;
    sessionKey.setSessionKeyId(sessionKeyId);

    // Store locally
    this.sessionKeys.set(sessionKeyId, sessionKey);
  }

  /**
   * Unlock a session key for auto-signing
   *
   * After unlocking, payments can be made without entering PIN.
   * The decrypted keypair is cached in memory with a TTL.
   *
   * @param sessionKeyId - UUID of the session key
   * @param pin - PIN to decrypt the session key
   * @param cacheTTL - How long to cache (default: 30 minutes)
   *
   * @example
   * ```typescript
   * // Unlock once
   * await zendfi.sessionKeys.unlock('uuid', '123456');
   *
   * // Make payments instantly (no PIN!)
   * await zendfi.sessionKeys.makePayment({...}); // Instant!
   * await zendfi.sessionKeys.makePayment({...}); // Instant!
   * ```
   */
  async unlock(sessionKeyId: string, pin: string, cacheTTL?: number): Promise<void> {
    const sessionKey = this.sessionKeys.get(sessionKeyId);
    if (!sessionKey) {
      // Try to load it first
      await this.load(sessionKeyId, pin);
      const loaded = this.sessionKeys.get(sessionKeyId);
      if (loaded) {
        await loaded.unlockWithPin(pin, cacheTTL);
      }
      return;
    }

    await sessionKey.unlockWithPin(pin, cacheTTL);
  }

  /**
   * Make a payment using a session key
   *
   * If the session key is unlocked (cached), no PIN is needed.
   * Otherwise, you must provide the PIN.
   *
   * @param options - Payment configuration
   * @returns Payment result with signature
   *
   * @example
   * ```typescript
   * // With unlocked session key (no PIN)
   * const result = await zendfi.sessionKeys.makePayment({
   *   sessionKeyId: 'uuid',
   *   amount: 5.0,
   *   recipient: '8xYZA...',
   *   description: 'Coffee purchase',
   * });
   *
   * // Or with PIN (one-time)
   * const result = await zendfi.sessionKeys.makePayment({
   *   sessionKeyId: 'uuid',
   *   amount: 5.0,
   *   recipient: '8xYZA...',
   *   pin: '123456',
   * });
   * ```
   */
  async makePayment(options: MakePaymentOptions): Promise<PaymentResult> {
    const sessionKey = this.sessionKeys.get(options.sessionKeyId);
    if (!sessionKey) {
      throw new Error(
        `Session key ${options.sessionKeyId} not loaded. Call create() or load() first.`
      );
    }

    const enableAutoSign = options.enableAutoSign !== false;

    // Check if we need PIN
    const needsPin = !sessionKey.isCached();
    if (needsPin && !options.pin) {
      throw new Error(
        'PIN required: session key not unlocked. Provide PIN or call unlock() first.'
      );
    }

    // Get metadata for this session key (includes agentId)
    const metadata = this.sessionMetadata.get(options.sessionKeyId);
    if (!metadata) {
      throw new Error(
        `Session key metadata not found for ${options.sessionKeyId}. Was it created in this session?`
      );
    }

    // Request payment (backend returns unsigned transaction)
    const paymentResponse = await this.requestFn<{
      payment_id: string;
      status: string;
      unsigned_transaction?: string;
      requires_signature: boolean;
    }>('POST', '/api/v1/ai/smart-payment', {
      agent_id: metadata.agentId, // Required by backend
      amount_usd: options.amount,
      user_wallet: sessionKey.getPublicKey(), // Session key's wallet (payer)
      token: options.token || 'USDC',
      description: options.description,
      session_key_id: options.sessionKeyId,
    });

    // If no signature required (shouldn't happen for device-bound)
    if (!paymentResponse.requires_signature && paymentResponse.status === 'confirmed') {
      return {
        paymentId: paymentResponse.payment_id,
        signature: '',
        status: paymentResponse.status,
      };
    }

    // Sign client-side
    if (!paymentResponse.unsigned_transaction) {
      throw new Error('Backend did not return unsigned transaction');
    }

    // Decode transaction
    const transactionBuffer = Buffer.from(paymentResponse.unsigned_transaction, 'base64');
    const transaction = Transaction.from(transactionBuffer);

    // Sign with session key
    const signedTransaction = await sessionKey.signTransaction(
      transaction,
      options.pin || '',
      enableAutoSign
    );

    // Submit signed transaction
    const submitResponse = await this.requestFn<{
      signature: string;
      status: string;
    }>('POST', `/api/v1/ai/payments/${paymentResponse.payment_id}/submit-signed`, {
      signed_transaction: signedTransaction.serialize().toString('base64'),
    });

    return {
      paymentId: paymentResponse.payment_id,
      signature: submitResponse.signature,
      status: submitResponse.status,
    };
  }

  /**
   * Get session key status
   *
   * @param sessionKeyId - UUID of the session key
   * @returns Current status including balance and expiry
   */
  async getStatus(sessionKeyId: string): Promise<SessionKeyInfo> {
    const response = await this.requestFn<{
      is_active: boolean;
      is_approved: boolean;
      limit_usdc: number;
      used_amount_usdc: number;
      remaining_usdc: number;
      expires_at: string;
      days_until_expiry: number;
    }>('POST', '/api/v1/ai/session-keys/status', {
      session_key_id: sessionKeyId,
    });

    return {
      sessionKeyId,
      isActive: response.is_active,
      isApproved: response.is_approved,
      limitUsdc: response.limit_usdc,
      usedAmountUsdc: response.used_amount_usdc,
      remainingUsdc: response.remaining_usdc,
      expiresAt: response.expires_at,
      daysUntilExpiry: response.days_until_expiry,
    };
  }

  /**
   * Revoke a session key
   *
   * Permanently deactivates the session key. Cannot be undone.
   *
   * @param sessionKeyId - UUID of the session key to revoke
   */
  async revoke(sessionKeyId: string): Promise<void> {
    await this.requestFn('POST', '/api/v1/ai/session-keys/revoke', {
      session_key_id: sessionKeyId,
    });

    // Clear local state
    this.sessionKeys.delete(sessionKeyId);
  }

  /**
   * Recover session key on new device
   *
   * Use this when moving to a new device with a recovery QR code.
   *
   * @param options - Recovery configuration
   *
   * @example
   * ```typescript
   * await zendfi.sessionKeys.recover({
   *   sessionKeyId: 'uuid',
   *   recoveryQR: '{"encryptedSessionKey":"..."}',
   *   oldPin: '123456',
   *   newPin: '654321',
   * });
   * ```
   */
  async recover(options: {
    sessionKeyId: string;
    recoveryQR: string;
    oldPin: string;
    newPin: string;
  }): Promise<void> {
    // Decode recovery QR
    const recoveryData = RecoveryQRGenerator.decode(options.recoveryQR);

    // Get new device fingerprint
    const newDeviceInfo = await DeviceFingerprintGenerator.generate();

    // Re-encrypt for new device
    const newEncrypted = await RecoveryQRGenerator.reEncryptForNewDevice(
      recoveryData,
      options.oldPin,
      'recovery-mode', // Old fingerprint (stored in QR in production)
      options.newPin,
      newDeviceInfo.fingerprint
    );

    // Call backend recovery endpoint
    await this.requestFn(
      'POST',
      `/api/v1/ai/session-keys/device-bound/${options.sessionKeyId}/recover`,
      {
        recovery_qr_data: options.recoveryQR,
        new_device_fingerprint: newDeviceInfo.fingerprint,
        new_encrypted_session_key: newEncrypted.encryptedData,
        new_nonce: newEncrypted.nonce,
      }
    );

    // Load recovered session key
    await this.load(options.sessionKeyId, options.newPin);
  }

  /**
   * Clear cached keypair for a session key
   *
   * Use this on logout or when session ends.
   *
   * @param sessionKeyId - UUID of the session key (or all if not specified)
   */
  clearCache(sessionKeyId?: string): void {
    if (sessionKeyId) {
      const sessionKey = this.sessionKeys.get(sessionKeyId);
      if (sessionKey) {
        sessionKey.clearCache();
      }
    } else {
      // Clear all
      for (const sessionKey of this.sessionKeys.values()) {
        sessionKey.clearCache();
      }
    }
  }

  /**
   * Check if a session key is cached (unlocked)
   *
   * @param sessionKeyId - UUID of the session key
   * @returns True if keypair is cached and auto-signing is enabled
   */
  isCached(sessionKeyId: string): boolean {
    const sessionKey = this.sessionKeys.get(sessionKeyId);
    return sessionKey?.isCached() || false;
  }

  /**
   * Get time remaining until cache expires
   *
   * @param sessionKeyId - UUID of the session key
   * @returns Milliseconds until cache expires
   */
  getCacheTimeRemaining(sessionKeyId: string): number {
    const sessionKey = this.sessionKeys.get(sessionKeyId);
    return sessionKey?.getCacheTimeRemaining() || 0;
  }

  /**
   * Extend cache expiry time
   *
   * Useful to keep session active during user activity.
   *
   * @param sessionKeyId - UUID of the session key
   * @param additionalTTL - Additional time in milliseconds
   */
  extendCache(sessionKeyId: string, additionalTTL: number): void {
    const sessionKey = this.sessionKeys.get(sessionKeyId);
    if (sessionKey) {
      sessionKey.extendCache(additionalTTL);
    }
  }

  /**
   * Get all loaded session key IDs
   *
   * @returns Array of session key UUIDs currently loaded
   */
  getLoadedSessionKeys(): string[] {
    return Array.from(this.sessionKeys.keys());
  }
}
