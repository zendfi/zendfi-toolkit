import fetch from 'cross-fetch';
import { createHmac, timingSafeEqual } from 'crypto';
import type {
  ZendFiConfig,
  CreatePaymentRequest,
  Payment,
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
  CreateInvoiceRequest,
  Invoice,
  CreateSubAccountRequest,
  SubAccount,
  ListSubAccountsResponse,
  SubAccountBalance,
  MintDelegationTokenRequest,
  MintDelegationTokenResponse,
  MintChildDelegationTokenRequest,
  MintChildDelegationTokenResponse,
  FreezeSubAccountRequest,
  UnfreezeSubAccountRequest,
  DrainSubAccountRequest,
  SubAccountWithdrawRequest,
  SubAccountWithdrawToBankRequest,
  SubAccountTransferResponse,
  SubAccountWithdrawToBankResponse,
  CreateSubAccountAutomationTokenRequest,
  CreateSubAccountAutomationTokenResponse,
  RevokeSubAccountAutomationTokenResponse,
  CreateSubAccountSigningGrantRequest,
  CreateSubAccountSigningGrantResponse,
  RevokeSubAccountSigningGrantResponse,
  StartSubAccountSigningGrantBrowserIntentRequest,
  StartSubAccountSigningGrantBrowserIntentResponse,
  PollSubAccountSigningGrantBrowserIntentRequest,
  PollSubAccountSigningGrantBrowserIntentResponse,
  CreateSubAccountPolicyRequest,
  CreateSubAccountPolicyResponse,
  DryRunSubAccountPolicyRequest,
  DryRunSubAccountPolicyResponse,
  SubAccountPolicy,
  CreateWebhookTriggerSubscriptionRequest,
  CreateWebhookTriggerSubscriptionResponse,
  ListWebhookTriggerSubscriptionsResponse,
  CreateExecutionIntentRequest,
  CreateExecutionIntentResponse,
  ApproveExecutionIntentRequest,
  ApproveExecutionIntentResponse,
  ReleaseExecutionIntentBySignalRequest,
  ReleaseExecutionIntentBySignalResponse,
  CreateBalanceRuleRequest,
  CreateBalanceRuleResponse,
} from './types';
import { ConfigLoader, generateIdempotencyKey, sleep } from './utils';
import { createZendFiError, isZendFiError } from './errors';
import { createInterceptors, type Interceptors, type RequestConfig, type ResponseData } from './interceptors';

/**
 * ZendFi SDK Client.
 * Zero-config TypeScript SDK for crypto payments
 */
export class ZendFiClient {
  private config: Required<ZendFiConfig>;
  public readonly interceptors: Interceptors;

  constructor(options?: Partial<ZendFiConfig>) {
    this.config = ConfigLoader.load(options);
    ConfigLoader.validateApiKey(this.config.apiKey);
    this.interceptors = createInterceptors();
    
    // Log initialization info
    if (this.config.environment === 'development' || this.config.debug) {
      console.log(
        `✓ ZendFi SDK initialized in ${this.config.mode} mode (${
          this.config.mode === 'test' ? 'devnet' : 'mainnet'
        })`
      );
      
      if (this.config.debug) {
        console.log('[ZendFi] Debug mode enabled');
      }
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
    const normalizedSplitRecipients = request.split_recipients?.map((recipient) => {
      if (recipient.recipient_type !== 'bank_account') {
        return recipient;
      }

      const bankIdentifier =
        recipient.recipient_bank_id ||
        recipient.recipient_bank ||
        recipient.bank_identifier ||
        recipient.bank_code;

      if (!bankIdentifier) {
        throw new Error(
          'Bank-account split recipient requires a bank identifier. Provide recipient_bank_id, recipient_bank, bank_identifier, or bank_code.'
        );
      }

      return {
        ...recipient,
        recipient_bank_id: bankIdentifier,
      };
    });

    const response = await this.request<PaymentLink>('POST', '/api/v1/payment-links', {
      ...request,
      split_recipients: normalizedSplitRecipients,
      currency: request.currency || 'USD',
      token: request.token || 'USDC',
      onramp: request.onramp || false,
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
   * Create a sub-account with dedicated MPC wallet.
   */
  async createSubAccount(request: CreateSubAccountRequest): Promise<SubAccount> {
    return this.request<SubAccount>('POST', '/api/v1/subaccounts', request);
  }

  /**
   * List all sub-accounts for authenticated merchant.
   */
  async listSubAccounts(): Promise<SubAccount[]> {
    const response = await this.request<ListSubAccountsResponse>('GET', '/api/v1/subaccounts');
    return response.subaccounts || [];
  }

  /**
   * Get sub-account details by id or external id.
   */
  async getSubAccount(subAccountId: string): Promise<SubAccount> {
    return this.request<SubAccount>('GET', `/api/v1/subaccounts/${subAccountId}`);
  }

  /**
   * Get sub-account balances and accrued yield snapshot.
   */
  async getSubAccountBalance(subAccountId: string): Promise<SubAccountBalance> {
    return this.request<SubAccountBalance>('GET', `/api/v1/subaccounts/${subAccountId}/balance`);
  }

  /**
   * Mint a scoped delegation token for a sub-account.
   */
  async mintSubAccountDelegationToken(
    subAccountId: string,
    request: MintDelegationTokenRequest
  ): Promise<MintDelegationTokenResponse> {
    return this.request<MintDelegationTokenResponse>(
      'POST',
      `/api/v1/subaccounts/${subAccountId}/session-key`,
      request
    );
  }

  /**
   * Mint child delegation token from an existing parent delegation token with attenuation.
   */
  async mintSubAccountChildDelegationToken(
    subAccountId: string,
    request: MintChildDelegationTokenRequest
  ): Promise<MintChildDelegationTokenResponse> {
    return this.request<MintChildDelegationTokenResponse>(
      'POST',
      `/api/v1/subaccounts/${subAccountId}/session-key/child`,
      request
    );
  }

  /**
   * Freeze sub-account. Frozen accounts block all activity.
   */
  async freezeSubAccount(subAccountId: string, request: FreezeSubAccountRequest = {}): Promise<{
    success: boolean;
    status: string;
    subaccount_id: string;
  }> {
    return this.request('POST', `/api/v1/subaccounts/${subAccountId}/freeze`, request);
  }

  /**
   * Unfreeze sub-account and return it to active state.
   */
  async unfreezeSubAccount(subAccountId: string, request: UnfreezeSubAccountRequest = {}): Promise<{
    success: boolean;
    status: string;
    subaccount_id: string;
    note: string;
  }> {
    return this.request('POST', `/api/v1/subaccounts/${subAccountId}/unfreeze`, request);
  }

  /**
   * Drain funds from sub-account back to merchant wallet.
   */
  async drainSubAccount(
    subAccountId: string,
    request: DrainSubAccountRequest
  ): Promise<SubAccountTransferResponse> {
    return this.request<SubAccountTransferResponse>(
      'POST',
      `/api/v1/subaccounts/${subAccountId}/drain`,
      request
    );
  }

  /**
   * Withdraw from sub-account to external address.
   */
  async withdrawFromSubAccount(
    subAccountId: string,
    request: SubAccountWithdrawRequest
  ): Promise<SubAccountTransferResponse> {
    return this.request<SubAccountTransferResponse>(
      'POST',
      `/api/v1/subaccounts/${subAccountId}/withdraw`,
      request
    );
  }

  /**
   * Withdraw from sub-account directly to a bank account via PAJ offramp.
   * This endpoint mirrors split-flow proxy-email OTP automation server-side.
   */
  async withdrawSubAccountToBank(
    subAccountId: string,
    request: SubAccountWithdrawToBankRequest
  ): Promise<SubAccountWithdrawToBankResponse> {
    const bankIdentifier = request.bank_id || request.bank_identifier || request.bank_code;
    if (!bankIdentifier) {
      throw new Error('bank_id is required (or provide bank_identifier/bank_code).');
    }

    return this.request<SubAccountWithdrawToBankResponse>(
      'POST',
      `/api/v1/subaccounts/${subAccountId}/withdraw-bank`,
      {
        ...request,
        bank_id: bankIdentifier,
      }
    );
  }

  /**
   * Mint an automation token for bounded headless sub-account bank withdrawals.
   * This endpoint requires merchant session auth (dashboard context).
   */
  async createSubAccountAutomationToken(
    request: CreateSubAccountAutomationTokenRequest
  ): Promise<CreateSubAccountAutomationTokenResponse> {
    return this.request<CreateSubAccountAutomationTokenResponse>(
      'POST',
      '/api/v1/merchants/me/subaccounts/automation-tokens',
      request
    );
  }

  /**
   * Revoke a previously minted sub-account automation token.
   * This endpoint requires merchant session auth (dashboard context).
   */
  async revokeSubAccountAutomationToken(
    tokenId: string
  ): Promise<RevokeSubAccountAutomationTokenResponse> {
    return this.request<RevokeSubAccountAutomationTokenResponse>(
      'POST',
      `/api/v1/merchants/me/subaccounts/automation-tokens/${tokenId}/revoke`
    );
  }

  /**
   * Mint a signing grant for bounded headless sub-account signing.
   * This endpoint requires merchant session auth (dashboard context).
   */
  async createSubAccountSigningGrant(
    request: CreateSubAccountSigningGrantRequest
  ): Promise<CreateSubAccountSigningGrantResponse> {
    return this.request<CreateSubAccountSigningGrantResponse>(
      'POST',
      '/api/v1/merchants/me/subaccounts/signing-grants',
      request
    );
  }

  /**
   * Start browser-mediated passkey approval intent for signing grant minting.
   * Recommended flow for CLI/SDK integrations.
   */
  async startSubAccountSigningGrantBrowserIntent(
    request: StartSubAccountSigningGrantBrowserIntentRequest
  ): Promise<StartSubAccountSigningGrantBrowserIntentResponse> {
    return this.request<StartSubAccountSigningGrantBrowserIntentResponse>(
      'POST',
      '/api/v1/subaccounts/signing-grants/browser-intents/start',
      request
    );
  }

  /**
   * Poll signing-grant browser intent until completed.
   * Returns approved grant material exactly once when available.
   */
  async pollSubAccountSigningGrantBrowserIntent(
    request: PollSubAccountSigningGrantBrowserIntentRequest
  ): Promise<PollSubAccountSigningGrantBrowserIntentResponse> {
    return this.request<PollSubAccountSigningGrantBrowserIntentResponse>(
      'POST',
      '/api/v1/subaccounts/signing-grants/browser-intents/poll',
      request
    );
  }

  /**
   * Revoke a previously minted signing grant.
   * This endpoint requires merchant session auth (dashboard context).
   */
  async revokeSubAccountSigningGrant(
    grantId: string
  ): Promise<RevokeSubAccountSigningGrantResponse> {
    return this.request<RevokeSubAccountSigningGrantResponse>(
      'POST',
      `/api/v1/merchants/me/subaccounts/signing-grants/${grantId}/revoke`
    );
  }

  /**
   * Create a versioned sub-account policy document.
   */
  async createSubAccountPolicy(
    request: CreateSubAccountPolicyRequest
  ): Promise<CreateSubAccountPolicyResponse> {
    return this.request<CreateSubAccountPolicyResponse>(
      'POST',
      '/api/v1/merchants/me/subaccounts/policies',
      request
    );
  }

  /**
   * Evaluate a policy document without persisting it.
   */
  async dryRunSubAccountPolicy(
    request: DryRunSubAccountPolicyRequest
  ): Promise<DryRunSubAccountPolicyResponse> {
    return this.request<DryRunSubAccountPolicyResponse>(
      'POST',
      '/api/v1/merchants/me/subaccounts/policies/dry-run',
      request
    );
  }

  /**
   * Fetch a sub-account policy by id.
   */
  async getSubAccountPolicy(policyId: string): Promise<SubAccountPolicy> {
    return this.request<SubAccountPolicy>(
      'GET',
      `/api/v1/merchants/me/subaccounts/policies/${policyId}`
    );
  }

  /**
   * Create a reactive webhook trigger subscription.
   */
  async createSubAccountWebhookTriggerSubscription(
    request: CreateWebhookTriggerSubscriptionRequest
  ): Promise<CreateWebhookTriggerSubscriptionResponse> {
    return this.request<CreateWebhookTriggerSubscriptionResponse>(
      'POST',
      '/api/v1/merchants/me/subaccounts/webhook-triggers',
      request
    );
  }

  /**
   * List webhook trigger subscriptions.
   */
  async listSubAccountWebhookTriggerSubscriptions(): Promise<ListWebhookTriggerSubscriptionsResponse> {
    return this.request<ListWebhookTriggerSubscriptionsResponse>(
      'GET',
      '/api/v1/merchants/me/subaccounts/webhook-triggers'
    );
  }

  /**
   * Create an execution intent.
   */
  async createSubAccountExecutionIntent(
    request: CreateExecutionIntentRequest
  ): Promise<CreateExecutionIntentResponse> {
    return this.request<CreateExecutionIntentResponse>(
      'POST',
      '/api/v1/merchants/me/subaccounts/execution-intents',
      request
    );
  }

  /**
   * Approve or reject an execution intent.
   */
  async approveSubAccountExecutionIntent(
    intentId: string,
    request: ApproveExecutionIntentRequest = {}
  ): Promise<ApproveExecutionIntentResponse> {
    return this.request<ApproveExecutionIntentResponse>(
      'POST',
      `/api/v1/merchants/me/subaccounts/execution-intents/${intentId}/approve`,
      request
    );
  }

  /**
   * Release an execution intent by webhook signal token.
   */
  async releaseSubAccountExecutionIntentBySignal(
    request: ReleaseExecutionIntentBySignalRequest
  ): Promise<ReleaseExecutionIntentBySignalResponse> {
    return this.request<ReleaseExecutionIntentBySignalResponse>(
      'POST',
      '/api/v1/subaccounts/execution-intents/release',
      request
    );
  }

  /**
   * Create sub-account balance rule automation.
   */
  async createSubAccountBalanceRule(
    request: CreateBalanceRuleRequest
  ): Promise<CreateBalanceRuleResponse> {
    return this.request<CreateBalanceRuleResponse>(
      'POST',
      '/api/v1/merchants/me/subaccounts/balance-rules',
      request
    );
  }

  /**
   * Close sub-account and revoke active delegation tokens.
   */
  async closeSubAccount(subAccountId: string): Promise<{
    success: boolean;
    status: string;
    subaccount_id: string;
  }> {
    return this.request('DELETE', `/api/v1/subaccounts/${subAccountId}`);
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
      const error = err as Error | undefined;
      if (this.config.environment === 'development') {
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
      }
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }

  /**
   * Make an HTTP request with retry logic, interceptors, and debug logging
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

    const startTime = Date.now();

    try {
      const url = `${this.config.baseURL}${endpoint}`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      };

      if (idempotencyKey) {
        headers['Idempotency-Key'] = idempotencyKey;
      }

      let requestConfig: RequestConfig = {
        method,
        url,
        headers,
        body: data,
      };

      if (this.interceptors.request.has()) {
        requestConfig = await this.interceptors.request.execute(requestConfig);
      }

      if (this.config.debug) {
        console.log(`[ZendFi] ${method} ${endpoint}`);
        if (data) {
          console.log('[ZendFi] Request:', JSON.stringify(data, null, 2));
        }
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(requestConfig.url, {
        method: requestConfig.method,
        headers: requestConfig.headers,
        body: requestConfig.body ? JSON.stringify(requestConfig.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let body: any;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      const duration = Date.now() - startTime;

      if (!response.ok) {
        const error = createZendFiError(response.status, body);

        if (this.config.debug) {
          console.error(`[ZendFi] ❌ ${response.status} ${response.statusText} (${duration}ms)`);
          console.error(`[ZendFi] Error:`, error.toString());
        }

        // Retry logic for 5xx errors
        if (response.status >= 500 && attempt < this.config.retries) {
          const delay = Math.pow(2, attempt) * 1000;
          
          if (this.config.debug) {
            console.log(`[ZendFi] Retrying in ${delay}ms... (attempt ${attempt + 1}/${this.config.retries})`);
          }
          
          await sleep(delay);
          return this.request<T>(method, endpoint, data, {
            idempotencyKey,
            attempt: attempt + 1,
          });
        }

        if (this.interceptors.error.has()) {
          const interceptedError = await this.interceptors.error.execute(error);
          throw interceptedError;
        }

        throw error;
      }

      if (this.config.debug) {
        console.log(`[ZendFi] ✓ ${response.status} ${response.statusText} (${duration}ms)`);
        if (body) {
          console.log('[ZendFi] Response:', JSON.stringify(body, null, 2));
        }
      }

      const headersObj: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headersObj[key] = value;
      });
      
      let responseData: ResponseData = {
        status: response.status,
        statusText: response.statusText,
        headers: headersObj,
        data: body,
        config: requestConfig,
      };

      if (this.interceptors.response.has()) {
        responseData = await this.interceptors.response.execute(responseData);
      }

      return responseData.data as T;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        const timeoutError = createZendFiError(0, {}, `Request timeout after ${this.config.timeout}ms`);
        
        if (this.config.debug) {
          console.error(`[ZendFi] ❌ Timeout (${this.config.timeout}ms)`);
        }
        
        throw timeoutError;
      }

      if (attempt < this.config.retries && (error.message?.includes('fetch') || error.message?.includes('network'))) {
        const delay = Math.pow(2, attempt) * 1000;
        
        if (this.config.debug) {
          console.log(`[ZendFi] Network error, retrying in ${delay}ms... (attempt ${attempt + 1}/${this.config.retries})`);
        }
        
        await sleep(delay);
        return this.request<T>(method, endpoint, data, {
          idempotencyKey,
          attempt: attempt + 1,
        });
      }

      if (isZendFiError(error)) {
        throw error;
      }

      const wrappedError = createZendFiError(0, {}, error.message || 'An unknown error occurred');
      
      if (this.config.debug) {
        console.error(`[ZendFi] ❌ Unexpected error:`, error);
      }
      
      throw wrappedError;
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
