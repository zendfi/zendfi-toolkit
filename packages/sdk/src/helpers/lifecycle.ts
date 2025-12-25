/**
 * Session Key Lifecycle Manager
 * High-level wrapper for device-bound session keys
 * Handles common patterns: create → cache → use → revoke
 * 
 * @example
 * ```typescript
 * import { SessionKeyLifecycle } from '@zendfi/sdk/helpers';
 * 
 * const lifecycle = new SessionKeyLifecycle(zendfi, {
 *   cache: QuickCaches.persistent(),
 *   pinProvider: () => promptUserForPIN(),
 * });
 * 
 * // Create and fund in one call
 * await lifecycle.createAndFund({
 *   userWallet: address,
 *   agentId: 'my-agent',
 *   limitUsdc: 100,
 * });
 * 
 * // Make payments (auto-handles caching/PIN)
 * await lifecycle.pay(5, 'Coffee');
 * 
 * // Cleanup on app close
 * await lifecycle.cleanup();
 * ```
 */

import type { ZendFiClient } from '../client';
import type { SessionKeyCache } from './cache';
import type { SessionKeyStatus } from '../types';

export interface LifecycleConfig {
  /** Optional cache instance */
  cache?: SessionKeyCache;
  /** PIN provider function (called when cache expires) */
  pinProvider?: () => Promise<string>;
  /** Device fingerprint generator */
  deviceFingerprintProvider?: () => Promise<string>;
  /** Auto-cleanup on window/tab close */
  autoCleanup?: boolean;
}

export interface CreateAndFundConfig {
  userWallet: string;
  agentId: string;
  agentName?: string;
  limitUsdc: number;
  durationDays?: number;
  onApprovalNeeded?: (transaction: string) => Promise<string>;
}

export interface PaymentResult {
  paymentId: string;
  status: string;
  signature?: string;
  confirmedInMs?: number;
}

/**
 * Session Key Lifecycle Manager
 * Simplifies device-bound session key management
 */
export class SessionKeyLifecycle {
  private sessionKeyId: string | null = null;
  private sessionWallet: string | null = null;
  private encryptedKey: { ciphertext: string; nonce: string } | null = null;
  private deviceFingerprint: string | null = null;

  constructor(
    private client: ZendFiClient,
    private config: LifecycleConfig = {}
  ) {
    // Setup auto-cleanup
    if (config.autoCleanup && typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.cleanup().catch(console.error);
      });
    }
  }

  /**
   * Create and fund session key in one call
   * Handles: keypair generation → encryption → backend registration → funding
   */
  async createAndFund(config: CreateAndFundConfig): Promise<{
    sessionKeyId: string;
    sessionWallet: string;
  }> {
    // Get device fingerprint
    const fingerprint = this.config.deviceFingerprintProvider
      ? await this.config.deviceFingerprintProvider()
      : await this.generateDeviceFingerprint();

    this.deviceFingerprint = fingerprint;

    // Get PIN
    const pin = this.config.pinProvider
      ? await this.config.pinProvider()
      : await this.promptForPIN('Create PIN for session key');

    // Import device-bound utilities
    const { Keypair } = await this.getSolanaWeb3();
    const { SessionKeyCrypto } = await import('../device-bound-crypto');

    // Generate keypair
    const keypair = Keypair.generate();

    // Encrypt keypair
    const encrypted = await SessionKeyCrypto.encrypt(
      keypair.secretKey,
      pin,
      fingerprint
    );

    // Store encrypted key
    this.encryptedKey = {
      ciphertext: encrypted.encryptedData,
      nonce: encrypted.nonce,
    };

    // Register with backend
    const response = await this.client.sessionKeys.createDeviceBound({
      user_wallet: config.userWallet,
      agent_id: config.agentId,
      agent_name: config.agentName,
      limit_usdc: config.limitUsdc,
      duration_days: config.durationDays || 7,
      encrypted_session_key: encrypted.encryptedData,
      nonce: encrypted.nonce,
      session_public_key: keypair.publicKey.toBase58(),
      device_fingerprint: fingerprint,
    });

    this.sessionKeyId = response.session_key_id;
    this.sessionWallet = response.session_wallet;

    // Cache the keypair
    if (this.config.cache) {
      await this.config.cache.getCached(
        this.sessionKeyId,
        async () => keypair,
        { deviceFingerprint: fingerprint }
      );
    }

    // Handle funding
    if (config.onApprovalNeeded) {
      // Custom approval handler
      const topupResponse = await this.client.sessionKeys.topUp(
        this.sessionKeyId,
        {
          user_wallet: config.userWallet,
          amount_usdc: config.limitUsdc,
          device_fingerprint: fingerprint,
        }
      );

      await config.onApprovalNeeded(topupResponse.top_up_transaction);
    }

    return {
      sessionKeyId: this.sessionKeyId,
      sessionWallet: this.sessionWallet,
    };
  }

  /**
   * Make a payment using the session key
   * Auto-handles caching, PIN prompts, and signing
   */
  async pay(
    amount: number,
    description: string
  ): Promise<PaymentResult> {
    if (!this.sessionKeyId) {
      throw new Error('No active session key. Call createAndFund() first.');
    }

    // Try to get cached keypair
    let keypair: any;

    if (this.config.cache) {
      keypair = await this.config.cache.getCached(
        this.sessionKeyId,
        async () => {
          // Cache miss - decrypt with PIN
          const pin = this.config.pinProvider
            ? await this.config.pinProvider()
            : await this.promptForPIN('Enter PIN to sign payment');

          return await this.decryptKeypair(pin);
        },
        { deviceFingerprint: this.deviceFingerprint || undefined }
      );
    } else {
      // No cache - always prompt for PIN
      const pin = this.config.pinProvider
        ? await this.config.pinProvider()
        : await this.promptForPIN('Enter PIN to sign payment');

      keypair = await this.decryptKeypair(pin);
    }

    // Create payment with session key
    const paymentResponse = await this.client.smart.execute({
      user_wallet: this.sessionWallet!, // Session wallet, not user wallet
      amount_usd: amount,
      description,
      agent_id: 'session-lifecycle',
      auto_detect_gasless: true,
    });

    // If requires signature (device-bound), sign locally
    if (paymentResponse.requires_signature && paymentResponse.unsigned_transaction) {
      // Import Solana web3
      const { Transaction } = await this.getSolanaWeb3();

      // Deserialize and sign
      const txBuffer = Uint8Array.from(atob(paymentResponse.unsigned_transaction), c => c.charCodeAt(0));
      const tx = Transaction.from(txBuffer);
      tx.partialSign(keypair);

      // Submit signed transaction
      const submitUrl = paymentResponse.submit_url || `/api/v1/ai/payments/${paymentResponse.payment_id}/submit-signed`;
      const submitResponse = await fetch(`${this.client['config'].baseURL}${submitUrl}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.client['config'].apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signed_transaction: btoa(String.fromCharCode(...tx.serialize())),
        }),
      });

      if (!submitResponse.ok) {
        throw new Error(`Failed to submit signed transaction: ${submitResponse.statusText}`);
      }

      const submitData = await submitResponse.json();

      return {
        paymentId: paymentResponse.payment_id,
        status: submitData.status,
        signature: submitData.transaction_signature,
        confirmedInMs: submitData.confirmed_in_ms,
      };
    }

    // Auto-signed (custodial or autonomous)
    return {
      paymentId: paymentResponse.payment_id,
      status: paymentResponse.status,
      signature: paymentResponse.transaction_signature,
      confirmedInMs: paymentResponse.confirmed_in_ms,
    };
  }

  /**
   * Check session key status
   */
  async getStatus(): Promise<SessionKeyStatus> {
    if (!this.sessionKeyId) {
      throw new Error('No active session key');
    }

    return await this.client.sessionKeys.getStatus(this.sessionKeyId);
  }

  /**
   * Top up session key
   */
  async topUp(amount: number, userWallet: string, onApprovalNeeded?: (tx: string) => Promise<void>): Promise<void> {
    if (!this.sessionKeyId || !this.deviceFingerprint) {
      throw new Error('No active session key');
    }

    const response = await this.client.sessionKeys.topUp(
      this.sessionKeyId,
      {
        user_wallet: userWallet,
        amount_usdc: amount,
        device_fingerprint: this.deviceFingerprint,
      }
    );

    if (onApprovalNeeded) {
      await onApprovalNeeded(response.top_up_transaction);
    }
  }

  /**
   * Revoke session key
   */
  async revoke(): Promise<void> {
    if (!this.sessionKeyId) {
      throw new Error('No active session key');
    }

    await this.client.sessionKeys.revoke(this.sessionKeyId);

    await this.cleanup();
  }

  /**
   * Cleanup (clear cache, reset state)
   */
  async cleanup(): Promise<void> {
    if (this.config.cache && this.sessionKeyId) {
      await this.config.cache.invalidate(this.sessionKeyId);
    }

    this.sessionKeyId = null;
    this.sessionWallet = null;
    this.encryptedKey = null;
    this.deviceFingerprint = null;
  }

  /**
   * Get current session key ID
   */
  getSessionKeyId(): string | null {
    return this.sessionKeyId;
  }

  /**
   * Check if session is active
   */
  isActive(): boolean {
    return this.sessionKeyId !== null;
  }

  // ============================================
  // Private Helpers
  // ============================================

  private async decryptKeypair(pin: string): Promise<any> {
    if (!this.encryptedKey || !this.deviceFingerprint) {
      throw new Error('No encrypted key available');
    }

    const { SessionKeyCrypto } = await import('../device-bound-crypto');

    const encrypted = {
      encryptedData: this.encryptedKey.ciphertext,
      nonce: this.encryptedKey.nonce,
      publicKey: '', // Not needed for decryption
      deviceFingerprint: this.deviceFingerprint,
      version: 'argon2id-aes256gcm-v1' as const,
    };

    return await SessionKeyCrypto.decrypt(encrypted, pin, this.deviceFingerprint);
  }

  private async generateDeviceFingerprint(): Promise<string> {
    const { DeviceFingerprintGenerator } = await import('../device-bound-crypto');
    const fingerprint = await DeviceFingerprintGenerator.generate();
    return fingerprint.fingerprint;
  }

  private async promptForPIN(message: string): Promise<string> {
    // Simple browser prompt (can be overridden by pinProvider)
    if (typeof window !== 'undefined' && window.prompt) {
      const pin = window.prompt(message);
      if (!pin) {
        throw new Error('PIN required');
      }
      return pin;
    }
    throw new Error('PIN provider not configured and no browser prompt available');
  }

  private async getSolanaWeb3(): Promise<any> {
    // Dynamically import to avoid forcing dependency
    try {
      return await import('@solana/web3.js');
    } catch {
      throw new Error('@solana/web3.js not installed. Install it to use device-bound payments.');
    }
  }
}

/**
 * Quick setup function for common use case
 */
export async function setupQuickSessionKey(
  client: ZendFiClient,
  config: {
    userWallet: string;
    agentId: string;
    budgetUsdc: number;
    onApproval: (tx: string) => Promise<string>;
  }
): Promise<SessionKeyLifecycle> {
  const { SessionKeyCache } = await import('./cache');

  const lifecycle = new SessionKeyLifecycle(client, {
    cache: new SessionKeyCache({ storage: 'localStorage', ttl: 3600000 }),
    autoCleanup: true,
  });

  await lifecycle.createAndFund({
    userWallet: config.userWallet,
    agentId: config.agentId,
    limitUsdc: config.budgetUsdc,
    onApprovalNeeded: config.onApproval,
  });

  return lifecycle;
}
