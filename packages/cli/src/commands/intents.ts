/**
 * Payment Intents Commands - Two-phase payment flow
 * 
 * Commands:
 * - zendfi intents create   Create a payment intent
 * - zendfi intents list     List payment intents
 * - zendfi intents get      Get intent details
 * - zendfi intents confirm  Confirm a payment intent
 * - zendfi intents cancel   Cancel a payment intent
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { buildApiHeaders } from '../utils/idempotency.js';

const ZENDFI_API_BASE = process.env.ZENDFI_API_URL || 'https://api.zendfi.tech/api/v1';

interface PaymentIntent {
  id: string;
  client_secret: string;
  amount: number;
  currency: string;
  description?: string;
  status: string;
  capture_method: string;
  agent_id?: string;
  payment_id?: string;
  created_at: string;
  expires_at: string;
}

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

function getStatusBadge(status: string): string {
  switch (status) {
    case 'requires_payment':
      return chalk.yellow('⏳ REQUIRES PAYMENT');
    case 'processing':
      return chalk.blue('⚡ PROCESSING');
    case 'succeeded':
      return chalk.green('✓ SUCCEEDED');
    case 'canceled':
      return chalk.gray('✕ CANCELED');
    case 'failed':
      return chalk.red('✗ FAILED');
    default:
      return chalk.gray(status.toUpperCase());
  }
}

export async function createIntent(options: {
  amount?: number;
  description?: string;
  agentId?: string;
  captureMethod?: string;
  expires?: number;
  idempotencyKey?: string;
}): Promise<void> {
  console.log(chalk.cyan.bold('\n💳 Create Payment Intent\n'));

  const apiKey = getApiKey();
  if (!apiKey) {
    console.log(chalk.red('❌ No API key found!'));
    console.log(chalk.gray('\nSet your API key:'));
    console.log(chalk.cyan('  export ZENDFI_API_KEY=your_key_here'));
    return;
  }

  let amount = options.amount;
  let description = options.description;
  let captureMethod = options.captureMethod || 'automatic';
  let expires = options.expires || 86400;

  if (!amount) {
    const answers = await inquirer.prompt([
      {
        type: 'number',
        name: 'amount',
        message: 'Amount (USD):',
        validate: (input: number) => input > 0 || 'Amount must be positive',
      },
    ]);
    amount = answers.amount;
  }

  if (!description) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'description',
        message: 'Description (optional):',
        default: '',
      },
    ]);
    description = answers.description || undefined;
  }

  if (!options.captureMethod) {
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'captureMethod',
        message: 'Capture method:',
        choices: [
          { name: 'Automatic - Capture immediately on confirm', value: 'automatic' },
          { name: 'Manual - Authorize only, capture later', value: 'manual' },
        ],
        default: 'automatic',
      },
    ]);
    captureMethod = answers.captureMethod;
  }

  const spinner = ora('Creating payment intent...').start();

  try {
    const response = await fetch(`${ZENDFI_API_BASE}/payment-intents`, {
      method: 'POST',
      headers: buildApiHeaders(apiKey, 'POST', options.idempotencyKey),
      body: JSON.stringify({
        amount,
        description,
        capture_method: captureMethod,
        agent_id: options.agentId,
        expires_in_seconds: expires,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const intent = await response.json() as PaymentIntent;
    spinner.succeed(chalk.green('Payment intent created!'));

    console.log('');
    console.log(chalk.bold('  Intent Details:'));
    console.log(chalk.gray('  ID:            ') + chalk.white(intent.id));
    console.log(chalk.gray('  Amount:        ') + chalk.green(formatCurrency(intent.amount)));
    console.log(chalk.gray('  Status:        ') + getStatusBadge(intent.status));
    console.log(chalk.gray('  Capture:       ') + chalk.white(intent.capture_method));
    console.log(chalk.gray('  Expires:       ') + chalk.white(formatDate(intent.expires_at)));
    console.log('');
    console.log(chalk.yellow.bold('  Client Secret (for frontend):'));
    console.log(chalk.cyan(`  ${intent.client_secret}`));
    console.log('');
    console.log(chalk.gray('  Confirm with:'));
    console.log(chalk.cyan(`  zendfi intents confirm ${intent.id} --wallet <customer_wallet>`));
    console.log('');
  } catch (error) {
    spinner.fail(chalk.red('Failed to create payment intent'));
    console.error(chalk.gray('\nError:'), error instanceof Error ? error.message : error);
  }
}

export async function listIntents(options: {
  status?: string;
  limit?: number;
} = {}): Promise<void> {
  console.log(chalk.cyan.bold('\nPayment Intents\n'));

  const apiKey = getApiKey();
  if (!apiKey) {
    console.log(chalk.red('No API key found!'));
    return;
  }

  const spinner = ora('Fetching payment intents...').start();

  try {
    const params = new URLSearchParams();
    if (options.status) params.append('status', options.status);
    if (options.limit) params.append('limit', options.limit.toString());
    const query = params.toString() ? `?${params.toString()}` : '';

    const response = await fetch(`${ZENDFI_API_BASE}/payment-intents${query}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as { intents?: PaymentIntent[] } | PaymentIntent[];
    const intents = Array.isArray(data) ? data : (data.intents || []);

    spinner.succeed(chalk.green(`Found ${intents.length} intent${intents.length !== 1 ? 's' : ''}`));

    if (intents.length === 0) {
      console.log(chalk.gray('\nNo payment intents found. Create one with:'));
      console.log(chalk.cyan('  zendfi intents create --amount 99.99\n'));
      return;
    }

    console.log('');
    intents.forEach((intent: PaymentIntent, index: number) => {
      console.log(chalk.bold(`${index + 1}. ${formatCurrency(intent.amount)} ${getStatusBadge(intent.status)}`));
      console.log(chalk.gray('   ID:       ') + chalk.white(intent.id));
      if (intent.description) {
        console.log(chalk.gray('   Desc:     ') + chalk.white(intent.description));
      }
      console.log(chalk.gray('   Created:  ') + chalk.white(formatDate(intent.created_at)));
      console.log(chalk.gray('   Expires:  ') + chalk.white(formatDate(intent.expires_at)));
      if (intent.payment_id) {
        console.log(chalk.gray('   Payment:  ') + chalk.green(intent.payment_id));
      }
      console.log('');
    });
  } catch (error) {
    spinner.fail(chalk.red('Failed to fetch payment intents'));
    console.error(chalk.gray('\nError:'), error instanceof Error ? error.message : error);
  }
}

export async function getIntent(intentId: string): Promise<void> {
  console.log(chalk.cyan.bold('\n💳 Payment Intent Details\n'));

  const apiKey = getApiKey();
  if (!apiKey) {
    console.log(chalk.red('❌ No API key found!'));
    return;
  }

  const spinner = ora('Fetching intent...').start();

  try {
    const response = await fetch(`${ZENDFI_API_BASE}/payment-intents/${intentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const intent = await response.json() as PaymentIntent;
    spinner.succeed(chalk.green('Intent loaded!'));

    console.log('');
    console.log(chalk.bold('  ID:            ') + chalk.white(intent.id));
    console.log(chalk.bold('  Amount:        ') + chalk.green(formatCurrency(intent.amount)));
    console.log(chalk.bold('  Status:        ') + getStatusBadge(intent.status));
    console.log(chalk.bold('  Capture:       ') + chalk.white(intent.capture_method));
    if (intent.description) {
      console.log(chalk.bold('  Description:   ') + chalk.white(intent.description));
    }
    if (intent.agent_id) {
      console.log(chalk.bold('  Agent:         ') + chalk.white(intent.agent_id));
    }
    console.log(chalk.bold('  Created:       ') + chalk.white(formatDate(intent.created_at)));
    console.log(chalk.bold('  Expires:       ') + chalk.white(formatDate(intent.expires_at)));
    if (intent.payment_id) {
      console.log(chalk.bold('  Payment ID:    ') + chalk.green(intent.payment_id));
    }
    console.log('');

    if (intent.status === 'requires_payment') {
      console.log(chalk.yellow('  This intent is awaiting confirmation.'));
      console.log(chalk.gray('  Confirm with:'));
      console.log(chalk.cyan(`  zendfi intents confirm ${intent.id} --wallet <customer_wallet>`));
      console.log('');
    }
  } catch (error) {
    spinner.fail(chalk.red('Failed to fetch intent'));
    console.error(chalk.gray('\nError:'), error instanceof Error ? error.message : error);
  }
}

export async function confirmIntent(
  intentId: string,
  options: {
    wallet?: string;
    secret?: string;
    gasless?: boolean;
    idempotencyKey?: string;
  }
): Promise<void> {
  console.log(chalk.cyan.bold('\nConfirm Payment Intent\n'));

  const apiKey = getApiKey();
  if (!apiKey) {
    console.log(chalk.red('No API key found!'));
    return;
  }

  let wallet = options.wallet;
  let clientSecret = options.secret;

  if (!wallet) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'wallet',
        message: 'Customer wallet address:',
        validate: (input: string) => input.length > 20 || 'Valid Solana address required',
      },
    ]);
    wallet = answers.wallet;
  }

  if (!clientSecret) {
    const spinner = ora('Fetching intent details...').start();
    try {
      const response = await fetch(`${ZENDFI_API_BASE}/payment-intents/${intentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      const intent = await response.json() as PaymentIntent;
      clientSecret = intent.client_secret;
      spinner.succeed('Intent loaded');
    } catch (error) {
      spinner.fail('Failed to fetch intent');
      throw error;
    }
  }

  const spinner = ora('Confirming payment intent...').start();

  try {
    const response = await fetch(`${ZENDFI_API_BASE}/payment-intents/${intentId}/confirm`, {
      method: 'POST',
      headers: buildApiHeaders(apiKey, 'POST', options.idempotencyKey),
      body: JSON.stringify({
        client_secret: clientSecret,
        customer_wallet: wallet,
        auto_gasless: options.gasless,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const intent = await response.json() as PaymentIntent;
    spinner.succeed(chalk.green('Payment intent confirmed!'));

    console.log('');
    console.log(chalk.bold('  Status:     ') + getStatusBadge(intent.status));
    if (intent.payment_id) {
      console.log(chalk.bold('  Payment ID: ') + chalk.green(intent.payment_id));
      console.log('');
      console.log(chalk.gray('  View payment:'));
      console.log(chalk.cyan(`  zendfi status ${intent.payment_id}`));
    }
    console.log('');
  } catch (error) {
    spinner.fail(chalk.red('Failed to confirm intent'));
    console.error(chalk.gray('\nError:'), error instanceof Error ? error.message : error);
  }
}

export async function cancelIntent(intentId: string, options: { idempotencyKey?: string } = {}): Promise<void> {
  console.log(chalk.cyan.bold('\nCancel Payment Intent\n'));

  const apiKey = getApiKey();
  if (!apiKey) {
    console.log(chalk.red('No API key found!'));
    return;
  }

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: chalk.yellow(`Cancel payment intent ${intentId}?`),
      default: false,
    },
  ]);

  if (!confirm) {
    console.log(chalk.gray('\nCancellation aborted.'));
    return;
  }

  const spinner = ora('Canceling payment intent...').start();

  try {
    const response = await fetch(`${ZENDFI_API_BASE}/payment-intents/${intentId}/cancel`, {
      method: 'POST',
      headers: buildApiHeaders(apiKey, 'POST', options.idempotencyKey),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const intent = await response.json() as PaymentIntent;
    spinner.succeed(chalk.green('Payment intent canceled!'));

    console.log('');
    console.log(chalk.bold('  Status: ') + getStatusBadge(intent.status));
    console.log('');
  } catch (error) {
    spinner.fail(chalk.red('Failed to cancel intent'));
    console.error(chalk.gray('\nError:'), error instanceof Error ? error.message : error);
  }
}
