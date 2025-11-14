/**
 * Payment Routes
 */

import express, { Router } from 'express';
import { createPayment, getPayment, listPayments } from '../controllers/paymentController.js';
import { authenticateApiKey, optionalAuth } from '../middleware/auth.js';

const router: express.Router = Router();

// Create a new payment (requires API key)
router.post('/create', authenticateApiKey, createPayment);

// Get payment by ID (optional auth - public if no auth, scoped if authenticated)
router.get('/:id', optionalAuth, getPayment);

// List all payments (optional auth - returns user's payments if authenticated)
router.get('/', optionalAuth, listPayments);

export default router;
