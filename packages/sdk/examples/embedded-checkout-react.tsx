/**
 * React Example - ZendFi Embedded Checkout
 * 
 * This example shows how to integrate ZendFi's embedded checkout
 * into a React application with TypeScript.
 */

import React, { useEffect, useRef, useState } from 'react';
import { ZendFiEmbeddedCheckout, PaymentSuccessData, CheckoutError } from '@zendfi/sdk';

interface CheckoutPageProps {
  linkCode: string;
  mode?: 'test' | 'live';
}

export function CheckoutPage({ linkCode, mode = 'test' }: CheckoutPageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<PaymentSuccessData | null>(null);
  const checkoutRef = useRef<ZendFiEmbeddedCheckout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create checkout instance
    const checkout = new ZendFiEmbeddedCheckout({
      linkCode,
      containerId: 'zendfi-checkout-container',
      mode,
      
      onLoad: () => {
        console.log('Checkout loaded');
        setIsLoading(false);
      },
      
      onSuccess: (payment: PaymentSuccessData) => {
        console.log('Payment successful:', payment);
        setPaymentSuccess(payment);
        
        // Track conversion (Google Analytics example)
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'purchase', {
            transaction_id: payment.paymentId,
            value: payment.amount,
            currency: payment.token,
            items: [{
              name: `Payment to ${payment.merchantName}`,
              quantity: 1,
              price: payment.amount,
            }],
          });
        }
        
        // Optional: Verify payment on your backend
        verifyPaymentOnBackend(payment.paymentId);
      },
      
      onError: (error: CheckoutError) => {
        console.error('Payment error:', error);
        setError(error.message);
        setIsLoading(false);
      },
      
      // Custom theme
      theme: {
        primaryColor: '#8b5cf6',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        fontFamily: 'Inter, system-ui, sans-serif',
        textColor: '#1f2937',
        buttonStyle: 'solid',
      },
    });

    // Mount checkout
    checkout.mount().catch((err) => {
      console.error('Failed to mount checkout:', err);
      setError('Failed to load checkout. Please try again.');
      setIsLoading(false);
    });

    checkoutRef.current = checkout;

    // Cleanup on unmount
    return () => {
      if (checkoutRef.current) {
        checkoutRef.current.unmount();
      }
    };
  }, [linkCode, mode]);

  const verifyPaymentOnBackend = async (paymentId: string) => {
    try {
      const response = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      });

      if (!response.ok) {
        console.error('Backend verification failed');
      }
    } catch (err) {
      console.error('Verification request failed:', err);
    }
  };

  if (paymentSuccess) {
    return (
      <div className="checkout-success">
        <div className="success-icon">✅</div>
        <h1>Payment Successful!</h1>
        <p>Thank you for your payment to {paymentSuccess.merchantName}</p>
        <div className="payment-details">
          <p><strong>Amount:</strong> ${paymentSuccess.amount} {paymentSuccess.token}</p>
          <p><strong>Transaction:</strong> {paymentSuccess.transactionSignature.slice(0, 16)}...</p>
        </div>
        <button onClick={() => window.location.href = '/'}>
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-header">
        <h1>Complete Your Payment</h1>
        <p>Secure checkout powered by ZendFi</p>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      )}

      {isLoading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Loading checkout...</p>
        </div>
      )}

      <div 
        id="zendfi-checkout-container" 
        ref={containerRef}
        className="checkout-container"
      />

      <style>{`
        .checkout-page {
          max-width: 600px;
          margin: 0 auto;
          padding: 2rem;
        }

        .checkout-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .checkout-header h1 {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          color: #1f2937;
        }

        .checkout-header p {
          color: #6b7280;
          font-size: 1rem;
        }

        .error-banner {
          background: #fee2e2;
          border: 1px solid #fca5a5;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .error-banner span {
          color: #dc2626;
        }

        .error-banner button {
          background: #dc2626;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
        }

        .loading-overlay {
          text-align: center;
          padding: 4rem 2rem;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f4f6;
          border-top-color: #8b5cf6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 1rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .checkout-success {
          text-align: center;
          padding: 4rem 2rem;
        }

        .success-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .checkout-success h1 {
          font-size: 2rem;
          color: #059669;
          margin-bottom: 1rem;
        }

        .payment-details {
          background: #f9fafb;
          border-radius: 12px;
          padding: 1.5rem;
          margin: 2rem 0;
          text-align: left;
        }

        .payment-details p {
          margin: 0.5rem 0;
          color: #374151;
        }

        .checkout-success button {
          background: #8b5cf6;
          color: white;
          border: none;
          padding: 0.75rem 2rem;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .checkout-success button:hover {
          background: #7c3aed;
        }

        .checkout-container {
          min-height: 400px;
        }
      `}</style>
    </div>
  );
}

export default CheckoutPage;
