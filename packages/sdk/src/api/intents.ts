/**
 * Payment Intents API - Two-phase payment flow
 * 
 * Payment Intents provide a modern checkout experience with:
 * - Create intent first (reserves amount)
 * - Confirm when ready (completes payment)
 * - Cancel if needed (releases hold)
 * 
 * @example
 * ```typescript
 * // Step 1: Create intent when user starts checkout
 * const intent = await zendfi.intents.create({
 *   amount: 99.99,
 *   description: 'Premium subscription',
 * });
 * 
 * // Step 2: Show payment form, collect wallet
 * // ...
 * 
 * // Step 3: Confirm when user clicks "Pay"
 * const confirmed = await zendfi.intents.confirm(intent.id, {
 *   client_secret: intent.client_secret,
 *   customer_wallet: userWallet,
 * });
 * ```
 */

import type {
  PaymentIntent,
  CreatePaymentIntentRequest,
  ConfirmPaymentIntentRequest,
  PaymentIntentEvent,
} from '../types';

export type RequestFn = <T>(method: string, endpoint: string, data?: any) => Promise<T>;

export interface ListIntentsOptions {
  /** Filter by status */
  status?: string;
  /** Maximum results to return */
  limit?: number;
  /** Pagination offset */
  offset?: number;
}

export class PaymentIntentsAPI {
  constructor(private request: RequestFn) {}

  /**
   * Create a payment intent
   * 
   * This is step 1 of the two-phase payment flow. The intent reserves
   * the payment amount and provides a client_secret for confirmation.
   * 
   * @param request - Payment intent configuration
   * @returns The created payment intent with client_secret
   * 
   * @example
   * ```typescript
   * const intent = await zendfi.intents.create({
   *   amount: 49.99,
   *   description: 'Pro Plan - Monthly',
   *   capture_method: 'automatic', // or 'manual' for auth-only
   *   expires_in_seconds: 3600, // 1 hour
   * });
   * 
   * // Store intent.id and pass intent.client_secret to frontend
   * console.log(`Intent created: ${intent.id}`);
   * console.log(`Status: ${intent.status}`); // "requires_payment"
   * ```
   */
  async create(request: CreatePaymentIntentRequest): Promise<PaymentIntent> {
    return this.request<PaymentIntent>('POST', '/api/v1/payment-intents', {
      amount: request.amount,
      currency: request.currency || 'USD',
      description: request.description,
      capture_method: request.capture_method || 'automatic',
      agent_id: request.agent_id,
      agent_name: request.agent_name,
      metadata: request.metadata,
      expires_in_seconds: request.expires_in_seconds || 86400, // 24h default
    });
  }

  /**
   * Get a payment intent by ID
   * 
   * @param intentId - UUID of the payment intent
   * @returns The payment intent details
   * 
   * @example
   * ```typescript
   * const intent = await zendfi.intents.get('pi_123...');
   * console.log(`Status: ${intent.status}`);
   * if (intent.payment_id) {
   *   console.log(`Payment: ${intent.payment_id}`);
   * }
   * ```
   */
  async get(intentId: string): Promise<PaymentIntent> {
    return this.request<PaymentIntent>('GET', `/api/v1/payment-intents/${intentId}`);
  }

  /**
   * List payment intents
   * 
   * @param options - Filter and pagination options
   * @returns Array of payment intents
   * 
   * @example
   * ```typescript
   * // Get recent pending intents
   * const intents = await zendfi.intents.list({
   *   status: 'requires_payment',
   *   limit: 20,
   * });
   * ```
   */
  async list(options?: ListIntentsOptions): Promise<PaymentIntent[]> {
    const params = new URLSearchParams();
    if (options?.status) params.append('status', options.status);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await this.request<{ intents: PaymentIntent[] } | PaymentIntent[]>(
      'GET',
      `/api/v1/payment-intents${query}`
    );
    return Array.isArray(response) ? response : response.intents;
  }

  /**
   * Confirm a payment intent
   * 
   * This is step 2 of the two-phase payment flow. Confirmation triggers
   * the actual payment using the customer's wallet.
   * 
   * @param intentId - UUID of the payment intent
   * @param request - Confirmation details including customer wallet
   * @returns The confirmed payment intent with payment_id
   * 
   * @example
   * ```typescript
   * const confirmed = await zendfi.intents.confirm('pi_123...', {
   *   client_secret: 'pi_secret_abc...',
   *   customer_wallet: 'Hx7B...abc',
   *   auto_gasless: true,
   * });
   * 
   * if (confirmed.status === 'succeeded') {
   *   console.log(`Payment complete: ${confirmed.payment_id}`);
   * }
   * ```
   */
  async confirm(intentId: string, request: ConfirmPaymentIntentRequest): Promise<PaymentIntent> {
    return this.request<PaymentIntent>('POST', `/api/v1/payment-intents/${intentId}/confirm`, {
      client_secret: request.client_secret,
      customer_wallet: request.customer_wallet,
      payment_type: request.payment_type,
      auto_gasless: request.auto_gasless,
      metadata: request.metadata,
    });
  }

  /**
   * Cancel a payment intent
   * 
   * Canceling releases any hold on the payment amount. Cannot cancel
   * intents that are already processing or succeeded.
   * 
   * @param intentId - UUID of the payment intent
   * @returns The canceled payment intent
   * 
   * @example
   * ```typescript
   * const canceled = await zendfi.intents.cancel('pi_123...');
   * console.log(`Status: ${canceled.status}`); // "canceled"
   * ```
   */
  async cancel(intentId: string): Promise<PaymentIntent> {
    return this.request<PaymentIntent>('POST', `/api/v1/payment-intents/${intentId}/cancel`);
  }

  /**
   * Get events for a payment intent
   * 
   * Events track the full lifecycle of the intent, including creation,
   * confirmation attempts, and status changes.
   * 
   * @param intentId - UUID of the payment intent
   * @returns Array of events in chronological order
   * 
   * @example
   * ```typescript
   * const events = await zendfi.intents.getEvents('pi_123...');
   * events.forEach(event => {
   *   console.log(`${event.created_at}: ${event.event_type}`);
   * });
   * ```
   */
  async getEvents(intentId: string): Promise<PaymentIntentEvent[]> {
    const response = await this.request<{ events: PaymentIntentEvent[] } | PaymentIntentEvent[]>(
      'GET',
      `/api/v1/payment-intents/${intentId}/events`
    );
    return Array.isArray(response) ? response : response.events;
  }
}
