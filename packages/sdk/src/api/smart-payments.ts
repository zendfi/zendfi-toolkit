/**
 * Smart Payments API - AI-powered payment routing
 * 
 * Smart payments combine multiple features into a single intelligent API:
 * - Automatic PPP pricing adjustments
 * - Gasless transaction detection
 * - Instant settlement options
 * - Escrow integration
 * - Receipt generation
 * 
 * @example
 * ```typescript
 * const result = await zendfi.payments.smart({
 *   agent_id: 'shopping-assistant',
 *   user_wallet: 'Hx7B...abc',
 *   amount_usd: 50,
 *   auto_detect_gasless: true,
 *   description: 'Premium subscription',
 * });
 * 
 * console.log(`Payment: ${result.payment_id}`);
 * console.log(`Receipt: ${result.receipt_url}`);
 * ```
 */

import type {
  SmartPaymentRequest,
  SmartPaymentResponse,
} from '../types';

export type RequestFn = <T>(method: string, endpoint: string, data?: any) => Promise<T>;

export class SmartPaymentsAPI {
  constructor(private request: RequestFn) {}

  /**
   * Execute an AI-powered smart payment
   * 
   * Smart payments analyze the context and automatically apply optimizations:
   * - **PPP Pricing**: Auto-adjusts based on customer location
   * - **Gasless**: Detects when user needs gas subsidization
   * - **Instant Settlement**: Optional immediate merchant payout
   * - **Escrow**: Optional fund holding for service delivery
   * 
   * @param request - Smart payment request configuration
   * @returns Payment result with status and receipt
   * 
   * @example
   * ```typescript
   * // Basic smart payment
   * const result = await zendfi.payments.smart({
   *   agent_id: 'my-agent',
   *   user_wallet: 'Hx7B...abc',
   *   amount_usd: 99.99,
   *   description: 'Annual Pro Plan',
   * });
   * 
   * // With all options
   * const result = await zendfi.payments.smart({
   *   agent_id: 'my-agent',
   *   session_token: 'zai_session_...', // For limit enforcement
   *   user_wallet: 'Hx7B...abc',
   *   amount_usd: 99.99,
   *   token: 'USDC',
   *   auto_detect_gasless: true,
   *   instant_settlement: true,
   *   enable_escrow: false,
   *   description: 'Annual Pro Plan',
   *   product_details: {
   *     name: 'Pro Plan',
   *     sku: 'PRO-ANNUAL',
   *   },
   *   metadata: {
   *     user_id: 'usr_123',
   *   },
   * });
   * 
   * if (result.requires_signature) {
   *   // Device-bound flow: need user to sign
   *   console.log('Please sign:', result.unsigned_transaction);
   *   console.log('Submit to:', result.submit_url);
   * } else {
   *   // Auto-signed (custodial or autonomous delegate)
   *   console.log('Payment complete:', result.transaction_signature);
   * }
   * ```
   */
  async execute(request: SmartPaymentRequest): Promise<SmartPaymentResponse> {
    return this.request<SmartPaymentResponse>('POST', '/api/v1/ai/smart-payment', {
      session_token: request.session_token,
      agent_id: request.agent_id,
      user_wallet: request.user_wallet,
      amount_usd: request.amount_usd,
      merchant_id: request.merchant_id,
      token: request.token || 'USDC',
      auto_detect_gasless: request.auto_detect_gasless,
      instant_settlement: request.instant_settlement,
      enable_escrow: request.enable_escrow,
      description: request.description,
      product_details: request.product_details,
      metadata: request.metadata,
    });
  }

  /**
   * Submit a signed transaction from device-bound flow
   * 
   * When a smart payment returns `requires_signature: true`, the client
   * must sign the transaction and submit it here.
   * 
   * @param paymentId - UUID of the payment
   * @param signedTransaction - Base64 encoded signed transaction
   * @returns Updated payment response
   * 
   * @example
   * ```typescript
   * // After user signs the transaction
   * const result = await zendfi.payments.submitSigned(
   *   payment.payment_id,
   *   signedTransaction
   * );
   * 
   * console.log(`Confirmed in ${result.confirmed_in_ms}ms`);
   * ```
   */
  async submitSigned(
    paymentId: string,
    signedTransaction: string
  ): Promise<SmartPaymentResponse> {
    return this.request<SmartPaymentResponse>(
      'POST',
      `/api/v1/ai/payments/${paymentId}/submit-signed`,
      {
        signed_transaction: signedTransaction,
      }
    );
  }
}
