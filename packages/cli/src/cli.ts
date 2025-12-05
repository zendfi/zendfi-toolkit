#!/usr/bin/env node

/**
 * ZendFi CLI - Management commands
 * 
 * Commands:
 * - zendfi init              Add ZendFi to existing project
 * - zendfi test payment      Create test payment
 * - zendfi status            Check payment status
 * - zendfi webhooks          Webhook management
 * - zendfi keys              API key management
 * - zendfi agent keys        Agent API key management
 * - zendfi agent sessions    Agent session management
 * - zendfi agent analytics   View agent analytics
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
  createAgentKey,
  listAgentKeys,
  revokeAgentKey,
  createAgentSession,
  listAgentSessions,
  revokeAgentSession,
  showAgentAnalytics,
} from './commands/agent.js';
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
  enableAutonomy,
  checkAutonomyStatus,
  revokeAutonomy,
  listDelegates,
} from './commands/autonomy.js';
import {
  createSmartPayment,
  simulateSmartPayment,
} from './commands/smart.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));
const version = pkg.version;

// ASCII Art Logo
const logo = `
${chalk.hex('#667eea').bold('╔══════════════════════════════════════╗')}
${chalk.hex('#667eea').bold('║')}  ${chalk.hex('#764ba2').bold('         ZendFi CLI')}                ${chalk.hex('#667eea').bold('║')}
${chalk.hex('#667eea').bold('║')}  ${chalk.gray('   Crypto payments made easy')}        ${chalk.hex('#667eea').bold('║')}
${chalk.hex('#667eea').bold('╚══════════════════════════════════════╝')}
`;

program
  .name('zendfi')
  .description('ZendFi CLI - Crypto payment tools for developers')
  .version(version)
  .addHelpText('before', logo);

// ============================================
// INIT COMMAND
// ============================================
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

// ============================================
// TEST COMMAND
// ============================================
const testCmd = program
  .command('test')
  .description('Testing utilities');

testCmd
  .command('payment')
  .description('Create a test payment')
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

// ============================================
// STATUS COMMAND
// ============================================
program
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

// ============================================
// WEBHOOKS COMMAND
// ============================================
const webhooksCmd = program
  .command('webhooks')
  .description('Webhook management');

webhooksCmd
  .command('listen')
  .description('Listen for webhooks locally')
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

// ============================================
// KEYS COMMAND
// ============================================
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

// ============================================
// AGENT COMMAND (Agentic Intent Protocol)
// ============================================
const agentCmd = program
  .command('agent')
  .description('Agent API key and session management');

// Agent Keys subcommands
const agentKeysCmd = agentCmd
  .command('keys')
  .description('Manage agent API keys');

agentKeysCmd
  .command('create')
  .description('Create a new agent API key')
  .option('--name <name>', 'Agent name')
  .option('--agent-id <agentId>', 'Unique agent identifier')
  .option('--scopes <scopes>', 'Comma-separated scopes (e.g., create_payments,read_analytics)')
  .option('--rate-limit <limit>', 'Rate limit per hour', parseInt)
  .action(async (options) => {
    try {
      await createAgentKey(options);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

agentKeysCmd
  .command('list')
  .description('List all agent API keys')
  .action(async () => {
    try {
      await listAgentKeys();
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

agentKeysCmd
  .command('revoke <key-id>')
  .description('Revoke an agent API key')
  .action(async (keyId) => {
    try {
      await revokeAgentKey(keyId);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Agent Sessions subcommands
const agentSessionsCmd = agentCmd
  .command('sessions')
  .description('Manage agent sessions');

agentSessionsCmd
  .command('create')
  .description('Create an agent session with spending limits')
  .option('--agent-id <agentId>', 'Agent identifier')
  .option('--wallet <wallet>', 'User Solana wallet address')
  .option('--max-per-day <amount>', 'Max spending per day in USD', parseFloat)
  .option('--max-per-transaction <amount>', 'Max per transaction in USD', parseFloat)
  .option('--duration <hours>', 'Session duration in hours', parseInt)
  .action(async (options) => {
    try {
      await createAgentSession(options);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

agentSessionsCmd
  .command('list')
  .description('List all agent sessions')
  .action(async () => {
    try {
      await listAgentSessions();
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

agentSessionsCmd
  .command('revoke <session-id>')
  .description('Revoke an agent session')
  .action(async (sessionId) => {
    try {
      await revokeAgentSession(sessionId);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Agent Analytics command
agentCmd
  .command('analytics')
  .description('View agent analytics and metrics')
  .action(async () => {
    try {
      await showAgentAnalytics();
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// ============================================
// INTENTS COMMAND (Payment Intents)
// ============================================
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

// ============================================
// PPP COMMAND (Purchasing Power Parity)
// ============================================
const pppCmd = program
  .command('ppp')
  .description('Purchasing Power Parity pricing');

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

// ============================================
// AUTONOMY COMMAND (Autonomous Delegation)
// ============================================
const autonomyCmd = program
  .command('autonomy')
  .description('Autonomous delegation management');

autonomyCmd
  .command('enable')
  .description('Enable autonomous delegation for a wallet')
  .option('--wallet <wallet>', 'User Solana wallet address')
  .option('--agent-id <agentId>', 'Agent identifier')
  .option('--max-per-day <amount>', 'Max spending per day in USD', parseFloat)
  .option('--max-per-transaction <amount>', 'Max per transaction in USD', parseFloat)
  .option('--duration <hours>', 'Delegation duration in hours', parseInt)
  .option('--merchants <merchants>', 'Comma-separated allowed merchant IDs')
  .option('--categories <categories>', 'Comma-separated allowed categories')
  .action(async (options) => {
    try {
      await enableAutonomy(options);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

autonomyCmd
  .command('status <wallet>')
  .description('Check autonomy status for a wallet')
  .action(async (wallet) => {
    try {
      await checkAutonomyStatus(wallet);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

autonomyCmd
  .command('revoke <delegate-id>')
  .description('Revoke an autonomous delegation')
  .action(async (delegateId) => {
    try {
      await revokeAutonomy(delegateId);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

autonomyCmd
  .command('delegates')
  .description('List all autonomous delegates')
  .option('--wallet <wallet>', 'Filter by wallet address')
  .option('--all', 'Include revoked delegates')
  .action(async (options) => {
    try {
      await listDelegates(options);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// ============================================
// SMART COMMAND (Smart Payments)
// ============================================
const smartCmd = program
  .command('smart')
  .description('Smart payments with automatic optimizations');

smartCmd
  .command('create')
  .description('Create a smart payment')
  .option('--amount <amount>', 'Amount in USD', parseFloat)
  .option('--wallet <wallet>', 'Payer wallet address')
  .option('--merchant <merchant>', 'Merchant ID')
  .option('--description <description>', 'Payment description')
  .option('--country <country>', '2-letter country code for PPP')
  .option('--ppp', 'Enable PPP pricing')
  .option('--no-ppp', 'Disable PPP pricing')
  .option('--agent-id <agentId>', 'Agent ID for session payments')
  .option('--use-session', 'Use existing agent session')
  .action(async (options) => {
    try {
      await createSmartPayment(options);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

smartCmd
  .command('simulate')
  .description('Simulate a smart payment (preview pricing)')
  .option('--amount <amount>', 'Amount in USD', parseFloat)
  .option('--country <country>', '2-letter country code')
  .action(async (options) => {
    try {
      await simulateSmartPayment(options);
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// ============================================
// HELP IMPROVEMENTS
// ============================================
program.on('--help', () => {
  console.log('');
  console.log(chalk.bold('Examples:'));
  console.log('');
  console.log(chalk.gray('  # Add ZendFi to your project'));
  console.log(chalk.cyan('  $ zendfi init'));
  console.log('');
  console.log(chalk.gray('  # Create a test payment'));
  console.log(chalk.cyan('  $ zendfi test payment --amount 50'));
  console.log('');
  console.log(chalk.gray('  # Check payment status'));
  console.log(chalk.cyan('  $ zendfi status pay_test_abc123'));
  console.log('');
  console.log(chalk.bold('Agent Commands (Agentic Intent Protocol):'));
  console.log('');
  console.log(chalk.gray('  # Create an agent API key'));
  console.log(chalk.cyan('  $ zendfi agent keys create'));
  console.log('');
  console.log(chalk.gray('  # List agent API keys'));
  console.log(chalk.cyan('  $ zendfi agent keys list'));
  console.log('');
  console.log(chalk.gray('  # Create an agent session'));
  console.log(chalk.cyan('  $ zendfi agent sessions create --agent-id my-agent --wallet Hx7B...'));
  console.log('');
  console.log(chalk.gray('  # View agent analytics'));
  console.log(chalk.cyan('  $ zendfi agent analytics'));
  console.log('');
  console.log(chalk.bold('Payment Intents:'));
  console.log('');
  console.log(chalk.gray('  # Create a payment intent'));
  console.log(chalk.cyan('  $ zendfi intents create --amount 99.99'));
  console.log('');
  console.log(chalk.gray('  # List all intents'));
  console.log(chalk.cyan('  $ zendfi intents list'));
  console.log('');
  console.log(chalk.gray('  # Confirm an intent'));
  console.log(chalk.cyan('  $ zendfi intents confirm pi_abc123 --wallet Hx7B...'));
  console.log('');
  console.log(chalk.bold('PPP Pricing (Purchasing Power Parity):'));
  console.log('');
  console.log(chalk.gray('  # Check PPP factor for a country'));
  console.log(chalk.cyan('  $ zendfi ppp check BR'));
  console.log('');
  console.log(chalk.gray('  # Calculate localized price'));
  console.log(chalk.cyan('  $ zendfi ppp calculate --price 99.99 --country IN'));
  console.log('');
  console.log(chalk.gray('  # List all PPP factors'));
  console.log(chalk.cyan('  $ zendfi ppp factors --sort discount'));
  console.log('');
  console.log(chalk.bold('Autonomous Delegation:'));
  console.log('');
  console.log(chalk.gray('  # Enable autonomy for a wallet'));
  console.log(chalk.cyan('  $ zendfi autonomy enable --wallet Hx7B... --agent-id my-agent'));
  console.log('');
  console.log(chalk.gray('  # Check autonomy status'));
  console.log(chalk.cyan('  $ zendfi autonomy status Hx7B...'));
  console.log('');
  console.log(chalk.gray('  # List all delegates'));
  console.log(chalk.cyan('  $ zendfi autonomy delegates'));
  console.log('');
  console.log(chalk.bold('Smart Payments:'));
  console.log('');
  console.log(chalk.gray('  # Create a smart payment with PPP'));
  console.log(chalk.cyan('  $ zendfi smart create --amount 99.99 --country BR'));
  console.log('');
  console.log(chalk.gray('  # Simulate pricing'));
  console.log(chalk.cyan('  $ zendfi smart simulate --amount 99.99 --country IN'));
  console.log('');
  console.log(chalk.gray('Documentation:'), chalk.blue.underline('https://docs.zendfi.com'));
  console.log('');
});

// Parse arguments
program.parse();
