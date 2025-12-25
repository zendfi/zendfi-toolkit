/**
 * ZendFi SDK Optional Helpers
 * 
 * Production-ready utilities to simplify AIP integration.
 * All helpers are optional and tree-shakeable.
 * 
 * @example
 * ```typescript
 * // Import specific helpers you need
 * import { SessionKeyCache, WalletConnector } from '@zendfi/sdk/helpers';
 * 
 * // Or import everything
 * import * as Helpers from '@zendfi/sdk/helpers';
 * ```
 */

// Cache utilities
export {
  SessionKeyCache,
  QuickCaches,
  type CachedKeypair,
  type SessionKeyCacheConfig,
  type CustomStorageAdapter,
} from './cache';

// AI utilities
export {
  PaymentIntentParser,
  OpenAIAdapter,
  AnthropicAdapter,
  GeminiAdapter,
  type ParsedIntent,
} from './ai';

// Wallet integration
export {
  WalletConnector,
  createWalletHook,
  type ConnectedWallet,
} from './wallet';

// Security utilities
export {
  PINValidator,
  PINRateLimiter,
  SecureStorage,
  type PINValidationResult,
} from './security';

// Transaction polling
export {
  TransactionPoller,
  TransactionMonitor,
  type PollingOptions,
  type TransactionStatus,
} from './polling';

// Error recovery
export {
  RetryStrategy,
  ErrorRecovery,
  type RetryOptions,
} from './recovery';

// Session key lifecycle
export {
  SessionKeyLifecycle,
  setupQuickSessionKey,
  type LifecycleConfig,
  type CreateAndFundConfig,
  type PaymentResult,
} from './lifecycle';

// Development tools
export {
  DevTools,
  PerformanceMonitor,
  type MockWallet,
  type TestSessionKey,
} from './dev';
