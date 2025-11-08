/**
 * Authentication Utilities
 * JWT token generation and verification, password hashing
 */

import bcrypt from 'bcrypt';
import crypto from 'crypto';

const SALT_ROUNDS = 10;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a secure API key
 */
export function generateApiKey(environment: 'development' | 'production' = 'development'): string {
  const prefix = environment === 'production' ? 'zfi_live' : 'zfi_test';
  const randomBytes = crypto.randomBytes(24).toString('base64url');
  return `${prefix}_${randomBytes}`;
}

/**
 * Generate a JWT-like session token (simplified)
 * For production, use jsonwebtoken library
 */
export function generateSessionToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ userId, iat: Date.now() })).toString('base64url');
  const signature = crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'your-secret-key')
    .update(payload)
    .digest('base64url');
  
  return `${payload}.${signature}`;
}

/**
 * Verify a session token
 */
export function verifySessionToken(token: string): { userId: string } | null {
  try {
    const [payload, signature] = token.split('.');
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.JWT_SECRET || 'your-secret-key')
      .update(payload)
      .digest('base64url');
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    // Decode payload
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    
    // Check expiration (24 hours)
    if (Date.now() - data.iat > 24 * 60 * 60 * 1000) {
      return null;
    }
    
    return { userId: data.userId };
  } catch (error) {
    return null;
  }
}
