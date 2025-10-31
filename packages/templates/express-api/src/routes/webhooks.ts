/**
 * Webhook Routes
 */

import { Router } from 'express';
import express from 'express';
import { handleZendFiWebhook } from '../controllers/webhookController.js';

const router = Router();

// ZendFi webhook endpoint
// ⚠️ IMPORTANT: Must use raw body parser for signature verification
router.post('/zendfi', express.raw({ type: 'application/json' }), handleZendFiWebhook);

export default router;
