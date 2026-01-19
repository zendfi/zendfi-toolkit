/**
 * Transaction Polling Utilities
 * Poll Solana transactions with exponential backoff
 * 
 * @example
 * ```typescript
 * import { TransactionPoller } from '@zendfi/sdk/helpers';
 * 
 * const status = await TransactionPoller.waitForConfirmation(
 *   signature,
 *   { timeout: 60000, interval: 2000 }
 * );
 * 
 * if (status.confirmed) {
 *   console.log(`Confirmed in slot ${status.slot}`);
 * }
 * ```
 */

export interface TransactionStatus {
  confirmed: boolean;
  signature: string;
  slot?: number;
  blockTime?: number;
  confirmations?: number;
  error?: string;
}

export interface PollingOptions {
  /** Maximum time to wait in ms (default: 60000 = 1 minute) */
  timeout?: number;
  /** Initial polling interval in ms (default: 2000 = 2 seconds) */
  interval?: number;
  /** Maximum polling interval in ms (default: 10000 = 10 seconds) */
  maxInterval?: number;
  /** Maximum number of attempts (default: 30) */
  maxAttempts?: number;
  /** Commitment level (default: 'confirmed') */
  commitment?: 'processed' | 'confirmed' | 'finalized';
  /** RPC endpoint (optional, uses default if not provided) */
  rpcUrl?: string;
}

/**
 * Transaction Poller
 * Poll transaction status with smart backoff
 */
export class TransactionPoller {
  /**
   * Wait for transaction confirmation
   */
  static async waitForConfirmation(
    signature: string,
    options: PollingOptions = {}
  ): Promise<TransactionStatus> {
    const {
      timeout = 60000,
      interval = 2000,
      maxInterval = 10000,
      maxAttempts = 30,
      commitment = 'confirmed',
      rpcUrl,
    } = options;

    const startTime = Date.now();
    let currentInterval = interval;
    let attempts = 0;

    while (true) {
      attempts++;

      if (Date.now() - startTime > timeout) {
        return {
          confirmed: false,
          signature,
          error: `Transaction confirmation timeout after ${timeout}ms`,
        };
      }

      if (attempts > maxAttempts) {
        return {
          confirmed: false,
          signature,
          error: `Maximum polling attempts (${maxAttempts}) exceeded`,
        };
      }

      try {
        const status = await this.checkTransactionStatus(signature, commitment, rpcUrl);

        if (status.confirmed) {
          return status;
        }

        if (status.error) {
          return status;
        }

        await this.sleep(currentInterval);
        currentInterval = Math.min(currentInterval * 1.5, maxInterval);

      } catch (error: any) {
        await this.sleep(currentInterval);
        currentInterval = Math.min(currentInterval * 1.5, maxInterval);
      }
    }
  }

  /**
   * Check transaction status via RPC
   */
  private static async checkTransactionStatus(
    signature: string,
    commitment: 'processed' | 'confirmed' | 'finalized' = 'confirmed',
    rpcUrl?: string
  ): Promise<TransactionStatus> {
    const endpoint = rpcUrl || this.getDefaultRpcUrl();

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getSignatureStatuses',
        params: [[signature], { searchTransactionHistory: true }],
      }),
    });

    if (!response.ok) {
      throw new Error(`RPC error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      return {
        confirmed: false,
        signature,
        error: data.error.message || 'RPC error',
      };
    }

    const status = data.result?.value?.[0];

    if (!status) {
      return {
        confirmed: false,
        signature,
      };
    }

    const isConfirmed = this.isCommitmentReached(status, commitment);

    return {
      confirmed: isConfirmed,
      signature,
      slot: status.slot,
      confirmations: status.confirmations,
      error: status.err ? JSON.stringify(status.err) : undefined,
    };
  }

  /**
   * Check if commitment level is reached
   */
  private static isCommitmentReached(
    status: any,
    commitment: 'processed' | 'confirmed' | 'finalized'
  ): boolean {
    if (status.err) return false;

    switch (commitment) {
      case 'processed':
        return true;
      case 'confirmed':
        return status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized';
      case 'finalized':
        return status.confirmationStatus === 'finalized';
      default:
        return false;
    }
  }

  /**
   * Get default RPC URL based on environment
   */
  private static getDefaultRpcUrl(): string {
    if (typeof window !== 'undefined' && window.location) {
      const hostname = window.location.hostname;
      if (hostname.includes('localhost') || hostname.includes('dev')) {
        return 'https://api.devnet.solana.com';
      }
    }

    return 'https://api.mainnet-beta.solana.com';
  }

  /**
   * Poll multiple transactions in parallel
   */
  static async waitForMultiple(
    signatures: string[],
    options: PollingOptions = {}
  ): Promise<TransactionStatus[]> {
    return await Promise.all(
      signatures.map(sig => this.waitForConfirmation(sig, options))
    );
  }

  /**
   * Get transaction details after confirmation
   */
  static async getTransactionDetails(
    signature: string,
    rpcUrl?: string
  ): Promise<any> {
    const endpoint = rpcUrl || this.getDefaultRpcUrl();

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTransaction',
        params: [
          signature,
          {
            encoding: 'jsonParsed',
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`RPC error: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'Failed to get transaction');
    }

    return data.result;
  }

  /**
   * Check if transaction exists on chain
   */
  static async exists(signature: string, rpcUrl?: string): Promise<boolean> {
    try {
      const status = await this.checkTransactionStatus(signature, 'confirmed', rpcUrl);
      return status.confirmed || !!status.slot;
    } catch {
      return false;
    }
  }

  /**
   * Get recent blockhash (useful for transaction building)
   */
  static async getRecentBlockhash(rpcUrl?: string): Promise<{
    blockhash: string;
    lastValidBlockHeight: number;
  }> {
    const endpoint = rpcUrl || this.getDefaultRpcUrl();

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getLatestBlockhash',
        params: [{ commitment: 'finalized' }],
      }),
    });

    if (!response.ok) {
      throw new Error(`RPC error: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.result.value;
  }

  /**
   * Sleep utility
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Transaction Monitor
 * Monitor transaction status with callbacks
 */
export class TransactionMonitor {
  private monitors: Map<string, {
    interval: NodeJS.Timeout;
    callbacks: {
      onConfirmed?: (status: TransactionStatus) => void;
      onFailed?: (status: TransactionStatus) => void;
      onTimeout?: () => void;
    };
  }> = new Map();

  /**
   * Start monitoring a transaction
   */
  monitor(
    signature: string,
    callbacks: {
      onConfirmed?: (status: TransactionStatus) => void;
      onFailed?: (status: TransactionStatus) => void;
      onTimeout?: () => void;
    },
    options: PollingOptions = {}
  ): void {
    this.stopMonitoring(signature);

    const { timeout = 60000, interval = 2000 } = options;
    const startTime = Date.now();

    const intervalId = setInterval(async () => {
      if (Date.now() - startTime > timeout) {
        this.stopMonitoring(signature);
        callbacks.onTimeout?.();
        return;
      }

      try {
        const status = await TransactionPoller.waitForConfirmation(signature, {
          ...options,
          maxAttempts: 1,
        });

        if (status.confirmed) {
          this.stopMonitoring(signature);
          callbacks.onConfirmed?.(status);
        } else if (status.error) {
          this.stopMonitoring(signature);
          callbacks.onFailed?.(status);
        }
      } catch (error) {
      }
    }, interval);

    this.monitors.set(signature, { interval: intervalId, callbacks });
  }

  /**
   * Stop monitoring a transaction
   */
  stopMonitoring(signature: string): void {
    const monitor = this.monitors.get(signature);
    if (monitor) {
      clearInterval(monitor.interval);
      this.monitors.delete(signature);
    }
  }

  /**
   * Stop all monitors
   */
  stopAll(): void {
    for (const [signature] of this.monitors) {
      this.stopMonitoring(signature);
    }
  }

  /**
   * Get active monitors
   */
  getActiveMonitors(): string[] {
    return Array.from(this.monitors.keys());
  }
}
