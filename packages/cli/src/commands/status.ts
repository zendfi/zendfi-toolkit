/**
 * Status Command
 * Check payment status with beautiful formatting
 */

import chalk from 'chalk';
import ora from 'ora';

export async function checkStatus(paymentId: string): Promise<void> {
  if (!paymentId) {
    console.error(chalk.red('❌ Error: Payment ID is required'));
    console.log(chalk.gray('\nUsage:'));
    console.log(chalk.cyan('  zendfi status <payment_id>'));
    console.log(chalk.gray('\nExample:'));
    console.log(chalk.cyan('  zendfi status pay_test_abc123\n'));
    process.exit(1);
  }

  // Load API key
  const apiKey = process.env.ZENDFI_API_KEY;
  
  if (!apiKey) {
    console.error(chalk.red('❌ Error: ZENDFI_API_KEY not found'));
    console.log(chalk.gray('\nSet your API key:'));
    console.log(chalk.cyan('  export ZENDFI_API_KEY=zfi_test_your_key\n'));
    process.exit(1);
  }

  const spinner = ora('Fetching payment details...').start();

  try {
    const response = await fetch(`https://api.zendfi.tech/api/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        spinner.fail(chalk.red('Payment not found'));
        console.log(chalk.gray('\nDouble-check the payment ID and try again\n'));
        process.exit(1);
      }
      
      const error = await response.json() as { message?: string };
      throw new Error(error.message || 'Failed to fetch payment');
    }

    const result: any = await response.json();
    
    // Debug logging
    if (process.env.DEBUG) {
      console.log('\nDEBUG - Raw response:', JSON.stringify(result, null, 2));
    }
    
    // Backend returns payment directly, not wrapped in data
    const payment = result;
    
    // Normalize field names for display
    payment.amount = payment.amount || parseFloat(payment.amount_usd);
    payment.currency = payment.currency || 'USD';
    
    spinner.succeed(chalk.green('Payment found!'));

    // Display payment details
    displayPaymentDetails(payment);

  } catch (error: any) {
    spinner.fail(chalk.red('Failed to fetch payment'));
    console.error(chalk.red('\n❌ Error:'), error.message);
    process.exit(1);
  }
}

/**
 * Display formatted payment details
 */
function displayPaymentDetails(payment: any): void {
  console.log('\n' + chalk.cyan('═'.repeat(70)));
  
  // Header
  console.log(chalk.bold.white('\n  Payment Details\n'));
  
  // Basic Info
  console.log(chalk.gray('  Payment ID:      ') + chalk.white(payment.id));
  console.log(chalk.gray('  Status:          ') + getStatusBadge(payment.status));
  console.log(chalk.gray('  Amount:          ') + chalk.white.bold(`$${payment.amount.toFixed(2)} ${payment.currency}`));
  console.log(chalk.gray('  Mode:            ') + chalk.white(payment.mode === 'test' ? '🟡 Test (Devnet)' : '🟢 Live (Mainnet)'));
  
  // Description
  if (payment.description) {
    console.log(chalk.gray('  Description:     ') + chalk.white(payment.description));
  }
  
  // Customer
  if (payment.customer_email) {
    console.log(chalk.gray('  Customer:        ') + chalk.white(payment.customer_email));
  }

  // Divider
  console.log(chalk.cyan('\n  ' + '─'.repeat(66)));
  
  // Timestamps
  console.log(chalk.bold.white('\n  Timeline\n'));
  console.log(chalk.gray('  Created:         ') + chalk.white(formatDate(payment.created_at)));
  
  if (payment.confirmed_at) {
    console.log(chalk.gray('  Confirmed:       ') + chalk.white(formatDate(payment.confirmed_at)));
    
    const duration = getDuration(payment.created_at, payment.confirmed_at);
    console.log(chalk.gray('  Duration:        ') + chalk.white(duration));
  }
  
  if (payment.expires_at && payment.status === 'pending') {
    const expiresIn = getTimeUntil(payment.expires_at);
    console.log(chalk.gray('  Expires:         ') + chalk.yellow(expiresIn));
  }

  // Transaction Details
  if (payment.transaction_signature) {
    console.log(chalk.cyan('\n  ' + '─'.repeat(66)));
    console.log(chalk.bold.white('\n  Transaction\n'));
    console.log(chalk.gray('  Signature:       ') + chalk.blue(payment.transaction_signature));
    console.log(chalk.gray('  Explorer:        ') + chalk.blue.underline(`https://solscan.io/tx/${payment.transaction_signature}`));
  }

  // Wallet Info
  if (payment.merchant_wallet || payment.customer_wallet) {
    console.log(chalk.cyan('\n  ' + '─'.repeat(66)));
    console.log(chalk.bold.white('\n  Wallets\n'));
    
    if (payment.merchant_wallet) {
      console.log(chalk.gray('  Merchant:        ') + chalk.white(truncateAddress(payment.merchant_wallet)));
    }
    
    if (payment.customer_wallet) {
      console.log(chalk.gray('  Customer:        ') + chalk.white(truncateAddress(payment.customer_wallet)));
    }
  }

  // Metadata
  if (payment.metadata && Object.keys(payment.metadata).length > 0) {
    console.log(chalk.cyan('\n  ' + '─'.repeat(66)));
    console.log(chalk.bold.white('\n  Metadata\n'));
    
    Object.entries(payment.metadata).forEach(([key, value]) => {
      const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      console.log(chalk.gray(`  ${displayKey.padEnd(16)} `) + chalk.white(String(value)));
    });
  }

  // Actions
  if (payment.status === 'pending') {
    console.log(chalk.cyan('\n  ' + '─'.repeat(66)));
    console.log(chalk.bold.white('\n  Actions\n'));
    console.log(chalk.gray('  Checkout URL:    ') + chalk.blue.underline(payment.payment_url));
    console.log(chalk.gray('\n  Share this URL with your customer to complete the payment'));
  }

  // Status-specific messages
  if (payment.status === 'confirmed') {
    console.log(chalk.cyan('\n  ' + '─'.repeat(66)));
    console.log(chalk.green.bold('\n  ✓ Payment successfully completed!\n'));
  } else if (payment.status === 'failed') {
    console.log(chalk.cyan('\n  ' + '─'.repeat(66)));
    console.log(chalk.red.bold('\n  ✗ Payment failed\n'));
    
    if (payment.failure_reason) {
      console.log(chalk.gray('  Reason:          ') + chalk.red(payment.failure_reason));
    }
  } else if (payment.status === 'expired') {
    console.log(chalk.cyan('\n  ' + '─'.repeat(66)));
    console.log(chalk.yellow.bold('\n  ⏱️  Payment expired\n'));
    console.log(chalk.gray('  Create a new payment with: ') + chalk.cyan('zendfi test payment'));
  }

  console.log(chalk.cyan('\n' + '═'.repeat(70)) + '\n');
}

/**
 * Get colored status badge
 */
function getStatusBadge(status: string): string {
  switch (status) {
    case 'pending':
      return chalk.yellow.bold('⏳ PENDING');
    case 'confirmed':
      return chalk.green.bold('✓ CONFIRMED');
    case 'failed':
      return chalk.red.bold('✗ FAILED');
    case 'expired':
      return chalk.gray.bold('⏱️  EXPIRED');
    default:
      return chalk.gray.bold(status.toUpperCase());
  }
}

/**
 * Format date with relative time
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  let relative = '';
  if (days > 0) {
    relative = `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (hours > 0) {
    relative = `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (minutes > 0) {
    relative = `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else {
    relative = `${seconds} second${seconds > 1 ? 's' : ''} ago`;
  }
  
  return `${date.toLocaleString()} (${relative})`;
}

/**
 * Get duration between two dates
 */
function getDuration(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diff = endDate.getTime() - startDate.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Get time until a future date
 */
function getTimeUntil(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  
  if (diff <= 0) {
    return 'Expired';
  }
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `in ${days} day${days > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `in ${hours} hour${hours > 1 ? 's' : ''}`;
  } else if (minutes > 0) {
    return `in ${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else {
    return `in ${seconds} second${seconds > 1 ? 's' : ''}`;
  }
}

/**
 * Truncate wallet address
 */
function truncateAddress(address: string): string {
  if (address.length <= 16) return address;
  return `${address.slice(0, 8)}...${address.slice(-8)}`;
}
