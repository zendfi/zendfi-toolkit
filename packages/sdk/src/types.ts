/**
 * ZendFi SDK Types
 * Complete type definitions for the ZendFi API
 */

export type Environment = 'development' | 'staging' | 'production';

export type ApiKeyMode = 'test' | 'live';

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

// ============================================
// Agentic Intent Protocol Types
// ============================================

/**
 * API Key Scopes for Agent Keys
 * Controls what operations an agent can perform
 */
export type ApiKeyScope =
  | 'full'
  | 'read_only'
  | 'create_payments'
  | 'manage_escrow'
  | 'create_subscriptions'
  | 'manage_installments'
  | 'read_analytics';

/**
 * Agent API Key - Scoped access for AI agents
 * Created via zendfi.agent.createKey()
 */
export interface AgentApiKey {
  /** Unique identifier (UUID) */
  id: string;
  /** First 12 characters of the key for identification */
  key_prefix: string;
  /** Full API key (only returned on creation, starts with zai_) */
  full_key?: string;
  /** Human-readable name for the agent */
  name: string;
  /** Permissions granted to this key */
  scopes: ApiKeyScope[];
  /** Maximum API calls per hour */
  rate_limit_per_hour: number;
  /** Agent metadata (agent_id, agent_name, etc.) */
  agent_metadata: Record<string, unknown>;
  /** ISO 8601 timestamp */
  created_at: string;
}

/**
 * Request to create an agent API key
 */
export interface CreateAgentApiKeyRequest {
  /** Human-readable name for the agent */
  name: string;
  /** Unique identifier for the agent (e.g., "shopping-assistant-v1") */
  agent_id: string;
  /** Display name for the agent */
  agent_name?: string;
  /** Permissions to grant (defaults to ['create_payments']) */
  scopes?: ApiKeyScope[];
  /** Maximum API calls per hour (defaults to 1000) */
  rate_limit_per_hour?: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Session spending limits for AI agents
 */
export interface SessionLimits {
  /** Maximum USD per single transaction (default: 1000) */
  max_per_transaction?: number;
  /** Maximum USD per day (default: 5000) */
  max_per_day?: number;
  /** Maximum USD per week (default: 20000) */
  max_per_week?: number;
  /** Maximum USD per month (default: 50000) */
  max_per_month?: number;
  /** Require approval for transactions above this amount (default: 500) */
  require_approval_above?: number;
}

/**
 * Agent Session - Time-bounded spending authorization
 */
export interface AgentSession {
  /** Unique identifier (UUID) */
  id: string;
  /** Session token for API calls (zai_session_...) */
  session_token: string;
  /** Agent identifier */
  agent_id: string;
  /** Display name */
  agent_name?: string;
  /** User's Solana wallet address */
  user_wallet: string;
  /** Spending limits for this session */
  limits: SessionLimits;
  /** Whether the session is active */
  is_active: boolean;
  /** ISO 8601 timestamp */
  created_at: string;
  /** When the session expires (ISO 8601) */
  expires_at: string;
  /** Remaining daily spending allowance */
  remaining_today: number;
  /** Remaining weekly spending allowance */
  remaining_this_week: number;
  /** Remaining monthly spending allowance */
  remaining_this_month: number;
}

/**
 * Request to create an agent session
 */
export interface CreateAgentSessionRequest {
  /** Unique identifier for the agent */
  agent_id: string;
  /** Display name for the agent */
  agent_name?: string;
  /** User's Solana wallet address */
  user_wallet: string;
  /** Spending limits (uses defaults if not provided) */
  limits?: SessionLimits;
  /** Restrict to specific merchants (UUIDs) */
  allowed_merchants?: string[];
  /** Session duration in hours (default: 24, max: 168) */
  duration_hours?: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// ============================================
// Payment Intents
// ============================================

/**
 * Payment Intent Status
 */
export type PaymentIntentStatus =
  | 'requires_payment'
  | 'processing'
  | 'succeeded'
  | 'canceled'
  | 'failed';

/**
 * Capture method for payment intents
 */
export type CaptureMethod = 'automatic' | 'manual';

/**
 * Payment Intent - Two-phase payment flow
 */
export interface PaymentIntent {
  /** Unique identifier (UUID) */
  id: string;
  /** Secret for confirming the intent (keep secure) */
  client_secret: string;
  /** Amount in USD */
  amount: number;
  /** Currency code */
  currency: string;
  /** Description of the payment */
  description?: string;
  /** Current status */
  status: PaymentIntentStatus;
  /** How to capture the payment */
  capture_method: CaptureMethod;
  /** Agent that created this intent */
  agent_id?: string;
  /** Linked payment ID (after confirmation) */
  payment_id?: string;
  /** ISO 8601 timestamp */
  created_at: string;
  /** When the intent expires (ISO 8601) */
  expires_at: string;
}

/**
 * Request to create a payment intent
 */
export interface CreatePaymentIntentRequest {
  /** Amount in USD (must be > 0) */
  amount: number;
  /** Currency code (default: "USD") */
  currency?: string;
  /** Description of the payment */
  description?: string;
  /** Capture method (default: "automatic") */
  capture_method?: CaptureMethod;
  /** Agent identifier */
  agent_id?: string;
  /** Agent display name */
  agent_name?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Time until expiration in seconds (default: 86400 = 24h) */
  expires_in_seconds?: number;
}

/**
 * Request to confirm a payment intent
 */
export interface ConfirmPaymentIntentRequest {
  /** The client_secret from the payment intent */
  client_secret: string;
  /** Customer's Solana wallet address */
  customer_wallet: string;
  /** Payment type (optional) */
  payment_type?: string;
  /** Enable gasless transaction (optional) */
  auto_gasless?: boolean;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Payment Intent Event
 */
export interface PaymentIntentEvent {
  /** Event ID */
  id: string;
  /** Payment Intent ID */
  payment_intent_id: string;
  /** Event type */
  event_type: string;
  /** Event data */
  data: Record<string, unknown>;
  /** ISO 8601 timestamp */
  created_at: string;
}

// ============================================
// PPP Pricing
// ============================================

/**
 * Purchasing Power Parity factor for a country
 */
export interface PPPFactor {
  /** ISO country code (e.g., "BR", "NG", "IN") */
  country_code: string;
  /** Full country name */
  country_name: string;
  /** PPP adjustment factor (0.0 - 1.0) */
  ppp_factor: number;
  /** Local currency code */
  currency_code: string;
  /** Suggested discount percentage */
  adjustment_percentage: number;
}

/**
 * User profile for pricing decisions
 */
export interface UserProfile {
  /** ISO country code */
  location_country?: string;
  /** Wallet transaction history (for loyalty detection) */
  wallet_history?: Record<string, unknown>;
  /** Context hint (e.g., "first-time", "loyal", "churning") */
  context?: string;
}

/**
 * PPP pricing configuration
 */
export interface PPPConfig {
  /** Enable PPP adjustments (default: true) */
  enabled?: boolean;
  /** Minimum PPP factor to apply */
  min_factor?: number;
  /** Maximum PPP factor to apply */
  max_factor?: number;
  /** Absolute minimum price in USD */
  floor_price?: number;
  /** Absolute maximum price in USD */
  ceiling_price?: number;
  /** Maximum discount percentage */
  max_discount_percent?: number;
  /** Additional discount percentage on top of PPP */
  extra_discount_percent?: number;
  /** Custom reasoning text */
  custom_reasoning?: string;
}

/**
 * Request for AI-powered pricing suggestion
 */
export interface PricingSuggestionRequest {
  /** Agent identifier */
  agent_id: string;
  /** Product identifier (optional) */
  product_id?: string;
  /** Base price in USD (must be > 0) */
  base_price: number;
  /** Currency code (default: "USD") */
  currency?: string;
  /** User profile for personalization */
  user_profile?: UserProfile;
  /** PPP configuration overrides */
  ppp_config?: PPPConfig;
}

/**
 * AI-powered pricing suggestion response
 */
export interface PricingSuggestion {
  /** Suggested price in USD */
  suggested_amount: number;
  /** Minimum acceptable price */
  min_amount: number;
  /** Maximum suggested price */
  max_amount: number;
  /** Currency code */
  currency: string;
  /** Human-readable explanation */
  reasoning: string;
  /** Whether PPP was applied */
  ppp_adjusted: boolean;
  /** PPP factor used (if applied) */
  adjustment_factor?: number;
}

// ============================================
// Autonomous Delegates
// ============================================

/**
 * Autonomous Delegate - Enables agent to sign transactions
 */
export interface AutonomousDelegate {
  /** Unique identifier (UUID) */
  id: string;
  /** Session key this delegate is attached to */
  session_key_id: string;
  /** Whether the delegate is active */
  is_active: boolean;
  /** Maximum spending in USD */
  max_amount_usd: number;
  /** Amount already spent */
  used_amount_usd: number;
  /** Remaining spending allowance */
  remaining_usd: number;
  /** When the delegate expires (ISO 8601) */
  expires_at: string;
  /** When the delegate was created (ISO 8601) */
  created_at: string;
  /** When the delegate was revoked (if applicable) */
  revoked_at?: string;
  /** Last time the delegate was used */
  last_used_at?: string;
}

/**
 * Request to enable autonomous signing
 */
export interface EnableAutonomyRequest {
  /** Maximum spending in USD (must be > 0) */
  max_amount_usd: number;
  /** Duration in hours (1-168, max 7 days) */
  duration_hours: number;
  /** Ed25519 delegation signature (base64) */
  delegation_signature: string;
  /** Explicit expiration time (ISO 8601, optional) */
  expires_at?: string;
  /** Lit Protocol encrypted keypair (for device-bound keys) */
  lit_encrypted_keypair?: string;
  /** Hash of Lit Protocol encrypted data */
  lit_data_hash?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Response from enabling autonomous signing
 */
export interface EnableAutonomyResponse {
  /** Delegate ID (UUID) */
  delegate_id: string;
  /** Session key ID (UUID) */
  session_key_id: string;
  /** Maximum spending in USD */
  max_amount_usd: number;
  /** When the delegate expires (ISO 8601) */
  expires_at: string;
  /** Public key of the delegate (base58) */
  delegate_public_key: string;
  /** Confirmation that autonomous mode is enabled */
  autonomous_mode_enabled: boolean;
  /** Whether Lit Protocol is being used */
  lit_protocol_enabled: boolean;
  /** True if device-bound key without Lit (fallback to client signing) */
  requires_lit_for_auto_sign?: boolean;
}

/**
 * Request to revoke autonomous mode
 */
export interface RevokeAutonomyRequest {
  /** Reason for revocation (optional) */
  reason?: string;
}

/**
 * Autonomy status response
 */
export interface AutonomyStatus {
  /** Whether autonomous mode is enabled */
  autonomous_mode_enabled: boolean;
  /** Active delegate (if any) */
  delegate?: AutonomousDelegate;
}

// ============================================
// Smart Payments
// ============================================

/**
 * Request for AI-powered smart payment
 */
export interface SmartPaymentRequest {
  /** Session token for limit enforcement (optional) */
  session_token?: string;
  /** Agent identifier */
  agent_id: string;
  /** User's Solana wallet address */
  user_wallet: string;
  /** Amount in USD (must be > 0) */
  amount_usd: number;
  /** Target merchant ID (optional) */
  merchant_id?: string;
  /** Token to use (default: "USDC") */
  token?: PaymentToken;
  /** Auto-detect if gasless is needed (optional) */
  auto_detect_gasless?: boolean;
  /** Enable instant settlement (optional) */
  instant_settlement?: boolean;
  /** Create escrow for this payment (optional) */
  enable_escrow?: boolean;
  /** Payment description */
  description?: string;
  /** Product details for receipt */
  product_details?: Record<string, unknown>;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Smart Payment Status
 */
export type SmartPaymentStatus = 'pending' | 'confirmed' | 'awaiting_signature' | 'failed';

/**
 * Response from smart payment
 */
export interface SmartPaymentResponse {
  /** Payment ID (UUID) */
  payment_id: string;
  /** Current status */
  status: SmartPaymentStatus;
  /** Amount in USD */
  amount_usd: number;
  /** Whether gasless transaction was used */
  gasless_used: boolean;
  /** Whether settlement is complete */
  settlement_complete: boolean;
  /** Escrow ID if escrow was enabled */
  escrow_id?: string;
  /** Base64 encoded transaction (for signing) */
  unsigned_transaction?: string;
  /** Whether client signature is required */
  requires_signature: boolean;
  /** Transaction signature (if auto-signed) */
  transaction_signature?: string;
  /** Confirmation time in milliseconds */
  confirmed_in_ms?: number;
  /** URL to payment receipt */
  receipt_url: string;
  /** NFT receipt address (if minted) */
  receipt_nft?: string;
  /** Human-readable next steps */
  next_steps: string;
  /** URL to submit signed transaction */
  submit_url?: string;
  /** ISO 8601 timestamp */
  created_at: string;
}

// ============================================
// Agent Analytics
// ============================================

/**
 * Analytics data for an agent
 */
export interface AgentAnalytics {
  /** Total number of payments */
  total_payments: number;
  /** Total volume in USD */
  total_volume_usd: number;
  /** Average payment amount in USD */
  average_payment_usd: number;
  /** Payment success rate (0-1) */
  success_rate: number;
  /** Number of active sessions */
  active_sessions: number;
  /** Number of active autonomous delegates */
  active_delegates: number;
  /** Total PPP savings in USD */
  ppp_savings_usd: number;
  /** Payments broken down by token */
  payments_by_token: Record<PaymentToken, number>;
  /** Daily payment statistics */
  payments_by_day: Array<{
    date: string;
    count: number;
    volume_usd: number;
  }>;
}
