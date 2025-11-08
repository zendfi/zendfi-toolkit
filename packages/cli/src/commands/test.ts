/**
 * Test Payment Command
 * Create test payments from the CLI for quick testing
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import open from 'open';
import clipboardy from 'clipboardy';

interface TestPaymentOptions {
  amount?: number;
  description?: string;
  email?: string;
  open?: boolean;
  watch?: boolean;
}

interface Payment {
  id: string;                    // Backend uses 'id' not 'payment_id'
  status: string;
  amount: number;
  currency: string;
  qr_code: string;
  payment_url: string;           // Backend uses 'payment_url' not 'checkout_url'
  expires_at: string;
  mode: string;
  transaction_signature?: string;
  failure_reason?: string;
  settlement_info?: any;
  split_ids?: string[];
}

export async function testPayment(options: TestPaymentOptions): Promise<void> {
  console.log(chalk.cyan.bold('\nCreate Test Payment\n'));

  // Load API key from environment
  const apiKey = process.env.ZENDFI_API_KEY;
  
  if (!apiKey) {
    console.error(chalk.red('❌ Error: ZENDFI_API_KEY not found'));
    console.log(chalk.gray('\nSet your API key:'));
    console.log(chalk.cyan('  export ZENDFI_API_KEY=zfi_test_your_key'));
    console.log(chalk.gray('\nOr add it to your .env file'));
    process.exit(1);
  }

  // Check if it's a test key
  if (!apiKey.startsWith('zfi_test_')) {
    console.warn(chalk.yellow('Warning: Using a live API key'));
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'This will create a real payment. Continue?',
        default: false,
      },
    ]);
    
    if (!confirm) {
      console.log(chalk.gray('Cancelled'));
      process.exit(0);
    }
  }

  // Get payment details
  const amount = options.amount || (
    await inquirer.prompt([
      {
        type: 'number',
        name: 'amount',
        message: 'Amount (USD):',
        default: 50,
        validate: (value: number) => value > 0 || 'Amount must be positive',
      },
    ])
  ).amount;

  const description = options.description || (
    await inquirer.prompt([
      {
        type: 'input',
        name: 'description',
        message: 'Description:',
        default: 'Test payment',
      },
    ])
  ).description;

  const email = options.email || (
    await inquirer.prompt([
      {
        type: 'input',
        name: 'email',
        message: 'Customer email (optional):',
        default: '',
      },
    ])
  ).email;

  // Create payment
  const spinner = ora('Creating test payment...').start();

  try {
    const response = await fetch('https://api.zendfi.tech/api/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        amount,
        currency: 'USD',
        description,
        customer_email: email || undefined,
        metadata: {
          source: 'cli-test',
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json() as { message?: string };
      throw new Error(error.message || 'Failed to create payment');
    }

    const result: any = await response.json();
    const payment = result.data || result as Payment;
    
    spinner.succeed(chalk.green('Payment created!'));

    // Display payment details
    console.log('\n' + chalk.cyan('═'.repeat(60)));
    console.log(chalk.bold('\n  Payment Details:\n'));
    console.log(chalk.gray('  Payment ID:   ') + chalk.white(payment.id));
    console.log(chalk.gray('  Status:       ') + getStatusBadge(payment.status));
    console.log(chalk.gray('  Amount:       ') + chalk.white(`$${amount.toFixed(2)} ${payment.currency}`));
    console.log(chalk.gray('  Mode:         ') + chalk.white(payment.mode === 'test' ? '🟡 Test (Devnet)' : '🟢 Live (Mainnet)'));
    console.log(chalk.gray('  Created:      ') + chalk.white(new Date().toLocaleString()));
    
    if (payment.mode === 'test') {
      console.log('\n' + chalk.yellow('  💡 This is a test payment (devnet)'));
      console.log(chalk.gray('     Use your test wallet to complete it\n'));
    }

    console.log(chalk.cyan('─'.repeat(60)));
    console.log(chalk.bold('\n  Checkout URL:\n'));
    const checkoutUrl = payment.payment_url;
    console.log(chalk.blue('  ' + checkoutUrl));
    console.log(chalk.cyan('═'.repeat(60)) + '\n');

    // Copy to clipboard
    try {
      await clipboardy.write(checkoutUrl);
      console.log(chalk.green('✓ Copied to clipboard!\n'));
    } catch {
      // Clipboard not available
    }

    // Offer to open in browser
    const shouldOpen = options.open ?? (
      await inquirer.prompt([
        {
          type: 'confirm',
          name: 'open',
          message: 'Open checkout URL in browser?',
          default: true,
        },
      ])
    ).open;

    if (shouldOpen) {
      await open(checkoutUrl);
      console.log(chalk.gray('Opened in browser'));
    }

    // Offer to watch status
    const shouldWatch = options.watch ?? (
      await inquirer.prompt([
        {
          type: 'confirm',
          name: 'watch',
          message: 'Watch payment status?',
          default: true,
        },
      ])
    ).watch;

    const paymentId = payment.id;
    
    if (shouldWatch) {
      await watchPaymentStatus(paymentId, apiKey);
    } else {
      console.log(chalk.gray('\nCheck status anytime with:'));
      console.log(chalk.cyan(`  zendfi status ${paymentId}\n`));
    }

  } catch (error: any) {
    spinner.fail(chalk.red('Failed to create payment'));
    console.error(chalk.red('\n❌ Error:'), error.message);
    
    if (error.message.includes('401')) {
      console.log(chalk.yellow('\n💡 Your API key may be invalid or expired'));
      console.log(chalk.gray('   Get a new one at: https://app.zendfi.com/settings/api-keys'));
    }
    
    process.exit(1);
  }
}

/**
 * Watch payment status until confirmed or failed
 */
async function watchPaymentStatus(paymentId: string, apiKey: string): Promise<void> {
  console.log(chalk.cyan('\n👀 Watching payment status...\n'));
  console.log(chalk.gray('Press Ctrl+C to stop\n'));

  const spinner = ora('Waiting for payment...').start();
  let lastStatus = 'pending';
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes (5s interval)

  const checkStatus = async (): Promise<boolean> => {
    try {
      const response = await fetch(`https://api.zendfi.tech/api/v1/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch payment status');
      }

      const payment = await response.json() as Payment;
      if (payment.status !== lastStatus) {
        spinner.text = `Status: ${getStatusBadge(payment.status)}`;
        lastStatus = payment.status;
      }

      if (payment.status === 'confirmed') {
        spinner.succeed(chalk.green('Payment confirmed! ✓'));
        console.log(chalk.gray('\nPayment ID:      ') + chalk.white(payment.id));
        console.log(chalk.gray('Amount:          ') + chalk.white(`$${payment.amount} ${payment.currency}`));
        
        if (payment.transaction_signature) {
          console.log(chalk.gray('Transaction:     ') + chalk.blue(`https://solscan.io/tx/${payment.transaction_signature}`));
        }
        
        console.log(chalk.gray('Confirmed at:    ') + chalk.white(new Date().toLocaleString()));
        console.log();
        return true;
      }

      if (payment.status === 'failed') {
        spinner.fail(chalk.red('Payment failed ✗'));
        console.log(chalk.red('\nReason:'), payment.failure_reason || 'Unknown');
        console.log();
        return true;
      }

      if (payment.status === 'expired') {
        spinner.fail(chalk.yellow('Payment expired'));
        console.log(chalk.gray('\nCreate a new payment with:'));
        console.log(chalk.cyan('  zendfi test payment\n'));
        return true;
      }

      return false;
    } catch (error: any) {
      spinner.fail(chalk.red('Error checking status'));
      console.error(chalk.red('\n❌ Error:'), error.message);
      return true;
    }
  };

  // Poll every 5 seconds
  const interval = setInterval(async () => {
    attempts++;
    
    const done = await checkStatus();
    
    if (done || attempts >= maxAttempts) {
      clearInterval(interval);
      
      if (attempts >= maxAttempts) {
        spinner.warn(chalk.yellow('Timeout: Payment still pending'));
        console.log(chalk.gray('\nCheck status anytime with:'));
        console.log(chalk.cyan(`  zendfi status ${paymentId}\n`));
      }
    }
  }, 5000);

  // Initial check
  await checkStatus();
}

/**
 * Get colored status badge
 */
function getStatusBadge(status: string): string {
  switch (status) {
    case 'pending':
      return chalk.yellow('⏳ pending');
    case 'confirmed':
      return chalk.green('✓ confirmed');
    case 'failed':
      return chalk.red('✗ failed');
    case 'expired':
      return chalk.gray('⏱️  expired');
    default:
      return chalk.gray(status);
  }
}
