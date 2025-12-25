/**
 * Retry Strategy & Error Recovery
 * Smart retry logic with exponential backoff
 * 
 * @example
 * ```typescript
 * import { RetryStrategy, ErrorRecovery } from '@zendfi/sdk/helpers';
 * 
 * // Retry with exponential backoff
 * const result = await RetryStrategy.withRetry(
 *   () => zendfi.smartPayments.execute({ amount_usd: 50 }),
 *   { maxAttempts: 3, backoffMs: 1000 }
 * );
 * 
 * // Auto-recover from common errors
 * const payment = await ErrorRecovery.recoverFromNetworkError(
 *   () => createPayment()
 * );
 * ```
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number;
  /** Initial backoff delay in ms (default: 1000) */
  backoffMs?: number;
  /** Backoff multiplier (default: 2 for exponential) */
  backoffMultiplier?: number;
  /** Maximum backoff delay in ms (default: 30000) */
  maxBackoffMs?: number;
  /** Function to determine if error is retryable (default: all errors) */
  shouldRetry?: (error: Error, attempt: number) => boolean;
  /** Callback on each retry */
  onRetry?: (error: Error, attempt: number, nextDelayMs: number) => void;
}

/**
 * Retry Strategy
 * Implements smart retry logic with exponential backoff
 */
export class RetryStrategy {
  /**
   * Execute function with retry logic
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      maxAttempts = 3,
      backoffMs = 1000,
      backoffMultiplier = 2,
      maxBackoffMs = 30000,
      shouldRetry = () => true,
      onRetry,
    } = options;

    let lastError: Error | null = null;
    let currentBackoff = backoffMs;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Check if we should retry
        if (attempt === maxAttempts || !shouldRetry(error, attempt)) {
          throw error;
        }

        // Calculate next backoff with jitter
        const jitter = Math.random() * 0.3 * currentBackoff; // ±30% jitter
        const nextDelay = Math.min(currentBackoff + jitter, maxBackoffMs);

        // Notify caller
        onRetry?.(error, attempt, nextDelay);

        // Wait before retry
        await this.sleep(nextDelay);

        // Increase backoff
        currentBackoff *= backoffMultiplier;
      }
    }

    throw lastError || new Error('Retry failed');
  }

  /**
   * Retry with linear backoff
   */
  static async withLinearRetry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    return this.withRetry(fn, {
      maxAttempts,
      backoffMs: delayMs,
      backoffMultiplier: 1, // Linear
    });
  }

  /**
   * Retry with custom backoff function
   */
  static async withCustomBackoff<T>(
    fn: () => Promise<T>,
    backoffFn: (attempt: number) => number,
    maxAttempts: number = 3
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        if (attempt === maxAttempts) {
          throw error;
        }

        const delay = backoffFn(attempt);
        await this.sleep(delay);
      }
    }

    throw lastError || new Error('Retry failed');
  }

  /**
   * Check if error is retryable
   */
  static isRetryableError(error: any): boolean {
    // Network errors
    if (error.name === 'NetworkError' || error.message?.includes('network')) {
      return true;
    }

    // Timeout errors
    if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
      return true;
    }

    // Rate limit errors (should retry after backoff)
    if (error.status === 429 || error.code === 'RATE_LIMIT_EXCEEDED') {
      return true;
    }

    // Server errors (5xx)
    if (error.status >= 500 && error.status < 600) {
      return true;
    }

    // Solana RPC errors (blockhash not found, etc.)
    if (error.message?.includes('blockhash') || error.message?.includes('recent')) {
      return true;
    }

    return false;
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Error Recovery
 * Auto-recovery strategies for common failure scenarios
 */
export class ErrorRecovery {
  /**
   * Recover from network errors with retry
   */
  static async recoverFromNetworkError<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3
  ): Promise<T> {
    return RetryStrategy.withRetry(fn, {
      maxAttempts,
      backoffMs: 2000,
      shouldRetry: (error) => {
        return error.name === 'NetworkError' ||
               error.message?.includes('network') ||
               error.message?.includes('fetch');
      },
      onRetry: (error, attempt, nextDelay) => {
        console.warn(
          `Network error (attempt ${attempt}), retrying in ${nextDelay}ms:`,
          error.message
        );
      },
    });
  }

  /**
   * Recover from rate limit errors with exponential backoff
   */
  static async recoverFromRateLimit<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 5
  ): Promise<T> {
    return RetryStrategy.withRetry(fn, {
      maxAttempts,
      backoffMs: 5000, // Start with 5 seconds
      backoffMultiplier: 2,
      maxBackoffMs: 60000, // Cap at 1 minute
      shouldRetry: (error: any) => {
        return error.status === 429 || error.code === 'RATE_LIMIT_EXCEEDED';
      },
      onRetry: (attempt, nextDelay) => {
        console.warn(
          `Rate limited (attempt ${attempt}), waiting ${nextDelay}ms before retry`
        );
      },
    });
  }

  /**
   * Recover from Solana RPC errors (blockhash, etc.)
   */
  static async recoverFromRPCError<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3
  ): Promise<T> {
    return RetryStrategy.withRetry(fn, {
      maxAttempts,
      backoffMs: 1000,
      shouldRetry: (error: any) => {
        const message = error.message?.toLowerCase() || '';
        return message.includes('blockhash') ||
               message.includes('recent') ||
               message.includes('slot') ||
               message.includes('rpc');
      },
      onRetry: (error, attempt, nextDelay) => {
        console.warn(
          `RPC error (attempt ${attempt}), retrying in ${nextDelay}ms:`,
          error.message
        );
      },
    });
  }

  /**
   * Recover from timeout errors
   */
  static async recoverFromTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number = 30000,
    maxAttempts: number = 2
  ): Promise<T> {
    return RetryStrategy.withRetry(
      () => this.withTimeout(fn, timeoutMs),
      {
        maxAttempts,
        backoffMs: 5000,
        shouldRetry: (error: any) => {
          return error.name === 'TimeoutError' || error.message?.includes('timeout');
        },
      }
    );
  }

  /**
   * Add timeout to async function
   */
  private static async withTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  }

  /**
   * Circuit breaker pattern for repeated failures
   */
  static createCircuitBreaker<T>(
    fn: () => Promise<T>,
    options: {
      failureThreshold?: number;
      resetTimeoutMs?: number;
      onStateChange?: (state: 'closed' | 'open' | 'half-open') => void;
    } = {}
  ) {
    const {
      failureThreshold = 5,
      resetTimeoutMs = 60000,
      onStateChange,
    } = options;

    let state: 'closed' | 'open' | 'half-open' = 'closed';
    let failureCount = 0;
    let lastFailureTime = 0;
    let resetTimer: NodeJS.Timeout | null = null;

    return async (): Promise<T> => {
      // Check if circuit should reset
      if (state === 'open' && Date.now() - lastFailureTime > resetTimeoutMs) {
        state = 'half-open';
        onStateChange?.('half-open');
      }

      // Reject immediately if circuit is open
      if (state === 'open') {
        throw new Error('Circuit breaker is OPEN - too many failures');
      }

      try {
        const result = await fn();

        // Success - reset circuit
        if (state === 'half-open') {
          state = 'closed';
          onStateChange?.('closed');
        }
        failureCount = 0;

        return result;
      } catch (error) {
        failureCount++;
        lastFailureTime = Date.now();

        // Open circuit if threshold exceeded
        if (failureCount >= failureThreshold) {
          state = 'open';
          onStateChange?.('open');

          // Schedule reset
          if (resetTimer) clearTimeout(resetTimer);
          resetTimer = setTimeout(() => {
            state = 'half-open';
            onStateChange?.('half-open');
          }, resetTimeoutMs);
        }

        throw error;
      }
    };
  }

  /**
   * Fallback to alternative function on error
   */
  static async withFallback<T>(
    primaryFn: () => Promise<T>,
    fallbackFn: () => Promise<T>,
    shouldFallback: (error: Error) => boolean = () => true
  ): Promise<T> {
    try {
      return await primaryFn();
    } catch (error: any) {
      if (shouldFallback(error)) {
        console.warn('Primary function failed, using fallback:', error.message);
        return await fallbackFn();
      }
      throw error;
    }
  }

  /**
   * Graceful degradation - return partial result on error
   */
  static async withGracefulDegradation<T>(
    fn: () => Promise<T>,
    defaultValue: T,
    onError?: (error: Error) => void
  ): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      onError?.(error);
      console.warn('Operation failed, returning default value:', error.message);
      return defaultValue;
    }
  }
}

/**
 * Batch Retry
 * Retry multiple operations with smart batching
 */
export class BatchRetry {
  /**
   * Retry batch of operations
   */
  static async retryBatch<T>(
    operations: Array<() => Promise<T>>,
    options: RetryOptions = {}
  ): Promise<Array<{ success: boolean; result?: T; error?: Error }>> {
    return await Promise.all(
      operations.map(async (op) => {
        try {
          const result = await RetryStrategy.withRetry(op, options);
          return { success: true, result };
        } catch (error: any) {
          return { success: false, error };
        }
      })
    );
  }

  /**
   * Retry batch with rate limiting
   */
  static async retryBatchWithRateLimit<T>(
    operations: Array<() => Promise<T>>,
    concurrency: number = 5,
    delayBetweenBatchesMs: number = 1000,
    retryOptions: RetryOptions = {}
  ): Promise<Array<{ success: boolean; result?: T; error?: Error }>> {
    const results: Array<{ success: boolean; result?: T; error?: Error }> = [];

    // Process in batches
    for (let i = 0; i < operations.length; i += concurrency) {
      const batch = operations.slice(i, i + concurrency);

      const batchResults = await this.retryBatch(batch, retryOptions);
      results.push(...batchResults);

      // Wait between batches (except for last batch)
      if (i + concurrency < operations.length) {
        await this.sleep(delayBetweenBatchesMs);
      }
    }

    return results;
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
