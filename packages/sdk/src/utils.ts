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
    const mode = this.detectMode(apiKey);
    const baseURL = this.getBaseURL(environment, mode, options?.baseURL);

    return {
      apiKey,
      baseURL,
      environment,
      mode,
      timeout: options?.timeout ?? 30000,
      retries: options?.retries ?? 3,
      idempotencyEnabled: options?.idempotencyEnabled ?? true,
    };
  }

  /**
   * Detect mode (test/live) from API key prefix
   */
  private static detectMode(apiKey: string): 'test' | 'live' {
    if (apiKey.startsWith('zfi_test_')) {
      return 'test';
    }
    if (apiKey.startsWith('zfi_live_')) {
      return 'live';
    }
    // Fallback to live if no prefix detected
    return 'live';
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

    if (typeof process !== 'undefined' && process.env) {
      const nodeEnv = process.env.NODE_ENV;

      if (nodeEnv === 'production') return 'production';
      if (nodeEnv === 'staging') return 'staging';
      if (nodeEnv === 'development' || nodeEnv === 'test') return 'development';
    }

    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;

      if (hostname === 'yourdomain.com' || hostname === 'www.yourdomain.com') {
        return 'production';
      }

      if (hostname.includes('staging') || hostname.includes('.vercel.app')) {
        return 'staging';
      }

      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'development';
      }
    }

    return 'development';
  }

  /**
   * Load API key from various sources
   */
  private static loadApiKey(explicitKey?: string): string {
    if (explicitKey) return explicitKey;

    if (typeof process !== 'undefined' && process.env) {
      const envKey =
        process.env.ZENDFI_API_KEY ||
        process.env.NEXT_PUBLIC_ZENDFI_API_KEY ||
        process.env.REACT_APP_ZENDFI_API_KEY;

      if (envKey) return envKey;
    }

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
   * Note: Both test and live modes use the same API endpoint.
   * The backend routes requests to devnet or mainnet based on API key prefix.
   */
  private static getBaseURL(_environment: Environment, _mode: 'test' | 'live', explicitURL?: string): string {
    if (explicitURL) return explicitURL;

    // Single API endpoint for both test (devnet) and live (mainnet) modes
    // Backend uses API key prefix to determine network routing
    return process.env.ZENDFI_API_URL || 'https://api.zendfi.tech';
  }

  /**
   * Load credentials from CLI config file (~/.zendfi/credentials.json)
   */
  private static loadCLICredentials(): { apiKey?: string } | null {
    if (typeof process === 'undefined' || !process.env.HOME) {
      return null;
    }

    try {
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
    if (!apiKey.startsWith('zfi_test_') && !apiKey.startsWith('zfi_live_')) {
      throw new Error(
        'Invalid API key format. ZendFi API keys should start with "zfi_test_" or "zfi_live_"'
      );
    }

    const mode = this.detectMode(apiKey);
    const env = this.detectEnvironment();
    
    if (mode === 'live' && env === 'development') {
      console.warn(
        '⚠️  Warning: Using a live API key (zfi_live_) in development environment. ' +
          'This will create real mainnet transactions. Use a test key (zfi_test_) for devnet testing.'
      );
    }
    
    if (mode === 'test' && env === 'production') {
      console.warn(
        '⚠️  Warning: Using a test API key (zfi_test_) in production environment. ' +
          'This will create devnet transactions only. Use a live key (zfi_live_) for mainnet.'
      );
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
