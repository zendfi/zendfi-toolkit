/**
 * API Keys Management Command
 * List, create, rotate API keys
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ZENDFI_API_BASE = process.env.ZENDFI_API_URL || 'https://api.zendfi.tech/api/v1';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  mode: 'test' | 'live';
  created_at: string;
  last_used?: string;
  prefix: string;
}

/**
 * List all API keys
 */
export async function listKeys(): Promise<void> {
  console.log(chalk.cyan.bold('\n🔑 API Keys\n'));

  const apiKey = getApiKey();
  if (!apiKey) {
    console.log(chalk.red('❌ No API key found!'));
    console.log(chalk.gray('\nSet your API key:'));
    console.log(chalk.cyan('  export ZENDFI_API_KEY=your_key_here'));
    console.log(chalk.gray('Or run:'));
    console.log(chalk.cyan('  zendfi init\n'));
    return;
  }

  const spinner = ora('Fetching API keys...').start();

  try {
    const response = await fetch(`${ZENDFI_API_BASE}/merchants/me/api-keys`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as { data?: ApiKey[]; keys?: ApiKey[] };
    const keys = data.data || data.keys || [];

    spinner.succeed(chalk.green(`Found ${keys.length} API key${keys.length !== 1 ? 's' : ''}`));

    if (keys.length === 0) {
      console.log(chalk.gray('\nNo API keys found. Create one with:'));
      console.log(chalk.cyan('  zendfi keys create\n'));
      return;
    }

    console.log('');
    keys.forEach((key: ApiKey, index: number) => {
      const isLive = key.mode === 'live';
      const modeColor = isLive ? chalk.green : chalk.yellow;
      const modeBadge = isLive ? '🟢 LIVE' : '🟡 TEST';

      console.log(chalk.bold(`${index + 1}. ${key.name || 'Unnamed Key'}`));
      console.log(chalk.gray('   ID:       ') + chalk.white(key.id));
      console.log(chalk.gray('   Prefix:   ') + chalk.white(key.prefix + '***'));
      console.log(chalk.gray('   Mode:     ') + modeColor(modeBadge));
      console.log(chalk.gray('   Created:  ') + chalk.white(formatDate(key.created_at)));
      if (key.last_used) {
        console.log(chalk.gray('   Last Used:') + chalk.white(formatDate(key.last_used)));
      }
      console.log('');
    });

  } catch (error) {
    spinner.fail(chalk.red('Failed to fetch API keys'));
    console.error(chalk.gray('\nError:'), error instanceof Error ? error.message : error);
    console.log('');
  }
}

/**
 * Create a new API key
 */
export async function createKey(options: {
  name?: string;
  mode?: string;
}): Promise<void> {
  console.log(chalk.cyan.bold('\n🔑 Create New API Key\n'));

  const apiKey = getApiKey();
  if (!apiKey) {
    console.log(chalk.red('❌ No API key found!'));
    console.log(chalk.gray('\nSet your API key first with:'));
    console.log(chalk.cyan('  zendfi init\n'));
    return;
  }

  // Prompt for details
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Key name:',
      default: options.name || `API Key ${new Date().toISOString().split('T')[0]}`,
      validate: (input) => input.length > 0 || 'Name is required',
    },
    {
      type: 'list',
      name: 'mode',
      message: 'Key mode:',
      default: options.mode || 'test',
      choices: [
        { name: '🟡 Test - For development and testing', value: 'test' },
        { name: '🟢 Live - For production use', value: 'live' },
      ],
    },
    {
      type: 'confirm',
      name: 'confirm',
      message: (answers) => {
        const mode = answers.mode === 'live' ? chalk.red.bold('LIVE') : chalk.yellow('TEST');
        return `Create ${mode} API key named "${answers.name}"?`;
      },
      default: true,
    },
  ]);

  if (!answers.confirm) {
    console.log(chalk.yellow('\nCancelled\n'));
    return;
  }

  const spinner = ora('Creating API key...').start();

  try {
    const response = await fetch(`${ZENDFI_API_BASE}/merchants/me/api-keys`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: answers.name,
        mode: answers.mode,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error((error as { message?: string }).message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const newKey = data.data || data.key;

    spinner.succeed(chalk.green('API key created successfully!'));

    console.log(chalk.cyan('\n📋 Key Details:'));
    console.log(chalk.gray('  Name:  ') + chalk.white(newKey.name));
    console.log(chalk.gray('  Mode:  ') + (newKey.mode === 'live' ? chalk.green('🟢 LIVE') : chalk.yellow('🟡 TEST')));
    console.log(chalk.gray('  ID:    ') + chalk.white(newKey.id));
    
    console.log(chalk.yellow('\n⚠️  Save your API key - it won\'t be shown again!\n'));
    console.log(chalk.cyan('  ' + newKey.key + '\n'));

    // Offer to save to .env
    const { saveToEnv } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'saveToEnv',
        message: 'Save to .env file in current directory?',
        default: true,
      },
    ]);

    if (saveToEnv) {
      try {
        const envPath = join(process.cwd(), '.env');
        let envContent = '';
        try {
          envContent = readFileSync(envPath, 'utf-8');
        } catch {
          // File doesn't exist yet
        }

        const keyName = newKey.mode === 'live' ? 'ZENDFI_API_KEY' : 'ZENDFI_TEST_API_KEY';
        
        if (envContent.includes(keyName)) {
          envContent = envContent.replace(
            new RegExp(`${keyName}=.*`, 'g'),
            `${keyName}=${newKey.key}`
          );
        } else {
          envContent += `\n${keyName}=${newKey.key}\n`;
        }

        writeFileSync(envPath, envContent);
        console.log(chalk.green(`\n✓ Saved to ${envPath}\n`));
      } catch (error) {
        console.log(chalk.red('\n✗ Failed to save to .env'));
        console.log(chalk.gray('Please save it manually\n'));
      }
    }

  } catch (error) {
    spinner.fail(chalk.red('Failed to create API key'));
    console.error(chalk.gray('\nError:'), error instanceof Error ? error.message : error);
    console.log('');
  }
}

/**
 * Rotate an API key
 */
export async function rotateKey(keyId: string): Promise<void> {
  console.log(chalk.cyan.bold('\n🔄 Rotate API Key\n'));

  const apiKey = getApiKey();
  if (!apiKey) {
    console.log(chalk.red('❌ No API key found!\n'));
    return;
  }

  if (!keyId) {
    console.log(chalk.red('❌ Key ID is required!'));
    console.log(chalk.gray('\nUsage:'));
    console.log(chalk.cyan('  zendfi keys rotate <key-id>\n'));
    console.log(chalk.gray('List your keys with:'));
    console.log(chalk.cyan('  zendfi keys list\n'));
    return;
  }

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: chalk.yellow('This will invalidate the old key. Continue?'),
      default: false,
    },
  ]);

  if (!confirm) {
    console.log(chalk.yellow('\nCancelled\n'));
    return;
  }

  const spinner = ora('Rotating API key...').start();

  try {
    const response = await fetch(`${ZENDFI_API_BASE}/merchants/me/api-keys/${keyId}/rotate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error((error as { message?: string }).message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const newKey = data.data || data.key;

    spinner.succeed(chalk.green('API key rotated successfully!'));

    console.log(chalk.yellow('\n⚠️  New API key (save it now!):\n'));
    console.log(chalk.cyan('  ' + newKey.key + '\n'));

    console.log(chalk.red('⚠️  The old key has been invalidated!\n'));

  } catch (error) {
    spinner.fail(chalk.red('Failed to rotate API key'));
    console.error(chalk.gray('\nError:'), error instanceof Error ? error.message : error);
    console.log('');
  }
}

/**
 * Get API key from environment
 */
function getApiKey(): string | undefined {
  return process.env.ZENDFI_API_KEY || process.env.ZENDFI_TEST_API_KEY;
}

/**
 * Format date
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return date.toLocaleDateString();
}