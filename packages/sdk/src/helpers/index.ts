/**
 * ZendFi SDK Optional Helpers
 * 
 * Production-ready utilities to simplify integration.
 * All helpers are optional and tree-shakeable.
 * 
 * @example
 * ```typescript
 * // Import specific helpers you need
 * import { WalletConnector, TransactionPoller } from '@zendfi/sdk/helpers';
 * 
 * // Or import everything
 * import * as Helpers from '@zendfi/sdk/helpers';
 * ```
 */

export {
  WalletConnector,
  createWalletHook,
  type ConnectedWallet,
} from './wallet';

export {
  TransactionPoller,
  TransactionMonitor,
  type PollingOptions,
  type TransactionStatus,
} from './polling';

export {
  DevTools,
  PerformanceMonitor,
  type MockWallet,
  type TestSessionKey,
} from './dev';
