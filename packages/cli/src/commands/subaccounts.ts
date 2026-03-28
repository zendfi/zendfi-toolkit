import chalk from 'chalk';
import ora from 'ora';
import { readFileSync } from 'fs';
import open from 'open';

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

interface StartSigningGrantBrowserIntentResponse {
  intent_id: string;
  intent_token: string;
  approval_url: string;
  expires_at: string;
}

interface PollSigningGrantBrowserIntentResponse {
  status: string;
  completed: boolean;
  expires_at: string;
  grant?: {
    grant_id: string;
    signing_grant: string;
    sub_account_id?: string;
    expires_at: string;
    max_uses: number;
    total_limit_usdc: number;
    per_tx_limit_usdc: number;
    mode?: 'test' | 'live';
  };
  error?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function parseOptionalPasskeyFile(filePath?: string): PasskeySignaturePayload | undefined {
  if (!filePath) {
    return undefined;
  }
  return parsePasskeyFile(filePath);
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
  policyVersionId?: string;
  agentLabel?: string;
  agentPublicKey?: string;
  agentMetadata?: string;
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
      policy_version_id: options.policyVersionId,
      agent_label: options.agentLabel,
      agent_public_key: options.agentPublicKey,
      agent_metadata: options.agentMetadata ? JSON.parse(options.agentMetadata) : undefined,
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

export async function mintSubAccountChildToken(id: string, options: {
  parentDelegationToken: string;
  scope?: string;
  spendLimit?: number;
  ttl?: number;
  whitelist?: string;
  singleUse?: boolean;
  policyVersionId?: string;
  agentLabel?: string;
  agentPublicKey?: string;
  agentMetadata?: string;
}): Promise<void> {
  const spinner = ora('Minting child delegation token...').start();
  const result = await request<any>(`/subaccounts/${id}/session-key/child`, {
    method: 'POST',
    body: {
      parent_delegation_token: options.parentDelegationToken,
      scope: parseScope(options.scope),
      spend_limit_usdc: options.spendLimit,
      expires_in_seconds: options.ttl,
      whitelist: options.whitelist ? options.whitelist.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      single_use: options.singleUse,
      policy_version_id: options.policyVersionId,
      agent_label: options.agentLabel,
      agent_public_key: options.agentPublicKey,
      agent_metadata: options.agentMetadata ? JSON.parse(options.agentMetadata) : undefined,
    },
  });
  spinner.succeed('Child delegation token minted');

  console.log(chalk.cyan('\nChild Delegation Token'));
  console.log(chalk.gray('  Token ID:       ') + chalk.white(result.token_id));
  console.log(chalk.gray('  Parent Token:   ') + chalk.white(result.parent_token_id));
  console.log(chalk.gray('  Scope:          ') + chalk.white(result.scope));
  console.log(chalk.gray('  Expires:        ') + chalk.white(result.expires_at));
  console.log(chalk.gray('  Depth:          ') + chalk.white(String(result.delegation_depth)));
  console.log(chalk.gray('  Token:          ') + chalk.yellow(result.delegation_token));
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
  signingGrant?: string;
  executionIntentId?: string;
}): Promise<void> {
  const passkey = parseOptionalPasskeyFile(options.passkeyFile);
  if (!options.signingGrant && !passkey) {
    throw new Error('Provide --signing-grant for headless execution or --passkey-file for interactive signing.');
  }

  if (options.signingGrant && passkey) {
    throw new Error('Use either --signing-grant or --passkey-file, not both.');
  }

  const spinner = ora('Submitting sub-account withdrawal...').start();
  const result = await request<any>(`/subaccounts/${id}/withdraw`, {
    method: 'POST',
    body: {
      to_address: options.to,
      amount: options.amount,
      token: options.token,
      mode: options.mode,
      delegation_token: options.delegationToken,
      signing_grant: options.signingGrant,
      execution_intent_id: options.executionIntentId,
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
  signingGrant?: string;
  executionIntentId?: string;
}): Promise<void> {
  if (options.automationToken && options.delegationToken) {
    throw new Error('Use either --automation-token or --delegation-token, not both.');
  }

  const passkey = parseOptionalPasskeyFile(options.passkeyFile);
  if (!options.signingGrant && !passkey) {
    throw new Error('Provide --signing-grant for headless execution or --passkey-file for interactive signing.');
  }

  if (options.signingGrant && passkey) {
    throw new Error('Use either --signing-grant or --passkey-file, not both.');
  }

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
      signing_grant: options.signingGrant,
      execution_intent_id: options.executionIntentId,
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
  policyVersionId?: string;
  parentTokenId?: string;
  agentLabel?: string;
  agentPublicKey?: string;
  agentMetadata?: string;
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
      policy_version_id: options.policyVersionId,
      parent_token_id: options.parentTokenId,
      agent_label: options.agentLabel,
      agent_public_key: options.agentPublicKey,
      agent_metadata: options.agentMetadata ? JSON.parse(options.agentMetadata) : undefined,
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

export async function mintSubAccountSigningGrant(options: {
  subAccountId?: string;
  ttl: number;
  maxUses: number;
  totalLimit: number;
  perTxLimit: number;
  bankIds?: string;
  accountNumbers?: string;
  mode?: 'test' | 'live';
  passkeyFile?: string;
  open?: boolean;
  policyVersionId?: string;
  parentGrantId?: string;
  activeDaysUtc?: string;
  activeStartUtc?: string;
  activeEndUtc?: string;
  autoRenew?: boolean;
  agentLabel?: string;
  agentPublicKey?: string;
  agentMetadata?: string;
}): Promise<void> {
  const activeDays = options.activeDaysUtc
    ? options.activeDaysUtc
        .split(',')
        .map((v) => parseInt(v.trim(), 10))
        .filter((v) => Number.isInteger(v) && v >= 0 && v <= 6)
    : undefined;

  const requestBody = {
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
    policy_version_id: options.policyVersionId,
    parent_grant_id: options.parentGrantId,
    active_days_utc: activeDays,
    active_start_time_utc: options.activeStartUtc,
    active_end_time_utc: options.activeEndUtc,
    auto_renew: options.autoRenew,
    agent_label: options.agentLabel,
    agent_public_key: options.agentPublicKey,
    agent_metadata: options.agentMetadata ? JSON.parse(options.agentMetadata) : undefined,
  };

  if (options.passkeyFile) {
    const passkey = parsePasskeyFile(options.passkeyFile);
    const spinner = ora('Minting sub-account signing grant (legacy passkey payload flow)...').start();
    const result = await request<any>('/merchants/me/subaccounts/signing-grants', {
      method: 'POST',
      body: {
        ...requestBody,
        passkey_signature: passkey,
      },
    });
    spinner.succeed('Signing grant minted');

    console.log(chalk.cyan('\nSigning Grant'));
    console.log(chalk.gray('  Grant ID:       ') + chalk.white(result.grant_id));
    console.log(chalk.gray('  Sub-account:    ') + chalk.white(result.sub_account_id ?? 'all merchant sub-accounts'));
    console.log(chalk.gray('  Expires At:     ') + chalk.white(result.expires_at));
    console.log(chalk.gray('  Max Uses:       ') + chalk.white(String(result.max_uses)));
    console.log(chalk.gray('  Total Limit:    ') + chalk.white(String(result.total_limit_usdc)));
    console.log(chalk.gray('  Per-Tx Limit:   ') + chalk.white(String(result.per_tx_limit_usdc)));
    console.log(chalk.gray('  Mode:           ') + chalk.white(String(result.mode ?? 'live')));
    console.log(chalk.gray('  Grant (one-time): ') + chalk.yellow(result.signing_grant));
    console.log('');
    return;
  }

  const startSpinner = ora('Starting browser passkey approval for signing grant...').start();
  const intent = await request<StartSigningGrantBrowserIntentResponse>(
    '/subaccounts/signing-grants/browser-intents/start',
    {
      method: 'POST',
      body: requestBody,
    }
  );
  startSpinner.succeed('Approval intent created');

  console.log(chalk.cyan('\nSigning Grant Browser Approval'));
  console.log(chalk.gray('  Intent ID:      ') + chalk.white(intent.intent_id));
  console.log(chalk.gray('  Approval URL:   ') + chalk.white(intent.approval_url));
  console.log(chalk.gray('  Expires At:     ') + chalk.white(intent.expires_at));

  if (options.open !== false) {
    try {
      await open(intent.approval_url);
      console.log(chalk.green('  Browser:        opened successfully'));
    } catch (error) {
      console.log(chalk.yellow(`  Browser:        could not auto-open (${error instanceof Error ? error.message : 'unknown error'})`));
      console.log(chalk.yellow('                   Open the approval URL manually.'));
    }
  } else {
    console.log(chalk.yellow('  Browser:        disabled via --no-open (open URL manually).'));
  }
  console.log('');

  const pollSpinner = ora('Waiting for passkey approval in browser...').start();
  const maxAttempts = 180;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const poll = await request<PollSigningGrantBrowserIntentResponse>(
      '/subaccounts/signing-grants/browser-intents/poll',
      {
        method: 'POST',
        body: {
          intent_id: intent.intent_id,
          intent_token: intent.intent_token,
        },
      }
    );

    if (poll.completed) {
      if (poll.status === 'approved' && poll.grant) {
        pollSpinner.succeed('Signing grant approved');
        console.log(chalk.cyan('\nSigning Grant'));
        console.log(chalk.gray('  Grant ID:       ') + chalk.white(poll.grant.grant_id));
        console.log(chalk.gray('  Sub-account:    ') + chalk.white(poll.grant.sub_account_id ?? 'all merchant sub-accounts'));
        console.log(chalk.gray('  Expires At:     ') + chalk.white(poll.grant.expires_at));
        console.log(chalk.gray('  Max Uses:       ') + chalk.white(String(poll.grant.max_uses)));
        console.log(chalk.gray('  Total Limit:    ') + chalk.white(String(poll.grant.total_limit_usdc)));
        console.log(chalk.gray('  Per-Tx Limit:   ') + chalk.white(String(poll.grant.per_tx_limit_usdc)));
        console.log(chalk.gray('  Mode:           ') + chalk.white(String(poll.grant.mode ?? 'live')));
        console.log(chalk.gray('  Grant (one-time): ') + chalk.yellow(poll.grant.signing_grant));
        console.log('');
        return;
      }

      pollSpinner.fail(`Signing grant approval ${poll.status}`);
      throw new Error(poll.error || `Signing grant approval ended with status: ${poll.status}`);
    }

    await sleep(2000);
  }

  pollSpinner.fail('Signing grant approval timed out');
  throw new Error('Timed out waiting for browser approval. Re-run command and complete passkey approval before intent expiry.');
}

export async function revokeSubAccountSigningGrant(grantId: string): Promise<void> {
  const spinner = ora('Revoking sub-account signing grant...').start();
  const result = await request<any>(`/merchants/me/subaccounts/signing-grants/${grantId}/revoke`, {
    method: 'POST',
  });
  spinner.succeed('Signing grant revoked');

  console.log(chalk.green(`\nGrant ${result.grant_id} is now ${result.status}.\n`));
}

export async function closeSubAccount(id: string): Promise<void> {
  const spinner = ora('Closing sub-account...').start();
  const result = await request<any>(`/subaccounts/${id}`, { method: 'DELETE' });
  spinner.succeed('Sub-account closed');

  console.log(chalk.green(`\n${result.subaccount_id} is now ${result.status}.\n`));
}

export async function createSubAccountPolicy(options: {
  subAccountId?: string;
  policyType: string;
  policyJson: string;
  status?: 'draft' | 'active' | 'deprecated' | 'revoked';
}): Promise<void> {
  const spinner = ora('Creating sub-account policy...').start();
  const result = await request<any>('/merchants/me/subaccounts/policies', {
    method: 'POST',
    body: {
      sub_account_id: options.subAccountId,
      policy_type: options.policyType,
      policy_json: JSON.parse(options.policyJson),
      status: options.status,
    },
  });
  spinner.succeed('Policy created');

  console.log(chalk.cyan('\nSub-account Policy'));
  console.log(chalk.gray('  Policy ID:      ') + chalk.white(result.policy_id));
  console.log(chalk.gray('  Type:           ') + chalk.white(result.policy_type));
  console.log(chalk.gray('  Version:        ') + chalk.white(String(result.version_number)));
  console.log(chalk.gray('  Status:         ') + chalk.white(result.status));
  console.log(chalk.gray('  Hash:           ') + chalk.white(result.semantic_hash));
  console.log('');
}

export async function dryRunSubAccountPolicy(options: {
  policyJson: string;
  amount: number;
  counterparty?: string;
  mode?: 'test' | 'live';
  subAccountId?: string;
  dailySpend?: number;
}): Promise<void> {
  const spinner = ora('Evaluating policy dry-run...').start();
  const result = await request<any>('/merchants/me/subaccounts/policies/dry-run', {
    method: 'POST',
    body: {
      policy_json: JSON.parse(options.policyJson),
      amount_usdc: options.amount,
      counterparty: options.counterparty,
      mode: options.mode,
      sub_account_id: options.subAccountId,
      daily_spend_usdc: options.dailySpend,
    },
  });
  spinner.succeed('Policy evaluated');
  console.log(chalk.cyan('\nPolicy Dry Run'));
  console.log(chalk.gray('  Allowed:        ') + chalk.white(String(result.allowed)));
  if (result.reason) {
    console.log(chalk.gray('  Reason:         ') + chalk.yellow(result.reason));
  }
  console.log('');
}

export async function createWebhookTriggerSubscription(options: {
  subAccountId?: string;
  triggerType: string;
  threshold?: number;
  cooldown?: number;
  policyVersionId?: string;
  destinationWebhookUrl?: string;
  metadata?: string;
}): Promise<void> {
  const spinner = ora('Creating webhook trigger subscription...').start();
  const result = await request<any>('/merchants/me/subaccounts/webhook-triggers', {
    method: 'POST',
    body: {
      sub_account_id: options.subAccountId,
      trigger_type: options.triggerType,
      threshold_value_usdc: options.threshold,
      cooldown_seconds: options.cooldown,
      policy_version_id: options.policyVersionId,
      destination_webhook_url: options.destinationWebhookUrl,
      metadata: options.metadata ? JSON.parse(options.metadata) : undefined,
    },
  });
  spinner.succeed('Webhook trigger subscription created');

  console.log(chalk.cyan('\nWebhook Trigger'));
  console.log(chalk.gray('  Subscription:   ') + chalk.white(result.subscription_id));
  console.log(chalk.gray('  Trigger:        ') + chalk.white(result.trigger_type));
  console.log(chalk.gray('  Status:         ') + chalk.white(result.status));
  console.log('');
}

export async function listWebhookTriggerSubscriptions(): Promise<void> {
  const spinner = ora('Listing webhook trigger subscriptions...').start();
  const result = await request<any>('/merchants/me/subaccounts/webhook-triggers');
  spinner.succeed(`Found ${result.count ?? 0} subscription${result.count === 1 ? '' : 's'}`);

  const items = result.subscriptions || [];
  if (!items.length) {
    console.log(chalk.gray('\nNo trigger subscriptions found.\n'));
    return;
  }

  console.log('');
  items.forEach((item: any, idx: number) => {
    console.log(chalk.bold(`${idx + 1}. ${item.trigger_type} (${item.status})`));
    console.log(chalk.gray('   ID:        ') + chalk.white(item.id));
    console.log(chalk.gray('   Sub:       ') + chalk.white(item.sub_account_id ?? 'merchant_scope'));
    if (item.threshold_value_usdc != null) {
      console.log(chalk.gray('   Threshold: ') + chalk.white(String(item.threshold_value_usdc)));
    }
    console.log(chalk.gray('   Cooldown:  ') + chalk.white(String(item.cooldown_seconds)));
    console.log('');
  });
}

export async function createExecutionIntent(options: {
  subAccountId: string;
  intentType: string;
  signalType: 'passkey_session' | 'webhook_ack' | 'programmatic_condition';
  payload: string;
  policyVersionId?: string;
  expires?: number;
  metadata?: string;
}): Promise<void> {
  const spinner = ora('Creating execution intent...').start();
  const result = await request<any>('/merchants/me/subaccounts/execution-intents', {
    method: 'POST',
    body: {
      sub_account_id: options.subAccountId,
      intent_type: options.intentType,
      requires_signal_type: options.signalType,
      payload: JSON.parse(options.payload),
      policy_version_id: options.policyVersionId,
      expires_in_seconds: options.expires,
      metadata: options.metadata ? JSON.parse(options.metadata) : undefined,
    },
  });
  spinner.succeed('Execution intent created');

  console.log(chalk.cyan('\nExecution Intent'));
  console.log(chalk.gray('  Intent ID:      ') + chalk.white(result.intent_id));
  console.log(chalk.gray('  Status:         ') + chalk.white(result.status));
  if (result.signal_token) {
    console.log(chalk.gray('  Signal Token:   ') + chalk.yellow(result.signal_token));
  }
  if (result.expires_at) {
    console.log(chalk.gray('  Expires:        ') + chalk.white(result.expires_at));
  }
  console.log('');
}

export async function approveExecutionIntent(intentId: string, options: {
  approve?: boolean;
  reason?: string;
}): Promise<void> {
  const spinner = ora('Updating execution intent approval...').start();
  const result = await request<any>(`/merchants/me/subaccounts/execution-intents/${intentId}/approve`, {
    method: 'POST',
    body: {
      approve: options.approve,
      reason: options.reason,
    },
  });
  spinner.succeed('Execution intent updated');
  console.log(chalk.green(`\nIntent ${intentId} is now ${result.status}.\n`));
}

export async function releaseExecutionIntentBySignal(signalToken: string): Promise<void> {
  const spinner = ora('Releasing execution intent by signal...').start();
  const result = await request<any>('/subaccounts/execution-intents/release', {
    method: 'POST',
    body: {
      signal_token: signalToken,
    },
  });
  spinner.succeed('Execution intent released');
  console.log(chalk.green(`\nIntent ${result.intent_id} released (status=${result.status}).\n`));
}

export async function createBalanceRule(options: {
  subAccountId: string;
  ruleName: string;
  ruleType: 'topup_below' | 'drain_above';
  threshold: number;
  actionAmount?: number;
  maxActionsPerDay?: number;
  cooldown?: number;
  policyVersionId?: string;
  metadata?: string;
}): Promise<void> {
  const spinner = ora('Creating balance rule...').start();
  const result = await request<any>('/merchants/me/subaccounts/balance-rules', {
    method: 'POST',
    body: {
      sub_account_id: options.subAccountId,
      rule_name: options.ruleName,
      rule_type: options.ruleType,
      threshold_usdc: options.threshold,
      action_amount_usdc: options.actionAmount,
      max_actions_per_day: options.maxActionsPerDay,
      cooldown_seconds: options.cooldown,
      policy_version_id: options.policyVersionId,
      metadata: options.metadata ? JSON.parse(options.metadata) : undefined,
    },
  });
  spinner.succeed('Balance rule created');

  console.log(chalk.cyan('\nBalance Rule'));
  console.log(chalk.gray('  Rule ID:        ') + chalk.white(result.rule_id));
  console.log(chalk.gray('  Status:         ') + chalk.white(result.status));
  console.log('');
}
