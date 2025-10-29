/**
 * Webhook Routes
 */

import { Router } from 'express';
import { handleZendFiWebhook } from '../controllers/webhookController.js';

const router = Router();

// ZendFi webhook endpoint
router.post('/zendfi', handleZendFiWebhook);

export default router;
