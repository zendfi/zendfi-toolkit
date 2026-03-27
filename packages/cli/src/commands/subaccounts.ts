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

export async function unfreezeSubAccount(id: string, options: { reason?: string }): Promise<void> {
  const spinner = ora('Unfreezing sub-account...').start();
  const result = await request<any>(`/subaccounts/${id}/unfreeze`, {
    method: 'POST',
    body: { reason: options.reason },
  });
  spinner.succeed('Sub-account unfrozen');

  console.log(chalk.green(`\n${result.subaccount_id} is now ${result.status}.`));
  if (result.note) {
    console.log(chalk.yellow(`  Note: ${result.note}`));
  }
  console.log('');
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

export async function withdrawSubAccountToBank(id: string, options: {
  amount: number;
  bankId: string;
  accountNumber: string;
  mode?: 'test' | 'live';
  passkeyFile?: string;
  delegationToken?: string;
  automationToken?: string;
}): Promise<void> {
  if (options.automationToken && options.delegationToken) {
    throw new Error('Use either --automation-token or --delegation-token, not both.');
  }

  const passkey = parsePasskeyFile(options.passkeyFile);
  const spinner = ora('Submitting sub-account bank withdrawal...').start();
  const result = await request<any>(`/subaccounts/${id}/withdraw-bank`, {
    method: 'POST',
    body: {
      amount_usdc: options.amount,
      bank_id: options.bankId,
      account_number: options.accountNumber,
      mode: options.mode,
      delegation_token: options.delegationToken,
      automation_token: options.automationToken,
      passkey_signature: passkey,
    },
  });
  spinner.succeed('Bank withdrawal submitted');

  console.log(chalk.cyan('\nBank Withdrawal Result'));
  console.log(chalk.gray('  TX:           ') + chalk.white(result.transaction_signature));
  console.log(chalk.gray('  Sub-account:  ') + chalk.white(result.subaccount_id));
  console.log(chalk.gray('  Order ID:     ') + chalk.white(result.order_id));
  console.log(chalk.gray('  PAJ Order ID: ') + chalk.white(result.paj_order_id));
  console.log(chalk.gray('  PAJ Wallet:   ') + chalk.white(result.paj_deposit_address));
  console.log(chalk.gray('  Bank Account: ') + chalk.white(result.bank_account_number));
  console.log(chalk.gray('  Account Name: ') + chalk.white(result.bank_account_name));
  console.log(chalk.gray('  Amount USDC:  ') + chalk.white(String(result.amount_usdc)));
  console.log(chalk.gray('  Amount NGN:   ') + chalk.white(String(result.fiat_amount)));
  console.log(chalk.gray('  Rate:         ') + chalk.white(String(result.exchange_rate)));
  console.log(chalk.gray('  Fee:          ') + chalk.white(String(result.fee)));
  console.log(chalk.gray('  Status:       ') + chalk.white(String(result.status)));
  console.log('');
}

export async function mintSubAccountAutomationToken(options: {
  subAccountId?: string;
  ttl: number;
  maxUses: number;
  totalLimit: number;
  perTxLimit: number;
  bankIds?: string;
  accountNumbers?: string;
  mode?: 'test' | 'live';
}): Promise<void> {
  const spinner = ora('Minting sub-account automation token...').start();
  const result = await request<any>('/merchants/me/subaccounts/automation-tokens', {
    method: 'POST',
    body: {
      sub_account_id: options.subAccountId,
      ttl_seconds: options.ttl,
      max_uses: options.maxUses,
      total_limit_usdc: options.totalLimit,
      per_tx_limit_usdc: options.perTxLimit,
      allowed_bank_ids: options.bankIds
        ? options.bankIds.split(',').map((v) => v.trim()).filter(Boolean)
        : undefined,
      allowed_account_numbers: options.accountNumbers
        ? options.accountNumbers.split(',').map((v) => v.trim()).filter(Boolean)
        : undefined,
      mode: options.mode,
    },
  });
  spinner.succeed('Automation token minted');

  console.log(chalk.cyan('\nAutomation Token'));
  console.log(chalk.gray('  Token ID:       ') + chalk.white(result.token_id));
  console.log(chalk.gray('  Sub-account:    ') + chalk.white(result.sub_account_id ?? 'all merchant sub-accounts'));
  console.log(chalk.gray('  Expires At:     ') + chalk.white(result.expires_at));
  console.log(chalk.gray('  Max Uses:       ') + chalk.white(String(result.max_uses)));
  console.log(chalk.gray('  Total Limit:    ') + chalk.white(String(result.total_limit_usdc)));
  console.log(chalk.gray('  Per-Tx Limit:   ') + chalk.white(String(result.per_tx_limit_usdc)));
  console.log(chalk.gray('  Mode:           ') + chalk.white(String(result.mode ?? 'live')));
  console.log(chalk.gray('  Token (one-time): ') + chalk.yellow(result.automation_token));
  console.log('');
}

export async function revokeSubAccountAutomationToken(tokenId: string): Promise<void> {
  const spinner = ora('Revoking sub-account automation token...').start();
  const result = await request<any>(`/merchants/me/subaccounts/automation-tokens/${tokenId}/revoke`, {
    method: 'POST',
  });
  spinner.succeed('Automation token revoked');

  console.log(chalk.green(`\nToken ${result.token_id} is now ${result.status}.\n`));
}

export async function closeSubAccount(id: string): Promise<void> {
  const spinner = ora('Closing sub-account...').start();
  const result = await request<any>(`/subaccounts/${id}`, { method: 'DELETE' });
  spinner.succeed('Sub-account closed');

  console.log(chalk.green(`\n${result.subaccount_id} is now ${result.status}.\n`));
}
