/**
 * Autonomy API - Enable autonomous agent signing
 * 
 * The Autonomy API enables AI agents to make payments without user interaction
 * for each transaction, while maintaining cryptographic security through:
 * 
 * 1. **Delegation Signatures** - User signs a message authorizing the agent
 * 2. **Spending Limits** - Hard caps on total spending
 * 3. **Time Bounds** - Automatic expiration
 * 4. **Lit Protocol** (optional) - Threshold cryptography for key management
 * 
 * @example
 * ```typescript
 * // Enable autonomous mode for a session key
 * const delegate = await zendfi.autonomy.enable({
 *   session_key_id: 'sk_123...',
 *   max_amount_usd: 100,
 *   duration_hours: 24,
 *   delegation_signature: signature, // Ed25519 sig from user
 * });
 * 
 * // Agent can now make payments automatically
 * console.log(`Delegate active: $${delegate.max_amount_usd} limit`);
 * ```
 */

import type {
  EnableAutonomyRequest,
  EnableAutonomyResponse,
  RevokeAutonomyRequest,
  AutonomyStatus,
} from '../types';

export type RequestFn = <T>(method: string, endpoint: string, data?: any) => Promise<T>;

export class AutonomyAPI {
  constructor(private request: RequestFn) {}

  /**
   * Enable autonomous signing for a session key
   * 
   * This grants an AI agent the ability to sign transactions on behalf of
   * the user, up to the specified spending limit and duration.
   * 
   * **Prerequisites:**
   * 1. Create a device-bound session key first
   * 2. Generate a delegation signature (see `createDelegationMessage`)
   * 3. Optionally encrypt keypair with Lit Protocol for true autonomy
   * 
   * @param sessionKeyId - UUID of the session key
   * @param request - Autonomy configuration including delegation signature
   * @returns The created autonomous delegate
   * 
   * @example
   * ```typescript
   * // The user must sign this exact message format
   * const message = zendfi.autonomy.createDelegationMessage(
   *   sessionKeyId, 100, '2024-12-10T00:00:00Z'
   * );
   * 
   * // Have user sign with their session key
   * const signature = await signWithSessionKey(message, pin);
   * 
   * // Enable autonomous mode
   * const delegate = await zendfi.autonomy.enable(sessionKeyId, {
   *   max_amount_usd: 100,
   *   duration_hours: 24,
   *   delegation_signature: signature,
   * });
   * 
   * console.log(`Delegate ID: ${delegate.delegate_id}`);
   * console.log(`Expires: ${delegate.expires_at}`);
   * ```
   */
  async enable(
    sessionKeyId: string,
    request: EnableAutonomyRequest
  ): Promise<EnableAutonomyResponse> {
    return this.request<EnableAutonomyResponse>(
      'POST',
      `/api/v1/ai/session-keys/${sessionKeyId}/enable-autonomy`,
      {
        max_amount_usd: request.max_amount_usd,
        duration_hours: request.duration_hours,
        delegation_signature: request.delegation_signature,
        expires_at: request.expires_at,
        lit_encrypted_keypair: request.lit_encrypted_keypair,
        lit_data_hash: request.lit_data_hash,
        metadata: request.metadata,
      }
    );
  }

  /**
   * Revoke autonomous mode for a session key
   * 
   * Immediately invalidates the autonomous delegate, preventing any further
   * automatic payments. The session key itself remains valid for manual use.
   * 
   * @param sessionKeyId - UUID of the session key
   * @param reason - Optional reason for revocation (logged for audit)
   * 
   * @example
   * ```typescript
   * await zendfi.autonomy.revoke('sk_123...', 'User requested revocation');
   * console.log('Autonomous mode disabled');
   * ```
   */
  async revoke(sessionKeyId: string, reason?: string): Promise<void> {
    const request: RevokeAutonomyRequest = { reason };
    await this.request<{ success: boolean }>(
      'POST',
      `/api/v1/ai/session-keys/${sessionKeyId}/revoke-autonomy`,
      request
    );
  }

  /**
   * Get autonomy status for a session key
   * 
   * Returns whether autonomous mode is enabled and details about the
   * active delegate including remaining spending allowance.
   * 
   * @param sessionKeyId - UUID of the session key
   * @returns Autonomy status with delegate details
   * 
   * @example
   * ```typescript
   * const status = await zendfi.autonomy.getStatus('sk_123...');
   * 
   * if (status.autonomous_mode_enabled && status.delegate) {
   *   console.log(`Remaining: $${status.delegate.remaining_usd}`);
   *   console.log(`Expires: ${status.delegate.expires_at}`);
   * } else {
   *   console.log('Autonomous mode not enabled');
   * }
   * ```
   */
  async getStatus(sessionKeyId: string): Promise<AutonomyStatus> {
    return this.request<AutonomyStatus>(
      'GET',
      `/api/v1/ai/session-keys/${sessionKeyId}/autonomy-status`
    );
  }

  /**
   * Create the delegation message that needs to be signed
   * 
   * This generates the exact message format required for the delegation
   * signature. The user must sign this message with their session key.
   * 
   * **Message format:**
   * ```
   * I authorize autonomous delegate for session {id} to spend up to ${amount} until {expiry}
   * ```
   * 
   * @param sessionKeyId - UUID of the session key
   * @param maxAmountUsd - Maximum spending amount in USD
   * @param expiresAt - ISO 8601 expiration timestamp
   * @returns The message to be signed
   * 
   * @example
   * ```typescript
   * const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
   * const message = zendfi.autonomy.createDelegationMessage(
   *   'sk_123...',
   *   100,
   *   expiresAt
   * );
   * // => "I authorize autonomous delegate for session sk_123... to spend up to $100 until 2024-12-06T..."
   * 
   * // Sign with nacl.sign.detached() or similar
   * const signature = signMessage(message, keypair);
   * ```
   */
  createDelegationMessage(
    sessionKeyId: string,
    maxAmountUsd: number,
    expiresAt: string
  ): string {
    return `I authorize autonomous delegate for session ${sessionKeyId} to spend up to $${maxAmountUsd} until ${expiresAt}`;
  }

  /**
   * Validate delegation signature parameters
   * 
   * Helper method to check if autonomy parameters are valid before
   * making the API call.
   * 
   * @param request - The enable autonomy request to validate
   * @throws Error if validation fails
   * 
   * @example
   * ```typescript
   * try {
   *   zendfi.autonomy.validateRequest(request);
   *   const delegate = await zendfi.autonomy.enable(sessionKeyId, request);
   * } catch (error) {
   *   console.error('Invalid request:', error.message);
   * }
   * ```
   */
  validateRequest(request: EnableAutonomyRequest): void {
    if (request.max_amount_usd <= 0) {
      throw new Error('max_amount_usd must be positive');
    }

    if (request.duration_hours < 1 || request.duration_hours > 168) {
      throw new Error('duration_hours must be between 1 and 168 (7 days)');
    }

    if (!request.delegation_signature || request.delegation_signature.length === 0) {
      throw new Error('delegation_signature is required');
    }

    // Basic base64 validation
    const base64Regex = /^[A-Za-z0-9+/]+=*$/;
    if (!base64Regex.test(request.delegation_signature)) {
      throw new Error('delegation_signature must be base64 encoded');
    }
  }

  /**
   * Get spending attestations for a delegate (audit trail)
   * 
   * Returns all cryptographically signed attestations ZendFi created for
   * this delegate. Each attestation contains:
   * - The spending state at the time of payment
   * - ZendFi's Ed25519 signature
   * - Timestamp and nonce (for replay protection)
   * 
   * These attestations can be independently verified using ZendFi's public key
   * to confirm spending limit enforcement was applied correctly.
   * 
   * @param delegateId - UUID of the autonomous delegate
   * @returns Attestation audit response with all signed attestations
   * 
   * @example
   * ```typescript
   * const audit = await zendfi.autonomy.getAttestations('delegate_123...');
   * 
   * console.log(`Found ${audit.attestation_count} attestations`);
   * console.log(`ZendFi public key: ${audit.zendfi_attestation_public_key}`);
   * 
   * // Verify each attestation independently
   * for (const signed of audit.attestations) {
   *   console.log(`Payment ${signed.attestation.payment_id}:`);
   *   console.log(`  Requested: $${signed.attestation.requested_usd}`);
   *   console.log(`  Remaining after: $${signed.attestation.remaining_after_usd}`);
   *   // Verify signature with nacl.sign.detached.verify()
   * }
   * ```
   */
  async getAttestations(delegateId: string): Promise<AttestationAuditResponse> {
    return this.request<AttestationAuditResponse>(
      'GET',
      `/api/v1/ai/delegates/${delegateId}/attestations`
    );
  }
}

/** Spending attestation - ZendFi's signed commitment to spending state */
export interface SpendingAttestation {
  delegate_id: string;
  session_key_id: string;
  merchant_id: string;
  spent_usd: number;
  limit_usd: number;
  requested_usd: number;
  remaining_after_usd: number;
  timestamp_ms: number;
  nonce: string;
  payment_id: string;
  version: number;
}

/** Signed attestation with ZendFi's cryptographic signature */
export interface SignedSpendingAttestation {
  attestation: SpendingAttestation;
  /** Base64-encoded Ed25519 signature */
  signature: string;
  /** Base58-encoded ZendFi public key */
  signer_public_key: string;
}

/** Response from the attestation audit endpoint */
export interface AttestationAuditResponse {
  delegate_id: string;
  attestation_count: number;
  attestations: SignedSpendingAttestation[];
  /** ZendFi's attestation public key for independent verification */
  zendfi_attestation_public_key: string | null;
}
