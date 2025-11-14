/**
 * Authentication Controller
 */

import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { hashPassword, verifyPassword, generateSessionToken, generateApiKey } from '../config/auth.js';

/**
 * Register a new user
 */
export async function register(req: Request, res: Response) {
  try {
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters',
      });
      return;
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(400).json({
        success: false,
        error: 'User with this email already exists',
      });
      return;
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    // Generate session token
    const token = generateSessionToken(user.id);

    res.status(201).json({
      success: true,
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
    });
  }
}

/**
 * Login user
 */
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
      return;
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
      return;
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password);

    if (!isValid) {
      res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
      return;
    }

    // Generate session token
    const token = generateSessionToken(user.id);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
    });
  }
}

/**
 * Get current user profile
 */
export async function getProfile(req: Request, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile',
    });
  }
}

/**
 * Create a new API key
 */
export async function createApiKey(req: Request, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
      return;
    }

    const { name, environment } = req.body;

    if (!name) {
      res.status(400).json({
        success: false,
        error: 'API key name is required',
      });
      return;
    }

    // Generate API key
    const key = generateApiKey(environment || 'development');

    // Create in database
    const apiKey = await prisma.apiKey.create({
      data: {
        userId: req.user.id,
        key,
        name,
        environment: environment || 'development',
      },
      select: {
        id: true,
        key: true,
        name: true,
        environment: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      success: true,
      data: { apiKey },
      message: 'API key created. Store it securely - you won\'t see it again!',
    });
  } catch (error) {
    console.error('Create API key error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create API key',
    });
  }
}

/**
 * List user's API keys
 */
export async function listApiKeys(req: Request, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
      return;
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: req.user.id },
      select: {
        id: true,
        name: true,
        environment: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
        // Don't return the actual key for security
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: { apiKeys },
    });
  } catch (error) {
    console.error('List API keys error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list API keys',
    });
  }
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(req: Request, res: Response) {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
      return;
    }

    const { id } = req.params;

    // Check ownership
    const apiKey = await prisma.apiKey.findUnique({
      where: { id },
    });

    if (!apiKey || apiKey.userId !== req.user.id) {
      res.status(404).json({
        success: false,
        error: 'API key not found',
      });
      return;
    }

    // Deactivate (don't delete for audit trail)
    await prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: 'API key revoked successfully',
    });
  } catch (error) {
    console.error('Revoke API key error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke API key',
    });
  }
}
