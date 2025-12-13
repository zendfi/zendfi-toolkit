/**
 * Session Keys API - On-chain funded session wallets
 * 
 * Session keys are dedicated wallets funded by users for AI agents to use.
 * Two modes are supported:
 * 
 * 1. **Custodial Mode**: Backend generates and stores the keypair (simpler)
 * 2. **Device-Bound Mode**: Client generates keypair and encrypts with PIN (more secure)
 * 
 * @example
 * ```typescript
 * // Create a custodial session key
 * const result = await zendfi.sessionKeys.create({
 *   user_wallet: 'Hx7B...abc',
 *   limit_usdc: 100,
 *   duration_days: 7,
 *   device_fingerprint: await getDeviceFingerprint(),
 * });
 * 
 * // User signs the approval transaction in their wallet
 * const signedTx = await wallet.signTransaction(result.approval_transaction);
 * 
 * // Submit the signed transaction
 * await zendfi.sessionKeys.submitApproval({
 *   session_key_id: result.session_key_id,
 *   signed_transaction: signedTx,
 * });
 * 
 * // Check status
 * const status = await zendfi.sessionKeys.getStatus(result.session_key_id);
 * console.log(`Remaining: $${status.remaining_usdc}`);
 * ```
 */

import type {
  CreateSessionKeyRequest,
  CreateSessionKeyResponse,
  CreateDeviceBoundSessionKeyRequest,
  CreateDeviceBoundSessionKeyResponse,
  SessionKeyStatus,
  TopUpSessionKeyRequest,
  TopUpSessionKeyResponse,
  SubmitSignedTransactionRequest,
  SubmitTransactionResponse,
  SessionKeyListResponse,
} from '../types';

export type RequestFn = <T>(method: string, endpoint: string, data?: any) => Promise<T>;

export class SessionKeysAPI {
  constructor(private request: RequestFn) {}

  // ============================================
  // Custodial Session Keys
  // ============================================

  /**
   * Create a custodial session key
   * 
   * The backend generates and securely stores the keypair.
   * Returns an approval transaction that the user must sign to fund the session wallet.
   * 
   * @param request - Session key configuration
   * @returns Creation response with approval transaction
   * 
   * @example
   * ```typescript
   * // Basic creation
   * const result = await zendfi.sessionKeys.create({
   *   user_wallet: 'Hx7B...abc',
   *   limit_usdc: 100,
   *   duration_days: 7,
   *   device_fingerprint: deviceFingerprint,
   * });
   * 
   * // Create with linked session for policy enforcement
   * const result = await zendfi.sessionKeys.create({
   *   user_wallet: 'Hx7B...abc',
   *   limit_usdc: 500,
   *   duration_days: 7,
   *   device_fingerprint: deviceFingerprint,
   *   link_session_id: session.id,  // Links to existing session
   * });
   * 
   * console.log(`Session key: ${result.session_key_id}`);
   * console.log('Please sign the approval transaction');
   * ```
   */
  async create(request: CreateSessionKeyRequest): Promise<CreateSessionKeyResponse> {
    return this.request<CreateSessionKeyResponse>('POST', '/api/v1/ai/session-keys/create', {
      user_wallet: request.user_wallet,
      limit_usdc: request.limit_usdc,
      duration_days: request.duration_days ?? 7,
      device_fingerprint: request.device_fingerprint,
      link_session_id: request.link_session_id,
      link_session_token: request.link_session_token,
    });
  }

  // ============================================
  // Device-Bound Session Keys (Non-Custodial)
  // ============================================

  /**
   * Create a device-bound session key (non-custodial)
   * 
   * The client generates the keypair and encrypts it with a PIN before sending.
   * The backend cannot decrypt the keypair - only the user's device can.
   * 
   * @param request - Device-bound session key configuration
   * @returns Creation response with session wallet address
   * 
   * @example
   * ```typescript
   * // Generate keypair client-side
   * const keypair = Keypair.generate();
   * 
   * // Encrypt with PIN
   * const encrypted = await encryptWithPin(keypair.secretKey, pin);
   * 
   * const result = await zendfi.sessionKeys.createDeviceBound({
   *   user_wallet: 'Hx7B...abc',
   *   limit_usdc: 100,
   *   duration_days: 7,
   *   encrypted_session_key: encrypted.ciphertext,
   *   nonce: encrypted.nonce,
   *   session_public_key: keypair.publicKey.toBase58(),
   *   device_fingerprint: deviceFingerprint,
   * });
   * 
   * console.log(`Session wallet: ${result.session_wallet}`);
   * ```
   */
  async createDeviceBound(
    request: CreateDeviceBoundSessionKeyRequest
  ): Promise<CreateDeviceBoundSessionKeyResponse> {
    return this.request<CreateDeviceBoundSessionKeyResponse>(
      'POST',
      '/api/v1/ai/session-keys/device-bound/create',
      {
        user_wallet: request.user_wallet,
        limit_usdc: request.limit_usdc,
        duration_days: request.duration_days,
        encrypted_session_key: request.encrypted_session_key,
        nonce: request.nonce,
        session_public_key: request.session_public_key,
        device_fingerprint: request.device_fingerprint,
        recovery_qr_data: request.recovery_qr_data,
      }
    );
  }

  /**
   * Get encrypted session key for device-bound mode
   * 
   * Retrieves the encrypted keypair so the client can decrypt it with their PIN.
   * The device fingerprint must match the one used during creation.
   * 
   * @param sessionKeyId - UUID of the session key
   * @param deviceFingerprint - Current device fingerprint
   * @returns Encrypted key data
   */
  async getEncrypted(
    sessionKeyId: string,
    deviceFingerprint: string
  ): Promise<{
    encrypted_session_key: string;
    nonce: string;
    device_fingerprint_valid: boolean;
  }> {
    return this.request('POST', '/api/v1/ai/session-keys/device-bound/get-encrypted', {
      session_key_id: sessionKeyId,
      device_fingerprint: deviceFingerprint,
    });
  }

  // ============================================
  // Transaction Submission
  // ============================================

  /**
   * Submit a signed approval transaction
   * 
   * After the user signs the approval transaction from `create()`,
   * submit it here to activate the session key.
   * 
   * @param request - Signed transaction data
   * @returns Submission result with signature
   * 
   * @example
   * ```typescript
   * const result = await zendfi.sessionKeys.submitApproval({
   *   session_key_id: sessionKeyId,
   *   signed_transaction: signedTxBase64,
   * });
   * 
   * console.log(`Approved! Signature: ${result.signature}`);
   * ```
   */
  async submitApproval(
    request: SubmitSignedTransactionRequest & { session_key_id: string }
  ): Promise<SubmitTransactionResponse> {
    return this.request<SubmitTransactionResponse>(
      'POST',
      '/api/v1/ai/session-keys/submit-approval',
      {
        session_key_id: request.session_key_id,
        signed_transaction: request.signed_transaction,
      }
    );
  }

  /**
   * Submit a signed top-up transaction
   * 
   * After the user signs the top-up transaction from `topUp()`,
   * submit it here to add funds.
   * 
   * @param sessionKeyId - UUID of the session key
   * @param signedTransaction - Base64 encoded signed transaction
   * @returns Submission result with new limit
   */
  async submitTopUp(
    sessionKeyId: string,
    signedTransaction: string
  ): Promise<SubmitTransactionResponse> {
    return this.request<SubmitTransactionResponse>(
      'POST',
      `/api/v1/ai/session-keys/${sessionKeyId}/submit-top-up`,
      {
        signed_transaction: signedTransaction,
      }
    );
  }

  // ============================================
  // Status & Management
  // ============================================

  /**
   * Get session key status
   * 
   * @param sessionKeyId - UUID of the session key
   * @returns Current status with remaining balance
   * 
   * @example
   * ```typescript
   * const status = await zendfi.sessionKeys.getStatus(sessionKeyId);
   * 
   * console.log(`Active: ${status.is_active}`);
   * console.log(`Limit: $${status.limit_usdc}`);
   * console.log(`Used: $${status.used_amount_usdc}`);
   * console.log(`Remaining: $${status.remaining_usdc}`);
   * console.log(`Expires in ${status.days_until_expiry} days`);
   * ```
   */
  async getStatus(sessionKeyId: string): Promise<SessionKeyStatus> {
    return this.request<SessionKeyStatus>('POST', '/api/v1/ai/session-keys/status', {
      session_key_id: sessionKeyId,
    });
  }

  /**
   * List all session keys for the merchant
   * 
   * @returns List of session keys with stats
   * 
   * @example
   * ```typescript
   * const { session_keys, stats } = await zendfi.sessionKeys.list();
   * 
   * console.log(`Total keys: ${stats.total_keys}`);
   * console.log(`Active: ${stats.active_keys}`);
   * 
   * session_keys.forEach(key => {
   *   console.log(`${key.session_key_id}: $${key.remaining_usdc} remaining`);
   * });
   * ```
   */
  async list(): Promise<SessionKeyListResponse> {
    return this.request<SessionKeyListResponse>('GET', '/api/v1/ai/session-keys/list');
  }

  /**
   * Top up a session key with additional funds
   * 
   * Returns a transaction that the user must sign to add funds.
   * 
   * @param sessionKeyId - UUID of the session key
   * @param request - Top-up configuration
   * @returns Top-up transaction to sign
   * 
   * @example
   * ```typescript
   * const topUp = await zendfi.sessionKeys.topUp(sessionKeyId, {
   *   user_wallet: 'Hx7B...abc',
   *   amount_usdc: 50,
   *   device_fingerprint: deviceFingerprint,
   * });
   * 
   * console.log(`Adding $${topUp.added_amount}`);
   * console.log(`New limit will be: $${topUp.new_limit}`);
   * 
   * // User signs the transaction
   * const signedTx = await wallet.signTransaction(topUp.top_up_transaction);
   * 
   * // Submit it
   * await zendfi.sessionKeys.submitTopUp(sessionKeyId, signedTx);
   * ```
   */
  async topUp(
    sessionKeyId: string,
    request: TopUpSessionKeyRequest
  ): Promise<TopUpSessionKeyResponse> {
    return this.request<TopUpSessionKeyResponse>(
      'POST',
      `/api/v1/ai/session-keys/${sessionKeyId}/top-up`,
      {
        user_wallet: request.user_wallet,
        amount_usdc: request.amount_usdc,
        device_fingerprint: request.device_fingerprint,
      }
    );
  }

  /**
   * Revoke a session key
   * 
   * Immediately deactivates the session key. Any remaining funds
   * are refunded to the user's wallet.
   * 
   * @param sessionKeyId - UUID of the session key
   * @returns Revocation result with optional refund details
   * 
   * @example
   * ```typescript
   * const result = await zendfi.sessionKeys.revoke(sessionKeyId);
   * 
   * console.log('Session key revoked');
   * if (result.refund?.refunded) {
   *   console.log(`Refunded: ${result.refund.transaction_signature}`);
   * }
   * ```
   */
  async revoke(sessionKeyId: string): Promise<{
    message: string;
    session_key_id: string;
    note: string;
    refund?: {
      refunded: boolean;
      transaction_signature: string;
      message: string;
    };
  }> {
    return this.request('POST', '/api/v1/ai/session-keys/revoke', {
      session_key_id: sessionKeyId,
    });
  }

  // ============================================
  // Session Linking
  // ============================================

  /**
   * Link a session key to an AI session for policy enforcement
   * 
   * When linked, payments through this session key will check both:
   * 1. Session key balance (hard cap)
   * 2. AI session limits (per-tx, daily, weekly, monthly)
   * 
   * This provides defense-in-depth: the session key provides signing
   * capability while the session enforces granular spending policies.
   * 
   * @param sessionKeyId - UUID of the session key
   * @param sessionId - UUID of the AI session to link
   * @returns Updated session key status
   * 
   * @example
   * ```typescript
   * // Create a session with limits
   * const session = await zendfi.agent.createSession({
   *   agent_id: 'shopping-bot',
   *   user_wallet: userWallet,
   *   limits: {
   *     max_per_transaction: 25,
   *     max_per_day: 100,
   *   },
   *   duration_hours: 24,
   * });
   * 
   * // Create and fund a session key
   * const key = await zendfi.sessionKeys.create({
   *   user_wallet: userWallet,
   *   limit_usdc: 500,  // Fund with $500
   *   duration_days: 7,
   *   device_fingerprint: fp,
   * });
   * 
   * // Link them together
   * await zendfi.sessionKeys.linkSession(key.session_key_id, session.id);
   * 
   * // Now payments will:
   * // - Be limited to $25 per transaction (session policy)
   * // - Be limited to $100 per day (session policy)
   * // - Never exceed $500 total (session key balance)
   * ```
   */
  async linkSession(
    sessionKeyId: string,
    sessionId: string
  ): Promise<{
    success: boolean;
    session_key_id: string;
    linked_session_id: string;
    message: string;
  }> {
    return this.request('POST', `/api/v1/ai/session-keys/${sessionKeyId}/link-session`, {
      session_id: sessionId,
    });
  }

  /**
   * Unlink a session key from its AI session
   * 
   * After unlinking, the session key will only be limited by its funded balance.
   * 
   * @param sessionKeyId - UUID of the session key
   * @returns Result of the unlink operation
   */
  async unlinkSession(sessionKeyId: string): Promise<{
    success: boolean;
    session_key_id: string;
    message: string;
  }> {
    return this.request('POST', `/api/v1/ai/session-keys/${sessionKeyId}/unlink-session`, {});
  }

  /**
   * Check if a payment amount is allowed
   * 
   * Checks both session key balance and linked session limits (if any).
   * Useful for pre-validating payments before attempting them.
   * 
   * @param sessionKeyId - UUID of the session key
   * @param amount - Amount in USD to check
   * @returns Whether the payment is allowed and the effective limit
   * 
   * @example
   * ```typescript
   * const check = await zendfi.sessionKeys.canAfford(keyId, 50);
   * 
   * if (check.allowed) {
   *   await zendfi.smart.execute({ ... });
   * } else {
   *   console.log(`Cannot afford: ${check.reason}`);
   *   console.log(`Effective limit: $${check.effective_limit}`);
   * }
   * ```
   */
  async canAfford(
    sessionKeyId: string,
    amount: number
  ): Promise<{
    allowed: boolean;
    reason?: string;
    effective_limit: number;
    session_key_remaining: number;
    session_remaining_today?: number;
  }> {
    return this.request('POST', `/api/v1/ai/session-keys/${sessionKeyId}/check-payment`, {
      amount,
    });
  }
}
