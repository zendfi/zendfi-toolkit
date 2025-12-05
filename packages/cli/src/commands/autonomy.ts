/**
 * Autonomous Delegation Commands
 * 
 * Commands:
 * - zendfi autonomy enable     Enable autonomous delegation for a wallet
 * - zendfi autonomy status     Check autonomy status
 * - zendfi autonomy revoke     Revoke autonomous delegation
 * - zendfi autonomy delegates  List autonomous delegates
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';

const ZENDFI_API_BASE = process.env.ZENDFI_API_URL || 'https://api.zendfi.tech/api/v1';

// ============================================
// Types
// ============================================

interface AutonomousDelegate {
  id: string;
  wallet_address: string;
  agent_id: string;
  max_per_day_usd: number;
  max_per_transaction_usd: number;
  allowed_merchants: string[] | null;
  allowed_categories: string[] | null;
  expires_at: string;
  is_revoked: boolean;
  created_at: string;
  updated_at: string;
  lit_action_ipfs_id?: string;
  encryption_method?: string;
}

interface AutonomyStatus {
  wallet_address: string;
  is_enabled: boolean;
  total_delegates: number;
  active_delegates: number;
  delegates: AutonomousDelegate[];
}

// ============================================
// Utilities
// ============================================

function getApiKey(): string | null {
  return process.env.ZENDFI_API_KEY || null;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

function formatDuration(expiresAt: string): string {
  const expires = new Date(expiresAt);
  const now = new Date();
  const diffMs = expires.getTime() - now.getTime();
  
  if (diffMs <= 0) return chalk.red('Expired');
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) return chalk.green(`${days}d ${hours % 24}h remaining`);
  return chalk.yellow(`${hours}h remaining`);
}

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// ============================================
// Enable Autonomy
// ============================================

export async function enableAutonomy(options: {
  wallet?: string;
  agentId?: string;
  maxPerDay?: number;
  maxPerTransaction?: number;
  duration?: number;
  merchants?: string;
  categories?: string;
}): Promise<void> {
  console.log(chalk.cyan.bold('\n🤖 Enable Autonomous Delegation\n'));

  const apiKey = getApiKey();
  if (!apiKey) {
    console.log(chalk.red('❌ No API key found!'));
    console.log(chalk.gray('\nSet your API key:'));
    console.log(chalk.cyan('  export ZENDFI_API_KEY=your_key_here'));
    return;
  }

  // Interactive prompts for missing options
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'wallet',
      message: 'User wallet address (Solana):',
      default: options.wallet,
      when: !options.wallet,
      validate: (input: string) => input.length >= 32 || 'Valid Solana address required',
    },
    {
      type: 'input',
      name: 'agentId',
      message: 'Agent identifier:',
      default: options.agentId,
      when: !options.agentId,
      validate: (input: string) => input.length > 0 || 'Agent ID required',
    },
    {
      type: 'number',
      name: 'maxPerDay',
      message: 'Max spending per day (USD):',
      default: options.maxPerDay || 100,
      when: !options.maxPerDay,
    },
    {
      type: 'number',
      name: 'maxPerTransaction',
      message: 'Max per transaction (USD):',
      default: options.maxPerTransaction || 50,
      when: !options.maxPerTransaction,
    },
    {
      type: 'number',
      name: 'duration',
      message: 'Duration (hours):',
      default: options.duration || 24,
      when: !options.duration,
    },
    {
      type: 'input',
      name: 'merchants',
      message: 'Allowed merchants (comma-separated, leave blank for all):',
      default: options.merchants || '',
      when: !options.merchants,
    },
    {
      type: 'list',
      name: 'categories',
      message: 'Allowed categories:',
      choices: [
        { name: 'All categories', value: '' },
        { name: 'Subscriptions only', value: 'subscriptions' },
        { name: 'Micro-payments only', value: 'micro_payments' },
        { name: 'Digital goods', value: 'digital_goods' },
        { name: 'Services', value: 'services' },
      ],
      when: !options.categories,
    },
  ]);

  const config = {
    wallet_address: options.wallet || answers.wallet,
    agent_id: options.agentId || answers.agentId,
    max_per_day_usd: options.maxPerDay || answers.maxPerDay,
    max_per_transaction_usd: options.maxPerTransaction || answers.maxPerTransaction,
    duration_hours: options.duration || answers.duration,
    allowed_merchants: (options.merchants || answers.merchants || '').split(',').filter(Boolean).map((s: string) => s.trim()),
    allowed_categories: (options.categories || answers.categories || '').split(',').filter(Boolean).map((s: string) => s.trim()),
  };

  // Show summary
  console.log('');
  console.log(chalk.gray('  ┌─────────────────────────────────────────┐'));
  console.log(chalk.gray('  │') + chalk.bold('  Delegation Summary                    ') + chalk.gray('│'));
  console.log(chalk.gray('  ├─────────────────────────────────────────┤'));
  console.log(chalk.gray('  │') + chalk.gray('  Wallet:      ') + chalk.white(truncateAddress(config.wallet_address).padEnd(21)) + chalk.gray('│'));
  console.log(chalk.gray('  │') + chalk.gray('  Agent:       ') + chalk.white(config.agent_id.padEnd(21)) + chalk.gray('│'));
  console.log(chalk.gray('  │') + chalk.gray('  Max/Day:     ') + chalk.green(`$${config.max_per_day_usd}`.padEnd(21)) + chalk.gray('│'));
  console.log(chalk.gray('  │') + chalk.gray('  Max/Tx:      ') + chalk.green(`$${config.max_per_transaction_usd}`.padEnd(21)) + chalk.gray('│'));
  console.log(chalk.gray('  │') + chalk.gray('  Duration:    ') + chalk.white(`${config.duration_hours}h`.padEnd(21)) + chalk.gray('│'));
  console.log(chalk.gray('  └─────────────────────────────────────────┘'));
  console.log('');

  // Confirm
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: chalk.yellow('⚠️  This grants spending authority. Continue?'),
      default: false,
    },
  ]);

  if (!confirm) {
    console.log(chalk.gray('\n  Cancelled.\n'));
    return;
  }

  const spinner = ora('Enabling autonomous delegation...').start();

  try {
    const response = await fetch(`${ZENDFI_API_BASE}/ai/autonomy/enable`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const delegate = await response.json() as AutonomousDelegate;
    spinner.succeed(chalk.green('Autonomous delegation enabled!'));

    console.log('');
    console.log(chalk.bold('  Delegate Details:'));
    console.log(chalk.gray('  ID:         ') + chalk.cyan(delegate.id));
    console.log(chalk.gray('  Expires:    ') + formatDuration(delegate.expires_at));
    console.log('');
    console.log(chalk.yellow('  ⚠️  The agent can now make payments within limits'));
    console.log('');
  } catch (error) {
    spinner.fail(chalk.red('Failed to enable autonomy'));
    console.error(chalk.gray('\nError:'), error instanceof Error ? error.message : error);
  }
}

// ============================================
// Check Autonomy Status
// ============================================

export async function checkAutonomyStatus(wallet: string): Promise<void> {
  console.log(chalk.cyan.bold('\n🔍 Autonomy Status\n'));

  const apiKey = getApiKey();
  if (!apiKey) {
    console.log(chalk.red('❌ No API key found!'));
    return;
  }

  const spinner = ora('Fetching autonomy status...').start();

  try {
    const response = await fetch(`${ZENDFI_API_BASE}/ai/autonomy/status/${wallet}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const status = await response.json() as AutonomyStatus;
    spinner.succeed(chalk.green('Status loaded'));

    console.log('');
    console.log(chalk.gray('  Wallet: ') + chalk.white(truncateAddress(status.wallet_address)));
    console.log(chalk.gray('  Status: ') + (status.is_enabled ? chalk.green('✓ Enabled') : chalk.red('✗ Disabled')));
    console.log(chalk.gray('  Active Delegates: ') + chalk.cyan(status.active_delegates.toString()));
    console.log('');

    if (status.delegates && status.delegates.length > 0) {
      console.log(chalk.bold('  Active Delegates:'));
      console.log(chalk.gray('  ─────────────────────────────────────────────────'));
      
      status.delegates.forEach((delegate, index) => {
        const statusIcon = delegate.is_revoked ? chalk.red('✗') : chalk.green('✓');
        console.log(`  ${index + 1}. ${statusIcon} ${chalk.cyan(delegate.agent_id)}`);
        console.log(chalk.gray(`     Max/day: $${delegate.max_per_day_usd} | Max/tx: $${delegate.max_per_transaction_usd}`));
        console.log(chalk.gray(`     ${formatDuration(delegate.expires_at)}`));
        console.log('');
      });
    } else {
      console.log(chalk.gray('  No active delegates'));
      console.log('');
    }
  } catch (error) {
    spinner.fail(chalk.red('Failed to fetch status'));
    console.error(chalk.gray('\nError:'), error instanceof Error ? error.message : error);
  }
}

// ============================================
// Revoke Autonomy
// ============================================

export async function revokeAutonomy(delegateId: string): Promise<void> {
  console.log(chalk.cyan.bold('\n🚫 Revoke Autonomous Delegation\n'));

  const apiKey = getApiKey();
  if (!apiKey) {
    console.log(chalk.red('❌ No API key found!'));
    return;
  }

  // Confirm
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Revoke delegation ${chalk.cyan(delegateId)}?`,
      default: false,
    },
  ]);

  if (!confirm) {
    console.log(chalk.gray('\n  Cancelled.\n'));
    return;
  }

  const spinner = ora('Revoking delegation...').start();

  try {
    const response = await fetch(`${ZENDFI_API_BASE}/ai/autonomy/revoke`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        delegate_id: delegateId,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    spinner.succeed(chalk.green('Delegation revoked!'));
    console.log('');
    console.log(chalk.gray('  The agent can no longer make payments'));
    console.log('');
  } catch (error) {
    spinner.fail(chalk.red('Failed to revoke delegation'));
    console.error(chalk.gray('\nError:'), error instanceof Error ? error.message : error);
  }
}

// ============================================
// List Delegates
// ============================================

export async function listDelegates(options: {
  wallet?: string;
  all?: boolean;
}): Promise<void> {
  console.log(chalk.cyan.bold('\n📋 Autonomous Delegates\n'));

  const apiKey = getApiKey();
  if (!apiKey) {
    console.log(chalk.red('❌ No API key found!'));
    return;
  }

  const spinner = ora('Fetching delegates...').start();

  try {
    const queryParams = new URLSearchParams();
    if (options.wallet) queryParams.set('wallet', options.wallet);
    if (options.all) queryParams.set('include_revoked', 'true');

    const url = `${ZENDFI_API_BASE}/ai/autonomy/delegates?${queryParams}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as { delegates?: AutonomousDelegate[] } | AutonomousDelegate[];
    const delegates = Array.isArray(data) ? data : (data.delegates || []);

    spinner.succeed(chalk.green(`Found ${delegates.length} delegate(s)`));

    if (delegates.length === 0) {
      console.log(chalk.gray('\n  No delegates found.'));
      console.log(chalk.gray('\n  Enable autonomy with:'));
      console.log(chalk.cyan('  zendfi autonomy enable\n'));
      return;
    }

    console.log('');
    console.log(chalk.gray('  Agent ID              Wallet           Max/Day    Expires'));
    console.log(chalk.gray('  ─────────────────────────────────────────────────────────────'));

    delegates.forEach((delegate: AutonomousDelegate) => {
      const statusIcon = delegate.is_revoked ? chalk.red('✗') : chalk.green('✓');
      const agentId = delegate.agent_id.padEnd(20).slice(0, 20);
      const wallet = truncateAddress(delegate.wallet_address).padEnd(16);
      const maxDay = `$${delegate.max_per_day_usd}`.padEnd(10);
      const expiry = formatDuration(delegate.expires_at);

      console.log(`  ${statusIcon} ${chalk.cyan(agentId)} ${wallet} ${chalk.green(maxDay)} ${expiry}`);
    });

    console.log('');
    if (!options.all) {
      console.log(chalk.gray('  Show all (including revoked): ') + chalk.cyan('zendfi autonomy delegates --all'));
      console.log('');
    }
  } catch (error) {
    spinner.fail(chalk.red('Failed to fetch delegates'));
    console.error(chalk.gray('\nError:'), error instanceof Error ? error.message : error);
  }
}
