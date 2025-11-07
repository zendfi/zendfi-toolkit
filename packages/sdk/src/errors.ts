/**
 * ZendFi SDK Error Classes
 * 
 * Custom error types with helpful messages, error codes, and documentation links
 */

export type ZendFiErrorType =
  | 'authentication_error'
  | 'payment_error'
  | 'validation_error'
  | 'network_error'
  | 'rate_limit_error'
  | 'api_error'
  | 'webhook_error'
  | 'unknown_error';

export interface ZendFiErrorData {
  code: string;
  message: string;
  type: ZendFiErrorType;
  suggestion?: string;
  statusCode?: number;
  response?: unknown;
}

/**
 * Base ZendFi Error class with enhanced developer experience
 */
export class ZendFiError extends Error {
  public readonly code: string;
  public readonly type: ZendFiErrorType;
  public readonly suggestion?: string;
  public readonly docs_url: string;
  public readonly statusCode?: number;
  public readonly response?: unknown;

  constructor(data: ZendFiErrorData) {
    super(data.message);
    this.name = 'ZendFiError';
    this.code = data.code;
    this.type = data.type;
    this.suggestion = data.suggestion;
    this.statusCode = data.statusCode;
    this.response = data.response;
    this.docs_url = `https://docs.zendfi.com/errors/${data.code}`;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ZendFiError);
    }
  }

  /**
   * Format error for display
   */
  toString(): string {
    let message = `[${this.code}] ${this.message}`;
    
    if (this.suggestion) {
      message += `\n💡 Suggestion: ${this.suggestion}`;
    }
    
    message += `\n📚 Docs: ${this.docs_url}`;
    
    return message;
  }

  /**
   * Convert error to JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      type: this.type,
      message: this.message,
      suggestion: this.suggestion,
      docs_url: this.docs_url,
      statusCode: this.statusCode,
    };
  }
}

/**
 * Authentication errors
 */
export class AuthenticationError extends ZendFiError {
  constructor(message: string, code = 'authentication_failed', suggestion?: string) {
    super({
      code,
      message,
      type: 'authentication_error',
      suggestion: suggestion || 'Check your API key in the dashboard at https://app.zendfi.com/settings/api-keys',
      statusCode: 401,
    });
    this.name = 'AuthenticationError';
  }
}

/**
 * Payment processing errors
 */
export class PaymentError extends ZendFiError {
  constructor(message: string, code = 'payment_failed', suggestion?: string) {
    super({
      code,
      message,
      type: 'payment_error',
      suggestion,
      statusCode: 400,
    });
    this.name = 'PaymentError';
  }
}

/**
 * Validation errors
 */
export class ValidationError extends ZendFiError {
  constructor(message: string, code = 'validation_failed', suggestion?: string) {
    super({
      code,
      message,
      type: 'validation_error',
      suggestion,
      statusCode: 400,
    });
    this.name = 'ValidationError';
  }
}

/**
 * Network/connection errors
 */
export class NetworkError extends ZendFiError {
  constructor(message: string, code = 'network_error', suggestion?: string) {
    super({
      code,
      message,
      type: 'network_error',
      suggestion: suggestion || 'Check your internet connection and try again',
      statusCode: 0,
    });
    this.name = 'NetworkError';
  }
}

/**
 * Rate limit errors
 */
export class RateLimitError extends ZendFiError {
  constructor(message: string, retryAfter?: number) {
    super({
      code: 'rate_limit_exceeded',
      message,
      type: 'rate_limit_error',
      suggestion: retryAfter
        ? `Wait ${retryAfter} seconds before retrying`
        : 'You are making too many requests. Please slow down.',
      statusCode: 429,
    });
    this.name = 'RateLimitError';
  }
}

/**
 * Generic API errors
 */
export class ApiError extends ZendFiError {
  constructor(message: string, code: string, statusCode: number, response?: unknown) {
    super({
      code,
      message,
      type: 'api_error',
      statusCode,
      response,
    });
    this.name = 'ApiError';
  }
}

/**
 * Webhook verification errors
 */
export class WebhookError extends ZendFiError {
  constructor(message: string, code = 'webhook_verification_failed', suggestion?: string) {
    super({
      code,
      message,
      type: 'webhook_error',
      suggestion: suggestion || 'Check your webhook secret matches the one in your dashboard',
      statusCode: 400,
    });
    this.name = 'WebhookError';
  }
}

/**
 * Error factory - creates appropriate error based on response
 */
export function createZendFiError(
  statusCode: number,
  responseBody: any,
  message?: string
): ZendFiError {
  const errorMessage = message || responseBody?.error?.message || responseBody?.message || 'An error occurred';
  const errorCode = responseBody?.error?.code || responseBody?.code || 'unknown_error';

  // Authentication errors
  if (statusCode === 401) {
    return new AuthenticationError(
      errorMessage,
      errorCode,
      'Verify your API key is correct and not expired'
    );
  }

  // Rate limiting
  if (statusCode === 429) {
    const retryAfter = responseBody?.retry_after;
    return new RateLimitError(errorMessage, retryAfter);
  }

  // Validation errors
  if (statusCode === 400 || statusCode === 422) {
    return new ValidationError(errorMessage, errorCode);
  }

  // Payment errors
  if (statusCode === 402) {
    return new PaymentError(errorMessage, errorCode);
  }

  // Network errors
  if (statusCode === 0 || statusCode >= 500) {
    return new NetworkError(
      errorMessage,
      errorCode,
      statusCode >= 500
        ? 'The ZendFi API is experiencing issues. Please try again later.'
        : undefined
    );
  }

  // Generic API error
  return new ApiError(errorMessage, errorCode, statusCode, responseBody);
}

/**
 * Common error codes and their messages
 */
export const ERROR_CODES = {
  // Authentication
  INVALID_API_KEY: 'invalid_api_key',
  API_KEY_EXPIRED: 'api_key_expired',
  API_KEY_REVOKED: 'api_key_revoked',
  
  // Payment
  INSUFFICIENT_BALANCE: 'insufficient_balance',
  PAYMENT_DECLINED: 'payment_declined',
  PAYMENT_EXPIRED: 'payment_expired',
  INVALID_AMOUNT: 'invalid_amount',
  INVALID_CURRENCY: 'invalid_currency',
  
  // Validation
  MISSING_REQUIRED_FIELD: 'missing_required_field',
  INVALID_PARAMETER: 'invalid_parameter',
  
  // Network
  NETWORK_ERROR: 'network_error',
  TIMEOUT: 'timeout',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  
  // Webhook
  WEBHOOK_SIGNATURE_INVALID: 'webhook_signature_invalid',
  WEBHOOK_TIMESTAMP_TOO_OLD: 'webhook_timestamp_too_old',
} as const;

/**
 * Helper to check if error is a ZendFi error
 */
export function isZendFiError(error: unknown): error is ZendFiError {
  return error instanceof ZendFiError;
}
