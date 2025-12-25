/**
 * Security Utilities
 * PIN validation, rate limiting, and security best practices
 * 
 * @example
 * ```typescript
 * import { PINValidator, PINRateLimiter } from '@zendfi/sdk/helpers';
 * 
 * // Validate PIN
 * const validation = PINValidator.validate(pin);
 * if (!validation.valid) {
 *   console.error(validation.errors);
 * }
 * 
 * // Rate limit PIN attempts
 * const limiter = new PINRateLimiter();
 * const attempt = await limiter.checkAttempt(sessionKeyId);
 * if (!attempt.allowed) {
 *   console.log(`Locked out for ${attempt.lockoutSeconds}s`);
 * }
 * ```
 */

export interface PINValidationResult {
  valid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  errors: string[];
  suggestions: string[];
}

/**
 * PIN Validator
 * Validates PIN security and strength
 */
export class PINValidator {
  /**
   * Validate PIN strength and format
   */
  static validate(pin: string): PINValidationResult {
    const errors: string[] = [];
    const suggestions: string[] = [];

    // Check length
    if (!pin || pin.length < 4) {
      errors.push('PIN must be at least 4 digits');
    }

    if (pin.length > 12) {
      errors.push('PIN must be at most 12 digits');
    }

    // Check if numeric
    if (!/^\d+$/.test(pin)) {
      errors.push('PIN must contain only digits');
    }

    // Check for weak patterns
    if (this.isWeakPattern(pin)) {
      errors.push('PIN is too simple');
      suggestions.push('Avoid sequential numbers (1234) or repeated digits (1111)');
    }

    // Determine strength
    let strength: 'weak' | 'medium' | 'strong' = 'strong';

    if (errors.length > 0) {
      strength = 'weak';
    } else if (pin.length <= 4 || this.hasRepeatedDigits(pin)) {
      strength = 'weak';
      suggestions.push('Use at least 6 digits for better security');
    } else if (pin.length <= 6) {
      strength = 'medium';
      suggestions.push('Use 8+ digits for maximum security');
    }

    return {
      valid: errors.length === 0,
      strength,
      errors,
      suggestions,
    };
  }

  /**
   * Check PIN strength (0-100 score)
   */
  static strengthScore(pin: string): number {
    if (!pin) return 0;

    let score = 0;

    // Length bonus
    score += Math.min(pin.length * 10, 50);

    // Uniqueness bonus
    const uniqueDigits = new Set(pin).size;
    score += uniqueDigits * 5;

    // Non-sequential bonus
    if (!this.isSequential(pin)) {
      score += 20;
    }

    // No repeats bonus
    if (!this.hasRepeatedDigits(pin)) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  /**
   * Generate a secure random PIN
   */
  static generateSecureRandom(length: number = 6): string {
    if (length < 4 || length > 12) {
      throw new Error('PIN length must be between 4 and 12');
    }

    // Use crypto.getRandomValues for secure randomness
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);

    const pin = Array.from(array)
      .map(num => num % 10)
      .join('');

    // Ensure it's not a weak pattern
    if (this.isWeakPattern(pin)) {
      // Regenerate if weak
      return this.generateSecureRandom(length);
    }

    return pin;
  }

  /**
   * Check for weak patterns
   */
  private static isWeakPattern(pin: string): boolean {
    // Sequential numbers
    if (this.isSequential(pin)) return true;

    // All same digits
    if (/^(\d)\1+$/.test(pin)) return true;

    // Common patterns
    const commonPatterns = [
      '1234', '4321', '1111', '2222', '3333', '4444', '5555',
      '6666', '7777', '8888', '9999', '0000', '1212', '2323',
      '0123', '3210', '9876', '6789',
    ];

    return commonPatterns.some(pattern => pin.includes(pattern));
  }

  /**
   * Check if PIN is sequential
   */
  private static isSequential(pin: string): boolean {
    for (let i = 1; i < pin.length; i++) {
      const diff = parseInt(pin[i]!) - parseInt(pin[i - 1]!);
      if (Math.abs(diff) !== 1) return false;
    }
    return true;
  }

  /**
   * Check if PIN has repeated digits
   */
  private static hasRepeatedDigits(pin: string): boolean {
    return /(\d)\1{2,}/.test(pin);
  }

  /**
   * Hash PIN for storage (if needed)
   * Note: For device-bound keys, the PIN is used for key derivation, not storage
   */
  static async hashPIN(pin: string, salt?: string): Promise<string> {
    const actualSalt = salt || crypto.getRandomValues(new Uint8Array(16));
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + actualSalt);

    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

/**
 * PIN Rate Limiter
 * Prevents brute-force attacks on PIN entry
 */
export class PINRateLimiter {
  private attempts: Map<string, Array<number>> = new Map();
  private locked: Map<string, number> = new Map();

  private maxAttempts: number;
  private windowMs: number;
  private lockoutMs: number;

  constructor(config: {
    maxAttempts?: number;
    windowMs?: number;
    lockoutMs?: number;
  } = {}) {
    this.maxAttempts = config.maxAttempts || 3;
    this.windowMs = config.windowMs || 60000; // 1 minute
    this.lockoutMs = config.lockoutMs || 300000; // 5 minutes
  }

  /**
   * Check if attempt is allowed
   */
  async checkAttempt(sessionKeyId: string): Promise<{
    allowed: boolean;
    remainingAttempts: number;
    lockoutSeconds?: number;
  }> {
    const now = Date.now();

    // Check if locked out
    const lockoutUntil = this.locked.get(sessionKeyId);
    if (lockoutUntil && now < lockoutUntil) {
      const lockoutSeconds = Math.ceil((lockoutUntil - now) / 1000);
      return {
        allowed: false,
        remainingAttempts: 0,
        lockoutSeconds,
      };
    }

    // Clear expired lockout
    if (lockoutUntil && now >= lockoutUntil) {
      this.locked.delete(sessionKeyId);
      this.attempts.delete(sessionKeyId);
    }

    // Get recent attempts
    const recentAttempts = this.getRecentAttempts(sessionKeyId, now);
    const remainingAttempts = this.maxAttempts - recentAttempts.length;

    if (remainingAttempts <= 0) {
      // Lock out
      this.locked.set(sessionKeyId, now + this.lockoutMs);
      return {
        allowed: false,
        remainingAttempts: 0,
        lockoutSeconds: Math.ceil(this.lockoutMs / 1000),
      };
    }

    return {
      allowed: true,
      remainingAttempts,
    };
  }

  /**
   * Record a failed attempt
   */
  recordFailedAttempt(sessionKeyId: string): void {
    const now = Date.now();
    const attempts = this.attempts.get(sessionKeyId) || [];
    attempts.push(now);
    this.attempts.set(sessionKeyId, attempts);
  }

  /**
   * Record a successful attempt (clears history)
   */
  recordSuccessfulAttempt(sessionKeyId: string): void {
    this.attempts.delete(sessionKeyId);
    this.locked.delete(sessionKeyId);
  }

  /**
   * Get recent attempts within window
   */
  private getRecentAttempts(sessionKeyId: string, now: number): number[] {
    const attempts = this.attempts.get(sessionKeyId) || [];
    const cutoff = now - this.windowMs;
    const recent = attempts.filter(timestamp => timestamp > cutoff);

    // Update with filtered list
    if (recent.length !== attempts.length) {
      this.attempts.set(sessionKeyId, recent);
    }

    return recent;
  }

  /**
   * Clear all rate limit data
   */
  clear(): void {
    this.attempts.clear();
    this.locked.clear();
  }

  /**
   * Check lockout status
   */
  isLockedOut(sessionKeyId: string): boolean {
    const lockoutUntil = this.locked.get(sessionKeyId);
    return lockoutUntil ? Date.now() < lockoutUntil : false;
  }

  /**
   * Get remaining lockout time
   */
  getRemainingLockoutTime(sessionKeyId: string): number {
    const lockoutUntil = this.locked.get(sessionKeyId);
    if (!lockoutUntil) return 0;
    return Math.max(0, lockoutUntil - Date.now());
  }
}

/**
 * Secure Storage Helper
 * Utilities for secure data storage
 */
export class SecureStorage {
  /**
   * Store data with encryption (basic)
   * For production, consider using Web Crypto API with user-derived keys
   */
  static async setEncrypted(key: string, value: string, secret: string): Promise<void> {
    const encrypted = await this.encrypt(value, secret);
    localStorage.setItem(key, JSON.stringify(encrypted));
  }

  /**
   * Retrieve encrypted data
   */
  static async getEncrypted(key: string, secret: string): Promise<string | null> {
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    try {
      const encrypted = JSON.parse(stored);
      return await this.decrypt(encrypted, secret);
    } catch {
      return null;
    }
  }

  /**
   * Encrypt string with AES-GCM
   */
  private static async encrypt(plaintext: string, secret: string): Promise<{
    ciphertext: string;
    iv: string;
  }> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    // Derive key from secret
    const key = await this.deriveKey(secret);

    // Generate IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    return {
      ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      iv: btoa(String.fromCharCode(...iv)),
    };
  }

  /**
   * Decrypt AES-GCM ciphertext
   */
  private static async decrypt(
    encrypted: { ciphertext: string; iv: string },
    secret: string
  ): Promise<string> {
    const key = await this.deriveKey(secret);

    const iv = Uint8Array.from(atob(encrypted.iv), c => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(encrypted.ciphertext), c => c.charCodeAt(0));

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  /**
   * Derive encryption key from secret
   */
  private static async deriveKey(secret: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('zendfi-secure-storage'),
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Clear all secure storage
   */
  static clearAll(namespace: string = 'zendfi'): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(namespace)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
}
