/**
 * API Key Setup Utility
 * Handles merchant account creation and API key configuration
 */

import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';
import fetch from 'node-fetch';

const ZENDFI_API_URL = 'https://api.zendfi.tech';

interface QuickCreateRequest {
  name: string;
  email: string;
  business_address: string;
  wallet_generation_method: 'mpc_passkey' | 'simple';
  settlement_preference: 'auto_usdc';
}

interface QuickCreateResponse {
  merchant: {
    id: string;
    name: string;
    wallet_address: string;
    wallet_type: string;
    settlement_preference: string;
    wallet_generation_method: string;
  };
  api_keys: {
    test: string;
    live: string;
  };
  message: string;
  security_note?: string;
  next_steps?: {
    passkey_setup_url?: string;
    setup_required: boolean;
    estimated_time?: string;
  };
  warning?: string;
}

/**
 * Validate email format
 */
function validateEmail(email: string): boolean | string {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    return 'Email is required';
  }
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  return true;
}

/**
 * Validate API key format
 */
function validateApiKey(apiKey: string): boolean | string {
  if (!apiKey) {
    return 'API key is required';
  }
  if (!apiKey.startsWith('zfi_test_') && !apiKey.startsWith('zfi_live_')) {
    return 'Invalid API key format. Should start with zfi_test_ or zfi_live_';
  }
  if (apiKey.length < 20) {
    return 'API key seems too short. Please check and try again';
  }
  return true;
}

/**
 * Verify API key works by making a test request
 */
async function verifyApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(`${ZENDFI_API_URL}/health`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Prompt for existing API key
 */
async function promptExistingKey(): Promise<string | null> {
  console.log(chalk.cyan('\nEnter your ZendFi API key\n'));
  console.log(chalk.gray('You can find this in your ZendFi dashboard:'));
  console.log(chalk.gray('https://api.zendfi.tech/dashboard\n'));

  const { apiKey } = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: 'API Key:',
      validate: validateApiKey,
      mask: '*',
    },
  ]);

  const spinner = ora('Verifying API key...').start();
  
  const isValid = await verifyApiKey(apiKey);
  
  if (isValid) {
    spinner.succeed(chalk.green('API key verified!'));
    return apiKey;
  } else {
    spinner.fail(chalk.red('API key verification failed'));
    console.log(chalk.yellow('\nThe API key could not be verified.'));
    console.log(chalk.gray('Please check your key and try again, or create a new account.\n'));
    return null;
  }
}

/**
 * Create a new merchant account
 */
async function createNewAccount(): Promise<string | null> {
  console.log(chalk.cyan('\nLet\'s create your ZendFi merchant account!\n'));
  console.log(chalk.gray('This takes less than a minute. We just need a few details.\n'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'email',
      message: 'Business email:',
      validate: validateEmail,
    },
    {
      type: 'input',
      name: 'businessName',
      message: 'Business/Project name:',
      validate: (input: string) => {
        if (!input || input.length < 2) {
          return 'Business name must be at least 2 characters';
        }
        if (input.length > 100) {
          return 'Business name must be less than 100 characters';
        }
        return true;
      },
    },
    {
      type: 'input',
      name: 'businessAddress',
      message: 'Business address (can be home address):',
      validate: (input: string) => {
        if (!input || input.length < 10) {
          return 'Please enter a valid address';
        }
        if (input.length > 500) {
          return 'Address must be less than 500 characters';
        }
        return true;
      },
    },
    {
      type: 'list',
      name: 'walletType',
      message: 'Choose your wallet type:',
      choices: [
        {
          name: chalk.bold('MPC Passkey Wallet') + chalk.gray(' - Non-custodial, secured by Face ID/Touch ID (Recommended)'),
          value: 'mpc_passkey',
        },
        {
          name: chalk.bold('Simple Wallet') + chalk.gray(' - Fastest setup, managed by ZendFi (Custodial)'),
          value: 'simple',
        },
      ],
      default: 'mpc_passkey',
    },
  ]);

  const spinner = ora('Creating your ZendFi merchant account...').start();

  try {
    const requestData: QuickCreateRequest = {
      name: answers.businessName,
      email: answers.email,
      business_address: answers.businessAddress,
      wallet_generation_method: answers.walletType,
      settlement_preference: 'auto_usdc',
    };

    const response = await fetch(`${ZENDFI_API_URL}/api/v1/merchants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const error = await response.json() as { message?: string; error?: string };
      spinner.fail(chalk.red('Failed to create merchant account'));
      console.log(chalk.yellow('\nError:'), error.message || error.error);
      return null;
    }

    const data = await response.json() as QuickCreateResponse;
    spinner.succeed(chalk.green('Merchant account created successfully!'));

    console.log(chalk.cyan('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.bold.green('  Your ZendFi Account is Ready!'));
    console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

    console.log(chalk.bold('Merchant ID:'), data.merchant.id);
    console.log(chalk.bold('Business Name:'), data.merchant.name);
    console.log(chalk.bold('Wallet Type:'), data.merchant.wallet_type);
    
    if (data.merchant.wallet_address) {
      console.log(chalk.bold('Wallet Address:'), data.merchant.wallet_address);
    }

    if (data.next_steps?.setup_required) {
      console.log(chalk.yellow('\n  Important: Complete Passkey Setup'));
      console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
      console.log(chalk.white('To activate auto-settlements and access your funds:'));
      console.log(chalk.cyan('\n1. Open this URL in your browser:'));
      console.log(chalk.bold.blue(`   ${data.next_steps.passkey_setup_url}`));
      console.log(chalk.cyan('\n2. Complete passkey setup with Face ID/Touch ID'));
      console.log(chalk.gray(`   (Takes ${data.next_steps.estimated_time || '30 seconds'})`));
      console.log(chalk.cyan('\n3. Your wallet will be ready to receive payments!\n'));
      
      console.log(chalk.gray(' You can start building now and complete setup later'));
    } else {
      console.log(chalk.green('\n Your wallet is ready to receive payments immediately!\n'));
    }

    console.log(chalk.yellow('\n  API Keys'));
    console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
    console.log(chalk.bold('Test API Key (Devnet):'));
    console.log(chalk.cyan(`  ${data.api_keys.test}`));
    console.log(chalk.gray('  Use this for development and testing\n'));
    
    console.log(chalk.bold('Live API Key (Mainnet):'));
    console.log(chalk.cyan(`  ${data.api_keys.live}`));
    console.log(chalk.gray('  Use this for production deployments\n'));

    console.log(chalk.yellow('Security Note:'));
    console.log(chalk.gray(data.security_note || 'Keep your API keys secure - they will not be shown again!\n'));

    console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

    // Return test API key by default (for development)
    return data.api_keys.test;

  } catch (error) {
    spinner.fail(chalk.red('Failed to create merchant account'));
    console.log(chalk.yellow('\nError:'), error instanceof Error ? error.message : 'Unknown error');
    console.log(chalk.gray('\nPlease check your internet connection and try again.'));
    console.log(chalk.gray('If the problem persists, contact support@zendfi.tech\n'));
    return null;
  }
}

/**
 * Main API key setup flow
 */
export async function setupApiKey(): Promise<string | null> {
  console.log(chalk.cyan('\n┌─────────────────────────────────────────────────────┐'));
  console.log(chalk.cyan('│') + chalk.bold('       ZendFi API Setup                              ') + chalk.cyan('│'));
  console.log(chalk.cyan('└─────────────────────────────────────────────────────┘\n'));

  const { choice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: 'Do you already have a ZendFi account?',
      choices: [
        {
          name: chalk.green(' Yes') + chalk.gray(' - I have an API key'),
          value: 'existing',
        },
        {
          name: chalk.blue(' No') + chalk.gray(' - Create a new merchant account'),
          value: 'create',
        },
        {
          name: chalk.yellow('  Skip') + chalk.gray(' - I\'ll set this up later'),
          value: 'skip',
        },
      ],
    },
  ]);

  let apiKey: string | null = null;

  if (choice === 'existing') {
    apiKey = await promptExistingKey();
    
    // If verification failed, offer to create new account
    if (!apiKey) {
      const { retry } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'retry',
          message: 'Would you like to create a new merchant account instead?',
          default: true,
        },
      ]);
      
      if (retry) {
        apiKey = await createNewAccount();
      }
    }
  } else if (choice === 'create') {
    apiKey = await createNewAccount();
  } else {
    console.log(chalk.yellow('\n  Skipping API key setup'));
    console.log(chalk.gray('You can configure your API key later in the .env file\n'));
    console.log(chalk.gray('Get your API key at: https://api.zendfi.tech/dashboard\n'));
    return null;
  }

  if (apiKey) {
    console.log(chalk.green('\nAPI key configured successfully!\n'));
    return apiKey;
  }

  return null;
}
