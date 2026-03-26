import chalk from 'chalk';
import ora from 'ora';
import { readFileSync } from 'fs';

const ZENDFI_API_BASE = process.env.ZENDFI_API_URL || 'https://api.zendfi.tech/api/v1';

type DelegationScope =
  | 'deposit_only'
  | 'withdraw_only'
  | 'spend_only'
  | 'read_only'
  | 'full_access';

interface PasskeySignaturePayload {
  credential_id: string;
  authenticator_data: number[];
  signature: number[];
  client_data_json: number[];
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: Record<string, unknown>;
}

function getApiKey(): string {
  const key = process.env.ZENDFI_API_KEY || process.env.ZENDFI_TEST_API_KEY;
  if (!key) {
    throw new Error('ZENDFI_API_KEY not set. Export your key before using subaccount commands.');
  }
  return key;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const apiKey = getApiKey();
  const response = await fetch(`${ZENDFI_API_BASE}${path}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data?.error || data?.message || `${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  return data as T;
}

function parsePasskeyFile(filePath?: string): PasskeySignaturePayload {
  if (!filePath) {
    throw new Error('Sensitive operation requires --passkey-file <path-to-json>.');
  }

  const raw = readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(raw);

  for (const key of ['credential_id', 'authenticator_data', 'signature', 'client_data_json']) {
    if (!(key in parsed)) {
      throw new Error(`Invalid passkey file: missing ${key}`);
    }
  }

  return parsed as PasskeySignaturePayload;
}

function parseScope(input?: string): DelegationScope {
  const value = (input || 'deposit_only').toLowerCase();
  const allowed: DelegationScope[] = ['deposit_only', 'withdraw_only', 'spend_only', 'read_only', 'full_access'];
  if (!allowed.includes(value as DelegationScope)) {
    throw new Error(`Invalid scope: ${input}. Expected one of ${allowed.join(', ')}`);
  }
  return value as DelegationScope;
}

export async function createSubAccount(options: {
  label?: string;
  spendLimit?: number;
  accessMode?: string;
  yieldEnabled?: boolean;
}): Promise<void> {
  if (!options.label) {
    throw new Error('Missing required --label for subaccount creation');
  }

  const spinner = ora('Creating sub-account...').start();
  const result = await request<any>('/subaccounts', {
    method: 'POST',
    body: {
      label: options.label,
      spend_limit_usdc: options.spendLimit,
      access_mode: options.accessMode,
      yield_enabled: options.yieldEnabled,
    },
  });
  spinner.succeed('Sub-account created');

  console.log(chalk.cyan('\nSub-account'));
  console.log(chalk.gray('  ID:        ') + chalk.white(result.id));
  console.log(chalk.gray('  Label:     ') + chalk.white(result.label));
  console.log(chalk.gray('  Wallet:    ') + chalk.white(result.wallet_address));
  console.log(chalk.gray('  Status:    ') + chalk.white(result.status));
  console.log(chalk.gray('  Created:   ') + chalk.white(result.created_at));
  console.log('');
}

export async function listSubAccounts(): Promise<void> {
  const spinner = ora('Listing sub-accounts...').start();
  const result = await request<{ subaccounts: any[]; count: number }>('/subaccounts');
  spinner.succeed(`Found ${result.count} sub-account${result.count === 1 ? '' : 's'}`);

  if (result.count === 0) {
    console.log(chalk.gray('\nNo sub-accounts found. Create one with:'));
    console.log(chalk.cyan('  zendfi subaccounts create --label user_001\n'));
    return;
  }

  console.log('');
  result.subaccounts.forEach((sub, idx) => {
    console.log(chalk.bold(`${idx + 1}. ${sub.label}`));
    console.log(chalk.gray('   ID:      ') + chalk.white(sub.id));
    console.log(chalk.gray('   Wallet:  ') + chalk.white(sub.wallet_address));
    console.log(chalk.gray('   Status:  ') + chalk.white(sub.status));
    console.log(chalk.gray('   Yield:   ') + chalk.white(sub.yield_enabled ? 'enabled' : 'disabled'));
    console.log('');
  });
}

export async function getSubAccount(id: string): Promise<void> {
  const spinner = ora('Fetching sub-account...').start();
  const result = await request<any>(`/subaccounts/${id}`);
  spinner.succeed('Sub-account found');

  console.log(chalk.cyan('\nSub-account Details'));
  Object.entries(result).forEach(([k, v]) => {
    console.log(chalk.gray(`  ${k}:`).padEnd(20) + chalk.white(String(v)));
  });
  console.log('');
}

export async function getSubAccountBalance(id: string): Promise<void> {
  const spinner = ora('Fetching sub-account balance...').start();
  const result = await request<any>(`/subaccounts/${id}/balance`);
  spinner.succeed('Balance fetched');

  console.log(chalk.cyan('\nSub-account Balance'));
  console.log(chalk.gray('  Subaccount: ') + chalk.white(result.subaccount_id));
  console.log(chalk.gray('  Wallet:     ') + chalk.white(result.wallet_address));
  console.log(chalk.gray('  USDC:       ') + chalk.white(String(result.usdc_balance)));
  console.log(chalk.gray('  SOL:        ') + chalk.white(String(result.sol_balance)));
  console.log(chalk.gray('  Yield:      ') + chalk.white(result.yield_enabled ? 'enabled' : 'disabled'));
  console.log('');
}

export async function mintSubAccountToken(id: string, options: {
  scope?: string;
  spendLimit?: number;
  ttl?: number;
  whitelist?: string;
  singleUse?: boolean;
}): Promise<void> {
  const spinner = ora('Minting delegation token...').start();
  const result = await request<any>(`/subaccounts/${id}/session-key`, {
    method: 'POST',
    body: {
      scope: parseScope(options.scope),
      spend_limit_usdc: options.spendLimit,
      expires_in_seconds: options.ttl,
      whitelist: options.whitelist ? options.whitelist.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      single_use: options.singleUse,
    },
  });
  spinner.succeed('Delegation token minted');

  console.log(chalk.cyan('\nDelegation Token'));
  console.log(chalk.gray('  Token ID:   ') + chalk.white(result.token_id));
  console.log(chalk.gray('  Scope:      ') + chalk.white(result.scope));
  console.log(chalk.gray('  Expires:    ') + chalk.white(result.expires_at));
  console.log(chalk.gray('  Token:      ') + chalk.yellow(result.delegation_token));
  console.log('');
}

export async function freezeSubAccount(id: string, options: { reason?: string }): Promise<void> {
  const spinner = ora('Freezing sub-account...').start();
  const result = await request<any>(`/subaccounts/${id}/freeze`, {
    method: 'POST',
    body: { reason: options.reason },
  });
  spinner.succeed('Sub-account frozen');

  console.log(chalk.green(`\n${result.subaccount_id} is now ${result.status}.\n`));
}

export async function drainSubAccount(id: string, options: {
  amount?: number;
  token?: 'Sol' | 'Usdc';
  mode?: 'test' | 'live';
  passkeyFile?: string;
}): Promise<void> {
  const passkey = parsePasskeyFile(options.passkeyFile);
  const spinner = ora('Draining sub-account...').start();
  const result = await request<any>(`/subaccounts/${id}/drain`, {
    method: 'POST',
    body: {
      amount: options.amount,
      token: options.token,
      mode: options.mode,
      passkey_signature: passkey,
    },
  });
  spinner.succeed('Sub-account drained');

  console.log(chalk.cyan('\nDrain Result'));
  console.log(chalk.gray('  TX:         ') + chalk.white(result.transaction_signature));
  console.log(chalk.gray('  Amount:     ') + chalk.white(String(result.amount)));
  console.log(chalk.gray('  Token:      ') + chalk.white(String(result.token)));
  console.log(chalk.gray('  To:         ') + chalk.white(result.to_address));
  console.log('');
}

export async function withdrawSubAccount(id: string, options: {
  to: string;
  amount: number;
  token?: 'Sol' | 'Usdc';
  mode?: 'test' | 'live';
  passkeyFile?: string;
  delegationToken?: string;
}): Promise<void> {
  const passkey = parsePasskeyFile(options.passkeyFile);
  const spinner = ora('Submitting sub-account withdrawal...').start();
  const result = await request<any>(`/subaccounts/${id}/withdraw`, {
    method: 'POST',
    body: {
      to_address: options.to,
      amount: options.amount,
      token: options.token,
      mode: options.mode,
      delegation_token: options.delegationToken,
      passkey_signature: passkey,
    },
  });
  spinner.succeed('Withdrawal submitted');

  console.log(chalk.cyan('\nWithdrawal Result'));
  console.log(chalk.gray('  TX:         ') + chalk.white(result.transaction_signature));
  console.log(chalk.gray('  From:       ') + chalk.white(result.from_address));
  console.log(chalk.gray('  To:         ') + chalk.white(result.to_address));
  console.log(chalk.gray('  Amount:     ') + chalk.white(String(result.amount)));
  console.log(chalk.gray('  Token:      ') + chalk.white(String(result.token)));
  console.log('');
}

export async function closeSubAccount(id: string): Promise<void> {
  const spinner = ora('Closing sub-account...').start();
  const result = await request<any>(`/subaccounts/${id}`, { method: 'DELETE' });
  spinner.succeed('Sub-account closed');

  console.log(chalk.green(`\n${result.subaccount_id} is now ${result.status}.\n`));
}
