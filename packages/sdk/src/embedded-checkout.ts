/**
 * ZendFi Embedded Checkout
 * 
 * Embed the ZendFi checkout directly into your website/app
 * without redirecting to checkout.zendfi.tech
 * 
 * @example
 * ```typescript
 * import { ZendFiEmbeddedCheckout } from '@zendfi/sdk';
 * 
 * const checkout = new ZendFiEmbeddedCheckout({
 *   linkCode: 'abc123xyz',
 *   containerId: 'zendfi-checkout',
 *   mode: 'live',
 *   onSuccess: (payment) => {
 *     console.log('Payment successful!', payment);
 *   },
 *   onError: (error) => {
 *     console.error('Payment failed:', error);
 *   }
 * });
 * 
 * checkout.mount();
 * ```
 */

import { ApiKeyMode } from './types';

export interface EmbeddedCheckoutConfig {
  /** Payment link code or payment ID */
  linkCode?: string;
  paymentId?: string;
  
  /** Container element ID where checkout will be mounted */
  containerId: string;
  
  /** API mode - 'test' for devnet, 'live' for mainnet */
  mode?: ApiKeyMode;
  
  /** API base URL (defaults to production) */
  apiUrl?: string;
  
  /** Callback when payment is successful */
  onSuccess?: (payment: PaymentSuccessData) => void;
  
  /** Callback when payment fails */
  onError?: (error: CheckoutError) => void;
  
  /** Callback when checkout is loaded */
  onLoad?: () => void;
  
  /** Custom theme overrides */
  theme?: CheckoutTheme;
  
  /** Enable custom amount (Pay What You Want) */
  allowCustomAmount?: boolean;
  
  /** Show/hide specific payment methods */
  paymentMethods?: {
    walletConnect?: boolean;
    qrCode?: boolean;
    solanaWallet?: boolean;
  };
}

export interface CheckoutTheme {
  primaryColor?: string;
  backgroundColor?: string;
  borderRadius?: string;
  fontFamily?: string;
  textColor?: string;
  buttonStyle?: 'solid' | 'outlined' | 'minimal';
}

export interface PaymentSuccessData {
  paymentId: string;
  transactionSignature: string;
  amount: number;
  token: string;
  merchantName: string;
}

export interface CheckoutError {
  code: string;
  message: string;
  details?: any;
}

interface CheckoutData {
  payment_id: string;
  merchant_name: string;
  amount_usd: number;
  currency: string;
  token: string;
  description?: string;
  qr_code: string;
  payment_url: string;
  wallet_address: string;
  expires_at: string;
  status: string;
  solana_network: string;
  allow_custom_amount: boolean;
  minimum_amount?: number;
  maximum_amount?: number;
  suggested_amount?: number;
}

/**
 * ZendFi Embedded Checkout Component
 * 
 * Provides a fully-functional checkout experience that can be
 * embedded directly into any web application.
 */
export class ZendFiEmbeddedCheckout {
  private config: Required<EmbeddedCheckoutConfig>;
  private container: HTMLElement | null = null;
  private checkoutData: CheckoutData | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private mounted: boolean = false;
  private paymentProcessed: boolean = false; // Prevent duplicate success callbacks

  constructor(config: EmbeddedCheckoutConfig) {
    this.config = {
      linkCode: config.linkCode || '',
      paymentId: config.paymentId || '',
      containerId: config.containerId,
      mode: config.mode || 'test',
      apiUrl: config.apiUrl || this.getDefaultApiUrl(),
      onSuccess: config.onSuccess || (() => {}),
      onError: config.onError || (() => {}),
      onLoad: config.onLoad || (() => {}),
      theme: config.theme || {},
      allowCustomAmount: config.allowCustomAmount || false,
      paymentMethods: config.paymentMethods || {
        walletConnect: true,
        qrCode: true,
        solanaWallet: true,
      },
    };

    if (!this.config.linkCode && !this.config.paymentId) {
      throw new Error('Either linkCode or paymentId must be provided');
    }
  }

  private getDefaultApiUrl(): string {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return 'http://localhost:8080';
    }
    return 'https://api.zendfi.tech';
  }

  /**
   * Mount the checkout to the DOM
   */
  async mount(): Promise<void> {
    if (this.mounted) {
      console.warn('Checkout is already mounted');
      return;
    }

    this.container = document.getElementById(this.config.containerId);
    if (!this.container) {
      throw new Error(`Container element #${this.config.containerId} not found`);
    }

    try {
      // Show loading state
      this.renderLoading();

      // Load dependencies (QR code, Solana web3.js)
      await this.loadDependencies();

      // Fetch checkout data
      await this.fetchCheckoutData();

      // Render the checkout UI
      this.render();

      // Start polling for payment confirmation
      this.startPaymentPolling();

      this.mounted = true;
      this.config.onLoad();
    } catch (error) {
      const err = error as Error;
      this.config.onError({
        code: 'MOUNT_ERROR',
        message: err.message,
        details: error,
      });
      this.renderError(err.message);
    }
  }

  /**
   * Unmount and cleanup
   */
  unmount(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    if (this.container) {
      this.container.innerHTML = '';
    }

    this.mounted = false;
  }

  /**
   * Fetch checkout data from API
   */
  private async fetchCheckoutData(): Promise<void> {
    let endpoint: string;
    let method: string;

    if (this.config.linkCode) {
      // For payment links, use POST to create a new payment
      endpoint = `/api/v1/payment-links/${this.config.linkCode}/pay`;
      method = 'POST';
    } else {
      // For direct payment IDs, use GET to fetch checkout data
      endpoint = `/api/v1/payments/${this.config.paymentId}/checkout-data`;
      method = 'GET';
    }

    const response = await fetch(`${this.config.apiUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch checkout data: ${response.statusText}`);
    }

    this.checkoutData = await response.json();
  }

  /**
   * Poll for payment confirmation
   */
  private startPaymentPolling(): void {
    this.pollInterval = setInterval(async () => {
      if (!this.checkoutData || this.paymentProcessed) return;

      try {
        const response = await fetch(
          `${this.config.apiUrl}/api/v1/payments/${this.checkoutData.payment_id}/status`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          
          if (data.status === 'confirmed' && !this.paymentProcessed) {
            // Payment confirmed - use status data directly
            this.handlePaymentSuccess(data);
          } else if (data.status === 'failed') {
            this.handlePaymentFailure(data);
          } else if (data.status === 'expired') {
            this.handlePaymentExpired();
          }
        }
      } catch (error) {
        console.error('Payment status check failed:', error);
      }
    }, 3000); // Poll every 3 seconds
  }

  /**
   * Handle successful payment
   */
  private handlePaymentSuccess(statusData: any): void {
    // Prevent duplicate callbacks
    if (this.paymentProcessed) return;
    this.paymentProcessed = true;

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    this.config.onSuccess({
      paymentId: this.checkoutData?.payment_id || statusData.payment_id,
      transactionSignature: statusData.transaction_signature || 'Processing...',
      amount: this.checkoutData?.amount_usd || 0,
      token: this.checkoutData?.token || 'USDC',
      merchantName: this.checkoutData?.merchant_name || 'Merchant',
    });

    this.renderSuccess();
  }

  /**
   * Handle payment failure
   */
  private handlePaymentFailure(data: any): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    this.config.onError({
      code: 'PAYMENT_FAILED',
      message: 'Payment failed',
      details: data,
    });

    this.renderError('Payment failed. Please try again.');
  }

  /**
   * Handle payment expiration
   */
  private handlePaymentExpired(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    this.config.onError({
      code: 'PAYMENT_EXPIRED',
      message: 'Payment link has expired',
    });

    this.renderError('This payment link has expired.');
  }

  /**
   * Render loading state
   */
  private renderLoading(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="zendfi-checkout-loading" style="${this.getLoadingStyles()}">
        <div class="zendfi-spinner" style="${this.getSpinnerStyles()}"></div>
        <p style="margin-top: 16px; color: #666;">Loading checkout...</p>
      </div>
    `;
  }

  /**
   * Render the main checkout UI
   */
  private render(): void {
    if (!this.container || !this.checkoutData) return;

    const theme = this.getComputedTheme();
    
    this.container.innerHTML = `
      <div class="zendfi-embedded-checkout" style="${this.getCheckoutContainerStyles(theme)}">
        ${this.renderHeader()}
        ${this.renderPaymentInfo()}
        ${this.renderPaymentMethods()}
        ${this.renderFooter()}
      </div>
    `;

    this.attachEventListeners();
    this.injectStyles();
  }

  /**
   * Render header section
   */
  private renderHeader(): string {
    if (!this.checkoutData) return '';

    return `
      <div class="zendfi-checkout-header" style="padding: 24px; border-bottom: 1px solid #e5e7eb;">
        <h2 style="margin: 0; font-size: 24px; font-weight: 600; color: ${this.config.theme.textColor || '#1f2937'};">
          Pay ${this.checkoutData.merchant_name}
        </h2>
        ${this.checkoutData.description ? `
          <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;">
            ${this.checkoutData.description}
          </p>
        ` : ''}
      </div>
    `;
  }

  /**
   * Render payment information
   */
  private renderPaymentInfo(): string {
    if (!this.checkoutData) return '';

    return `
      <div class="zendfi-payment-info" style="padding: 24px; background: #f9fafb;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <span style="font-size: 14px; color: #6b7280;">Amount</span>
          <span style="font-size: 24px; font-weight: 700; color: #1f2937;">
            $${this.checkoutData.amount_usd.toFixed(2)} ${this.checkoutData.token}
          </span>
        </div>
        
        ${this.checkoutData.allow_custom_amount ? this.renderCustomAmountInput() : ''}
        
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: white; border-radius: 8px; margin-top: 12px;">
          <span style="font-size: 12px; color: #6b7280;">Network</span>
          <span style="font-size: 12px; font-weight: 600; color: #1f2937; text-transform: uppercase;">
            ${this.checkoutData.solana_network}
          </span>
        </div>
      </div>
    `;
  }

  /**
   * Render custom amount input (Pay What You Want)
   */
  private renderCustomAmountInput(): string {
    if (!this.checkoutData) return '';

    return `
      <div style="margin-top: 16px;">
        <label style="display: block; font-size: 14px; color: #6b7280; margin-bottom: 8px;">
          Custom Amount (Optional)
        </label>
        <input
          type="number"
          id="zendfi-custom-amount"
          placeholder="${this.checkoutData.suggested_amount || this.checkoutData.amount_usd}"
          min="${this.checkoutData.minimum_amount || 0}"
          ${this.checkoutData.maximum_amount ? `max="${this.checkoutData.maximum_amount}"` : ''}
          step="0.01"
          style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 16px;"
        />
        ${this.checkoutData.minimum_amount ? `
          <p style="font-size: 12px; color: #6b7280; margin-top: 4px;">
            Minimum: $${this.checkoutData.minimum_amount}
          </p>
        ` : ''}
      </div>
    `;
  }

  /**
   * Render payment methods
   */
  private renderPaymentMethods(): string {
    if (!this.checkoutData) return '';

    return `
      <div class="zendfi-payment-methods" style="padding: 24px;">
        <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #1f2937;">
          Payment Methods
        </h3>
        
        ${this.config.paymentMethods.qrCode ? this.renderQRCodeMethod() : ''}
        ${this.config.paymentMethods.solanaWallet ? this.renderWalletMethod() : ''}
        ${this.config.paymentMethods.walletConnect ? this.renderWalletConnectMethod() : ''}
      </div>
    `;
  }

  /**
   * Render QR code payment method
   */
  private renderQRCodeMethod(): string {
    if (!this.checkoutData) return '';

    return `
      <div class="zendfi-payment-method" style="padding: 16px; border: 1px solid #e5e7eb; border-radius: 12px; margin-bottom: 16px;">
        <div style="text-align: center;">
          <p style="font-size: 14px; color: #6b7280; margin-bottom: 16px;">
            Scan with Solana wallet
          </p>
          <div id="zendfi-qr-container" style="display: flex; justify-content: center; margin-bottom: 16px;">
            <canvas id="zendfi-qr-code"></canvas>
          </div>
          <button
            id="zendfi-copy-address"
            style="padding: 10px 20px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 8px; cursor: pointer; font-size: 14px; color: #374151; transition: all 0.2s;"
            onmouseover="this.style.background='#e5e7eb'"
            onmouseout="this.style.background='#f3f4f6'"
          >
            📋 Copy Address
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render browser wallet method
   */
  private renderWalletMethod(): string {
    return `
      <div class="zendfi-payment-method" style="margin-bottom: 16px;">
        <button
          id="zendfi-connect-wallet"
          style="width: 100%; padding: 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"
          onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 12px rgba(0, 0, 0, 0.15)';"
          onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px rgba(0, 0, 0, 0.1)';"
        >
          🔗 Connect Wallet
        </button>
      </div>
    `;
  }

  /**
   * Render WalletConnect method
   */
  private renderWalletConnectMethod(): string {
    return `
      <div class="zendfi-payment-method">
        <button
          id="zendfi-wallet-connect"
          style="width: 100%; padding: 16px; background: white; color: #1f2937; border: 2px solid #e5e7eb; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.2s;"
          onmouseover="this.style.borderColor='#667eea'; this.style.background='#f9fafb';"
          onmouseout="this.style.borderColor='#e5e7eb'; this.style.background='white';"
        >
          📱 WalletConnect
        </button>
      </div>
    `;
  }

  /**
   * Render footer
   */
  private renderFooter(): string {
    return `
      <div class="zendfi-checkout-footer" style="padding: 16px 24px; border-top: 1px solid #e5e7eb; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">
          Powered by <a href="https://zendfi.tech" target="_blank" style="color: #667eea; text-decoration: none; font-weight: 600;">ZendFi</a>
        </p>
      </div>
    `;
  }

  /**
   * Render success state
   */
  private renderSuccess(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="zendfi-checkout-success" style="${this.getSuccessStyles()}">
        <div style="font-size: 64px; margin-bottom: 16px;">✅</div>
        <h3 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #059669;">
          Payment Successful!
        </h3>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">
          Your payment has been confirmed on the blockchain.
        </p>
      </div>
    `;
  }

  /**
   * Render error state
   */
  private renderError(message: string): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="zendfi-checkout-error" style="${this.getErrorStyles()}">
        <div style="font-size: 64px; margin-bottom: 16px;">❌</div>
        <h3 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #dc2626;">
          Payment Failed
        </h3>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">
          ${message}
        </p>
      </div>
    `;
  }

  /**
   * Attach event listeners to interactive elements
   */
  private attachEventListeners(): void {
    // QR Code generation
    const qrCanvas = document.getElementById('zendfi-qr-code') as HTMLCanvasElement;
    if (qrCanvas && this.checkoutData) {
      this.generateQRCode(qrCanvas, this.checkoutData.qr_code);
    }

    // Copy address button
    const copyBtn = document.getElementById('zendfi-copy-address');
    if (copyBtn && this.checkoutData) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(this.checkoutData!.wallet_address);
        copyBtn.textContent = '✓ Copied!';
        setTimeout(() => {
          copyBtn.textContent = '📋 Copy Address';
        }, 2000);
      });
    }

    // Connect wallet button
    const connectBtn = document.getElementById('zendfi-connect-wallet');
    if (connectBtn) {
      connectBtn.addEventListener('click', () => this.handleWalletConnect());
    }

    // WalletConnect button
    const walletConnectBtn = document.getElementById('zendfi-wallet-connect');
    if (walletConnectBtn) {
      walletConnectBtn.addEventListener('click', () => this.handleWalletConnectScan());
    }
  }

  /**
   * Handle wallet connection and payment
   */
  private async handleWalletConnect(): Promise<void> {
    try {
      // Check if Solana wallet is available
      const provider = (window as any).solana;
      if (!provider) {
        alert('No Solana wallet found. Please install Phantom, Solflare, or another Solana wallet.');
        return;
      }

      // Connect to wallet
      const connectBtn = document.getElementById('zendfi-connect-wallet');
      if (connectBtn) {
        connectBtn.textContent = '🔄 Connecting...';
        (connectBtn as HTMLButtonElement).disabled = true;
      }

      await provider.connect();
      const publicKey = provider.publicKey.toString();

      if (connectBtn) {
        connectBtn.textContent = '🔨 Building transaction...';
      }

      // Build transaction
      const response = await fetch(
        `${this.config.apiUrl}/api/v1/payments/${this.checkoutData!.payment_id}/build-transaction`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payer_wallet: publicKey,
            prefer_gasless: true,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to build transaction');
      }

      const { transaction: transactionBase64, is_gasless } = await response.json();

      if (connectBtn) {
        connectBtn.textContent = '✍️ Sign transaction...';
      }

      // Decode transaction using @solana/web3.js
      const solanaWeb3 = (window as any).solanaWeb3;
      const transactionBuffer = Uint8Array.from(atob(transactionBase64), c => c.charCodeAt(0));
      const transaction = solanaWeb3.Transaction.from(transactionBuffer);

      // Sign transaction
      const signedTransaction = await provider.signTransaction(transaction);

      if (connectBtn) {
        connectBtn.textContent = '📡 Submitting...';
      }

      // Submit transaction
      if (is_gasless) {
        // For gasless, submit signed transaction to backend
        const serialized = signedTransaction.serialize();
        const signedBase64 = btoa(String.fromCharCode(...serialized));

        const submitResponse = await fetch(
          `${this.config.apiUrl}/api/v1/payments/${this.checkoutData!.payment_id}/submit-gasless-transaction`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              signed_transaction: signedBase64,
            }),
          }
        );

        if (!submitResponse.ok) {
          const errorData = await submitResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to submit gasless transaction');
        }
      } else {
        // For regular transactions, submit signature
        const signature = signedTransaction.signature?.toString();
        if (!signature) {
          throw new Error('Transaction signature missing');
        }

        const submitResponse = await fetch(
          `${this.config.apiUrl}/api/v1/payments/${this.checkoutData!.payment_id}/submit-transaction`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transaction_signature: signature,
            }),
          }
        );

        if (!submitResponse.ok) {
          const errorData = await submitResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to submit transaction');
        }
      }

      if (connectBtn) {
        connectBtn.textContent = '⏳ Confirming...';
      }

      // Payment will be confirmed via polling
    } catch (error) {
      console.error('Wallet connection error:', error);
      
      // Reset button
      const connectBtn = document.getElementById('zendfi-connect-wallet');
      if (connectBtn) {
        connectBtn.textContent = '🔗 Connect Wallet';
        (connectBtn as HTMLButtonElement).disabled = false;
      }

      this.config.onError({
        code: 'WALLET_ERROR',
        message: error instanceof Error ? error.message : 'Wallet connection failed',
        details: error,
      });

      alert(`Payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle mobile wallet connection via Solana Pay deep link
   */
  private handleWalletConnectScan(): void {
    if (!this.checkoutData) return;

    // Generate Solana Pay URL
    const solanaPayUrl = `solana:${this.checkoutData.wallet_address}?amount=${this.checkoutData.amount_usd}&spl-token=${this.checkoutData.token}&reference=${this.checkoutData.payment_id}&label=${encodeURIComponent(this.checkoutData.merchant_name)}&message=${encodeURIComponent(this.checkoutData.description || 'Payment')}`;

    // Open in mobile wallet or copy to clipboard
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      // On mobile, try to open wallet directly
      window.location.href = solanaPayUrl;
    } else {
      // On desktop, copy to clipboard and show QR
      navigator.clipboard.writeText(solanaPayUrl).then(() => {
        alert('Solana Pay link copied! Open it on your mobile wallet or scan the QR code above.');
      }).catch(() => {
        alert('Solana Pay URL: ' + solanaPayUrl);
      });
    }
  }

  /**
   * Generate QR code on canvas using QRious library
   */
  private generateQRCode(canvas: HTMLCanvasElement, data: string): void {
    try {
      const QRious = (window as any).QRious;
      if (!QRious) {
        console.error('QRious library not loaded');
        return;
      }

      new QRious({
        element: canvas,
        value: data,
        size: 256,
        level: 'M',
      });
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    }
  }

  /**
   * Inject custom styles
   */
  private injectStyles(): void {
    const styleId = 'zendfi-embedded-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .zendfi-embedded-checkout * {
        box-sizing: border-box;
      }
      
      @keyframes zendfi-spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Load external dependencies (QR code library, Solana web3.js)
   */
  private async loadDependencies(): Promise<void> {
    // Load QRious for QR code generation
    if (!(window as any).QRious) {
      await this.loadScript('https://cdn.jsdelivr.net/npm/qrious@4/dist/qrious.min.js');
    }

    // Load Solana web3.js
    if (!(window as any).solanaWeb3) {
      await this.loadScript('https://unpkg.com/@solana/web3.js@1.95.2/lib/index.iife.min.js');
    }
  }

  /**
   * Load external script
   */
  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  }

  /**
   * Get computed theme with defaults
   */
  private getComputedTheme(): Required<CheckoutTheme> {
    return {
      primaryColor: this.config.theme.primaryColor || '#667eea',
      backgroundColor: this.config.theme.backgroundColor || '#ffffff',
      borderRadius: this.config.theme.borderRadius || '16px',
      fontFamily: this.config.theme.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      textColor: this.config.theme.textColor || '#1f2937',
      buttonStyle: this.config.theme.buttonStyle || 'solid',
    };
  }

  /**
   * Style helpers
   */
  private getCheckoutContainerStyles(theme: Required<CheckoutTheme>): string {
    return `
      font-family: ${theme.fontFamily};
      background: ${theme.backgroundColor};
      border-radius: ${theme.borderRadius};
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      max-width: 500px;
      margin: 0 auto;
    `.replace(/\s+/g, ' ').trim();
  }

  private getLoadingStyles(): string {
    return `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 24px;
      text-align: center;
    `.replace(/\s+/g, ' ').trim();
  }

  private getSpinnerStyles(): string {
    return `
      width: 40px;
      height: 40px;
      border: 4px solid #f3f4f6;
      border-top-color: #667eea;
      border-radius: 50%;
      animation: zendfi-spin 0.8s linear infinite;
    `.replace(/\s+/g, ' ').trim();
  }

  private getSuccessStyles(): string {
    return this.getLoadingStyles();
  }

  private getErrorStyles(): string {
    return this.getLoadingStyles();
  }
}

// Export for use in HTML
if (typeof window !== 'undefined') {
  (window as any).ZendFiEmbeddedCheckout = ZendFiEmbeddedCheckout;
}
