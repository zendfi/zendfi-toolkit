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

/** Session ID (e.g., 'sess_abc123') */
export type SessionId = Brand<string, 'SessionId'>;

/** Agent Key ID (e.g., 'ak_abc123') */
export type AgentKeyId = Brand<string, 'AgentKeyId'>;

/** Merchant ID (e.g., 'merch_abc123') */
export type MerchantId = Brand<string, 'MerchantId'>;

/** Invoice ID (e.g., 'inv_abc123') */
export type InvoiceId = Brand<string, 'InvoiceId'>;

/** Subscription ID (e.g., 'sub_abc123') */
export type SubscriptionId = Brand<string, 'SubscriptionId'>;

/** Escrow ID (e.g., 'esc_abc123') */
export type EscrowId = Brand<string, 'EscrowId'>;

/** Installment Plan ID (e.g., 'inst_abc123') */
export type InstallmentPlanId = Brand<string, 'InstallmentPlanId'>;

/** Payment Link Code (e.g., 'link_abc123') */
export type PaymentLinkCode = Brand<string, 'PaymentLinkCode'>;

/** Intent ID (e.g., 'pi_abc123') */
export type IntentId = Brand<string, 'IntentId'>;

// Helper to create branded IDs (use in tests or when receiving from API)
export const asPaymentId = (id: string): PaymentId => id as PaymentId;
export const asSessionId = (id: string): SessionId => id as SessionId;
export const asAgentKeyId = (id: string): AgentKeyId => id as AgentKeyId;
export const asMerchantId = (id: string): MerchantId => id as MerchantId;
export const asInvoiceId = (id: string): InvoiceId => id as InvoiceId;
export const asSubscriptionId = (id: string): SubscriptionId => id as SubscriptionId;
export const asEscrowId = (id: string): EscrowId => id as EscrowId;
export const asInstallmentPlanId = (id: string): InstallmentPlanId => id as InstallmentPlanId;
export const asPaymentLinkCode = (id: string): PaymentLinkCode => id as PaymentLinkCode;
export const asIntentId = (id: string): IntentId => id as IntentId;

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
  onramp?: boolean;
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
  /** Whether a PKP was minted for on-chain session identity */
  mint_pkp?: boolean;
  /** PKP Ethereum address (if mint_pkp was true) */
  pkp_address?: string;
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
  /** 
   * Mint a PKP for on-chain session identity (audit trail).
   * Creates a blockchain-verified session identity via Lit Protocol.
   * Note: Spending limits are enforced server-side.
   */
  mint_pkp?: boolean;
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
  /** Session token for spending limit enforcement (optional) */
  session_token?: string;
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

// ============================================
// Session Keys (On-Chain Funded Wallets)
// ============================================

/**
 * @deprecated Use device-bound session keys via `zendfi.sessionKeys.create()` instead.
 * Custodial session keys are deprecated and will be removed in a future version.
 */
export interface CreateSessionKeyRequest {
  /** @deprecated */ user_wallet: string;
  /** @deprecated */ agent_id: string;
  /** @deprecated */ agent_name?: string;
  /** @deprecated */ limit_usdc: number;
  /** @deprecated */ duration_days?: number;
  /** @deprecated */ device_fingerprint: string;
  /** @deprecated */ link_session_id?: string;
  /** @deprecated */ link_session_token?: string;
}

/**
 * @deprecated Use device-bound session keys instead.
 */
export interface CreateSessionKeyResponse {
  /** @deprecated */ session_key_id: string;
  /** @deprecated */ user_wallet: string;
  /** @deprecated */ agent_id: string;
  /** @deprecated */ agent_name?: string;
  /** @deprecated */ limit_usdc: number;
  /** @deprecated */ expires_at: string;
  /** @deprecated */ requires_approval: boolean;
  /** @deprecated */ approval_transaction: string;
  /** @deprecated */ cross_app_compatible: boolean;
  /** @deprecated */ instructions: SessionKeyInstructions;
}

/** @deprecated */
export interface SessionKeyInstructions {
  step_1: string;
  step_2: string;
  step_3: string;
  wallet_support: string[];
}

/**
 * Device-bound session key creation request (non-custodial mode)
 * Client generates keypair and encrypts it before sending
 */
export interface CreateDeviceBoundSessionKeyRequest {
  /** User's main wallet address */
  user_wallet: string;
  /** Agent identifier for cross-app compatibility (e.g., "shopping-assistant-v1") */
  agent_id: string;
  /** Human-readable agent name (e.g., "AI Shopping Assistant") */
  agent_name?: string;
  /** Spending limit in USDC */
  limit_usdc: number;
  /** Duration in days (1-30) */
  duration_days: number;
  /** Client-encrypted session keypair (base64) */
  encrypted_session_key: string;
  /** Encryption nonce (base64, 12 bytes) */
  nonce: string;
  /** Public key of the session keypair */
  session_public_key: string;
  /** Device fingerprint (SHA-256 hex, 64 chars) */
  device_fingerprint: string;
  /** Optional recovery QR data */
  recovery_qr_data?: string;
}

/**
 * Device-bound session key creation response
 */
export interface CreateDeviceBoundSessionKeyResponse {
  /** UUID of the created session key */
  session_key_id: string;
  /** Always "device_bound" */
  mode: string;
  /** Always false for device-bound */
  is_custodial: boolean;
  /** User's main wallet address */
  user_wallet: string;
  /** Agent identifier */
  agent_id: string;
  /** Agent name (if provided) */
  agent_name?: string;
  /** Session wallet public key */
  session_wallet: string;
  /** Spending limit in USDC */
  limit_usdc: number;
  /** Expiration timestamp */
  expires_at: string;
  /** Always true for device-bound */
  requires_client_signing: boolean;
  /** True if this session key works across multiple apps with same agent_id */
  cross_app_compatible: boolean;
  /** Security details */
  security_info: SessionKeySecurityInfo;
}

export interface SessionKeySecurityInfo {
  encryption_type: string;
  device_bound: boolean;
  backend_can_decrypt: boolean;
  recovery_qr_saved: boolean;
}

/**
 * Session key status response
 */
export interface SessionKeyStatus {
  /** UUID of the session key */
  session_key_id: string;
  /** Whether the key is currently active */
  is_active: boolean;
  /** Whether the approval transaction was confirmed */
  is_approved: boolean;
  /** Total spending limit in USDC */
  limit_usdc: number;
  /** Amount already spent in USDC */
  used_amount_usdc: number;
  /** Remaining balance in USDC */
  remaining_usdc: number;
  /** Expiration timestamp */
  expires_at: string;
  /** Days until expiry */
  days_until_expiry: number;
  /** Security status */
  security_status: SecurityStatus;
  /** Linked AI session info (if linked) */
  linked_session?: LinkedSessionInfo;
}

/**
 * Information about a linked AI session (for policy enforcement)
 */
export interface LinkedSessionInfo {
  /** Session ID */
  session_id: string;
  /** Agent ID */
  agent_id: string;
  /** Whether the linked session is active */
  is_active: boolean;
  /** Per-transaction limit */
  max_per_transaction?: number;
  /** Daily remaining */
  remaining_today: number;
  /** Weekly remaining */
  remaining_this_week: number;
  /** Monthly remaining */
  remaining_this_month: number;
  /** Effective limit (minimum of session key balance and session limits) */
  effective_limit: number;
}

export interface SecurityStatus {
  device_fingerprint_matched: boolean;
  recent_security_events: number;
  last_used_at: string | null;
}

/**
 * Top-up request for adding funds to a session key
 */
export interface TopUpSessionKeyRequest {
  /** User's main wallet address */
  user_wallet: string;
  /** Amount to add in USDC */
  amount_usdc: number;
  /** Device fingerprint for security */
  device_fingerprint: string;
}

/**
 * Top-up response with unsigned transaction
 */
export interface TopUpSessionKeyResponse {
  /** UUID of the session key */
  session_key_id: string;
  /** Previous limit before top-up */
  previous_limit: number;
  /** New limit after top-up */
  new_limit: number;
  /** Amount being added */
  added_amount: number;
  /** Base64 encoded top-up transaction (user must sign) */
  top_up_transaction: string;
  /** Block height for transaction validity */
  last_valid_block_height: number;
  /** Instructions for the user */
  instructions: string;
}

/**
 * Submit signed transaction request
 */
export interface SubmitSignedTransactionRequest {
  /** Base64 encoded signed transaction */
  signed_transaction: string;
  /** Optional session key ID (for some endpoints) */
  session_key_id?: string;
}

/**
 * Submit transaction response
 */
export interface SubmitTransactionResponse {
  success: boolean;
  signature: string;
  message: string;
  /** For top-up submissions */
  new_limit?: number;
}

/**
 * Session key list response
 */
export interface SessionKeyListResponse {
  session_keys: SessionKeyStatus[];
  stats: SessionKeyStats;
  merchant_id: string;
}

export interface SessionKeyStats {
  total_keys: number;
  active_keys: number;
  total_limit_usdc: number;
  total_used_usdc: number;
}

/**
 * Agent payment request - simplified payment via session
 */
export interface AgentPaymentRequest {
  /** Session token for spending limit enforcement */
  session_token: string;
  /** Amount in USD */
  amount: number;
  /** Payment description */
  description?: string;
  /** Recipient merchant ID (optional if paying to session owner) */
  recipient_merchant_id?: string;
  /** Token to use (default: USDC) */
  token?: PaymentToken;
  /** Auto-detect if gasless is needed */
  auto_gasless?: boolean;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Agent payment response
 */
export interface AgentPaymentResponse {
  /** UUID of the created payment */
  payment_id: string;
  /** Payment status */
  status: 'pending' | 'processing' | 'confirmed' | 'failed' | 'awaiting_signature';
  /** Amount in USD */
  amount_usd: number;
  /** Whether gasless mode was used */
  gasless_used: boolean;
  /** Transaction signature (if confirmed) */
  transaction_signature?: string;
  /** Confirmation time in milliseconds */
  confirmed_in_ms?: number;
  /** Receipt URL */
  receipt_url?: string;
  /** If true, client must sign the transaction */
  requires_signature: boolean;
  /** Base64 encoded unsigned transaction (if requires_signature) */
  unsigned_transaction?: string;
  /** URL to submit signed transaction */
  submit_url?: string;
  /** Next steps for the client */
  next_steps: string;
}

