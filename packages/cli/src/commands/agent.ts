/**
 * Agent Commands - Manage agent API keys and sessions
 * 
 * Commands:
 * - zendfi agent keys create     Create a new agent API key
 * - zendfi agent keys list       List all agent API keys
 * - zendfi agent keys revoke     Revoke an agent API key
 * - zendfi agent sessions create Create an agent session
 * - zendfi agent sessions list   List agent sessions
 * - zendfi agent sessions revoke Revoke an agent session
 * - zendfi agent analytics       View agent analytics
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';

const ZENDFI_API_BASE = process.env.ZENDFI_API_URL || 'https://api.zendfi.tech/api/v1';

// ============================================
// Types
// ============================================

interface AgentApiKey {
  id: string;
  key_prefix: string;
  full_key?: string;
  name: string;
  scopes: string[];
  rate_limit_per_hour: number;
  agent_metadata: Record<string, unknown>;
  created_at: string;
}

interface AgentSession {
  id: string;
  session_token?: string;
  agent_id: string;
  agent_name?: string;
  user_wallet: string;
  limits: {
    max_per_transaction?: number;
    max_per_day?: number;
    max_per_week?: number;
    max_per_month?: number;
    require_approval_above?: number;
  };
  is_active: boolean;
  created_at: string;
  expires_at: string;
  remaining_today: number;
  remaining_this_week: number;
  remaining_this_month: number;
}

interface AgentAnalytics {
  total_payments: number;
  total_volume_usd: number;
  average_payment_usd: number;
  success_rate: number;
  active_sessions: number;
  active_delegates: number;
  ppp_savings_usd: number;
}

// ============================================
// Utilities
// ============================================

function getApiKey(): string | null {
  return process.env.ZENDFI_API_KEY || null;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString();
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

const SCOPE_DESCRIPTIONS: Record<string, string> = {
  full: 'Full access to all operations',
  read_only: 'Read-only access to data',
  create_payments: 'Create and manage payments',
  manage_escrow: 'Create and manage escrow transactions',
  create_subscriptions: 'Create and manage subscriptions',
  manage_installments: 'Create and manage installment plans',
  read_analytics: 'Read analytics and reports',
};

// ============================================
// Agent Keys Commands
// ============================================

/**
 * Create a new agent API key
 */
export async function createAgentKey(options: {
  name?: string;
  agentId?: string;
  scopes?: string;
  rateLimit?: number;
}): Promise<void> {
  console.log(chalk.cyan.bold('\n🤖 Create Agent API Key\n'));

  const apiKey = getApiKey();
  if (!apiKey) {
    console.log(chalk.red('❌ No API key found!'));
    console.log(chalk.gray('\nSet your API key:'));
    console.log(chalk.cyan('  export ZENDFI_API_KEY=your_key_here'));
    return;
  }

  // Interactive prompts if not provided
  let name = options.name;
  let agentId = options.agentId;
  let scopes: string[] = options.scopes ? options.scopes.split(',') : [];
  let rateLimit = options.rateLimit || 1000;

  if (!name) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Agent name:',
        default: 'My AI Agent',
        validate: (input: string) => input.length > 0 || 'Name is required',
      },
    ]);
    name = answers.name;
  }

  if (!agentId) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'agentId',
        message: 'Agent ID (unique identifier):',
        default: name!.toLowerCase().replace(/\s+/g, '-'),
        validate: (input: string) => input.length > 0 || 'Agent ID is required',
      },
    ]);
    agentId = answers.agentId;
  }

  if (scopes.length === 0) {
    const scopeChoices = Object.entries(SCOPE_DESCRIPTIONS).map(([value, description]) => ({
      name: `${value} - ${description}`,
      value,
      checked: value === 'create_payments',
    }));

    const answers = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'scopes',
        message: 'Select permissions:',
        choices: scopeChoices,
        validate: (input: string[]) => input.length > 0 || 'At least one scope is required',
      },
    ]);
    scopes = answers.scopes;
  }

  if (!options.rateLimit) {
    const answers = await inquirer.prompt([
      {
        type: 'number',
        name: 'rateLimit',
        message: 'Rate limit (requests per hour):',
        default: 1000,
        validate: (input: number) => input > 0 || 'Rate limit must be positive',
      },
    ]);
    rateLimit = answers.rateLimit;
  }

  const spinner = ora('Creating agent API key...').start();

  try {
    const response = await fetch(`${ZENDFI_API_BASE}/agent-keys`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        agent_id: agentId,
        scopes,
        rate_limit_per_hour: rateLimit,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as AgentApiKey;
    spinner.succeed(chalk.green('Agent API key created!'));

    console.log('');
    console.log(chalk.bold('  Key Details:'));
    console.log(chalk.gray('  ID:         ') + chalk.white(data.id));
    console.log(chalk.gray('  Name:       ') + chalk.white(data.name));
    console.log(chalk.gray('  Scopes:     ') + chalk.white(scopes.join(', ')));
    console.log(chalk.gray('  Rate Limit: ') + chalk.white(`${rateLimit}/hour`));
    console.log('');
    console.log(chalk.yellow.bold('  ⚠️  IMPORTANT: Save this key now - it won\'t be shown again!'));
    console.log('');
    console.log(chalk.gray('  Full Key:   ') + chalk.green.bold(data.full_key));
    console.log('');
    console.log(chalk.gray('  Add to .env:'));
    console.log(chalk.cyan(`  ZENDFI_AGENT_KEY=${data.full_key}`));
    console.log('');
  } catch (error) {
    spinner.fail(chalk.red('Failed to create agent API key'));
    console.error(chalk.gray('\nError:'), error instanceof Error ? error.message : error);
  }
}

/**
 * List all agent API keys
 */
export async function listAgentKeys(): Promise<void> {
  console.log(chalk.cyan.bold('\n🤖 Agent API Keys\n'));

  const apiKey = getApiKey();
  if (!apiKey) {
    console.log(chalk.red('❌ No API key found!'));
    console.log(chalk.gray('\nSet your API key:'));
    console.log(chalk.cyan('  export ZENDFI_API_KEY=your_key_here'));
    return;
  }

  const spinner = ora('Fetching agent keys...').start();

  try {
    const response = await fetch(`${ZENDFI_API_BASE}/agent-keys`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as { keys?: AgentApiKey[] } | AgentApiKey[];
    const keys = Array.isArray(data) ? data : (data.keys || []);

    spinner.succeed(chalk.green(`Found ${keys.length} agent key${keys.length !== 1 ? 's' : ''}`));

    if (keys.length === 0) {
      console.log(chalk.gray('\nNo agent keys found. Create one with:'));
      console.log(chalk.cyan('  zendfi agent keys create\n'));
      return;
    }

    console.log('');
    keys.forEach((key: AgentApiKey, index: number) => {
      console.log(chalk.bold(`${index + 1}. ${key.name}`));
      console.log(chalk.gray('   ID:         ') + chalk.white(key.id));
      console.log(chalk.gray('   Prefix:     ') + chalk.white(key.key_prefix + '***'));
      console.log(chalk.gray('   Scopes:     ') + chalk.white(key.scopes.join(', ')));
      console.log(chalk.gray('   Rate Limit: ') + chalk.white(`${key.rate_limit_per_hour}/hour`));
      console.log(chalk.gray('   Created:    ') + chalk.white(formatDate(key.created_at)));
      console.log('');
    });
  } catch (error) {
    spinner.fail(chalk.red('Failed to fetch agent keys'));
    console.error(chalk.gray('\nError:'), error instanceof Error ? error.message : error);
  }
}

/**
 * Revoke an agent API key
 */
export async function revokeAgentKey(keyId: string): Promise<void> {
  console.log(chalk.cyan.bold('\n🤖 Revoke Agent API Key\n'));

  const apiKey = getApiKey();
  if (!apiKey) {
    console.log(chalk.red('❌ No API key found!'));
    return;
  }

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: chalk.yellow(`Are you sure you want to revoke key ${keyId}? This cannot be undone.`),
      default: false,
    },
  ]);

  if (!confirm) {
    console.log(chalk.gray('\nRevocation cancelled.'));
    return;
  }

  const spinner = ora('Revoking agent key...').start();

  try {
    const response = await fetch(`${ZENDFI_API_BASE}/agent-keys/${keyId}/revoke`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    spinner.succeed(chalk.green('Agent key revoked!'));
    console.log(chalk.gray('\nThe key can no longer be used for API calls.\n'));
  } catch (error) {
    spinner.fail(chalk.red('Failed to revoke agent key'));
    console.error(chalk.gray('\nError:'), error instanceof Error ? error.message : error);
  }
}

// ============================================
// Agent Sessions Commands
// ============================================

/**
 * Create an agent session
 */
export async function createAgentSession(options: {
  agentId?: string;
  wallet?: string;
  maxPerDay?: number;
  maxPerTransaction?: number;
  duration?: number;
}): Promise<void> {
  console.log(chalk.cyan.bold('\n🔐 Create Agent Session\n'));

  const apiKey = getApiKey();
  if (!apiKey) {
    console.log(chalk.red('❌ No API key found!'));
    return;
  }

  // Interactive prompts if not provided
  let agentId = options.agentId;
  let wallet = options.wallet;
  let maxPerDay = options.maxPerDay || 500;
  let maxPerTransaction = options.maxPerTransaction || 100;
  let duration = options.duration || 24;

  if (!agentId) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'agentId',
        message: 'Agent ID:',
        validate: (input: string) => input.length > 0 || 'Agent ID is required',
      },
    ]);
    agentId = answers.agentId;
  }

  if (!wallet) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'wallet',
        message: 'User wallet address:',
        validate: (input: string) => input.length > 20 || 'Valid Solana address required',
      },
    ]);
    wallet = answers.wallet;
  }

  if (!options.maxPerDay) {
    const answers = await inquirer.prompt([
      {
        type: 'number',
        name: 'maxPerDay',
        message: 'Max spending per day (USD):',
        default: 500,
      },
      {
        type: 'number',
        name: 'maxPerTransaction',
        message: 'Max per transaction (USD):',
        default: 100,
      },
      {
        type: 'number',
        name: 'duration',
        message: 'Session duration (hours):',
        default: 24,
        validate: (input: number) => (input >= 1 && input <= 168) || 'Duration must be 1-168 hours',
      },
    ]);
    maxPerDay = answers.maxPerDay;
    maxPerTransaction = answers.maxPerTransaction;
    duration = answers.duration;
  }

  const spinner = ora('Creating agent session...').start();

  try {
    const response = await fetch(`${ZENDFI_API_BASE}/ai/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: agentId,
        user_wallet: wallet,
        limits: {
          max_per_transaction: maxPerTransaction,
          max_per_day: maxPerDay,
        },
        duration_hours: duration,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as AgentSession;
    spinner.succeed(chalk.green('Agent session created!'));

    console.log('');
    console.log(chalk.bold('  Session Details:'));
    console.log(chalk.gray('  ID:            ') + chalk.white(data.id));
    console.log(chalk.gray('  Agent:         ') + chalk.white(data.agent_id));
    console.log(chalk.gray('  User Wallet:   ') + chalk.white(data.user_wallet));
    console.log(chalk.gray('  Max/Day:       ') + chalk.white(formatCurrency(maxPerDay)));
    console.log(chalk.gray('  Max/TX:        ') + chalk.white(formatCurrency(maxPerTransaction)));
    console.log(chalk.gray('  Expires:       ') + chalk.white(formatDate(data.expires_at)));
    console.log('');
    
    if (data.session_token) {
      console.log(chalk.yellow.bold('  ⚠️  Session Token (save this!):'));
      console.log(chalk.green.bold(`  ${data.session_token}`));
      console.log('');
    }
  } catch (error) {
    spinner.fail(chalk.red('Failed to create agent session'));
    console.error(chalk.gray('\nError:'), error instanceof Error ? error.message : error);
  }
}

/**
 * List agent sessions
 */
export async function listAgentSessions(): Promise<void> {
  console.log(chalk.cyan.bold('\n🔐 Agent Sessions\n'));

  const apiKey = getApiKey();
  if (!apiKey) {
    console.log(chalk.red('❌ No API key found!'));
    return;
  }

  const spinner = ora('Fetching agent sessions...').start();

  try {
    const response = await fetch(`${ZENDFI_API_BASE}/ai/sessions`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as { sessions?: AgentSession[] } | AgentSession[];
    const sessions = Array.isArray(data) ? data : (data.sessions || []);

    spinner.succeed(chalk.green(`Found ${sessions.length} session${sessions.length !== 1 ? 's' : ''}`));

    if (sessions.length === 0) {
      console.log(chalk.gray('\nNo sessions found. Create one with:'));
      console.log(chalk.cyan('  zendfi agent sessions create\n'));
      return;
    }

    console.log('');
    sessions.forEach((session: AgentSession, index: number) => {
      const isActive = session.is_active;
      const statusBadge = isActive ? chalk.green('● ACTIVE') : chalk.gray('○ EXPIRED');

      console.log(chalk.bold(`${index + 1}. ${session.agent_id} ${statusBadge}`));
      console.log(chalk.gray('   ID:          ') + chalk.white(session.id));
      console.log(chalk.gray('   Wallet:      ') + chalk.white(session.user_wallet.slice(0, 8) + '...' + session.user_wallet.slice(-4)));
      console.log(chalk.gray('   Remaining:   ') + chalk.white(`${formatCurrency(session.remaining_today)} today`));
      console.log(chalk.gray('   Expires:     ') + chalk.white(formatDate(session.expires_at)));
      console.log('');
    });
  } catch (error) {
    spinner.fail(chalk.red('Failed to fetch agent sessions'));
    console.error(chalk.gray('\nError:'), error instanceof Error ? error.message : error);
  }
}

/**
 * Revoke an agent session
 */
export async function revokeAgentSession(sessionId: string): Promise<void> {
  console.log(chalk.cyan.bold('\n🔐 Revoke Agent Session\n'));

  const apiKey = getApiKey();
  if (!apiKey) {
    console.log(chalk.red('❌ No API key found!'));
    return;
  }

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: chalk.yellow(`Revoke session ${sessionId}? Agent will no longer be able to make payments.`),
      default: false,
    },
  ]);

  if (!confirm) {
    console.log(chalk.gray('\nRevocation cancelled.'));
    return;
  }

  const spinner = ora('Revoking session...').start();

  try {
    const response = await fetch(`${ZENDFI_API_BASE}/ai/sessions/${sessionId}/revoke`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    spinner.succeed(chalk.green('Session revoked!'));
    console.log(chalk.gray('\nThe agent can no longer make payments with this session.\n'));
  } catch (error) {
    spinner.fail(chalk.red('Failed to revoke session'));
    console.error(chalk.gray('\nError:'), error instanceof Error ? error.message : error);
  }
}

// ============================================
// Agent Analytics Command
// ============================================

/**
 * Show agent analytics
 */
export async function showAgentAnalytics(): Promise<void> {
  console.log(chalk.cyan.bold('\n📊 Agent Analytics\n'));

  const apiKey = getApiKey();
  if (!apiKey) {
    console.log(chalk.red('❌ No API key found!'));
    return;
  }

  const spinner = ora('Fetching analytics...').start();

  try {
    const response = await fetch(`${ZENDFI_API_BASE}/analytics/agents`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as AgentAnalytics;
    spinner.succeed(chalk.green('Analytics loaded!'));

    console.log('');
    console.log(chalk.bold('  Overview:'));
    console.log(chalk.gray('  Total Payments:      ') + chalk.white(data.total_payments.toLocaleString()));
    console.log(chalk.gray('  Total Volume:        ') + chalk.green(formatCurrency(data.total_volume_usd)));
    console.log(chalk.gray('  Average Payment:     ') + chalk.white(formatCurrency(data.average_payment_usd)));
    console.log(chalk.gray('  Success Rate:        ') + chalk.white(`${(data.success_rate * 100).toFixed(1)}%`));
    console.log('');
    console.log(chalk.bold('  Active:'));
    console.log(chalk.gray('  Sessions:            ') + chalk.white(data.active_sessions));
    console.log(chalk.gray('  Autonomous Delegates:') + chalk.white(data.active_delegates));
    console.log('');
    console.log(chalk.bold('  Savings:'));
    console.log(chalk.gray('  PPP Discounts Given: ') + chalk.green(formatCurrency(data.ppp_savings_usd)));
    console.log('');
  } catch (error) {
    spinner.fail(chalk.red('Failed to fetch analytics'));
    console.error(chalk.gray('\nError:'), error instanceof Error ? error.message : error);
  }
}
