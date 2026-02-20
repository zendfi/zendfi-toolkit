/**
 * ZendFi SDK Types
 * Complete type definitions for the ZendFi API
 */

// ============================================
// Branded Types for Type-Safe IDs
// Prevents accidentally mixing up different ID types
// ============================================

/** Branded type for type-safe IDs - prevents mixing different ID types */
export type Brand<T, B> = T & { __brand: B };

/** Payment ID (e.g., 'pay_abc123') */
export type PaymentId = Brand<string, 'PaymentId'>;

/** Merchant ID (e.g., 'merch_abc123') */
export type MerchantId = Brand<string, 'MerchantId'>;

/** Invoice ID (e.g., 'inv_abc123') */
export type InvoiceId = Brand<string, 'InvoiceId'>;

/** Subscription ID (e.g., 'sub_abc123') */
export type SubscriptionId = Brand<string, 'SubscriptionId'>;

/** Installment Plan ID (e.g., 'inst_abc123') */
export type InstallmentPlanId = Brand<string, 'InstallmentPlanId'>;

/** Payment Link Code (e.g., 'link_abc123') */
export type PaymentLinkCode = Brand<string, 'PaymentLinkCode'>;

// Helper to create branded IDs (use in tests or when receiving from API)
export const asPaymentId = (id: string): PaymentId => id as PaymentId;
export const asMerchantId = (id: string): MerchantId => id as MerchantId;
export const asInvoiceId = (id: string): InvoiceId => id as InvoiceId;
export const asSubscriptionId = (id: string): SubscriptionId => id as SubscriptionId;
export const asInstallmentPlanId = (id: string): InstallmentPlanId => id as InstallmentPlanId;
export const asPaymentLinkCode = (id: string): PaymentLinkCode => id as PaymentLinkCode;

// ============================================
// Core Types
// ============================================

export type Environment = 'development' | 'staging' | 'production';

export type ApiKeyMode = 'test' | 'live';

export type Currency = 'USD' | 'EUR' | 'GBP';

export type PaymentToken = 'SOL' | 'USDC' | 'USDT';

export type PaymentStatus = 'pending' | 'confirmed' | 'failed' | 'expired';

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'paused';

export type InstallmentPlanStatus = 'active' | 'completed' | 'defaulted' | 'cancelled';

export type InvoiceStatus = 'draft' | 'sent' | 'paid';

export type SplitStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

export type WebhookEvent =
  | 'payment.created'
  | 'payment.confirmed'
  | 'payment.failed'
  | 'payment.expired'
  | 'subscription.created'
  | 'subscription.activated'
  | 'subscription.canceled'
  | 'subscription.payment_failed'
  | 'split.completed'
  | 'split.failed'
  | 'installment.due'
  | 'installment.paid'
  | 'installment.late'
  | 'invoice.sent'
  | 'invoice.paid';

export interface ZendFiConfig {
  apiKey?: string;
  baseURL?: string;
  environment?: Environment;
  mode?: ApiKeyMode;
  timeout?: number;
  retries?: number;
  idempotencyEnabled?: boolean;
  debug?: boolean; // Enable request/response logging
}

export interface SplitRecipient {
  recipient_wallet: string;
  recipient_name?: string;
  percentage?: number;
  fixed_amount_usd?: number;
  split_order?: number;
}

export interface CreatePaymentRequest {
  amount: number;
  currency?: Currency;
  token?: PaymentToken;
  description?: string;
  customer_email?: string;
  redirect_url?: string;
  metadata?: Record<string, any>;
  split_recipients?: SplitRecipient[];
}

/**
 * Payment Link - Shareable checkout links
 */
export interface CreatePaymentLinkRequest {
  amount: number;
  currency?: string;
  token?: string;
  description?: string;
  max_uses?: number;
  expires_at?: string;
  metadata?: Record<string, any>;
  onramp?: boolean;
  /** Original NGN amount for PAJ exact conversion (if using a NGN-denominated link) */
  amount_ngn?: number;
  /**
   * If true, a service charge of max(₦30, ceil(2.1% × amount_ngn)) is added on top
   * and shown transparently to the payer on checkout.
   * If false/absent, no service charge is applied (merchant absorbs PAJ slippage).
   * Only relevant when `onramp` is true.
   */
  payer_service_charge?: boolean;
}

export interface PaymentLink {
  link_code: string;
  merchant_id: string;
  title?: string;
  description?: string;
  amount: number;
  currency: string;
  payment_methods?: string[];
  redirect_url?: string;
  expires_at?: string;
  metadata?: Record<string, any>;
  payment_url: string;
  hosted_page_url: string;
  created_at: string;
  updated_at: string;
  
  // Convenience aliases
  url: string;  // Alias for hosted_page_url
  
  id?: string;
  token?: string;
  max_uses?: number;
  uses_count?: number;
  is_active?: boolean;
  onramp?: boolean;
  /** Whether this link applies a service charge to the payer (onramp only) */
  payer_service_charge?: boolean;
}

export interface Payment {
  id: string;
  merchant_id: string;
  amount_usd?: number;
  amount?: number; // from PaymentResponse
  currency?: string; // from PaymentResponse
  payment_token?: PaymentToken;
  status: PaymentStatus;
  customer_wallet?: string;
  customer_email?: string;
  description?: string;
  checkout_url?: string;
  payment_url?: string; // from PaymentResponse
  qr_code?: string; // from PaymentResponse
  expires_at: string;
  confirmed_at?: string;
  transaction_signature?: string;
  metadata?: Record<string, any>;
  split_ids?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface ListPaymentsRequest {
  page?: number;
  limit?: number;
  status?: PaymentStatus;
  from_date?: string;
  to_date?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface CreateSubscriptionPlanRequest {
  name: string;
  description?: string;
  amount: number;
  currency?: Currency;
  interval: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval_count?: number;
  trial_days?: number;
  metadata?: Record<string, any>;
}

export interface SubscriptionPlan {
  id: string;
  merchant_id: string;
  name: string;
  description?: string;
  amount: number;
  currency: Currency;
  interval: string;
  interval_count: number;
  trial_days: number;
  is_active: boolean;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateSubscriptionRequest {
  plan_id: string;
  customer_email: string;
  customer_wallet?: string;
  metadata?: Record<string, any>;
}

export interface Subscription {
  id: string;
  plan_id: string;
  merchant_id: string;
  customer_email: string;
  customer_wallet?: string;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  trial_end?: string;
  canceled_at?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  merchant_id: string;
  data: Payment | Subscription;
}

export interface VerifyWebhookRequest {
  // Allow either the raw JSON string body or the already-parsed object.
  // The SDK will handle both cases.
  payload: string | object;
  signature: string;
  secret: string;
}

export class ZendFiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ZendFiError';
  }
}

export class AuthenticationError extends ZendFiError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends ZendFiError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends ZendFiError {
  constructor(message: string) {
    super(message, 0, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

export class RateLimitError extends ZendFiError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_ERROR');
    this.name = 'RateLimitError';
  }
}

/**
 * Installment Plans - Pay over time
 */
export interface InstallmentScheduleItem {
  installment_number: number;
  due_date: string;
  amount: string;
  status: string;
  payment_id?: string;
  paid_at?: string;
}

export interface CreateInstallmentPlanRequest {
  customer_wallet: string;
  customer_email?: string;
  total_amount: number;
  installment_count: number;
  first_payment_date?: string;
  payment_frequency_days: number;
  description?: string;
  late_fee_amount?: number;
  grace_period_days?: number;
  metadata?: Record<string, any>;
}

export interface CreateInstallmentPlanResponse {
  plan_id: string;
  status: string;
}

export interface InstallmentPlan {
  id?: string;
  plan_id?: string; // from create response
  merchant_id?: string;
  customer_wallet?: string;
  customer_email?: string;
  total_amount?: string;
  installment_count?: number;
  amount_per_installment?: string;
  payment_schedule?: InstallmentScheduleItem[];
  paid_count?: number;
  status: InstallmentPlanStatus | string;
  description?: string;
  late_fee_amount?: string;
  grace_period_days?: number;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
  defaulted_at?: string;
}

/**
 * Invoices - Professional billing
 */
export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

export interface CreateInvoiceRequest {
  customer_email: string;
  customer_name?: string;
  amount: number;
  token?: PaymentToken;
  description: string;
  line_items?: InvoiceLineItem[];
  due_date?: string;
  metadata?: Record<string, any>;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  merchant_id: string;
  customer_email: string;
  customer_name?: string;
  amount_usd: number;
  token: PaymentToken;
  description: string;
  line_items?: InvoiceLineItem[];
  status: InvoiceStatus;
  payment_url?: string;
  due_date?: string;
  sent_at?: string;
  paid_at?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}
