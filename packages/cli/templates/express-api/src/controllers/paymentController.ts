/**
 * Payment Controller
 * Handles payment creation, retrieval, and management with database persistence
 */

import { Request, Response } from 'express';
import { zendfi } from '../config/zendfi.js';
import { prisma } from '../config/database.js';
import type { CreatePaymentRequest, ApiResponse } from '../types/index.js';

export async function createPayment(req: Request, res: Response) {
  try {
    const { amount, currency, description, metadata, token, customer_email } = req.body as CreatePaymentRequest;

    // Validation
    if (!amount || !currency || !description) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: amount, currency, description',
      });
      return;
    }

    if (amount <= 0) {
      res.status(400).json({
        success: false,
        error: 'Amount must be greater than 0',
      });
      return;
    }

    // Create payment link via ZendFi
    const paymentLink = await zendfi.createPaymentLink({
      amount,
      currency,
      token: token || 'USDC',
      description,
      metadata: {
        ...metadata,
        customer_email,
        userId: req.user?.id,
        createdAt: new Date().toISOString(),
      },
    });

    // Store in database
    const payment = await prisma.payment.create({
      data: {
        userId: req.user?.id,
        zendfiPaymentId: paymentLink.id,
        amount,
        currency,
        token: token || 'USDC',
        description,
        status: 'pending',
        checkoutUrl: paymentLink.url,
        customerEmail: customer_email,
        metadata: metadata || {},
      },
    });

    const response: ApiResponse = {
      success: true,
      data: {
        payment: {
          id: payment.id,
          zendfiPaymentId: payment.zendfiPaymentId,
          url: payment.checkoutUrl,
          amount: payment.amount,
          currency: payment.currency,
          token: payment.token,
          description: payment.description,
          status: payment.status,
          createdAt: payment.createdAt,
        },
      },
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create payment',
    });
  }
}

export async function getPayment(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Payment ID is required',
      });
      return;
    }

    // Fetch from database (can be either internal ID or ZendFi payment ID)
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { id },
          { zendfiPaymentId: id },
        ],
        // If authenticated, only show user's payments
        ...(req.user && { userId: req.user.id }),
      },
      select: {
        id: true,
        zendfiPaymentId: true,
        amount: true,
        currency: true,
        token: true,
        description: true,
        status: true,
        checkoutUrl: true,
        transactionSignature: true,
        customerEmail: true,
        metadata: true,
        confirmedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!payment) {
      res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: { payment },
    };

    res.json(response);
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment',
    });
  }
}

export async function listPayments(req: Request, res: Response) {
  try {
    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Filters
    const status = req.query.status as string;
    const userId = req.user?.id;

    // Build where clause
    const where: any = {};
    if (userId) where.userId = userId;
    if (status) where.status = status;

    // Fetch from database with pagination
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        select: {
          id: true,
          zendfiPaymentId: true,
          amount: true,
          currency: true,
          token: true,
          description: true,
          status: true,
          checkoutUrl: true,
          customerEmail: true,
          confirmedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    const response: ApiResponse = {
      success: true,
      data: {
        payments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };

    res.json(response);
  } catch (error) {
    console.error('List payments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list payments',
    });
    throw error;
  }
}
