/**
 * Development Tools & Utilities
 * Debugging helpers for development and testing
 * 
 * @example
 * ```typescript
 * import { DevTools } from '@zendfi/sdk/helpers';
 * 
 * // Enable debug mode
 * DevTools.enableDebugMode();
 * 
 * // Create test session key
 * const testKey = await DevTools.createTestSessionKey();
 * 
 * // Mock wallet for testing
 * const mockWallet = DevTools.mockWallet();
 * 
 * // Log transaction flow
 * DevTools.logTransactionFlow(paymentId);
 * ```
 */

export interface MockWallet {
  address: string;
  publicKey: any;
  signTransaction: (tx: any) => Promise<any>;
  signMessage: (msg: Uint8Array) => Promise<{ signature: Uint8Array }>;
  isConnected: () => boolean;
  disconnect: () => Promise<void>;
}

export interface TestSessionKey {
  sessionKeyId: string;
  sessionWallet: string;
  privateKey: Uint8Array;
  budget: number;
}

/**
 * Development Tools
 * Utilities for debugging and testing
 */
export class DevTools {
  private static debugEnabled = false;
  private static requestLog: Array<{
    timestamp: Date;
    method: string;
    url: string;
    status?: number;
    duration?: number;
  }> = [];

  /**
   * Enable debug mode (logs all API requests/responses)
   */
  static enableDebugMode(): void {
    if (this.isDevelopment()) {
      this.debugEnabled = true;
      console.log('🔧 ZendFi Debug Mode: ENABLED');
      console.log('All API requests will be logged to console');
    } else {
      console.warn('Debug mode can only be enabled in development environment');
    }
  }

  /**
   * Disable debug mode
   */
  static disableDebugMode(): void {
    this.debugEnabled = false;
    console.log('🔧 ZendFi Debug Mode: DISABLED');
  }

  /**
   * Check if debug mode is enabled
   */
  static isDebugEnabled(): boolean {
    return this.debugEnabled;
  }

  /**
   * Log API request
   */
  static logRequest(method: string, url: string, body?: any): void {
    if (!this.debugEnabled) return;

    const timestamp = new Date();
    console.group(`📤 API Request: ${method} ${url}`);
    console.log('Time:', timestamp.toISOString());
    if (body) {
      console.log('Body:', body);
    }
    console.groupEnd();

    this.requestLog.push({ timestamp, method, url });
  }

  /**
   * Log API response
   */
  static logResponse(method: string, url: string, status: number, data: any, duration?: number): void {
    if (!this.debugEnabled) return;

    const emoji = status >= 200 && status < 300 ? '✅' : '❌';
    console.group(`${emoji} API Response: ${method} ${url} [${status}]`);
    if (duration) {
      console.log('Duration:', `${duration}ms`);
    }
    console.log('Data:', data);
    console.groupEnd();

    // Update request log
    const lastRequest = this.requestLog[this.requestLog.length - 1];
    if (lastRequest && lastRequest.method === method && lastRequest.url === url) {
      lastRequest.status = status;
      lastRequest.duration = duration;
    }
  }

  /**
   * Get request log
   */
  static getRequestLog(): Array<{
    timestamp: Date;
    method: string;
    url: string;
    status?: number;
    duration?: number;
  }> {
    return [...this.requestLog];
  }

  /**
   * Clear request log
   */
  static clearRequestLog(): void {
    this.requestLog = [];
    console.log('🗑️ Request log cleared');
  }

  /**
   * Create a test session key (devnet only)
   */
  static async createTestSessionKey(): Promise<TestSessionKey> {
    if (!this.isDevelopment()) {
      throw new Error('Test session keys can only be created in development');
    }

    // Generate test keypair
    const { Keypair } = await this.getSolanaWeb3();
    const keypair = Keypair.generate();

    return {
      sessionKeyId: this.generateTestId('sk_test'),
      sessionWallet: keypair.publicKey.toString(),
      privateKey: keypair.secretKey,
      budget: 10, // $10 test budget
    };
  }

  /**
   * Create a mock wallet for testing
   */
  static mockWallet(address?: string): MockWallet {
    const mockAddress = address || this.generateTestAddress();

    return {
      address: mockAddress,
      publicKey: { toString: () => mockAddress },
      signTransaction: async (tx: any) => {
        console.log('🔧 Mock wallet: Signing transaction');
        return tx; // Return unsigned in mock
      },
      signMessage: async (_msg: Uint8Array) => {
        console.log('🔧 Mock wallet: Signing message');
        return {
          signature: new Uint8Array(64), // Mock signature
        };
      },
      isConnected: () => true,
      disconnect: async () => {
        console.log('🔧 Mock wallet: Disconnected');
      },
    };
  }

  /**
   * Log transaction flow (visual diagram in console)
   */
  static logTransactionFlow(paymentId: string): void {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    TRANSACTION FLOW                            ║
╠═══════════════════════════════════════════════════════════════╣
║                                                                ║
║  Payment ID: ${paymentId}                                      ║
║                                                                ║
║  1. 🏗️  Create Payment Intent                                 ║
║      └─> POST /api/v1/ai/smart-payment                        ║
║                                                                ║
║  2. 🔐 Sign Transaction (Device-Bound)                        ║
║      └─> Client-side signing with cached keypair             ║
║                                                                ║
║  3. 📤 Submit Signed Transaction                              ║
║      └─> POST /api/v1/ai/payments/{id}/submit-signed         ║
║                                                                ║
║  4. ⏳ Wait for Blockchain Confirmation                       ║
║      └─> Poll Solana RPC (~30-60 seconds)                    ║
║                                                                ║
║  5. ✅ Payment Confirmed                                      ║
║      └─> Webhook fired: payment.confirmed                    ║
║                                                                ║
╚═══════════════════════════════════════════════════════════════╝
    `);
  }

  /**
   * Log session key lifecycle
   */
  static logSessionKeyLifecycle(sessionKeyId: string): void {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                  SESSION KEY LIFECYCLE                        ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Session Key ID: ${sessionKeyId}                              ║
║                                                               ║
║  Phase 1: CREATION                                            ║
║  ├─ Generate keypair (client-side)                            ║
║  ├─ Encrypt with PIN + device fingerprint                     ║
║  ├─ Send encrypted blob to backend                            ║
║  └─ Session key record created                                ║
║                                                               ║
║  Phase 2: FUNDING                                             ║
║  ├─ Create top-up transaction                                 ║
║  ├─ User signs with main wallet                               ║
║  ├─ Submit to Solana                                          ║
║  └─ Session wallet funded                                     ║
║                                                               ║
║  Phase 3: USAGE                                               ║
║  ├─ Decrypt keypair with PIN                                  ║
║  ├─ Cache for 30min/1hr/24hr                                  ║
║  ├─ Sign payments automatically                               ║
║  └─ Track spending against limit                              ║
║                                                               ║
║  Phase 4: REVOCATION                                          ║
║  ├─ Mark as inactive in DB                                    ║
║  ├─ Clear local cache                                         ║
║  └─ Remaining funds locked                                    ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
    `);
  }

  /**
   * Benchmark API request
   */
  static async benchmarkRequest<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<{ result: T; durationMs: number }> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;

    console.log(`⏱️ Benchmark [${name}]: ${duration.toFixed(2)}ms`);

    return {
      result,
      durationMs: duration,
    };
  }

  /**
   * Stress test (send multiple concurrent requests)
   */
  static async stressTest<T>(
    name: string,
    fn: () => Promise<T>,
    concurrency: number = 10,
    iterations: number = 100
  ): Promise<{
    totalRequests: number;
    successful: number;
    failed: number;
    avgDurationMs: number;
    minDurationMs: number;
    maxDurationMs: number;
  }> {
    console.log(`🔥 Stress Test: ${name}`);
    console.log(`Concurrency: ${concurrency}, Iterations: ${iterations}`);

    const durations: number[] = [];
    let successful = 0;
    let failed = 0;

    // Run in batches
    for (let i = 0; i < iterations; i += concurrency) {
      const batch = Array(Math.min(concurrency, iterations - i))
        .fill(null)
        .map(() => this.benchmarkRequest(`${name}-${i}`, fn));

      const results = await Promise.allSettled(batch);

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          successful++;
          durations.push(result.value.durationMs);
        } else {
          failed++;
        }
      });
    }

    const stats = {
      totalRequests: iterations,
      successful,
      failed,
      avgDurationMs: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDurationMs: Math.min(...durations),
      maxDurationMs: Math.max(...durations),
    };

    console.table(stats);
    return stats;
  }

  /**
   * Inspect ZendFi SDK configuration
   */
  static inspectConfig(client: any): void {
    console.group('🔍 ZendFi SDK Configuration');
    console.log('Base URL:', client.config?.baseURL || 'Unknown');
    console.log('API Key:', client.config?.apiKey ? `${client.config.apiKey.slice(0, 10)}...` : 'Not set');
    console.log('Mode:', client.config?.mode || 'Unknown');
    console.log('Environment:', client.config?.environment || 'Unknown');
    console.log('Timeout:', client.config?.timeout || 'Default');
    console.groupEnd();
  }

  /**
   * Generate test data
   */
  static generateTestData(): {
    userWallet: string;
    agentId: string;
    sessionKeyId: string;
    paymentId: string;
  } {
    return {
      userWallet: this.generateTestAddress(),
      agentId: `test-agent-${Date.now()}`,
      sessionKeyId: this.generateTestId('sk_test'),
      paymentId: this.generateTestId('pay_test'),
    };
  }

  /**
   * Check if running in development environment
   */
  private static isDevelopment(): boolean {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.NODE_ENV === 'development' || 
             process.env.NODE_ENV === 'test';
    }

    if (typeof window !== 'undefined' && window.location) {
      return window.location.hostname === 'localhost' ||
             window.location.hostname.includes('dev') ||
             window.location.hostname.includes('staging');
    }

    return false;
  }

  /**
   * Generate test Solana address
   */
  private static generateTestAddress(): string {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let address = '';
    for (let i = 0; i < 44; i++) {
      address += chars[Math.floor(Math.random() * chars.length)];
    }
    return address;
  }

  /**
   * Generate test ID with prefix
   */
  private static generateTestId(prefix: string): string {
    const id = Array(32)
      .fill(null)
      .map(() => Math.floor(Math.random() * 16).toString(16))
      .join('');
    return `${prefix}_${id}`;
  }

  /**
   * Get Solana Web3.js
   */
  private static async getSolanaWeb3(): Promise<any> {
    try {
      return await import('@solana/web3.js');
    } catch {
      throw new Error('@solana/web3.js not installed');
    }
  }
}

/**
 * Performance Monitor
 * Track SDK performance metrics
 */
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  /**
   * Record a metric
   */
  record(name: string, value: number): void {
    const values = this.metrics.get(name) || [];
    values.push(value);
    this.metrics.set(name, values);
  }

  /**
   * Get statistics for a metric
   */
  getStats(name: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const count = values.length;

    return {
      count,
      avg: values.reduce((a, b) => a + b, 0) / count,
      min: sorted[0]!,
      max: sorted[count - 1]!,
      p50: sorted[Math.floor(count * 0.5)]!,
      p95: sorted[Math.floor(count * 0.95)]!,
      p99: sorted[Math.floor(count * 0.99)]!,
    };
  }

  /**
   * Get all metrics
   */
  getAllStats(): Record<string, ReturnType<typeof this.getStats>> {
    const stats: Record<string, ReturnType<typeof this.getStats>> = {};
    for (const [name] of this.metrics) {
      stats[name] = this.getStats(name);
    }
    return stats;
  }

  /**
   * Print report
   */
  printReport(): void {
    console.table(this.getAllStats());
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }
}
