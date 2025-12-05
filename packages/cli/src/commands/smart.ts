/**
 * Smart Payment Commands
 * 
 * Commands:
 * - zendfi smart create    Create a smart payment with all optimizations
 * - zendfi smart simulate  Simulate a smart payment
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';

const ZENDFI_API_BASE = process.env.ZENDFI_API_URL || 'https://api.zendfi.tech/api/v1';

// ============================================
// Types
// ============================================

interface SmartPaymentRequest {
  amount_usd: number;
  wallet_address: string;
  merchant_id: string;
  description?: string;
  country_code?: string;
  enable_ppp?: boolean;
  agent_id?: string;
  use_session?: boolean;
  metadata?: Record<string, string>;
}

interface SmartPaymentResponse {
  id: string;
  status: string;
  original_amount_usd: number;
  final_amount_usd: number;
  ppp_discount_applied: boolean;
  ppp_factor?: number;
  country_code?: string;
  session_used: boolean;
  agent_id?: string;
  wallet_address: string;
  merchant_id: string;
  checkout_url?: string;
  payment_address?: string;
  token_mint?: string;
  expires_at: string;
  created_at: string;
}

// ============================================
// Utilities
// ============================================

function getApiKey(): string | null {
  return process.env.ZENDFI_API_KEY || null;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getStatusBadge(status: string): string {
  switch (status.toLowerCase()) {
    case 'pending': return chalk.yellow('● PENDING');
    case 'processing': return chalk.blue('● PROCESSING');
    case 'completed': return chalk.green('● COMPLETED');
    case 'failed': return chalk.red('● FAILED');
    case 'cancelled': return chalk.gray('● CANCELLED');
    default: return chalk.gray(`● ${status.toUpperCase()}`);
  }
}

// ============================================
// Create Smart Payment
// ============================================

export async function createSmartPayment(options: {
  amount?: number;
  wallet?: string;
  merchant?: string;
  description?: string;
  country?: string;
  ppp?: boolean;
  agentId?: string;
  useSession?: boolean;
}): Promise<void> {
  console.log(chalk.cyan.bold('\n⚡ Create Smart Payment\n'));
  console.log(chalk.gray('  Smart payments automatically apply PPP discounts'));
  console.log(chalk.gray('  and use agent sessions when available.\n'));

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
      type: 'number',
      name: 'amount',
      message: 'Payment amount (USD):',
      default: options.amount || 10,
      when: !options.amount,
      validate: (input: number) => input > 0 || 'Amount must be positive',
    },
    {
      type: 'input',
      name: 'wallet',
      message: 'Payer wallet address:',
      default: options.wallet,
      when: !options.wallet,
      validate: (input: string) => input.length >= 32 || 'Valid Solana address required',
    },
    {
      type: 'input',
      name: 'merchant',
      message: 'Merchant ID:',
      default: options.merchant || 'default',
      when: !options.merchant,
    },
    {
      type: 'input',
      name: 'description',
      message: 'Payment description:',
      default: options.description || 'Smart payment',
      when: !options.description,
    },
    {
      type: 'input',
      name: 'country',
      message: 'Country code for PPP (e.g., BR, IN, or leave blank):',
      default: options.country || '',
      when: options.country === undefined,
    },
    {
      type: 'confirm',
      name: 'ppp',
      message: 'Apply PPP pricing?',
      default: options.ppp !== false,
      when: options.ppp === undefined,
    },
    {
      type: 'input',
      name: 'agentId',
      message: 'Agent ID (leave blank for none):',
      default: options.agentId || '',
      when: options.agentId === undefined,
    },
    {
      type: 'confirm',
      name: 'useSession',
      message: 'Use existing agent session if available?',
      default: options.useSession !== false,
      when: options.useSession === undefined && options.agentId,
    },
  ]);

  const config: SmartPaymentRequest = {
    amount_usd: options.amount || answers.amount,
    wallet_address: options.wallet || answers.wallet,
    merchant_id: options.merchant || answers.merchant || 'default',
    description: options.description || answers.description,
    country_code: (options.country || answers.country || '').toUpperCase() || undefined,
    enable_ppp: options.ppp !== undefined ? options.ppp : (answers.ppp !== false),
    agent_id: options.agentId || answers.agentId || undefined,
    use_session: options.useSession !== undefined ? options.useSession : answers.useSession,
  };

  // Clean up undefined values
  Object.keys(config).forEach(key => {
    const k = key as keyof SmartPaymentRequest;
    if (config[k] === undefined || config[k] === '') {
      delete config[k];
    }
  });

  const spinner = ora('Creating smart payment...').start();

  try {
    const response = await fetch(`${ZENDFI_API_BASE}/ai/smart-payments`, {
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

    const payment = await response.json() as SmartPaymentResponse;
    spinner.succeed(chalk.green('Smart payment created!'));

    console.log('');
    console.log(chalk.gray('  ┌───────────────────────────────────────────────┐'));
    console.log(chalk.gray('  │') + chalk.bold('  Smart Payment Details                       ') + chalk.gray('│'));
    console.log(chalk.gray('  ├───────────────────────────────────────────────┤'));
    console.log(chalk.gray('  │') + chalk.gray('  ID:             ') + chalk.cyan(payment.id.padEnd(24)) + chalk.gray('│'));
    console.log(chalk.gray('  │') + chalk.gray('  Status:         ') + getStatusBadge(payment.status).padEnd(33) + chalk.gray('│'));
    console.log(chalk.gray('  │') + chalk.gray('  Original:       ') + chalk.white(formatCurrency(payment.original_amount_usd).padEnd(24)) + chalk.gray('│'));
    
    if (payment.ppp_discount_applied) {
      console.log(chalk.gray('  │') + chalk.gray('  PPP Discount:   ') + chalk.green('✓ Applied'.padEnd(24)) + chalk.gray('│'));
      console.log(chalk.gray('  │') + chalk.gray('  Final Amount:   ') + chalk.green(formatCurrency(payment.final_amount_usd).padEnd(24)) + chalk.gray('│'));
      const savings = payment.original_amount_usd - payment.final_amount_usd;
      console.log(chalk.gray('  │') + chalk.gray('  Savings:        ') + chalk.green(formatCurrency(savings).padEnd(24)) + chalk.gray('│'));
    } else {
      console.log(chalk.gray('  │') + chalk.gray('  PPP Discount:   ') + chalk.gray('Not applied'.padEnd(24)) + chalk.gray('│'));
      console.log(chalk.gray('  │') + chalk.gray('  Final Amount:   ') + chalk.white(formatCurrency(payment.final_amount_usd).padEnd(24)) + chalk.gray('│'));
    }
    
    if (payment.session_used) {
      console.log(chalk.gray('  │') + chalk.gray('  Agent Session:  ') + chalk.green('✓ Used'.padEnd(24)) + chalk.gray('│'));
    }
    
    console.log(chalk.gray('  │') + chalk.gray('  Wallet:         ') + chalk.white(truncateAddress(payment.wallet_address).padEnd(24)) + chalk.gray('│'));
    console.log(chalk.gray('  └───────────────────────────────────────────────┘'));
    console.log('');

    if (payment.checkout_url) {
      console.log(chalk.bold('  Checkout URL:'));
      console.log(chalk.blue.underline(`  ${payment.checkout_url}`));
      console.log('');
    }

    if (payment.payment_address) {
      console.log(chalk.bold('  Payment Address:'));
      console.log(chalk.cyan(`  ${payment.payment_address}`));
      console.log('');
    }

    console.log(chalk.gray('  Check status: ') + chalk.cyan(`zendfi status ${payment.id}`));
    console.log('');
  } catch (error) {
    spinner.fail(chalk.red('Failed to create smart payment'));
    console.error(chalk.gray('\nError:'), error instanceof Error ? error.message : error);
  }
}

// ============================================
// Simulate Smart Payment
// ============================================

export async function simulateSmartPayment(options: {
  amount?: number;
  country?: string;
}): Promise<void> {
  console.log(chalk.cyan.bold('\n🔮 Simulate Smart Payment\n'));
  console.log(chalk.gray('  Preview pricing without creating a payment.\n'));

  const apiKey = getApiKey();
  if (!apiKey) {
    console.log(chalk.red('❌ No API key found!'));
    return;
  }

  // Interactive prompts
  const answers = await inquirer.prompt([
    {
      type: 'number',
      name: 'amount',
      message: 'Base amount (USD):',
      default: options.amount || 99.99,
      when: !options.amount,
    },
    {
      type: 'input',
      name: 'country',
      message: 'Country code:',
      default: options.country || 'BR',
      when: !options.country,
    },
  ]);

  const amount = options.amount || answers.amount;
  const country = (options.country || answers.country || 'US').toUpperCase();

  const spinner = ora('Simulating payment...').start();

  try {
    // First get PPP factor
    const pppResponse = await fetch(`${ZENDFI_API_BASE}/ai/pricing/ppp-factor`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        country_code: country,
      }),
    });

    if (!pppResponse.ok) {
      throw new Error(`Could not get PPP factor for ${country}`);
    }

    const pppData = await pppResponse.json() as {
      country_code: string;
      country_name: string;
      ppp_factor: number;
      adjustment_percentage: number;
    };

    spinner.succeed(chalk.green('Simulation complete'));

    const localizedAmount = amount * pppData.ppp_factor;
    const savings = amount - localizedAmount;

    console.log('');
    console.log(chalk.bold('  Payment Simulation'));
    console.log(chalk.gray('  ═══════════════════════════════════════════'));
    console.log('');
    console.log(chalk.gray('  🌍 Country:     ') + chalk.white(`${pppData.country_name} (${pppData.country_code})`));
    console.log(chalk.gray('  📊 PPP Factor:  ') + chalk.white(pppData.ppp_factor.toFixed(2)));
    console.log(chalk.gray('  💵 Base Price:  ') + chalk.white(formatCurrency(amount)));
    console.log('');
    console.log(chalk.gray('  ───────────────────────────────────────────'));
    console.log('');
    console.log(chalk.bold('  💰 Final Price: ') + chalk.green.bold(formatCurrency(localizedAmount)));
    console.log(chalk.gray('  💸 Savings:     ') + chalk.green(`${formatCurrency(savings)} (${pppData.adjustment_percentage.toFixed(0)}% off)`));
    console.log('');
    console.log(chalk.gray('  ═══════════════════════════════════════════'));
    console.log('');
    console.log(chalk.gray('  Create this payment:'));
    console.log(chalk.cyan(`  zendfi smart create --amount ${amount} --country ${country}`));
    console.log('');
  } catch (error) {
    spinner.fail(chalk.red('Simulation failed'));
    console.error(chalk.gray('\nError:'), error instanceof Error ? error.message : error);
  }
}
