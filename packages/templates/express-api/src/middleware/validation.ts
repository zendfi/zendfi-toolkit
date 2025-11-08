/**
 * Request Validation Middleware
 * Uses Zod for type-safe request validation
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

/**
 * Validate request body against a Zod schema
 */
export function validateBody(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.issues.map((err: any) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Invalid request body',
        });
      }
    }
  };
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQuery(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.query);
      req.query = validated as any;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: error.issues.map((err: any) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
        });
      }
    }
  };
}

/**
 * Validation schemas for common requests
 */
export const schemas = {
  // Auth schemas
  register: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().optional(),
  }),

  login: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),

  createApiKey: z.object({
    name: z.string().min(1, 'API key name is required'),
    environment: z.enum(['development', 'production']).optional(),
  }),

  // Payment schemas
  createPayment: z.object({
    amount: z.number().positive('Amount must be greater than 0'),
    currency: z.string().min(1, 'Currency is required'),
    description: z.string().min(1, 'Description is required'),
    token: z.enum(['USDC', 'SOL', 'USDT']).optional(),
    customer_email: z.string().email().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  }),

  listPayments: z.object({
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    status: z.enum(['pending', 'confirmed', 'failed', 'expired']).optional(),
  }),
};
