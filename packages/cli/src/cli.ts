#!/usr/bin/env node

/**
 * ZendFi CLI - Crypto payments made easy
 * 
 * Core Commands (Start Here):
 * - zendfi init              Add ZendFi to existing project
 * - zendfi dev               Local development server
 * - zendfi payment           Create and manage payments
 * - zendfi webhooks          Test webhooks locally
 * 
 * Advanced:
 * - zendfi keys              API key management
 * - zendfi intents           Payment intents (Stripe-like flow)
 * - zendfi ppp               Purchasing power parity pricing
 */

import { program } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initCommand } from './commands/init.js';
import { testPayment } from './commands/test.js';
import { checkStatus } from './commands/status.js';
import { listenWebhooks } from './commands/webhooks.js';
import { listKeys, createKey, rotateKey } from './commands/keys.js';
import {
  createIntent,
  listIntents,
  getIntent,
  confirmIntent,
  cancelIntent,
} from './commands/intents.js';
import {
  checkPPP,
  listPPPFactors,
  calculatePPP,
} from './commands/ppp.js';
import {
  createSubAccount,
  listSubAccounts,
  getSubAccount,
  getSubAccountBalance,
  mintSubAccountToken,
  freezeSubAccount,
  unfreezeSubAccount,
  drainSubAccount,
  withdrawSubAccount,
  withdrawSubAccountToBank,
  mintSubAccountAutomationToken,
  revokeSubAccountAutomationToken,
  mintSubAccountSigningGrant,
  revokeSubAccountSigningGrant,
  closeSubAccount,
} from './commands/subaccounts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));
const version = pkg.version;

const logo = `
${chalk.hex('#667eea').bold('╔══════════════════════════════════════╗')}
${chalk.hex('#667eea').bold('║')}  ${chalk.hex('#764ba2').bold('         ZendFi CLI')}                ${chalk.hex('#667eea').bold('║')}
${chalk.hex('#667eea').bold('║')}  ${chalk.gray('   Payments in 7 lines of code')}      ${chalk.hex('#667eea').bold('║')}
${chalk.hex('#667eea').bold('╚══════════════════════════════════════╝')}
`;

program
  .name('zendfi')
  .description('Crypto payments made easy - Built for Solana e-commerce')
  .version(version)
  .addHelpText('before', logo);

program
  .command('init')
  .description('Add ZendFi to an existing project')
  .option('--framework <framework>', 'Framework (nextjs, express, react)')
  .option('--skip-install', 'Skip installing dependencies')
  .option('-y, --yes', 'Skip confirmation prompts')
  .action(async (options) => {
    try {
      await initCommand(options);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

const paymentCmd = program
  .command('payment')
  .description('Payment management')
  .alias('pay');

paymentCmd
  .command('create')
  .description('Create a test payment')
  .alias('test')
  .option('--amount <amount>', 'Payment amount in USD', parseFloat)
  .option('--description <description>', 'Payment description')
  .option('--email <email>', 'Customer email')
  .option('--open', 'Open checkout URL in browser')
  .option('--watch', 'Watch payment status')
  .action(async (options) => {
    try {
      await testPayment(options);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

paymentCmd
  .command('status <payment-id>')
  .description('Check payment status')
  .action(async (paymentId) => {
    try {
      await checkStatus(paymentId);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('webhooks')
  .description('Test webhooks locally (tunnels via ngrok/cloudflared)')
  .alias('listen')
  .option('--port <port>', 'Local port', '3000')
  .option('--forward-to <url>', 'Forward webhooks to URL')
  .action(async (options) => {
    try {
      await listenWebhooks(options);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

const keysCmd = program
  .command('keys')
  .description('API key management');

keysCmd
  .command('list')
  .description('List all API keys')
  .action(async () => {
    try {
      await listKeys();
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

keysCmd
  .command('create')
  .description('Create a new API key')
  .option('--name <name>', 'Key name')
  .option('--mode <mode>', 'Mode (test/live)')
  .action(async (options) => {
    try {
      await createKey(options);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

keysCmd
  .command('rotate <key-id>')
  .description('Rotate an API key')
  .action(async (keyId) => {
    try {
      await rotateKey(keyId);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

const intentsCmd = program
  .command('intents')
  .description('Payment intent management');

intentsCmd
  .command('create')
  .description('Create a new payment intent')
  .option('--amount <amount>', 'Amount in USD', parseFloat)
  .option('--currency <currency>', 'Currency code (default: USD)')
  .option('--description <description>', 'Payment description')
  .option('--capture <method>', 'Capture method: automatic or manual')
  .action(async (options) => {
    try {
      await createIntent(options);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

intentsCmd
  .command('list')
  .description('List all payment intents')
  .action(async () => {
    try {
      await listIntents();
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

intentsCmd
  .command('get <intent-id>')
  .description('Get payment intent details')
  .action(async (intentId) => {
    try {
      await getIntent(intentId);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

intentsCmd
  .command('confirm <intent-id>')
  .description('Confirm a payment intent')
  .option('--wallet <wallet>', 'User Solana wallet address')
  .option('--client-secret <secret>', 'Client secret for verification')
  .action(async (intentId, options) => {
    try {
      await confirmIntent(intentId, options);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

intentsCmd
  .command('cancel <intent-id>')
  .description('Cancel a payment intent')
  .action(async (intentId) => {
    try {
      await cancelIntent(intentId);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

const pppCmd = program
  .command('ppp')
  .description('Purchasing Power Parity pricing');

const subAccountsCmd = program
  .command('subaccounts')
  .description('Sub-account management and delegated access controls')
  .alias('sa');

subAccountsCmd
  .command('create')
  .description('Create a new sub-account with dedicated MPC wallet')
  .requiredOption('--label <label>', 'Immutable sub-account label')
  .option('--spend-limit <amount>', 'Sub-account spend limit in USDC', parseFloat)
  .option('--access-mode <mode>', 'delegated or merchant_managed', 'delegated')
  .option('--yield-enabled', 'Enable yield for this sub-account')
  .action(async (options) => {
    try {
      await createSubAccount(options);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

subAccountsCmd
  .command('list')
  .description('List all sub-accounts')
  .action(async () => {
    try {
      await listSubAccounts();
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

subAccountsCmd
  .command('get <id>')
  .description('Get sub-account details by id or external id')
  .action(async (id) => {
    try {
      await getSubAccount(id);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

subAccountsCmd
  .command('balance <id>')
  .description('Get current balance and yield snapshot for sub-account')
  .action(async (id) => {
    try {
      await getSubAccountBalance(id);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

subAccountsCmd
  .command('token <id>')
  .description('Mint a scoped delegation token for a sub-account')
  .option('--scope <scope>', 'deposit_only|withdraw_only|spend_only|read_only|full_access', 'deposit_only')
  .option('--spend-limit <amount>', 'Maximum spendable USDC', parseFloat)
  .option('--ttl <seconds>', 'Token TTL in seconds', parseInt)
  .option('--whitelist <addresses>', 'Comma-separated whitelisted destination addresses')
  .option('--single-use', 'Revoke token automatically after first use')
  .action(async (id, options) => {
    try {
      await mintSubAccountToken(id, options);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

subAccountsCmd
  .command('freeze <id>')
  .description('Freeze a sub-account and revoke active delegation tokens')
  .option('--reason <reason>', 'Freeze reason for audit trail')
  .action(async (id, options) => {
    try {
      await freezeSubAccount(id, options);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

subAccountsCmd
  .command('unfreeze <id>')
  .description('Unfreeze a frozen sub-account and restore active status')
  .option('--reason <reason>', 'Unfreeze reason for audit trail')
  .action(async (id, options) => {
    try {
      await unfreezeSubAccount(id, options);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

subAccountsCmd
  .command('drain <id>')
  .description('Drain sub-account funds back to merchant main wallet')
  .option('--amount <amount>', 'Optional amount to drain', parseFloat)
  .option('--token <token>', 'Sol or Usdc', 'Usdc')
  .option('--mode <mode>', 'test or live', 'live')
  .requiredOption('--passkey-file <path>', 'JSON file containing passkey signature payload')
  .action(async (id, options) => {
    try {
      await drainSubAccount(id, options);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

subAccountsCmd
  .command('withdraw <id>')
  .description('Withdraw from sub-account to external address')
  .requiredOption('--to <address>', 'Destination Solana address')
  .requiredOption('--amount <amount>', 'Withdrawal amount', parseFloat)
  .option('--token <token>', 'Sol or Usdc', 'Usdc')
  .option('--mode <mode>', 'test or live', 'live')
  .option('--delegation-token <token>', 'Scoped delegation token for delegated execution')
  .option('--signing-grant <grant>', 'Signing grant minted via merchant session endpoint')
  .option('--passkey-file <path>', 'Fallback interactive signing payload (deprecated for automation)')
  .action(async (id, options) => {
    try {
      await withdrawSubAccount(id, options);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

subAccountsCmd
  .command('withdraw-bank <id>')
  .description('Withdraw from sub-account to bank account (proxy-email OTP automation)')
  .requiredOption('--amount <amount>', 'Withdrawal amount in USDC', parseFloat)
  .requiredOption('--bank-id <bankId>', 'PAJ bank identifier')
  .requiredOption('--account-number <accountNumber>', 'Recipient bank account number')
  .option('--mode <mode>', 'test or live', 'live')
  .option('--delegation-token <token>', 'Scoped delegation token for delegated execution')
  .option('--automation-token <token>', 'Automation token minted via merchant session endpoint')
  .option('--signing-grant <grant>', 'Signing grant minted via merchant session endpoint')
  .option('--passkey-file <path>', 'Fallback interactive signing payload (deprecated for automation)')
  .action(async (id, options) => {
    try {
      await withdrawSubAccountToBank(id, options);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

subAccountsCmd
  .command('automation-token-mint')
  .description('Mint bounded automation token for headless sub-account bank withdrawals')
  .option('--subaccount-id <id>', 'Optional sub-account id/external id scope')
  .option('--ttl <seconds>', 'Token TTL in seconds (60 to 604800)', parseInt, 3600)
  .option('--max-uses <count>', 'Maximum number of uses', parseInt, 25)
  .option('--total-limit <amount>', 'Total spend limit in USDC', parseFloat, 500)
  .option('--per-tx-limit <amount>', 'Per transaction limit in USDC', parseFloat, 50)
  .option('--bank-ids <ids>', 'Comma-separated allowed bank IDs')
  .option('--account-numbers <accounts>', 'Comma-separated allowed account numbers')
  .option('--mode <mode>', 'test or live', 'live')
  .action(async (options) => {
    try {
      await mintSubAccountAutomationToken(options);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

subAccountsCmd
  .command('automation-token-revoke <token-id>')
  .description('Revoke an automation token immediately')
  .action(async (tokenId) => {
    try {
      await revokeSubAccountAutomationToken(tokenId);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

subAccountsCmd
  .command('signing-grant-mint')
  .description('Mint bounded signing grant for headless sub-account signing (browser passkey flow)')
  .option('--subaccount-id <id>', 'Optional sub-account id/external id scope')
  .option('--ttl <seconds>', 'Grant TTL in seconds (60 to 604800)', parseInt, 3600)
  .option('--max-uses <count>', 'Maximum number of uses', parseInt, 25)
  .option('--total-limit <amount>', 'Total spend limit in USDC', parseFloat, 500)
  .option('--per-tx-limit <amount>', 'Per transaction limit in USDC', parseFloat, 50)
  .option('--bank-ids <ids>', 'Comma-separated allowed bank IDs')
  .option('--account-numbers <accounts>', 'Comma-separated allowed account numbers')
  .option('--mode <mode>', 'test or live', 'live')
  .option('--passkey-file <path>', 'Legacy manual passkey payload fallback (deprecated)')
  .option('--no-open', 'Do not auto-open browser; print approval URL and poll only')
  .action(async (options) => {
    try {
      await mintSubAccountSigningGrant(options);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

subAccountsCmd
  .command('signing-grant-revoke <grant-id>')
  .description('Revoke a signing grant immediately')
  .action(async (grantId) => {
    try {
      await revokeSubAccountSigningGrant(grantId);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

subAccountsCmd
  .command('close <id>')
  .description('Close a sub-account and revoke all delegation tokens')
  .action(async (id) => {
    try {
      await closeSubAccount(id);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

pppCmd
  .command('check <country>')
  .description('Get PPP factor for a country')
  .option('--price <price>', 'Calculate localized price', parseFloat)
  .action(async (country, options) => {
    try {
      await checkPPP(country, options);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

pppCmd
  .command('factors')
  .description('List all PPP factors')
  .option('--sort <sort>', 'Sort by: discount or country')
  .action(async (options) => {
    try {
      await listPPPFactors(options);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

pppCmd
  .command('calculate')
  .description('Calculate localized price')
  .requiredOption('--price <price>', 'Original price in USD', parseFloat)
  .requiredOption('--country <country>', '2-letter country code')
  .action(async (options) => {
    try {
      await calculatePPP(options);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.on('--help', () => {
  console.log('');
  console.log(chalk.bold('Quick Start:'));
  console.log('');
  console.log(chalk.gray('  # Add ZendFi to your project'));
  console.log(chalk.cyan('  $ zendfi init'));
  console.log('');
  console.log(chalk.gray('  # Create a test payment'));
  console.log(chalk.cyan('  $ zendfi payment create --amount 50'));
  console.log('');
  console.log(chalk.gray('  # Check payment status'));
  console.log(chalk.cyan('  $ zendfi payment status pay_test_abc123'));
  console.log('');
  console.log(chalk.gray('  # Test webhooks locally'));
  console.log(chalk.cyan('  $ zendfi webhooks --port 3000'));
  console.log('');
  console.log(chalk.bold('API Keys:'));
  console.log('');
  console.log(chalk.gray('  # List all API keys'));
  console.log(chalk.cyan('  $ zendfi keys list'));
  console.log('');
  console.log(chalk.gray('  # Create a new API key'));
  console.log(chalk.cyan('  $ zendfi keys create --name "Production" --mode live'));
  console.log('');
  console.log(chalk.bold('Payment Intents:'));
  console.log('');
  console.log(chalk.gray('  # Create a payment intent'));
  console.log(chalk.cyan('  $ zendfi intents create --amount 99.99'));
  console.log('');
  console.log(chalk.gray('  # Confirm a payment intent'));
  console.log(chalk.cyan('  $ zendfi intents confirm pi_abc123'));
  console.log('');
  console.log(chalk.bold('PPP Pricing:'));
  console.log('');
  console.log(chalk.gray('  # Check PPP factor for a country'));
  console.log(chalk.cyan('  $ zendfi ppp check BR --price 99.99'));
  console.log('');
  console.log(chalk.gray('  # List all PPP factors'));
  console.log(chalk.cyan('  $ zendfi ppp factors'));
  console.log('');
  console.log(chalk.bold('Learn More:'));
  console.log('');
  console.log(chalk.gray('  Docs:'), chalk.blue.underline('https://docs.zendfi.tech'));
  console.log('');
});

// Parse arguments
program.parse();
