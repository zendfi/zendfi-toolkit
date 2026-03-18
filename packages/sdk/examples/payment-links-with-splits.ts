/**
 * ZendFi Payment Links with Splits Example
 *
 * This example demonstrates how to create payment links with split recipients,
 * supporting both wallet (direct blockchain transfer) and bank account
 * (PAJ offramp: USDC → NGN → bank) settlement paths.
 */

import { ZendFiClient, CreatePaymentLinkRequest, SplitRecipient } from '@zendfi/sdk';

const zendfi = new ZendFiClient({
  apiKey: process.env.ZENDFI_API_KEY,
  mode: 'test', // use 'live' in production
});

/**
 * Example 1: Marketplace with wallet splits
 *
 * Create a payment link for a marketplace that automatically splits
 * payments between seller, platform, and referrer.
 */
async function exampleMarketplaceSplits() {
  console.log('\n=== Marketplace Splits (Wallet Recipients) ===\n');

  const walletSplits: SplitRecipient[] = [
    {
      recipient_type: 'wallet',
      recipient_wallet: '7xKXt1Lk2R4T9z3mN8pQ5vHjB2wX6yL0aE4sC9dF1gK',
      percentage: 60,
      recipient_name: 'Seller',
      split_order: 1,
    },
    {
      recipient_type: 'wallet',
      recipient_wallet: '8yLYu2Ml3S5U0a4nO9qR6wIkC3xY7zM1bF5tD0eG2hL',
      percentage: 30,
      recipient_name: 'Platform',
      split_order: 2,
    },
    {
      recipient_type: 'wallet',
      recipient_wallet: '9zMZv3Nm4T6V1b5oP0rS7xJlD4yZ8aN2cG6uE1fH3iM',
      percentage: 10,
      recipient_name: 'Referrer',
      split_order: 3,
    },
  ];

  const request: CreatePaymentLinkRequest = {
    amount: 100.00,
    currency: 'USD',
    token: 'USDC',
    description: 'Marketplace Purchase – 3-way split',
    max_uses: 100,
    split_recipients: walletSplits,
  };

  const link = await zendfi.createPaymentLink(request);

  console.log('✓ Payment link created:', link.link_code);
  console.log('  URL:', link.url);
  console.log('  Recipients:');
  link.split_recipients?.forEach((recipient) => {
    if (recipient.recipient_type === 'wallet') {
      console.log(
        `    - ${recipient.recipient_name} (${recipient.percentage}%): ${recipient.recipient_wallet?.slice(0, 8)}...`
      );
    }
  });
}

/**
 * Example 2: Bank deposits with PAJ offramp
 *
 * Create a payment link for contractor/vendor payments that automatically
 * deposits to bank accounts via PAJ (USDC → NGN conversion).
 */
async function exampleBankAccountSplits() {
  console.log('\n=== Bank Account Splits (PAJ Offramp) ===\n');

  const bankSplits: SplitRecipient[] = [
    {
      recipient_type: 'bank_account',
      percentage: 70,
      recipient_account_name: 'John Okonkwo',
      recipient_bank_account: '0123456789',
      recipient_bank_id: 'GTB', // Guaranty Trust Bank
      recipient_email: 'john@contractor.com',
      split_order: 1,
    },
    {
      recipient_type: 'bank_account',
      percentage: 30,
      recipient_account_name: 'Mary Adeyemi',
      recipient_bank_account: '9876543210',
      recipient_bank_id: 'ACCESS', // Access Bank
      recipient_email: 'mary@contractor.com',
      split_order: 2,
    },
  ];

  const request: CreatePaymentLinkRequest = {
    amount: 500.00,
    currency: 'USD',
    token: 'USDC',
    description: 'Contractor Payment – Direct to Bank',
    onramp: true, // Enable NGN bank transfer option
    split_recipients: bankSplits,
  };

  const link = await zendfi.createPaymentLink(request);

  console.log('✓ Payment link created:', link.link_code);
  console.log('  URL:', link.url);
  console.log('  Settlement (USDC → NGN → Bank):');
  link.split_recipients?.forEach((recipient) => {
    if (recipient.recipient_type === 'bank_account') {
      console.log(`    - ${recipient.recipient_account_name} (${recipient.percentage}%): ${recipient.recipient_bank_id}`);
    }
  });
}

/**
 * Example 3: Mixed splits (wallet + bank)
 *
 * Create a payment link that splits between a blockchain wallet
 * and bank account recipients in a single transaction.
 */
async function exampleMixedSplits() {
  console.log('\n=== Mixed Splits (Wallet + Bank) ===\n');

  const mixedSplits: SplitRecipient[] = [
    {
      recipient_type: 'wallet',
      recipient_wallet: '7xKXt1Lk2R4T9z3mN8pQ5vHjB2wX6yL0aE4sC9dF1gK',
      percentage: 40,
      recipient_name: 'Agent (Crypto)',
      split_order: 1,
    },
    {
      recipient_type: 'bank_account',
      percentage: 60,
      recipient_account_name: 'Samuel Oluwaseun',
      recipient_bank_account: '0147258369',
      recipient_bank_id: 'ZENITH',
      recipient_email: 'samuel@business.ng',
      split_order: 2,
    },
  ];

  const request: CreatePaymentLinkRequest = {
    amount: 250.00,
    currency: 'USD',
    token: 'USDC',
    description: 'Split Payment – Crypto Agent + NGN Bank',
    onramp: true,
    collect_customer_info: true,
    split_recipients: mixedSplits,
  };

  const link = await zendfi.createPaymentLink(request);

  console.log('✓ Payment link created:', link.link_code);
  console.log('  URL:', link.url);
  console.log('  Settlement:');
  console.log('    - 40% direct blockchain transfer (crypto wallet)');
  console.log('    - 60% USDC → NGN → bank deposit');
}

/**
 * Example 4: Retrieve payment link with splits
 */
async function exampleRetrieveLinkWithSplits() {
  console.log('\n=== Retrieve Payment Link with Splits ===\n');

  // Create a simple link with splits first
  const splits: SplitRecipient[] = [
    {
      recipient_type: 'wallet',
      recipient_wallet: '7xKXt1Lk2R4T9z3mN8pQ5vHjB2wX6yL0aE4sC9dF1gK',
      percentage: 100,
      split_order: 1,
    },
  ];

  const created = await zendfi.createPaymentLink({
    amount: 99.99,
    description: 'Test Link',
    split_recipients: splits,
  });

  // Retrieve it
  const retrieved = await zendfi.getPaymentLink(created.link_code);

  console.log('✓ Retrieved link:', retrieved.link_code);
  console.log('  Description:', retrieved.description);
  console.log('  Has split_recipients:', !!retrieved.split_recipients?.length);
  console.log('  Split count:', retrieved.split_recipients?.length ?? 0);
}

/**
 * Type-safe discriminated union usage
 *
 * This demonstrates how TypeScript's discriminated unions ensure
 * type safety when working with different recipient types.
 */
function demonstrateTypeSafety() {
  console.log('\n=== Type Safety Demonstration ===\n');

  // Wallet recipient - TypeScript enforces recipient_wallet is required
  const walletRecipient: SplitRecipient = {
    recipient_type: 'wallet',
    recipient_wallet: '7xKXt...',
    percentage: 50,
    recipient_name: 'Wallet A',
  };

  // Bank recipient - TypeScript enforces bank-specific fields
  const bankRecipient: SplitRecipient = {
    recipient_type: 'bank_account',
    percentage: 50,
    recipient_account_name: 'John Doe',
    recipient_bank_account: '1234567890',
    recipient_bank_id: 'GTB',
    recipient_email: 'john@example.com',
  };

  // Type guards work naturally with discriminated unions
  const processSplit = (split: SplitRecipient) => {
    if (split.recipient_type === 'wallet') {
      // TypeScript knows split.recipient_wallet is available here
      console.log(`Processing wallet transfer to: ${split.recipient_wallet}`);
    } else {
      // TypeScript knows bank-specific fields are available here
      console.log(`Processing bank transfer to: ${split.recipient_account_name} (${split.recipient_bank_id})`);
    }
  };

  processSplit(walletRecipient);
  processSplit(bankRecipient);

  console.log('✓ Type safety demonstrated');
}

/**
 * Main function - run all examples
 */
async function main() {
  try {
    console.log('ZendFi Payment Links with Splits - Examples');
    console.log('==========================================');

    // Show type safety first (no API calls needed)
    demonstrateTypeSafety();

    // Run API examples in sequence
    await exampleMarketplaceSplits();
    await exampleBankAccountSplits();
    await exampleMixedSplits();
    await exampleRetrieveLinkWithSplits();

    console.log('\n✓ All examples completed successfully!');
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Uncomment to run: main();
