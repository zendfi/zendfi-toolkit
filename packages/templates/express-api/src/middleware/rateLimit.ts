/**
 * Rate Limiting Middleware
 * Protects API from abuse and DDoS attacks
 */

import { Request, Response, NextFunction } from 'express';

interface RateLimitOptions {
  windowMs: number;  // Time window in milliseconds
  max: number;       // Max requests per window
  message?: string;
}

interface ClientRecord {
  count: number;
  resetTime: number;
}

// In-memory store (for production, use Redis)
const store = new Map<string, ClientRecord>();

/**
 * Create rate limiter middleware
 */
export function rateLimit(options: RateLimitOptions) {
  const { windowMs, max, message = 'Too many requests, please try again later' } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Get client identifier (IP address)
    const clientId = req.ip || req.socket.remoteAddress || 'unknown';
    
    const now = Date.now();
    const record = store.get(clientId);

    // Clean up expired records periodically
    if (Math.random() < 0.01) {
      for (const [key, value] of store.entries()) {
        if (value.resetTime < now) {
          store.delete(key);
        }
      }
    }

    if (!record || record.resetTime < now) {
      // First request or window expired
      store.set(clientId, {
        count: 1,
        resetTime: now + windowMs,
      });
      
      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', max - 1);
      res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());
      
      next();
    } else if (record.count < max) {
      // Within limit
      record.count++;
      
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', max - record.count);
      res.setHeader('X-RateLimit-Reset', new Date(record.resetTime).toISOString());
      
      next();
    } else {
      // Rate limit exceeded
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', new Date(record.resetTime).toISOString());
      res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000));
      
      res.status(429).json({
        success: false,
        error: message,
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      });
    }
  };
}

/**
 * Stricter rate limit for authentication endpoints
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 attempts
  message: 'Too many authentication attempts, please try again later',
});

/**
 * Rate limit for payment creation
 */
export const paymentRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 payments per minute
  message: 'Payment creation rate limit exceeded',
});
