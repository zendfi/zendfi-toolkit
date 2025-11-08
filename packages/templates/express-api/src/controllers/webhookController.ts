/**
 * Webhook Controller
 * 
 * ✅ Auto-verified webhook handler with type-safe event routing
 * Uses ZendFi SDK webhook handler for automatic signature verification
 * Persists events to database for audit trail and reliability
 */

import { Request, Response, RequestHandler } from 'express';
import { createExpressWebhookHandler } from '@zendfi/sdk/express';
import { prisma } from '../config/database.js';

// Export the webhook handler as Express middleware
export const handleZendFiWebhook: RequestHandler = createExpressWebhookHandler({
  secret: process.env.ZENDFI_WEBHOOK_SECRET!,
  handlers: {
  'payment.confirmed': async (payment: any) => {
    // Payment successfully completed
    console.log('💰 Payment confirmed:', payment.payment_id);
    
    try {
      // Log webhook event
      await prisma.webhookEvent.create({
        data: {
          eventType: 'payment.confirmed',
          paymentId: payment.payment_id,
          payload: payment,
          processed: false,
        },
      });
      
      // Update payment in database
      await prisma.payment.update({
        where: { zendfiPaymentId: payment.payment_id },
        data: {
          status: 'confirmed',
          transactionSignature: payment.transaction?.signature,
          confirmedAt: new Date(),
        },
      });
      
      // Mark webhook as processed
      await prisma.webhookEvent.updateMany({
        where: {
          eventType: 'payment.confirmed',
          paymentId: payment.payment_id,
          processed: false,
        },
        data: {
          processed: true,
          processedAt: new Date(),
        },
      });
      
      console.log('✅ Payment updated in database');
      
      // TODO: Add your business logic here:
      // - Send confirmation email
      // - Trigger fulfillment process
      // - Update analytics
    } catch (error) {
      console.error('Error processing payment.confirmed:', error);
      
      // Log error in webhook event
      await prisma.webhookEvent.updateMany({
        where: {
          eventType: 'payment.confirmed',
          paymentId: payment.payment_id,
          processed: false,
        },
        data: {
          processingError: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      
      throw error;
    }
  },
  
  'payment.failed': async (payment: any) => {
    // Payment failed
    console.log('❌ Payment failed:', payment.payment_id);
    
    try {
      // Log webhook event
      await prisma.webhookEvent.create({
        data: {
          eventType: 'payment.failed',
          paymentId: payment.payment_id,
          payload: payment,
          processed: false,
        },
      });
      
      // Update payment status
      await prisma.payment.update({
        where: { zendfiPaymentId: payment.payment_id },
        data: {
          status: 'failed',
        },
      });
      
      // Mark webhook as processed
      await prisma.webhookEvent.updateMany({
        where: {
          eventType: 'payment.failed',
          paymentId: payment.payment_id,
          processed: false,
        },
        data: {
          processed: true,
          processedAt: new Date(),
        },
      });
      
      console.log('✅ Payment marked as failed in database');
      
      // TODO: Send failure notification
    } catch (error) {
      console.error('Error processing payment.failed:', error);
      throw error;
    }
  },
  
  'payment.created': async (payment: any) => {
    // Payment initiated (pending)
    console.log('⏳ Payment created:', payment.payment_id);
    
    // Log webhook event for audit trail
    await prisma.webhookEvent.create({
      data: {
        eventType: 'payment.created',
        paymentId: payment.payment_id,
        payload: payment,
        processed: true,
        processedAt: new Date(),
      },
    });
  },
  
  'payment.expired': async (payment: any) => {
    // Payment link or session expired
    console.log('⏰ Payment expired:', payment.payment_id);
    
    try {
      // Log webhook event
      await prisma.webhookEvent.create({
        data: {
          eventType: 'payment.expired',
          paymentId: payment.payment_id,
          payload: payment,
          processed: false,
        },
      });
      
      // Update payment status
      await prisma.payment.update({
        where: { zendfiPaymentId: payment.payment_id },
        data: {
          status: 'expired',
        },
      });
      
      // Mark webhook as processed
      await prisma.webhookEvent.updateMany({
        where: {
          eventType: 'payment.expired',
          paymentId: payment.payment_id,
          processed: false,
        },
        data: {
          processed: true,
          processedAt: new Date(),
        },
      });
      
      console.log('✅ Payment marked as expired');
    } catch (error) {
      console.error('Error processing payment.expired:', error);
      throw error;
    }
  },
  }
});
