/**
 * File Templates for zendfi init
 * Framework-specific file content generators
 */

import type { Framework } from './framework-detector.js';

/**
 * Generate ZendFi client file content
 */
export function generateClientFile(framework: Framework, hasTypeScript: boolean): string {
  const ext = hasTypeScript ? 'ts' : 'js';
  
  const imports = hasTypeScript
    ? `import { ZendFiClient } from '@zendfi/sdk';`
    : `const { ZendFiClient } = require('@zendfi/sdk');`;

  const exportStatement = framework.startsWith('nextjs')
    ? `export const zendfi`
    : `module.exports.zendfi`;

  const types = hasTypeScript ? ': ZendFiClient' : '';

  return `/**
 * ZendFi SDK Client
 * 
 * This file creates and exports a configured ZendFi SDK instance.
 * The SDK is automatically configured from environment variables.
 */

${imports}

// Create ZendFi client instance
// Automatically reads ZENDFI_API_KEY and ZENDFI_ENVIRONMENT from env
${exportStatement}${types} = new ZendFiClient();
`;
}

/**
 * Generate webhook handler for Next.js App Router
 */
export function generateNextAppWebhook(hasTypeScript: boolean): string {
  return `import { createNextWebhookHandler } from '@zendfi/sdk/nextjs';
import { prisma } from '@/lib/db'; // Adjust import based on your setup

/**
 * ZendFi Webhook Handler
 * 
 * This webhook receives payment events from ZendFi and is automatically verified.
 * 
 * ⚠️ IMPORTANT: Implement the TODO sections below to:
 * - Update order status in your database
 * - Send confirmation emails
 * - Handle failed payments
 * 
 * Learn more: https://docs.zendfi.com/webhooks
 */

export const POST = createNextWebhookHandler({
  secret: process.env.ZENDFI_WEBHOOK_SECRET!,
  handlers: {
    'payment.confirmed': async (payment) => {
      console.log('Payment confirmed:', payment.payment_id);
      
      // TODO: Fulfill order
      // Example:
      // await prisma.order.update({
      //   where: { paymentId: payment.payment_id },
      //   data: { status: 'paid' }
      // });
    },
    
    'payment.failed': async (payment) => {
      console.log('❌ Payment failed:', payment.payment_id);
      
      // TODO: Handle failed payment
      // Example:
      // await prisma.order.update({
      //   where: { paymentId: payment.payment_id },
      //   data: { status: 'failed' }
      // });
    },
  }
});
`;
}

/**
 * Generate webhook handler for Next.js Pages Router
 */
export function generateNextPagesWebhook(hasTypeScript: boolean): string {
  const types = hasTypeScript ? ': NextApiRequest, res: NextApiResponse' : '(req, res)';
  
  return `import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyWebhook } from '@zendfi/sdk';

export default async function handler${types} {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify webhook signature
    const event = await verifyWebhook({
      body: req.body,
      signature: req.headers['x-zendfi-signature'] as string,
      secret: process.env.ZENDFI_WEBHOOK_SECRET!,
    });

    // Handle events
    switch (event.type) {
      case 'payment.confirmed':
        console.log('Payment confirmed:', event.data.payment_id);
        // TODO: Fulfill order
        break;
        
      case 'payment.failed':
        console.log('Payment failed:', event.data.payment_id);
        // TODO: Handle failed payment
        break;
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook verification failed' });
  }
}
`;
}

/**
 * Generate webhook handler for Express
 */
export function generateExpressWebhook(hasTypeScript: boolean): string {
  const imports = hasTypeScript
    ? `import { Router, Request, Response } from 'express';
import { verifyWebhook } from '@zendfi/sdk';`
    : `const { Router } = require('express');
const { verifyWebhook } = require('@zendfi/sdk');`;

  const routerDeclaration = hasTypeScript
    ? `const router = Router();`
    : `const router = Router();`;

  const exportStatement = hasTypeScript
    ? `export default router;`
    : `module.exports = router;`;

  return `${imports}

${routerDeclaration}

/**
 * ZendFi Webhook Handler
 * POST /webhooks/zendfi
 */
router.post('/webhooks/zendfi', async (req${hasTypeScript ? ': Request' : ''}, res${hasTypeScript ? ': Response' : ''}) => {
  try {
    // Verify webhook signature
    const event = await verifyWebhook({
      body: req.body,
      signature: req.headers['x-zendfi-signature']${hasTypeScript ? ' as string' : ''},
      secret: process.env.ZENDFI_WEBHOOK_SECRET!,
    });

    // Handle events
    switch (event.type) {
      case 'payment.confirmed':
        console.log('Payment confirmed:', event.data.payment_id);
        // TODO: Fulfill order
        break;
        
      case 'payment.failed':
        console.log('Payment failed:', event.data.payment_id);
        // TODO: Handle failed payment
        break;
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook verification failed' });
  }
});

${exportStatement}
`;
}

/**
 * Generate environment file content
 */
export function generateEnvFile(framework: Framework): string {
  const envFile = framework.startsWith('nextjs') ? '.env.local' : '.env';
  
  return `# ZendFi Configuration
# Get your API key from: https://app.zendfi.com/settings/api-keys

# API Key (get from dashboard)
ZENDFI_API_KEY=zfi_test_your_key_here

# Webhook Secret (get from dashboard)
ZENDFI_WEBHOOK_SECRET=whsec_your_secret_here

# Environment (development or production)
ZENDFI_ENVIRONMENT=development
`;
}

/**
 * Get webhook handler content based on framework
 */
export function generateWebhookFile(framework: Framework, hasTypeScript: boolean): string {
  switch (framework) {
    case 'nextjs-app':
      return generateNextAppWebhook(hasTypeScript);
    case 'nextjs-pages':
      return generateNextPagesWebhook(hasTypeScript);
    case 'express':
      return generateExpressWebhook(hasTypeScript);
    default:
      return generateExpressWebhook(hasTypeScript); // Fallback
  }
}
