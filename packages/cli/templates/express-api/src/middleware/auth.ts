/**
 * Authentication Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { verifySessionToken } from '../config/auth.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name?: string;
      };
    }
  }
}

/**
 * Authenticate via Bearer token (session token)
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header',
      });
      return;
    }
    
    const token = authHeader.substring(7);
    const decoded = verifySessionToken(token);
    
    if (!decoded) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
      return;
    }
    
    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true },
    });
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User not found',
      });
      return;
    }
    
    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}

/**
 * Authenticate via API Key (X-API-Key header)
 */
export async function authenticateApiKey(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      res.status(401).json({
        success: false,
        error: 'Missing X-API-Key header',
      });
      return;
    }
    
    // Validate API key
    const keyRecord = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    
    if (!keyRecord || !keyRecord.isActive) {
      res.status(401).json({
        success: false,
        error: 'Invalid or inactive API key',
      });
      return;
    }
    
    // Check expiration
    if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
      res.status(401).json({
        success: false,
        error: 'API key has expired',
      });
      return;
    }
    
    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: keyRecord.id },
      data: { lastUsedAt: new Date() },
    });
    
    // Attach user to request
    req.user = keyRecord.user;
    next();
  } catch (error) {
    console.error('API key authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}

/**
 * Optional authentication - doesn't fail if no auth provided
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'] as string;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifySessionToken(token);
      
      if (decoded) {
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, email: true, name: true },
        });
        
        if (user) {
          req.user = user;
        }
      }
    } else if (apiKey) {
      const keyRecord = await prisma.apiKey.findUnique({
        where: { key: apiKey },
        include: { user: { select: { id: true, email: true, name: true } } },
      });
      
      if (keyRecord && keyRecord.isActive) {
        req.user = keyRecord.user;
        
        // Update last used timestamp
        await prisma.apiKey.update({
          where: { id: keyRecord.id },
          data: { lastUsedAt: new Date() },
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next();
  }
}
