/**
 * PPP Pricing Commands - Purchasing Power Parity
 * 
 * Commands:
 * - zendfi ppp check <country>  Get PPP factor for a country
 * - zendfi ppp factors          List all PPP factors
 * - zendfi ppp calculate        Calculate localized price
 */

import chalk from 'chalk';
import ora from 'ora';

const ZENDFI_API_BASE = process.env.ZENDFI_API_URL || 'https://api.zendfi.tech/api/v1';

// Country flag emoji mapping
const COUNTRY_FLAGS: Record<string, string> = {
  AR: '🇦🇷', AU: '🇦🇺', BR: '🇧🇷', CA: '🇨🇦', CH: '🇨🇭',
  CL: '🇨🇱', CN: '🇨🇳', CO: '🇨🇴', CZ: '🇨🇿', DE: '🇩🇪',
  DK: '🇩🇰', EG: '🇪🇬', ES: '🇪🇸', FR: '🇫🇷', GB: '🇬🇧',
  GH: '🇬🇭', HK: '🇭🇰', HU: '🇭🇺', ID: '🇮🇩', IE: '🇮🇪',
  IL: '🇮🇱', IN: '🇮🇳', IT: '🇮🇹', JP: '🇯🇵', KE: '🇰🇪',
  KR: '🇰🇷', MX: '🇲🇽', MY: '🇲🇾', NG: '🇳🇬', NL: '🇳🇱',
  NO: '🇳🇴', NZ: '🇳🇿', PE: '🇵🇪', PH: '🇵🇭', PK: '🇵🇰',
  PL: '🇵🇱', PT: '🇵🇹', RO: '🇷🇴', RU: '🇷🇺', SA: '🇸🇦',
  SE: '🇸🇪', SG: '🇸🇬', TH: '🇹🇭', TR: '🇹🇷', TW: '🇹🇼',
  UA: '🇺🇦', US: '🇺🇸', VN: '🇻🇳', ZA: '🇿🇦',
};

// ============================================
// Types
// ============================================

interface PPPFactor {
  country_code: string;
  country_name: string;
  ppp_factor: number;
  currency_code: string;
  adjustment_percentage: number;
}

// ============================================
// Utilities
// ============================================

function getApiKey(): string | null {
  return process.env.ZENDFI_API_KEY || null;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function getFlag(countryCode: string): string {
  return COUNTRY_FLAGS[countryCode.toUpperCase()] || '🏳️';
}

function getDiscountColor(percentage: number): (str: string) => string {
  if (percentage >= 50) return chalk.green;
  if (percentage >= 30) return chalk.yellow;
  if (percentage >= 10) return chalk.cyan;
  return chalk.gray;
}

// ============================================
// Check PPP for Country
// ============================================

export async function checkPPP(countryCode: string, options: {
  price?: number;
}): Promise<void> {
  console.log(chalk.cyan.bold('\n🌍 PPP Factor Lookup\n'));

  const apiKey = getApiKey();
  if (!apiKey) {
    console.log(chalk.red('❌ No API key found!'));
    console.log(chalk.gray('\nSet your API key:'));
    console.log(chalk.cyan('  export ZENDFI_API_KEY=your_key_here'));
    return;
  }

  const spinner = ora(`Fetching PPP factor for ${countryCode.toUpperCase()}...`).start();

  try {
    const response = await fetch(`${ZENDFI_API_BASE}/ai/pricing/ppp-factor`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        country_code: countryCode.toUpperCase(),
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const factor = await response.json() as PPPFactor;
    spinner.succeed(chalk.green('PPP factor loaded!'));

    const flag = getFlag(factor.country_code);
    const discountColor = getDiscountColor(factor.adjustment_percentage);

    console.log('');
    console.log(chalk.bold(`  ${flag} ${factor.country_name} (${factor.country_code})`));
    console.log('');
    console.log(chalk.gray('  PPP Factor:       ') + chalk.white(factor.ppp_factor.toFixed(2)));
    console.log(chalk.gray('  Discount:         ') + discountColor(`${factor.adjustment_percentage.toFixed(0)}%`));
    console.log(chalk.gray('  Local Currency:   ') + chalk.white(factor.currency_code));
    console.log('');

    // If price provided, show calculation
    if (options.price && options.price > 0) {
      const localPrice = options.price * factor.ppp_factor;
      const savings = options.price - localPrice;

      console.log(chalk.bold('  Price Calculation:'));
      console.log(chalk.gray('  Original:    ') + chalk.white(formatCurrency(options.price)));
      console.log(chalk.gray('  Localized:   ') + chalk.green(formatCurrency(localPrice)));
      console.log(chalk.gray('  Savings:     ') + discountColor(formatCurrency(savings)));
      console.log('');
    } else {
      console.log(chalk.gray('  Example: $100 → ') + chalk.green(formatCurrency(100 * factor.ppp_factor)));
      console.log('');
      console.log(chalk.gray('  Calculate with price:'));
      console.log(chalk.cyan(`  zendfi ppp check ${countryCode} --price 99.99`));
      console.log('');
    }
  } catch (error) {
    spinner.fail(chalk.red('Failed to fetch PPP factor'));
    console.error(chalk.gray('\nError:'), error instanceof Error ? error.message : error);
    console.log('');
    console.log(chalk.gray('Make sure the country code is valid (e.g., BR, IN, NG)'));
    console.log('');
  }
}

// ============================================
// List All PPP Factors
// ============================================

export async function listPPPFactors(options: {
  sort?: 'discount' | 'country';
}): Promise<void> {
  console.log(chalk.cyan.bold('\n🌍 PPP Factors - All Countries\n'));

  const apiKey = getApiKey();
  if (!apiKey) {
    console.log(chalk.red('❌ No API key found!'));
    return;
  }

  const spinner = ora('Fetching PPP factors...').start();

  try {
    const response = await fetch(`${ZENDFI_API_BASE}/ai/pricing/ppp-factors`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as { factors?: PPPFactor[] } | PPPFactor[];
    let factors = Array.isArray(data) ? data : (data.factors || []);

    spinner.succeed(chalk.green(`Loaded ${factors.length} countries`));

    if (factors.length === 0) {
      console.log(chalk.gray('\nNo PPP factors available.\n'));
      return;
    }

    // Sort by discount or country name
    if (options.sort === 'discount') {
      factors = factors.sort((a, b) => b.adjustment_percentage - a.adjustment_percentage);
    } else {
      factors = factors.sort((a, b) => a.country_name.localeCompare(b.country_name));
    }

    console.log('');
    console.log(chalk.gray('  Country              Factor    Discount    $100 →'));
    console.log(chalk.gray('  ─────────────────────────────────────────────────'));

    factors.forEach((factor: PPPFactor) => {
      const flag = getFlag(factor.country_code);
      const discountColor = getDiscountColor(factor.adjustment_percentage);
      const localPrice = (100 * factor.ppp_factor).toFixed(0);

      const countryStr = `${flag} ${factor.country_name}`.padEnd(20);
      const factorStr = factor.ppp_factor.toFixed(2).padStart(6);
      const discountStr = discountColor(`${factor.adjustment_percentage.toFixed(0)}%`.padStart(6));
      const priceStr = chalk.green(`$${localPrice}`);

      console.log(`  ${countryStr} ${factorStr}    ${discountStr}      ${priceStr}`);
    });

    console.log('');
    console.log(chalk.gray('  Sort by discount: ') + chalk.cyan('zendfi ppp factors --sort discount'));
    console.log('');
  } catch (error) {
    spinner.fail(chalk.red('Failed to fetch PPP factors'));
    console.error(chalk.gray('\nError:'), error instanceof Error ? error.message : error);
  }
}

// ============================================
// Calculate Localized Price
// ============================================

export async function calculatePPP(options: {
  price: number;
  country: string;
}): Promise<void> {
  console.log(chalk.cyan.bold('\n💰 PPP Price Calculator\n'));

  const apiKey = getApiKey();
  if (!apiKey) {
    console.log(chalk.red('❌ No API key found!'));
    return;
  }

  if (!options.price || options.price <= 0) {
    console.log(chalk.red('❌ Price must be positive'));
    return;
  }

  if (!options.country || options.country.length !== 2) {
    console.log(chalk.red('❌ Valid 2-letter country code required'));
    return;
  }

  const spinner = ora('Calculating localized price...').start();

  try {
    const response = await fetch(`${ZENDFI_API_BASE}/ai/pricing/ppp-factor`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        country_code: options.country.toUpperCase(),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const factor = await response.json() as PPPFactor;
    spinner.succeed(chalk.green('Price calculated!'));

    const localPrice = options.price * factor.ppp_factor;
    const savings = options.price - localPrice;
    const flag = getFlag(factor.country_code);
    const discountColor = getDiscountColor(factor.adjustment_percentage);

    console.log('');
    console.log(chalk.bold(`  ${flag} ${factor.country_name}`));
    console.log('');
    console.log(chalk.gray('  ┌─────────────────────────────────────┐'));
    console.log(chalk.gray('  │') + chalk.bold('  Original Price:  ') + chalk.white(formatCurrency(options.price).padStart(12)) + chalk.gray('  │'));
    console.log(chalk.gray('  │') + chalk.bold('  PPP Factor:      ') + chalk.white(factor.ppp_factor.toFixed(2).padStart(12)) + chalk.gray('  │'));
    console.log(chalk.gray('  │') + chalk.gray('─────────────────────────────────────') + chalk.gray('│'));
    console.log(chalk.gray('  │') + chalk.bold('  Localized Price: ') + chalk.green(formatCurrency(localPrice).padStart(12)) + chalk.gray('  │'));
    console.log(chalk.gray('  │') + chalk.bold('  Customer Saves:  ') + discountColor(formatCurrency(savings).padStart(12)) + chalk.gray('  │'));
    console.log(chalk.gray('  └─────────────────────────────────────┘'));
    console.log('');
    console.log(chalk.gray(`  Discount: ${factor.adjustment_percentage.toFixed(0)}% off for ${factor.country_name} customers`));
    console.log('');
  } catch (error) {
    spinner.fail(chalk.red('Failed to calculate price'));
    console.error(chalk.gray('\nError:'), error instanceof Error ? error.message : error);
  }
}
