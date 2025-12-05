/**
 * Agent API - Manage agent API keys and sessions
 * 
 * @example
 * ```typescript
 * // Create an agent API key
 * const agentKey = await zendfi.agent.createKey({
 *   name: 'Shopping Assistant',
 *   agent_id: 'shopping-assistant-v1',
 *   scopes: ['create_payments', 'read_analytics'],
 *   rate_limit_per_hour: 1000,
 * });
 * 
 * // Create an agent session with spending limits
 * const session = await zendfi.agent.createSession({
 *   agent_id: 'shopping-assistant-v1',
 *   user_wallet: 'Hx7B...abc',
 *   limits: {
 *     max_per_transaction: 100,
 *     max_per_day: 500,
 *   },
 *   duration_hours: 24,
 * });
 * ```
 */

import type {
  AgentApiKey,
  CreateAgentApiKeyRequest,
  AgentSession,
  CreateAgentSessionRequest,
  AgentAnalytics,
} from '../types';

export type RequestFn = <T>(method: string, endpoint: string, data?: any) => Promise<T>;

export class AgentAPI {
  constructor(private request: RequestFn) {}

  // ============================================
  // Agent API Keys
  // ============================================

  /**
   * Create a new agent API key with scoped permissions
   * 
   * Agent keys (prefixed with `zai_`) have limited permissions compared to
   * merchant keys. This enables safe delegation to AI agents.
   * 
   * @param request - Agent key configuration
   * @returns The created agent key (full_key only returned on creation!)
   * 
   * @example
   * ```typescript
   * const agentKey = await zendfi.agent.createKey({
   *   name: 'Shopping Assistant',
   *   agent_id: 'shopping-assistant-v1',
   *   scopes: ['create_payments'],
   *   rate_limit_per_hour: 500,
   * });
   * 
   * // IMPORTANT: Save the full_key now - it won't be shown again!
   * console.log(agentKey.full_key); // => "zai_test_abc123..."
   * ```
   */
  async createKey(request: CreateAgentApiKeyRequest): Promise<AgentApiKey> {
    return this.request<AgentApiKey>('POST', '/api/v1/agent-keys', {
      name: request.name,
      agent_id: request.agent_id,
      agent_name: request.agent_name,
      scopes: request.scopes || ['create_payments'],
      rate_limit_per_hour: request.rate_limit_per_hour || 1000,
      metadata: request.metadata,
    });
  }

  /**
   * List all agent API keys for the merchant
   * 
   * @returns Array of agent API keys (without full_key for security)
   * 
   * @example
   * ```typescript
   * const keys = await zendfi.agent.listKeys();
   * keys.forEach(key => {
   *   console.log(`${key.name}: ${key.key_prefix}*** (${key.scopes.join(', ')})`);
   * });
   * ```
   */
  async listKeys(): Promise<AgentApiKey[]> {
    const response = await this.request<{ keys: AgentApiKey[] } | AgentApiKey[]>(
      'GET',
      '/api/v1/agent-keys'
    );
    // Handle both array and object response formats
    return Array.isArray(response) ? response : response.keys;
  }

  /**
   * Revoke an agent API key
   * 
   * Once revoked, the key cannot be used for any API calls.
   * This action is irreversible.
   * 
   * @param keyId - UUID of the agent key to revoke
   * 
   * @example
   * ```typescript
   * await zendfi.agent.revokeKey('ak_123...');
   * console.log('Agent key revoked');
   * ```
   */
  async revokeKey(keyId: string): Promise<void> {
    await this.request<{ success: boolean }>('POST', `/api/v1/agent-keys/${keyId}/revoke`);
  }

  // ============================================
  // Agent Sessions
  // ============================================

  /**
   * Create an agent session with spending limits
   * 
   * Sessions provide time-bounded authorization for agents to make payments
   * on behalf of users, with configurable spending limits.
   * 
   * @param request - Session configuration
   * @returns The created session with token
   * 
   * @example
   * ```typescript
   * const session = await zendfi.agent.createSession({
   *   agent_id: 'shopping-assistant-v1',
   *   agent_name: 'Shopping Assistant',
   *   user_wallet: 'Hx7B...abc',
   *   limits: {
   *     max_per_transaction: 100,
   *     max_per_day: 500,
   *     require_approval_above: 50,
   *   },
   *   duration_hours: 24,
   * });
   * 
   * // Use session_token for subsequent API calls
   * console.log(session.session_token); // => "zai_session_..."
   * ```
   */
  async createSession(request: CreateAgentSessionRequest): Promise<AgentSession> {
    return this.request<AgentSession>('POST', '/api/v1/ai/sessions', {
      agent_id: request.agent_id,
      agent_name: request.agent_name,
      user_wallet: request.user_wallet,
      limits: request.limits || {
        max_per_transaction: 1000,
        max_per_day: 5000,
        max_per_week: 20000,
        max_per_month: 50000,
        require_approval_above: 500,
      },
      allowed_merchants: request.allowed_merchants,
      duration_hours: request.duration_hours || 24,
      metadata: request.metadata,
    });
  }

  /**
   * List all agent sessions
   * 
   * @returns Array of agent sessions (both active and expired)
   * 
   * @example
   * ```typescript
   * const sessions = await zendfi.agent.listSessions();
   * const activeSessions = sessions.filter(s => s.is_active);
   * console.log(`${activeSessions.length} active sessions`);
   * ```
   */
  async listSessions(): Promise<AgentSession[]> {
    const response = await this.request<{ sessions: AgentSession[] } | AgentSession[]>(
      'GET',
      '/api/v1/ai/sessions'
    );
    return Array.isArray(response) ? response : response.sessions;
  }

  /**
   * Get a specific agent session by ID
   * 
   * @param sessionId - UUID of the session
   * @returns The session details with remaining limits
   * 
   * @example
   * ```typescript
   * const session = await zendfi.agent.getSession('sess_123...');
   * console.log(`Remaining today: $${session.remaining_today}`);
   * console.log(`Expires: ${session.expires_at}`);
   * ```
   */
  async getSession(sessionId: string): Promise<AgentSession> {
    return this.request<AgentSession>('GET', `/api/v1/ai/sessions/${sessionId}`);
  }

  /**
   * Revoke an agent session
   * 
   * Immediately invalidates the session, preventing any further payments.
   * This action is irreversible.
   * 
   * @param sessionId - UUID of the session to revoke
   * 
   * @example
   * ```typescript
   * await zendfi.agent.revokeSession('sess_123...');
   * console.log('Session revoked - agent can no longer make payments');
   * ```
   */
  async revokeSession(sessionId: string): Promise<void> {
    await this.request<{ success: boolean }>('POST', `/api/v1/ai/sessions/${sessionId}/revoke`);
  }

  // ============================================
  // Agent Analytics
  // ============================================

  /**
   * Get analytics for all agent activity
   * 
   * @returns Comprehensive analytics including payments, success rate, and PPP savings
   * 
   * @example
   * ```typescript
   * const analytics = await zendfi.agent.getAnalytics();
   * console.log(`Total volume: $${analytics.total_volume_usd}`);
   * console.log(`Success rate: ${(analytics.success_rate * 100).toFixed(1)}%`);
   * console.log(`PPP savings: $${analytics.ppp_savings_usd}`);
   * ```
   */
  async getAnalytics(): Promise<AgentAnalytics> {
    return this.request<AgentAnalytics>('GET', '/api/v1/analytics/agents');
  }
}
