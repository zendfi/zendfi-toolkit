import { describe, it, expect } from 'vitest';
import { ZendFiClient } from '../client';
import type { WebhookPayload } from '../types';

describe('Webhook Verification', () => {
  const client = new ZendFiClient({
    apiKey: 'zfi_test_abc123',
    environment: 'development',
  });

  const mockPayload: WebhookPayload = {
    event: 'payment.confirmed',
    timestamp: '2025-10-29T12:00:00Z',
    merchant_id: 'merchant_123',
    data: {
      id: 'payment_123',
      merchant_id: 'merchant_123',
      amount_usd: 50.0,
      payment_token: 'USDC',
      status: 'confirmed',
      checkout_url: 'https://checkout.zendfi.tech/payment_123',
      expires_at: '2025-10-29T12:15:00Z',
      created_at: '2025-10-29T12:00:00Z',
      updated_at: '2025-10-29T12:00:00Z',
    },
  };

  const webhookSecret = 'whsec_test_secret_key_12345';

  it('should verify valid webhook signature', () => {
    const payload = JSON.stringify(mockPayload);
    
    // In real scenario, signature would come from ZendFi backend
    // For testing, we compute it ourselves
    const crypto = require('crypto');
    const signature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload, 'utf8')
      .digest('hex');

    const isValid = client.verifyWebhook({
      payload,
      signature,
      secret: webhookSecret,
    });

    expect(isValid).toBe(true);
  });

  it('should reject invalid signature', () => {
    const payload = JSON.stringify(mockPayload);
    const invalidSignature = 'invalid_signature_12345';

    const isValid = client.verifyWebhook({
      payload,
      signature: invalidSignature,
      secret: webhookSecret,
    });

    expect(isValid).toBe(false);
  });

  it('should reject tampered payload', () => {
    const payload = JSON.stringify(mockPayload);
    
    const crypto = require('crypto');
    const signature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload, 'utf8')
      .digest('hex');

    // Tamper with the payload
    const tamperedPayload = JSON.stringify({
      ...mockPayload,
      data: {
        ...mockPayload.data,
        amount_usd: 1000000, // Changed amount!
      },
    });

    const isValid = client.verifyWebhook({
      payload: tamperedPayload,
      signature, // Original signature
      secret: webhookSecret,
    });

    expect(isValid).toBe(false);
  });

  it('should reject webhook with wrong secret', () => {
    const payload = JSON.stringify(mockPayload);
    
    const crypto = require('crypto');
    const signature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload, 'utf8')
      .digest('hex');

    const isValid = client.verifyWebhook({
      payload,
      signature,
      secret: 'wrong_secret', // Wrong secret
    });

    expect(isValid).toBe(false);
  });

  it('should reject malformed JSON payload', () => {
    const malformedPayload = '{ invalid json }';
    const signature = 'some_signature';

    const isValid = client.verifyWebhook({
      payload: malformedPayload,
      signature,
      secret: webhookSecret,
    });

    expect(isValid).toBe(false);
  });

  it('should reject payload with missing required fields', () => {
    const incompletePayload = JSON.stringify({
      event: 'payment.confirmed',
      // Missing timestamp and merchant_id
    });

    const crypto = require('crypto');
    const signature = crypto
      .createHmac('sha256', webhookSecret)
      .update(incompletePayload, 'utf8')
      .digest('hex');

    const isValid = client.verifyWebhook({
      payload: incompletePayload,
      signature,
      secret: webhookSecret,
    });

    expect(isValid).toBe(false);
  });

  it('should reject empty inputs', () => {
    expect(
      client.verifyWebhook({
        payload: '',
        signature: '',
        secret: '',
      })
    ).toBe(false);
  });

  it('should handle different payload sizes correctly', () => {
    // Large payload test
    const largePayload: WebhookPayload = {
      ...mockPayload,
      data: {
        ...mockPayload.data,
        metadata: {
          large_data: 'x'.repeat(10000), // 10KB of data
        },
      } as any,
    };

    const payload = JSON.stringify(largePayload);
    
    const crypto = require('crypto');
    const signature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload, 'utf8')
      .digest('hex');

    const isValid = client.verifyWebhook({
      payload,
      signature,
      secret: webhookSecret,
    });

    expect(isValid).toBe(true);
  });
});
