/**
 * Payment Routes
 */

import express, { Router } from 'express';
import { createPayment, getPayment, listPayments } from '../controllers/paymentController.js';

const router: express.Router = Router();

// Create a new payment
router.post('/create', createPayment);

// Get payment by ID
router.get('/:id', getPayment);

// List all payments
router.get('/', listPayments);

export default router;
