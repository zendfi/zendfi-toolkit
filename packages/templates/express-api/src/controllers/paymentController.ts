/**
 * Payment Controller
 */

import { Request, Response } from 'express';
import { zendfi } from '../config/zendfi.js';
import type { CreatePaymentRequest, ApiResponse } from '../types/index.js';

export async function createPayment(req: Request, res: Response) {
  try {
    const { amount, currency, description, metadata, token } = req.body as CreatePaymentRequest;

    // Validation
    if (!amount || !currency || !description) {
      res.status(400);
      throw new Error('Missing required fields: amount, currency, description');
    }

    if (amount <= 0) {
      res.status(400);
      throw new Error('Amount must be greater than 0');
    }

    // Create payment link
    const paymentLink = await zendfi.createPaymentLink({
      amount,
      currency,
      token: token || 'USDC',
      description,
      metadata: {
        ...metadata,
        createdAt: new Date().toISOString(),
      },
    });

    const response: ApiResponse = {
      success: true,
      data: {
        payment: {
          id: paymentLink.id,
          url: paymentLink.url,
          amount,
          currency,
          description,
          status: 'pending',
        },
      },
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500);
    throw error;
  }
}

export async function getPayment(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400);
      throw new Error('Payment ID is required');
    }

    // In production, fetch from database
    const payment = await zendfi.getPaymentLink(id);

    const response: ApiResponse = {
      success: true,
      data: { payment },
    };

    res.json(response);
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500);
    throw error;
  }
}

export async function listPayments(req: Request, res: Response) {
  try {
    // In production, fetch from database with pagination
    const payments = await zendfi.listPaymentLinks();

    const response: ApiResponse = {
      success: true,
      data: {
        payments,
        total: payments.length,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('List payments error:', error);
    res.status(500);
    throw error;
  }
}
