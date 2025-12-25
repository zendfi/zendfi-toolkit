/**
 * Session Key Cache Manager
 * Optional caching utility for session key keypairs
 * 
 * @example
 * ```typescript
 * import { SessionKeyCache } from '@zendfi/sdk/helpers';
 * 
 * const cache = new SessionKeyCache({
 *   storage: 'localStorage',
 *   ttl: 3600000, // 1 hour
 *   autoRefresh: true,
 * });
 * 
 * // Get cached or decrypt
 * const keypair = await cache.getCached(sessionKeyId, async () => {
 *   return await SessionKeyCrypto.decrypt(encrypted, pin, fingerprint);
 * });
 * 
 * // Invalidate on logout
 * await cache.clear();
 * ```
 */

export interface CachedKeypair {
  keypair: any; // Solana Keypair or raw bytes
  expiry: number;
  sessionKeyId: string;
  deviceFingerprint?: string;
}

export interface SessionKeyCacheConfig {
  /** Storage backend */
  storage?: 'memory' | 'localStorage' | 'indexedDB' | CustomStorageAdapter;
  /** Time-to-live in milliseconds (default: 30 minutes) */
  ttl?: number;
  /** Auto-refresh before expiry (default: false) */
  autoRefresh?: boolean;
  /** Namespace for storage keys (default: 'zendfi_cache') */
  namespace?: string;
  /** Enable debug logging (default: false) */
  debug?: boolean;
}

export interface CustomStorageAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Session Key Cache Manager
 * Provides flexible caching with multiple storage backends
 */
export class SessionKeyCache {
  private memoryCache: Map<string, CachedKeypair> = new Map();
  private config: Required<SessionKeyCacheConfig>;
  private refreshTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: SessionKeyCacheConfig = {}) {
    this.config = {
      storage: config.storage || 'memory',
      ttl: config.ttl || 30 * 60 * 1000, // 30 minutes default
      autoRefresh: config.autoRefresh || false,
      namespace: config.namespace || 'zendfi_cache',
      debug: config.debug || false,
    };
  }

  /**
   * Get cached keypair or decrypt and cache
   */
  async getCached(
    sessionKeyId: string,
    decryptFn: () => Promise<any>,
    options?: { deviceFingerprint?: string }
  ): Promise<any> {
    this.log(`getCached: ${sessionKeyId}`);

    // Check memory cache first (fastest)
    const memoryCached = this.memoryCache.get(sessionKeyId);
    if (memoryCached && Date.now() < memoryCached.expiry) {
      this.log(`Memory cache HIT: ${sessionKeyId}`);
      return memoryCached.keypair;
    }

    // Check persistent storage
    if (this.config.storage !== 'memory') {
      const persistentCached = await this.getFromStorage(sessionKeyId);
      if (persistentCached && Date.now() < persistentCached.expiry) {
        // Verify device fingerprint if provided
        if (options?.deviceFingerprint && persistentCached.deviceFingerprint) {
          if (options.deviceFingerprint !== persistentCached.deviceFingerprint) {
            this.log(`Device fingerprint mismatch for ${sessionKeyId}`);
            await this.invalidate(sessionKeyId);
            return await this.decryptAndCache(sessionKeyId, decryptFn, options);
          }
        }

        this.log(`Persistent cache HIT: ${sessionKeyId}`);
        // Restore to memory cache
        this.memoryCache.set(sessionKeyId, persistentCached);
        return persistentCached.keypair;
      }
    }

    // Cache miss - decrypt and cache
    this.log(`Cache MISS: ${sessionKeyId}`);
    return await this.decryptAndCache(sessionKeyId, decryptFn, options);
  }

  /**
   * Decrypt keypair and cache it
   */
  private async decryptAndCache(
    sessionKeyId: string,
    decryptFn: () => Promise<any>,
    options?: { deviceFingerprint?: string }
  ): Promise<any> {
    const keypair = await decryptFn();
    const expiry = Date.now() + this.config.ttl;

    const cached: CachedKeypair = {
      keypair,
      expiry,
      sessionKeyId,
      deviceFingerprint: options?.deviceFingerprint,
    };

    // Store in memory
    this.memoryCache.set(sessionKeyId, cached);

    // Store in persistent storage
    if (this.config.storage !== 'memory') {
      await this.setInStorage(sessionKeyId, cached);
    }

    // Setup auto-refresh if enabled
    if (this.config.autoRefresh) {
      this.setupAutoRefresh(sessionKeyId, decryptFn, options);
    }

    this.log(`Cached: ${sessionKeyId}, expires in ${this.config.ttl}ms`);
    return keypair;
  }

  /**
   * Invalidate cached keypair
   */
  async invalidate(sessionKeyId: string): Promise<void> {
    this.log(`Invalidating: ${sessionKeyId}`);

    // Clear memory cache
    this.memoryCache.delete(sessionKeyId);

    // Clear refresh timer
    const timer = this.refreshTimers.get(sessionKeyId);
    if (timer) {
      clearTimeout(timer);
      this.refreshTimers.delete(sessionKeyId);
    }

    // Clear persistent storage
    if (this.config.storage !== 'memory') {
      await this.removeFromStorage(sessionKeyId);
    }
  }

  /**
   * Clear all cached keypairs
   */
  async clear(): Promise<void> {
    this.log('Clearing all cache');

    // Clear memory
    this.memoryCache.clear();

    // Clear all timers
    for (const timer of this.refreshTimers.values()) {
      clearTimeout(timer);
    }
    this.refreshTimers.clear();

    // Clear persistent storage
    if (this.config.storage !== 'memory') {
      await this.clearStorage();
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    entries: Array<{ sessionKeyId: string; expiresIn: number }>;
  } {
    const entries = Array.from(this.memoryCache.entries()).map(([id, cached]) => ({
      sessionKeyId: id,
      expiresIn: Math.max(0, cached.expiry - Date.now()),
    }));

    return { size: this.memoryCache.size, entries };
  }

  /**
   * Check if a session key is cached and valid
   */
  isCached(sessionKeyId: string): boolean {
    const cached = this.memoryCache.get(sessionKeyId);
    return cached ? Date.now() < cached.expiry : false;
  }

  /**
   * Update TTL for a cached session key
   */
  async extendTTL(sessionKeyId: string, additionalMs: number): Promise<boolean> {
    const cached = this.memoryCache.get(sessionKeyId);
    if (!cached) return false;

    cached.expiry += additionalMs;
    this.memoryCache.set(sessionKeyId, cached);

    if (this.config.storage !== 'memory') {
      await this.setInStorage(sessionKeyId, cached);
    }

    this.log(`Extended TTL for ${sessionKeyId} by ${additionalMs}ms`);
    return true;
  }

  // ============================================
  // Storage Backend Implementations
  // ============================================

  private async getFromStorage(sessionKeyId: string): Promise<CachedKeypair | null> {
    try {
      const key = this.getStorageKey(sessionKeyId);

      if (this.config.storage === 'localStorage') {
        const data = localStorage.getItem(key);
        if (!data) return null;
        const parsed = JSON.parse(data);
        // Restore keypair from serialized format
        return {
          ...parsed,
          keypair: this.deserializeKeypair(parsed.keypair),
        };
      }

      if (this.config.storage === 'indexedDB') {
        return await this.getFromIndexedDB(key);
      }

      if (typeof this.config.storage === 'object') {
        const data = await this.config.storage.get(key);
        if (!data) return null;
        const parsed = JSON.parse(data);
        return {
          ...parsed,
          keypair: this.deserializeKeypair(parsed.keypair),
        };
      }
    } catch (error) {
      this.log(`Error reading from storage: ${error}`);
    }
    return null;
  }

  private async setInStorage(sessionKeyId: string, cached: CachedKeypair): Promise<void> {
    try {
      const key = this.getStorageKey(sessionKeyId);
      const serialized = {
        ...cached,
        keypair: this.serializeKeypair(cached.keypair),
      };

      if (this.config.storage === 'localStorage') {
        localStorage.setItem(key, JSON.stringify(serialized));
        return;
      }

      if (this.config.storage === 'indexedDB') {
        await this.setInIndexedDB(key, serialized);
        return;
      }

      if (typeof this.config.storage === 'object') {
        await this.config.storage.set(key, JSON.stringify(serialized));
      }
    } catch (error) {
      this.log(`Error writing to storage: ${error}`);
    }
  }

  private async removeFromStorage(sessionKeyId: string): Promise<void> {
    try {
      const key = this.getStorageKey(sessionKeyId);

      if (this.config.storage === 'localStorage') {
        localStorage.removeItem(key);
        return;
      }

      if (this.config.storage === 'indexedDB') {
        await this.removeFromIndexedDB(key);
        return;
      }

      if (typeof this.config.storage === 'object') {
        await this.config.storage.remove(key);
      }
    } catch (error) {
      this.log(`Error removing from storage: ${error}`);
    }
  }

  private async clearStorage(): Promise<void> {
    try {
      if (this.config.storage === 'localStorage') {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith(this.config.namespace)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        return;
      }

      if (this.config.storage === 'indexedDB') {
        await this.clearIndexedDB();
        return;
      }

      if (typeof this.config.storage === 'object') {
        await this.config.storage.clear();
      }
    } catch (error) {
      this.log(`Error clearing storage: ${error}`);
    }
  }

  // ============================================
  // IndexedDB Helpers
  // ============================================

  private async getFromIndexedDB(key: string): Promise<CachedKeypair | null> {
    return new Promise((resolve) => {
      const request = indexedDB.open(this.config.namespace, 1);

      request.onerror = () => resolve(null);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache');
        }
      };

      request.onsuccess = (event: any) => {
        const db = event.target.result;
        const transaction = db.transaction(['cache'], 'readonly');
        const store = transaction.objectStore('cache');
        const getRequest = store.get(key);

        getRequest.onsuccess = () => {
          resolve(getRequest.result || null);
        };

        getRequest.onerror = () => resolve(null);
      };
    });
  }

  private async setInIndexedDB(key: string, value: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.namespace, 1);

      request.onerror = () => reject(new Error('IndexedDB error'));

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache');
        }
      };

      request.onsuccess = (event: any) => {
        const db = event.target.result;
        const transaction = db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        store.put(value, key);

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(new Error('IndexedDB transaction error'));
      };
    });
  }

  private async removeFromIndexedDB(key: string): Promise<void> {
    return new Promise((resolve) => {
      const request = indexedDB.open(this.config.namespace, 1);
      request.onsuccess = (event: any) => {
        const db = event.target.result;
        const transaction = db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        store.delete(key);
        transaction.oncomplete = () => resolve();
      };
      request.onerror = () => resolve();
    });
  }

  private async clearIndexedDB(): Promise<void> {
    return new Promise((resolve) => {
      const request = indexedDB.open(this.config.namespace, 1);
      request.onsuccess = (event: any) => {
        const db = event.target.result;
        const transaction = db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        store.clear();
        transaction.oncomplete = () => resolve();
      };
      request.onerror = () => resolve();
    });
  }

  // ============================================
  // Serialization
  // ============================================

  private serializeKeypair(keypair: any): any {
    // Handle Solana Keypair
    if (keypair && typeof keypair === 'object' && 'secretKey' in keypair) {
      return {
        type: 'solana',
        secretKey: Array.from(keypair.secretKey),
      };
    }
    // Handle raw Uint8Array
    if (keypair instanceof Uint8Array) {
      return {
        type: 'uint8array',
        data: Array.from(keypair),
      };
    }
    return keypair;
  }

  private deserializeKeypair(data: any): any {
    if (!data || typeof data !== 'object') return data;

    if (data.type === 'solana' && data.secretKey) {
      // Note: Solana Keypair.fromSecretKey requires @solana/web3.js
      // We return the raw bytes - caller must reconstruct
      return new Uint8Array(data.secretKey);
    }

    if (data.type === 'uint8array' && data.data) {
      return new Uint8Array(data.data);
    }

    return data;
  }

  // ============================================
  // Auto-Refresh
  // ============================================

  private setupAutoRefresh(
    sessionKeyId: string,
    decryptFn: () => Promise<any>,
    options?: { deviceFingerprint?: string }
  ): void {
    // Clear existing timer
    const existingTimer = this.refreshTimers.get(sessionKeyId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Refresh 5 minutes before expiry
    const refreshIn = Math.max(0, this.config.ttl - 5 * 60 * 1000);

    const timer = setTimeout(async () => {
      this.log(`Auto-refreshing: ${sessionKeyId}`);
      try {
        await this.decryptAndCache(sessionKeyId, decryptFn, options);
      } catch (error) {
        this.log(`Auto-refresh failed: ${error}`);
      }
    }, refreshIn);

    this.refreshTimers.set(sessionKeyId, timer);
  }

  // ============================================
  // Utilities
  // ============================================

  private getStorageKey(sessionKeyId: string): string {
    return `${this.config.namespace}:${sessionKeyId}`;
  }

  private log(message: string): void {
    if (this.config.debug) {
      console.log(`[SessionKeyCache] ${message}`);
    }
  }
}

/**
 * Pre-configured cache instances for common use cases
 */
export const QuickCaches = {
  /** Memory-only cache (30 minutes) */
  memory: () => new SessionKeyCache({ storage: 'memory', ttl: 30 * 60 * 1000 }),

  /** Persistent cache (1 hour, survives reload) */
  persistent: () => new SessionKeyCache({ storage: 'localStorage', ttl: 60 * 60 * 1000 }),

  /** Long-term cache (24 hours, IndexedDB) */
  longTerm: () => new SessionKeyCache({ storage: 'indexedDB', ttl: 24 * 60 * 60 * 1000, autoRefresh: true }),

  /** Secure cache (5 minutes, memory-only) */
  secure: () => new SessionKeyCache({ storage: 'memory', ttl: 5 * 60 * 1000 }),
};
