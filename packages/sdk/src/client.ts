import fetch from 'cross-fetch';
import { createHmac, timingSafeEqual } from 'crypto';
import type {
  ZendFiConfig,
  CreatePaymentRequest,
  Payment,
  ListPaymentsRequest,
  PaginatedResponse,
  CreateSubscriptionPlanRequest,
  SubscriptionPlan,
  CreateSubscriptionRequest,
  Subscription,
  CreatePaymentLinkRequest,
  PaymentLink,
  WebhookPayload,
  VerifyWebhookRequest,
  CreateInstallmentPlanRequest,
  InstallmentPlan,
  CreateEscrowRequest,
  Escrow,
  ApproveEscrowRequest,
  RefundEscrowRequest,
  DisputeEscrowRequest,
  CreateInvoiceRequest,
  Invoice,
} from './types';
import { ConfigLoader, parseError, generateIdempotencyKey, sleep } from './utils';

/**
 * ZendFi SDK Client.
 * AZero-config TypeScript SDK for crypto payments
 */
export class ZendFiClient {
  private config: Required<ZendFiConfig>;

  constructor(options?: Partial<ZendFiConfig>) {
    this.config = ConfigLoader.load(options);
    ConfigLoader.validateApiKey(this.config.apiKey);
    
    // Log initialization info
    if (this.config.environment === 'development') {
      console.log(
        `✓ ZendFi SDK initialized in ${this.config.mode} mode (${
          this.config.mode === 'test' ? 'devnet' : 'mainnet'
        })`
      );
    }
  }

  /**
   * Create a new payment
   */
  async createPayment(request: CreatePaymentRequest): Promise<Payment> {
    return this.request<Payment>('POST', '/api/v1/payments', {
      ...request,
      currency: request.currency || 'USD',
      token: request.token || 'USDC',
    });
  }

  /**
   * Get payment by ID
   */
  async getPayment(paymentId: string): Promise<Payment> {
    return this.request<Payment>('GET', `/api/v1/payments/${paymentId}`);
  }

  /**
   * List all payments with pagination
   */
  async listPayments(
    request?: ListPaymentsRequest
  ): Promise<PaginatedResponse<Payment>> {
    const params = new URLSearchParams();

    if (request?.page) params.append('page', request.page.toString());
    if (request?.limit) params.append('limit', request.limit.toString());
    if (request?.status) params.append('status', request.status);
    if (request?.from_date) params.append('from_date', request.from_date);
    if (request?.to_date) params.append('to_date', request.to_date);

    const query = params.toString() ? `?${params.toString()}` : '';

    return this.request<PaginatedResponse<Payment>>('GET', `/api/v1/payments${query}`);
  }

  /**
   * Create a subscription plan
   */
  async createSubscriptionPlan(
    request: CreateSubscriptionPlanRequest
  ): Promise<SubscriptionPlan> {
    return this.request<SubscriptionPlan>('POST', '/api/v1/subscriptions/plans', {
      ...request,
      currency: request.currency || 'USD',
      interval_count: request.interval_count || 1,
      trial_days: request.trial_days || 0,
    });
  }

  /**
   * Get subscription plan by ID
   */
  async getSubscriptionPlan(planId: string): Promise<SubscriptionPlan> {
    return this.request<SubscriptionPlan>('GET', `/api/v1/subscriptions/plans/${planId}`);
  }

  /**
   * Create a subscription
   */
  async createSubscription(request: CreateSubscriptionRequest): Promise<Subscription> {
    return this.request<Subscription>('POST', '/api/v1/subscriptions', request);
  }

  /**
   * Get subscription by ID
   */
  async getSubscription(subscriptionId: string): Promise<Subscription> {
    return this.request<Subscription>('GET', `/api/v1/subscriptions/${subscriptionId}`);
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<Subscription> {
    return this.request<Subscription>(
      'POST',
      `/api/v1/subscriptions/${subscriptionId}/cancel`
    );
  }

  /**
   * Create a payment link (shareable checkout URL)
   */
  async createPaymentLink(request: CreatePaymentLinkRequest): Promise<PaymentLink> {
    const response = await this.request<PaymentLink>('POST', '/api/v1/payment-links', {
      ...request,
      currency: request.currency || 'USD',
      token: request.token || 'USDC',
    });
    
    return {
      ...response,
      url: response.hosted_page_url,
    };
  }

  /**
   * Get payment link by link code
   */
  async getPaymentLink(linkCode: string): Promise<PaymentLink> {
    const response = await this.request<PaymentLink>('GET', `/api/v1/payment-links/${linkCode}`);
    
    return {
      ...response,
      url: response.hosted_page_url,
    };
  }

  /**
   * List all payment links for the authenticated merchant
   */
  async listPaymentLinks(): Promise<PaymentLink[]> {
    const response = await this.request<PaymentLink[]>('GET', '/api/v1/payment-links');
    return response.map(link => ({
      ...link,
      url: link.hosted_page_url,
    }));
  }

  /**
   * Create an installment plan
   * Split a purchase into multiple scheduled payments
   */
  async createInstallmentPlan(request: CreateInstallmentPlanRequest): Promise<InstallmentPlan> {
    const response = await this.request<{ plan_id: string; status: string }>(
      'POST',
      '/api/v1/installment-plans',
      request
    );
    return {
      id: response.plan_id,
      plan_id: response.plan_id,
      status: response.status,
    } as InstallmentPlan;
  }

  /**
   * Get installment plan by ID
   */
  async getInstallmentPlan(planId: string): Promise<InstallmentPlan> {
    return this.request<InstallmentPlan>('GET', `/api/v1/installment-plans/${planId}`);
  }

  /**
   * List all installment plans for merchant
   */
  async listInstallmentPlans(params?: { limit?: number; offset?: number }): Promise<InstallmentPlan[]> {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request<InstallmentPlan[]>('GET', `/api/v1/installment-plans${queryString}`);
  }

  /**
   * List installment plans for a specific customer
   */
  async listCustomerInstallmentPlans(customerWallet: string): Promise<InstallmentPlan[]> {
    return this.request<InstallmentPlan[]>(
      'GET',
      `/api/v1/customers/${customerWallet}/installment-plans`
    );
  }

  /**
   * Cancel an installment plan
   */
  async cancelInstallmentPlan(planId: string): Promise<{ message: string; plan_id: string }> {
    return this.request<{ message: string; plan_id: string }>(
      'POST',
      `/api/v1/installment-plans/${planId}/cancel`
    );
  }

  /**
   * Create an escrow transaction
   * Hold funds until conditions are met
   */
  async createEscrow(request: CreateEscrowRequest): Promise<Escrow> {
    return this.request<Escrow>('POST', '/api/v1/escrows', {
      ...request,
      currency: request.currency || 'USD',
      token: request.token || 'USDC',
    });
  }

  /**
   * Get escrow by ID
   */
  async getEscrow(escrowId: string): Promise<Escrow> {
    return this.request<Escrow>('GET', `/api/v1/escrows/${escrowId}`);
  }

  /**
   * List all escrows for merchant
   */
  async listEscrows(params?: { limit?: number; offset?: number }): Promise<Escrow[]> {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request<Escrow[]>('GET', `/api/v1/escrows${queryString}`);
  }

  /**
   * Approve escrow release to seller
   */
  async approveEscrow(
    escrowId: string,
    request: ApproveEscrowRequest
  ): Promise<{ status: string; transaction_signature?: string; message: string }> {
    return this.request<{ status: string; transaction_signature?: string; message: string }>(
      'POST',
      `/api/v1/escrows/${escrowId}/approve`,
      request
    );
  }

  /**
   * Refund escrow to buyer
   */
  async refundEscrow(
    escrowId: string,
    request: RefundEscrowRequest
  ): Promise<{ status: string; transaction_signature: string; message: string; reason: string }> {
    return this.request<{
      status: string;
      transaction_signature: string;
      message: string;
      reason: string;
    }>('POST', `/api/v1/escrows/${escrowId}/refund`, request);
  }

  /**
   * Raise a dispute for an escrow
   */
  async disputeEscrow(
    escrowId: string,
    request: DisputeEscrowRequest
  ): Promise<{ status: string; message: string; dispute_id: string; created_at: string }> {
    return this.request<{
      status: string;
      message: string;
      dispute_id: string;
      created_at: string;
    }>('POST', `/api/v1/escrows/${escrowId}/dispute`, request);
  }

  /**
   * Create an invoice
   */
  async createInvoice(request: CreateInvoiceRequest): Promise<Invoice> {
    return this.request<Invoice>('POST', '/api/v1/invoices', {
      ...request,
      token: request.token || 'USDC',
    });
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId: string): Promise<Invoice> {
    return this.request<Invoice>('GET', `/api/v1/invoices/${invoiceId}`);
  }

  /**
   * List all invoices for merchant
   */
  async listInvoices(): Promise<Invoice[]> {
    return this.request<Invoice[]>('GET', '/api/v1/invoices');
  }

  /**
   * Send invoice to customer via email
   */
  async sendInvoice(invoiceId: string): Promise<{
    success: boolean;
    invoice_id: string;
    invoice_number: string;
    sent_to: string;
    payment_url: string;
    status: string;
  }> {
    return this.request<{
      success: boolean;
      invoice_id: string;
      invoice_number: string;
      sent_to: string;
      payment_url: string;
      status: string;
    }>('POST', `/api/v1/invoices/${invoiceId}/send`);
  }

  /**
   * Verify webhook signature using HMAC-SHA256
   * 
   * @param request - Webhook verification request containing payload, signature, and secret
   * @returns true if signature is valid, false otherwise
   * 
   * @example
   * ```typescript
   * const isValid = zendfi.verifyWebhook({
   *   payload: req.body,
   *   signature: req.headers['x-zendfi-signature'],
   *   secret: process.env.ZENDFI_WEBHOOK_SECRET
   * });
   * 
   * if (!isValid) {
   *   return res.status(401).json({ error: 'Invalid signature' });
   * }
   * ```
   */
  verifyWebhook(request: VerifyWebhookRequest): boolean {
    try {
      if (!request.payload || !request.signature || !request.secret) {
        return false;
      }

      let payloadString: string;
      let parsedPayload: WebhookPayload | null = null;

      if (typeof request.payload === 'string') {
        payloadString = request.payload;
        try {
          parsedPayload = JSON.parse(payloadString) as WebhookPayload;
        } catch (e) {
          return false;
        }
      } else if (typeof request.payload === 'object') {
        parsedPayload = request.payload as WebhookPayload;
        try {
          payloadString = JSON.stringify(request.payload);
        } catch (e) {
          return false;
        }
      } else {
        return false;
      }

      if (!parsedPayload || !parsedPayload.event || !parsedPayload.merchant_id || !parsedPayload.timestamp) {
        return false;
      }

      const computedSignature = this.computeHmacSignature(payloadString, request.secret);

      return this.timingSafeEqual(request.signature, computedSignature);
    } catch (err) {
      // In dev, print concise error message (avoid dumping large objects)
      const error = err as Error | undefined;
      if (this.config.environment === 'development') {
        // eslint-disable-next-line no-console
        console.error('Webhook verification error:', error?.message || String(error));
      }
      return false;
    }
  }

  /**
   * Compute HMAC-SHA256 signature
   * Works in both Node.js and browser environments
   */
  private computeHmacSignature(payload: string, secret: string): string {
    if (typeof process !== 'undefined' && process.versions?.node) {
      return createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');
    }

    throw new Error(
      'Webhook verification in browser is not supported. Use this method in your backend/server environment.'
    );
  }

  /**
   * Timing-safe string comparison to prevent timing attacks
   */
  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    if (typeof process !== 'undefined' && process.versions?.node) {
      try {
        const bufferA = Buffer.from(a, 'utf8');
        const bufferB = Buffer.from(b, 'utf8');
        return timingSafeEqual(bufferA, bufferB);
      } catch {
        // Fall back to manual comparison
      }
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }

  /**
   * Make an HTTP request with retry logic
   */
  private async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    options: { idempotencyKey?: string; attempt?: number } = {}
  ): Promise<T> {
    const attempt = options.attempt || 1;
    const idempotencyKey =
      options.idempotencyKey ||
      (this.config.idempotencyEnabled && method !== 'GET' ? generateIdempotencyKey() : undefined);

    try {
      const url = `${this.config.baseURL}${endpoint}`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      };

      if (idempotencyKey) {
        headers['Idempotency-Key'] = idempotencyKey;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let body: any;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (!response.ok) {
        const error = parseError(response, body);

        if (response.status >= 500 && attempt < this.config.retries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          await sleep(delay);
          return this.request<T>(method, endpoint, data, {
            idempotencyKey,
            attempt: attempt + 1,
          });
        }

        throw error;
      }

      return body as T;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.config.timeout}ms`);
      }

      if (attempt < this.config.retries && error.message?.includes('fetch')) {
        const delay = Math.pow(2, attempt) * 1000;
        await sleep(delay);
        return this.request<T>(method, endpoint, data, {
          idempotencyKey,
          attempt: attempt + 1,
        });
      }

      throw error;
    }
  }
}

/**
 * Default singleton instance
 * Auto-configured from environment
 * 
 * Note: This will throw if ZENDFI_API_KEY is not set.
 * For custom configuration, create your own instance:
 * const client = new ZendFiClient({ apiKey: '...' })
 */
export const zendfi = (() => {
  try {
    return new ZendFiClient();
  } catch (error) {
    if (process.env.NODE_ENV === 'test' || !process.env.ZENDFI_API_KEY) {
      return new Proxy({} as ZendFiClient, {
        get() {
          throw new Error(
            'ZendFi singleton not initialized. Set ZENDFI_API_KEY environment variable or create a custom instance: new ZendFiClient({ apiKey: "..." })'
          );
        },
      });
    }
    throw error;
  }
})();
