/**
 * Authentication Routes
 */

import { Router } from 'express';
import { register, login, getProfile, createApiKey, listApiKeys, revokeApiKey } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/profile', authenticate, getProfile);
router.post('/api-keys', authenticate, createApiKey);
router.get('/api-keys', authenticate, listApiKeys);
router.delete('/api-keys/:id', authenticate, revokeApiKey);

export default router;
