import type {
  Environment,
  ZendFiConfig,
} from './types';
import {
  ZendFiError,
  AuthenticationError,
  ValidationError,
  NetworkError,
  RateLimitError,
} from './types';

/**
 * Configuration loader and environment detector
 */
export class ConfigLoader {
  /**
   * Load configuration from various sources
   */
  static load(options?: Partial<ZendFiConfig>): Required<ZendFiConfig> {
    const environment = this.detectEnvironment();
    const apiKey = this.loadApiKey(options?.apiKey);
    const baseURL = this.getBaseURL(environment, options?.baseURL);

    return {
      apiKey,
      baseURL,
      environment,
      timeout: options?.timeout ?? 30000,
      retries: options?.retries ?? 3,
      idempotencyEnabled: options?.idempotencyEnabled ?? true,
    };
  }

  /**
   * Detect environment based on various signals
   */
  private static detectEnvironment(): Environment {
    // Explicit env var takes precedence
    const envVar = process.env.ZENDFI_ENVIRONMENT || process.env.NEXT_PUBLIC_ZENDFI_ENVIRONMENT;
    if (envVar) {
      return envVar as Environment;
    }

    // Node environment detection
    if (typeof process !== 'undefined' && process.env) {
      const nodeEnv = process.env.NODE_ENV;

      if (nodeEnv === 'production') return 'production';
      if (nodeEnv === 'staging') return 'staging';
      if (nodeEnv === 'development' || nodeEnv === 'test') return 'development';
    }

    // Browser detection (if window is available)
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;

      // Production domains
      if (hostname === 'yourdomain.com' || hostname === 'www.yourdomain.com') {
        return 'production';
      }

      // Staging domains
      if (hostname.includes('staging') || hostname.includes('.vercel.app')) {
        return 'staging';
      }

      // Local development
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'development';
      }
    }

    // Default to development for safety
    return 'development';
  }

  /**
   * Load API key from various sources
   */
  private static loadApiKey(explicitKey?: string): string {
    // 1. Explicit key in constructor
    if (explicitKey) return explicitKey;

    // 2. Environment variables (try multiple variants)
    if (typeof process !== 'undefined' && process.env) {
      const envKey =
        process.env.ZENDFI_API_KEY ||
        process.env.NEXT_PUBLIC_ZENDFI_API_KEY ||
        process.env.REACT_APP_ZENDFI_API_KEY;

      if (envKey) return envKey;
    }

    // 3. CLI credentials file (for development)
    try {
      const credentials = this.loadCLICredentials();
      if (credentials?.apiKey) return credentials.apiKey;
    } catch {
      // Ignore errors loading CLI credentials
    }

    throw new Error(
      'ZendFi API key not found. Set ZENDFI_API_KEY environment variable or pass apiKey in constructor.'
    );
  }

  /**
   * Get base URL for API
   */
  private static getBaseURL(_environment: Environment, explicitURL?: string): string {
    if (explicitURL) return explicitURL;

    // For now, all environments use the same API
    // In the future, you might have separate staging/dev APIs
    return process.env.ZENDFI_API_URL || 'https://api.zendfi.tech';
  }

  /**
   * Load credentials from CLI config file (~/.zendfi/credentials.json)
   */
  private static loadCLICredentials(): { apiKey?: string } | null {
    // Only works in Node.js environment
    if (typeof process === 'undefined' || !process.env.HOME) {
      return null;
    }

    try {
      // Dynamic import to avoid bundling fs in browser builds
      const fs = require('fs');
      const path = require('path');

      const credentialsPath = path.join(process.env.HOME, '.zendfi', 'credentials.json');

      if (fs.existsSync(credentialsPath)) {
        const data = fs.readFileSync(credentialsPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      // Ignore errors
    }

    return null;
  }

  /**
   * Validate API key format
   */
  static validateApiKey(apiKey: string): void {
    // ZendFi API keys start with zfi_test_ or zfi_live_
    if (!apiKey.startsWith('zfi_test_') && !apiKey.startsWith('zfi_live_')) {
      throw new Error(
        'Invalid API key format. ZendFi API keys should start with "zfi_test_" or "zfi_live_"'
      );
    }

    // Warn if using live key in development
    if (apiKey.startsWith('zfi_live_')) {
      const env = this.detectEnvironment();
      if (env === 'development') {
        console.warn(
          '⚠️  Warning: Using a live API key (zfi_live_) in development environment. ' +
            'This will create real transactions. Use a test key (zfi_test_) for development.'
        );
      }
    }
  }
}

/**
 * Parse error responses from API
 */
export function parseError(response: Response, body?: any): ZendFiError {
  const statusCode = response.status;
  const errorMessage = body?.error || body?.message || response.statusText || 'Unknown error';
  const errorCode = body?.code;
  const details = body?.details;

  // Map status codes to appropriate error types
  switch (statusCode) {
    case 401:
    case 403:
      return new AuthenticationError(errorMessage) as any;

    case 400:
      return new ValidationError(errorMessage, details) as any;

    case 429:
      return new RateLimitError(errorMessage) as any;

    case 500:
    case 502:
    case 503:
    case 504:
      return new NetworkError(errorMessage) as any;

    default:
      return new (ZendFiError as any)(errorMessage, statusCode, errorCode, details);
  }
}

/**
 * Generate idempotency key
 */
export function generateIdempotencyKey(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `zfi_idem_${timestamp}_${random}`;
}

/**
 * Sleep utility for retry backoff
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
