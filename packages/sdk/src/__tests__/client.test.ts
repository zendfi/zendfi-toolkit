import { describe, it, expect } from 'vitest';
import { ZendFiClient } from '../index';

describe('ZendFiClient', () => {
  it('should create a client instance with explicit API key', () => {
    const client = new ZendFiClient({
      apiKey: 'zfi_test_abc123',
      environment: 'development',
    });

    expect(client).toBeInstanceOf(ZendFiClient);
  });

  it('should throw error if no API key is provided', () => {
    expect(() => {
      new ZendFiClient({});
    }).toThrow('ZendFi API key not found');
  });

  it('should accept custom configuration', () => {
    const client = new ZendFiClient({
      apiKey: 'zfi_test_custom',
      baseURL: 'https://custom-api.example.com',
      timeout: 60000,
      retries: 5,
      idempotencyEnabled: false,
    });

    expect(client).toBeInstanceOf(ZendFiClient);
  });

  it('should validate API key format', () => {
    // Valid test key
    expect(() => {
      new ZendFiClient({ apiKey: 'zfi_test_abc123' });
    }).not.toThrow();

    // Valid live key
    expect(() => {
      new ZendFiClient({ apiKey: 'zfi_live_xyz789' });
    }).not.toThrow();

    // Invalid format
    expect(() => {
      new ZendFiClient({ apiKey: 'invalid_key' });
    }).toThrow('Invalid API key format');
  });
});
