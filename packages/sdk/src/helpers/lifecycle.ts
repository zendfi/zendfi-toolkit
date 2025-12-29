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
   * Handles: keypair generation → encryption → backend registration
   * Note: The SDK now handles all crypto internally
   */
  async createAndFund(config: CreateAndFundConfig): Promise<{
    sessionKeyId: string;
    sessionWallet: string;
  }> {
    // Get PIN
    const pin = this.config.pinProvider
      ? await this.config.pinProvider()
      : await this.promptForPIN('Create PIN for session key');

    // The new SDK handles everything: keypair generation, encryption, and backend registration
    const response = await this.client.sessionKeys.create({
      userWallet: config.userWallet,
      agentId: config.agentId,
      agentName: config.agentName,
      limitUSDC: config.limitUsdc,
      durationDays: config.durationDays || 7,
      pin, // SDK handles encryption internally
      generateRecoveryQR: false,
    });

    this.sessionKeyId = response.sessionKeyId;
    this.sessionWallet = response.sessionWallet;

    // The SDK now caches internally after create() - session key is auto-unlocked
    // No need to call unlock() separately since we just created it with PIN

    // Note: The new device-bound session keys don't need separate funding
    // The user funds the session wallet directly after creation
    if (config.onApprovalNeeded) {
      // Signal that approval/funding is needed
      // The developer should handle funding the session wallet externally
      await config.onApprovalNeeded(`Fund session wallet: ${this.sessionWallet}`);
    }

    return {
      sessionKeyId: this.sessionKeyId,
      sessionWallet: this.sessionWallet,
    };
  }

  /**
   * Make a payment using the session key
   * Uses the new SDK's makePayment which handles caching internally
   */
  async pay(
    amount: number,
    description: string
  ): Promise<PaymentResult> {
    if (!this.sessionKeyId || !this.sessionWallet) {
      throw new Error('No active session key. Call createAndFund() first.');
    }

    // Get PIN if not cached
    const pin = this.config.pinProvider
      ? await this.config.pinProvider()
      : undefined;

    // Use the new SDK's makePayment
    const result = await this.client.sessionKeys.makePayment({
      sessionKeyId: this.sessionKeyId,
      amount,
      recipient: this.sessionWallet,
      description,
      pin, // SDK will only use PIN if needed
    });

    return {
      paymentId: result.paymentId,
      status: result.status,
      signature: result.signature,
    };
  }

  /**
   * Check session key status
   */
  async getStatus(): Promise<{
    sessionKeyId: string;
    isActive: boolean;
    isApproved: boolean;
    limitUsdc: number;
    usedAmountUsdc: number;
    remainingUsdc: number;
    expiresAt: string;
    daysUntilExpiry: number;
  }> {
    if (!this.sessionKeyId) {
      throw new Error('No active session key');
    }

    return await this.client.sessionKeys.getStatus(this.sessionKeyId);
  }

  /**
   * Top up session key
   * @deprecated Device-bound session keys are funded directly by the user.
   * Use the session wallet address to send funds directly.
   */
  async topUp(_amount: number, _userWallet: string, _onApprovalNeeded?: (tx: string) => Promise<void>): Promise<void> {
    if (!this.sessionWallet) {
      throw new Error('No active session key');
    }

    console.warn(
      'topUp() is deprecated for device-bound session keys. ' +
      `Send funds directly to the session wallet: ${this.sessionWallet}`
    );
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

    // Clear cache on the SDK side too
    if (this.sessionKeyId) {
      this.client.sessionKeys.clearCache(this.sessionKeyId);
    }

    this.sessionKeyId = null;
    this.sessionWallet = null;
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
