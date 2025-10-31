/**
 * ZendFi SDK Types
 * Complete type definitions for the ZendFi API
 */

export type Environment = 'development' | 'staging' | 'production';

export type Currency = 'USD' | 'EUR' | 'GBP';

export type PaymentToken = 'SOL' | 'USDC' | 'USDT';

export type PaymentStatus = 'pending' | 'confirmed' | 'failed' | 'expired';

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'paused';

export type InstallmentPlanStatus = 'active' | 'completed' | 'defaulted' | 'cancelled';

export type EscrowStatus = 'pending' | 'funded' | 'released' | 'refunded' | 'disputed' | 'cancelled';

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
  | 'escrow.funded'
  | 'escrow.released'
  | 'escrow.refunded'
  | 'escrow.disputed'
  | 'invoice.sent'
  | 'invoice.paid';

export interface ZendFiConfig {
  apiKey?: string;
  baseURL?: string;
  environment?: Environment;
  timeout?: number;
  retries?: number;
  idempotencyEnabled?: boolean;
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
 * Escrow - Secure fund holding
 */
export interface ReleaseCondition {
  type: 'manual_approval' | 'time_based' | 'confirmation_required' | 'milestone';
  approver?: string;
  approved?: boolean;
  release_after?: string;
  confirmations_needed?: number;
  confirmed_by?: string[];
  description?: string;
  approved_by?: string;
}

export interface CreateEscrowRequest {
  buyer_wallet: string;
  seller_wallet: string;
  amount: number;
  currency?: Currency;
  token?: PaymentToken;
  description?: string;
  release_conditions: ReleaseCondition;
  metadata?: Record<string, any>;
}

export interface Escrow {
  id: string;
  payment_id: string;
  merchant_id: string;
  buyer_wallet: string;
  seller_wallet: string;
  escrow_wallet: string;
  amount: number;
  currency: Currency;
  token: PaymentToken;
  release_conditions: ReleaseCondition;
  status: EscrowStatus;
  payment_url?: string;
  qr_code?: string;
  funded_at?: string;
  released_at?: string;
  refunded_at?: string;
  disputed_at?: string;
  dispute_reason?: string;
  release_transaction_signature?: string;
  refund_transaction_signature?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ApproveEscrowRequest {
  approver_wallet: string;
}

export interface RefundEscrowRequest {
  reason: string;
}

export interface DisputeEscrowRequest {
  reason: string;
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
