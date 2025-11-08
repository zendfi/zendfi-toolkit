/**
 * TypeScript Types
 */

export interface CreatePaymentRequest {
  amount: number;
  currency: string;
  token?: string;
  description: string;
  customer_email?: string;
  metadata?: Record<string, any>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
