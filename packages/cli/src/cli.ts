#!/usr/bin/env node

/**
 * ZendFi CLI - Management commands
 * 
 * Commands:
 * - zendfi init          Add ZendFi to existing project
 * - zendfi test payment  Create test payment
 * - zendfi status        Check payment status
 * - zendfi webhooks      Webhook management (coming soon)
 * - zendfi keys          API key management (coming soon)
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
  console.log(chalk.gray('Documentation:'), chalk.blue.underline('https://docs.zendfi.com'));
  console.log('');
});

// Parse arguments
program.parse();
