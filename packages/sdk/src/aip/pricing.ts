/**
 * Pricing API - Purchasing Power Parity (PPP) and AI-powered pricing
 * 
 * Enable global reach with geo-aware pricing that automatically adjusts
 * prices based on the customer's location and purchasing power.
 * 
 * @example
 * ```typescript
 * // Get PPP factor for Brazil
 * const factor = await zendfi.pricing.getPPPFactor('BR');
 * console.log(`Brazil: ${factor.adjustment_percentage}% discount suggested`);
 * 
 * // Apply PPP to a product price
 * const basePrice = 100;
 * const localPrice = basePrice * factor.ppp_factor;
 * console.log(`$${basePrice} → $${localPrice.toFixed(2)} for Brazilian customers`);
 * ```
 */

import type {
  PPPFactor,
  PricingSuggestion,
  PricingSuggestionRequest,
} from '../types';

export type RequestFn = <T>(method: string, endpoint: string, data?: any) => Promise<T>;

export class PricingAPI {
  constructor(private request: RequestFn) {}

  /**
   * Get PPP factor for a specific country
   * 
   * Returns the purchasing power parity adjustment factor for the given
   * country code. Use this to calculate localized pricing.
   * 
   * @param countryCode - ISO 3166-1 alpha-2 country code (e.g., "BR", "IN", "NG")
   * @returns PPP factor and suggested adjustment
   * 
   * @example
   * ```typescript
   * const factor = await zendfi.pricing.getPPPFactor('BR');
   * // {
   * //   country_code: 'BR',
   * //   country_name: 'Brazil',
   * //   ppp_factor: 0.35,
   * //   currency_code: 'BRL',
   * //   adjustment_percentage: 35.0
   * // }
   * 
   * // Calculate localized price
   * const usdPrice = 100;
   * const localPrice = usdPrice * (1 - factor.adjustment_percentage / 100);
   * console.log(`$${localPrice} for Brazilian customers`);
   * ```
   */
  async getPPPFactor(countryCode: string): Promise<PPPFactor> {
    return this.request<PPPFactor>('POST', '/api/v1/ai/pricing/ppp-factor', {
      country_code: countryCode.toUpperCase(),
    });
  }

  /**
   * List all available PPP factors
   * 
   * Returns PPP factors for all supported countries. Useful for building
   * pricing tables or pre-computing regional prices.
   * 
   * @returns Array of PPP factors for all supported countries
   * 
   * @example
   * ```typescript
   * const factors = await zendfi.pricing.listFactors();
   * 
   * // Create pricing tiers
   * const tiers = factors.map(f => ({
   *   country: f.country_name,
   *   price: (100 * f.ppp_factor).toFixed(2),
   * }));
   * 
   * console.table(tiers);
   * ```
   */
  async listFactors(): Promise<PPPFactor[]> {
    const response = await this.request<{ factors: PPPFactor[] } | PPPFactor[]>(
      'GET',
      '/api/v1/ai/pricing/ppp-factors'
    );
    return Array.isArray(response) ? response : response.factors;
  }

  /**
   * Get AI-powered pricing suggestion
   * 
   * Returns an intelligent pricing recommendation based on the user's
   * location, wallet history, and your pricing configuration.
   * 
   * @param request - Pricing suggestion request with user context
   * @returns AI-generated pricing suggestion with reasoning
   * 
   * @example
   * ```typescript
   * const suggestion = await zendfi.pricing.getSuggestion({
   *   agent_id: 'shopping-assistant',
   *   base_price: 99.99,
   *   user_profile: {
   *     location_country: 'BR',
   *     context: 'first-time',
   *   },
   *   ppp_config: {
   *     enabled: true,
   *     max_discount_percent: 50,
   *     floor_price: 29.99,
   *   },
   * });
   * 
   * console.log(`Suggested: $${suggestion.suggested_amount}`);
   * console.log(`Reason: ${suggestion.reasoning}`);
   * // => "Price adjusted for Brazilian purchasing power (35% PPP discount) 
   * //     plus 10% first-time customer discount"
   * ```
   */
  async getSuggestion(request: PricingSuggestionRequest): Promise<PricingSuggestion> {
    return this.request<PricingSuggestion>('POST', '/api/v1/ai/pricing/suggest', {
      agent_id: request.agent_id,
      product_id: request.product_id,
      base_price: request.base_price,
      currency: request.currency || 'USD',
      user_profile: request.user_profile,
      ppp_config: request.ppp_config,
    });
  }

  /**
   * Calculate localized price for a given base price and country
   * 
   * Convenience method that combines getPPPFactor with price calculation.
   * 
   * @param basePrice - Original price in USD
   * @param countryCode - ISO 3166-1 alpha-2 country code
   * @returns Object with original and adjusted prices
   * 
   * @example
   * ```typescript
   * const result = await zendfi.pricing.calculateLocalPrice(100, 'IN');
   * console.log(`Original: $${result.original}`);
   * console.log(`Local: $${result.adjusted}`);
   * console.log(`Savings: $${result.savings} (${result.discount_percentage}%)`);
   * ```
   */
  async calculateLocalPrice(
    basePrice: number,
    countryCode: string
  ): Promise<{
    original: number;
    adjusted: number;
    savings: number;
    discount_percentage: number;
    country: string;
    ppp_factor: number;
  }> {
    const factor = await this.getPPPFactor(countryCode);
    const adjusted = Number((basePrice * factor.ppp_factor).toFixed(2));
    const savings = Number((basePrice - adjusted).toFixed(2));
    
    return {
      original: basePrice,
      adjusted,
      savings,
      discount_percentage: factor.adjustment_percentage,
      country: factor.country_name,
      ppp_factor: factor.ppp_factor,
    };
  }
}
