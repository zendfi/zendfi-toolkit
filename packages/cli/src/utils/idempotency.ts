import { randomUUID } from 'crypto';

export function generateIdempotencyKey(): string {
  return `zfi_cli_${Date.now()}_${randomUUID()}`;
}

export function buildApiHeaders(
  apiKey: string,
  method: string,
  idempotencyKey?: string
): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  if (method.toUpperCase() !== 'GET') {
    headers['Idempotency-Key'] = idempotencyKey || generateIdempotencyKey();
  }

  return headers;
}