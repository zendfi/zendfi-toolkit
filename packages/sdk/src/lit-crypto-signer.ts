/**
 * Lit Protocol PKP Session Identity Module
 * 
 * This module provides client-side integration with Lit Protocol for
 * on-chain session identity. When a session has `mint_pkp: true`,
 * a PKP (Programmable Key Pair) is minted to create a blockchain-verified
 * session identity for audit and compliance purposes.
 * 
 * **Important**: Spending limits are enforced server-side, not via the PKP.
 * The PKP cannot sign Solana transactions (ECDSA vs Ed25519 incompatibility).
 * It serves as an identity anchor and audit trail, not a signing key.
 * 
 * @example
 * ```typescript
 * import { LitCryptoSigner, requiresLitSigning } from '@zendfi/sdk';
 * 
 * // Check if session has PKP identity
 * if (session.mint_pkp) {
 *   console.log('Session has on-chain identity:', session.pkp_address);
 * }
 * 
 * // Note: This module is primarily for future extensibility
 * // Current spending enforcement is server-side
 * ```
 */

// The IPFS CID of our spending limit Lit Action
// This must match the CID in the backend (crypto_spending_limits.rs)
export const SPENDING_LIMIT_ACTION_CID = 'QmXXunoMeNhXhnr4onzBuvnMzDqH8rf1qdM94RKXayypX3';

export type LitNetwork = 'datil' | 'datil-test' | 'datil-dev';

export interface LitCryptoSignerConfig {
  network?: LitNetwork;
  apiEndpoint?: string;
  apiKey?: string;
  
  debug?: boolean;
}

export interface SignPaymentParams {
  sessionId: string;
  amountUsd: number;
  
  transactionToSign: string;
  
  pkpPublicKey: string;
  
  merchantId?: string;
  
  sessionSigs?: any;
}

export interface SignPaymentResult {
  success: boolean;
  signature?: string;
  publicKey?: string;
  recid?: number;
  sessionId?: string;
  amountUsd?: number;
  remainingBudget?: number;
  cryptoEnforced: boolean;
  error?: string;
  code?: string;
  currentSpent?: number;
  limit?: number;
  remaining?: number;
}

export class LitCryptoSigner {
  private config: Required<LitCryptoSignerConfig>;
  private litNodeClient: any = null;
  private connected: boolean = false;
  
  constructor(config: LitCryptoSignerConfig = {}) {
    this.config = {
      network: config.network || 'datil-dev',
      apiEndpoint: config.apiEndpoint || 'https://api.zendfi.tech',
      apiKey: config.apiKey || '',
      debug: config.debug || false,
    };
  }
  
  async connect(): Promise<void> {
    if (this.connected && this.litNodeClient) {
      return;
    }
    
    this.log('Connecting to Lit Protocol network:', this.config.network);
    
    const { LitNodeClient } = await import('@lit-protocol/lit-node-client');
    
    this.litNodeClient = new LitNodeClient({
      litNetwork: this.config.network as any,
      debug: this.config.debug,
    });
    
    await this.litNodeClient.connect();
    this.connected = true;
    
    this.log('Connected to Lit Protocol');
  }
  
  async disconnect(): Promise<void> {
    if (this.litNodeClient) {
      await this.litNodeClient.disconnect();
      this.litNodeClient = null;
      this.connected = false;
    }
  }
  
  async signPayment(params: SignPaymentParams): Promise<SignPaymentResult> {
    if (!this.connected || !this.litNodeClient) {
      throw new Error('Not connected to Lit Protocol. Call connect() first.');
    }
    
    this.log('Signing payment with Lit Protocol');
    this.log('  Session:', params.sessionId);
    this.log('  Amount: $' + params.amountUsd);
    
    try {
      let sessionSigs = params.sessionSigs;
      if (!sessionSigs) {
        sessionSigs = await this.getSessionSigs(params.pkpPublicKey);
      }
      
      const result = await this.litNodeClient.executeJs({
        ipfsId: SPENDING_LIMIT_ACTION_CID,
        sessionSigs,
        jsParams: {
          sessionId: params.sessionId,
          requestedAmountUsd: params.amountUsd,
          merchantId: params.merchantId,
          transactionToSign: params.transactionToSign,
          apiEndpoint: this.config.apiEndpoint,
          apiKey: this.config.apiKey,
          pkpPublicKey: params.pkpPublicKey,
        },
      });
      
      this.log('Lit Action result:', result);
      
      const response = JSON.parse(result.response);
      
      return {
        success: response.success,
        signature: response.signature,
        publicKey: response.publicKey,
        recid: response.recid,
        sessionId: response.session_id,
        amountUsd: response.amount_usd,
        remainingBudget: response.remaining_budget,
        cryptoEnforced: response.crypto_enforced ?? true,
        error: response.error,
        code: response.code,
        currentSpent: response.current_spent,
        limit: response.limit,
        remaining: response.remaining,
      };
      
    } catch (error) {
      this.log('Lit signing error:', error);
      
      return {
        success: false,
        cryptoEnforced: true,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'LIT_ERROR',
      };
    }
  }
  
  private async getSessionSigs(pkpPublicKey: string): Promise<any> {
    this.log('Generating Lit session signatures');
    
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const { ethers } = await import('ethers');
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      
      const { LitAbility, LitPKPResource } = await import('@lit-protocol/auth-helpers');
      
      const sessionSigs = await this.litNodeClient.getSessionSigs({
        pkpPublicKey,
        chain: 'ethereum',
        expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(),
        resourceAbilityRequests: [
          {
            resource: new LitPKPResource('*'),
            ability: LitAbility.PKPSigning,
          },
        ],
        authNeededCallback: async (params: any) => {
          const message = params.message;
          const signature = await signer.signMessage(message);
          return {
            sig: signature,
            derivedVia: 'web3.eth.personal.sign',
            signedMessage: message,
            address: await signer.getAddress(),
          };
        },
      });
      
      return sessionSigs;
    }
    
    throw new Error(
      'No wallet available. In browser, ensure MetaMask or similar is connected. ' +
      'In Node.js, pass pre-generated sessionSigs to signPayment().'
    );
  }
  
  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[LitCryptoSigner]', ...args);
    }
  }
}

/**
 * Helper function to check if a session has PKP identity
 * @deprecated Spending limits are enforced server-side. This checks for audit trail only.
 */
export function requiresLitSigning(session: { crypto_enforced?: boolean; mint_pkp?: boolean }): boolean {
  return session.crypto_enforced === true || session.mint_pkp === true;
}

export function encodeTransactionForLit(transaction: Uint8Array | Buffer): string {
  const bytes = transaction instanceof Uint8Array ? transaction : new Uint8Array(transaction);
  return btoa(String.fromCharCode(...bytes));
}

export function decodeSignatureFromLit(result: SignPaymentResult): Uint8Array | null {
  if (!result.success || !result.signature) {
    return null;
  }
  
  const hex = result.signature.startsWith('0x') 
    ? result.signature.slice(2) 
    : result.signature;
    
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  
  return bytes;
}
