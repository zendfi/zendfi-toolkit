/**
 * Wallet Connector
 * Simplifies integration with Solana wallets (Phantom, Solflare, Backpack, etc.)
 * 
 * @example
 * ```typescript
 * import { WalletConnector } from '@zendfi/sdk/helpers';
 * 
 * // Auto-detect and connect
 * const wallet = await WalletConnector.detectAndConnect();
 * console.log(`Connected: ${wallet.address}`);
 * console.log(`Provider: ${wallet.provider}`);
 * 
 * // Sign transaction
 * const result = await wallet.signTransaction(transaction);
 * 
 * // Disconnect
 * await wallet.disconnect();
 * ```
 */

export interface ConnectedWallet {
  address: string;
  provider: 'phantom' | 'solflare' | 'backpack' | 'coinbase' | 'trust' | 'unknown';
  publicKey: any; // Solana PublicKey
  signTransaction: (tx: any) => Promise<any>;
  signAllTransactions: (txs: any[]) => Promise<any[]>;
  signMessage: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
  disconnect: () => Promise<void>;
  isConnected: () => boolean;
  raw: any; // Original wallet adapter
}

export interface WalletConnectorConfig {
  /** Preferred wallet provider (if multiple detected) */
  preferredProvider?: 'phantom' | 'solflare' | 'backpack' | 'coinbase' | 'trust';
  /** Auto-connect on page load if previously connected */
  autoConnect?: boolean;
  /** Show connection UI if no wallet detected */
  showInstallPrompt?: boolean;
  /** Network (mainnet-beta, devnet, testnet) */
  network?: string;
}

/**
 * Wallet Connector
 * Detects and connects to Solana wallets
 */
export class WalletConnector {
  private static connectedWallet: ConnectedWallet | null = null;

  /**
   * Detect and connect to a Solana wallet
   */
  static async detectAndConnect(config: WalletConnectorConfig = {}): Promise<ConnectedWallet> {
    // Check if already connected
    if (this.connectedWallet && this.connectedWallet.isConnected()) {
      return this.connectedWallet;
    }

    // Detect available wallets
    const detected = this.detectWallets();

    if (detected.length === 0) {
      if (config.showInstallPrompt !== false) {
        this.showInstallPrompt();
      }
      throw new Error('No Solana wallet detected. Please install Phantom, Solflare, or Backpack.');
    }

    // Select wallet (prefer user's choice or first available)
    let selectedProvider: 'phantom' | 'solflare' | 'backpack' | 'coinbase' | 'trust' = detected[0]!;
    if (config.preferredProvider && detected.includes(config.preferredProvider)) {
      selectedProvider = config.preferredProvider;
    }

    // Connect to wallet
    const wallet = await this.connectToProvider(selectedProvider);
    this.connectedWallet = wallet;

    return wallet;
  }

  /**
   * Detect available Solana wallets
   */
  static detectWallets(): Array<'phantom' | 'solflare' | 'backpack' | 'coinbase' | 'trust'> {
    const detected: Array<'phantom' | 'solflare' | 'backpack' | 'coinbase' | 'trust'> = [];

    if (typeof window === 'undefined') return detected;

    // @ts-ignore
    if (window.solana?.isPhantom) detected.push('phantom');
    // @ts-ignore
    if (window.solflare?.isSolflare) detected.push('solflare');
    // @ts-ignore
    if (window.backpack?.isBackpack) detected.push('backpack');
    // @ts-ignore
    if (window.coinbaseSolana) detected.push('coinbase');
    // @ts-ignore
    if (window.trustwallet?.solana) detected.push('trust');

    return detected;
  }

  /**
   * Connect to a specific wallet provider
   */
  static async connectToProvider(
    provider: 'phantom' | 'solflare' | 'backpack' | 'coinbase' | 'trust'
  ): Promise<ConnectedWallet> {
    if (typeof window === 'undefined') {
      throw new Error('Wallet connection only works in browser environment');
    }

    let adapter: any;

    switch (provider) {
      case 'phantom':
        // @ts-ignore
        adapter = window.solana;
        if (!adapter?.isPhantom) {
          throw new Error('Phantom wallet not found');
        }
        break;

      case 'solflare':
        // @ts-ignore
        adapter = window.solflare;
        if (!adapter?.isSolflare) {
          throw new Error('Solflare wallet not found');
        }
        break;

      case 'backpack':
        // @ts-ignore
        adapter = window.backpack;
        if (!adapter?.isBackpack) {
          throw new Error('Backpack wallet not found');
        }
        break;

      case 'coinbase':
        // @ts-ignore
        adapter = window.coinbaseSolana;
        if (!adapter) {
          throw new Error('Coinbase Wallet not found');
        }
        break;

      case 'trust':
        // @ts-ignore
        adapter = window.trustwallet?.solana;
        if (!adapter) {
          throw new Error('Trust Wallet not found');
        }
        break;

      default:
        throw new Error(`Unknown wallet provider: ${provider}`);
    }

    // Connect
    try {
      const response = await adapter.connect();
      const publicKey = response.publicKey || adapter.publicKey;

      if (!publicKey) {
        throw new Error('Failed to get wallet public key');
      }

      const connectedWallet: ConnectedWallet = {
        address: publicKey.toString(),
        provider,
        publicKey,
        signTransaction: async (tx: any) => {
          return await adapter.signTransaction(tx);
        },
        signAllTransactions: async (txs: any[]) => {
          if (adapter.signAllTransactions) {
            return await adapter.signAllTransactions(txs);
          }
          // Fallback: sign one by one
          const signed = [];
          for (const tx of txs) {
            signed.push(await adapter.signTransaction(tx));
          }
          return signed;
        },
        signMessage: async (message: Uint8Array) => {
          if (adapter.signMessage) {
            return await adapter.signMessage(message);
          }
          throw new Error(`${provider} does not support message signing`);
        },
        disconnect: async () => {
          if (adapter.disconnect) {
            await adapter.disconnect();
          }
          WalletConnector.connectedWallet = null;
        },
        isConnected: () => {
          return adapter.isConnected ?? false;
        },
        raw: adapter,
      };

      return connectedWallet;
    } catch (error: any) {
      throw new Error(`Failed to connect to ${provider}: ${error.message}`);
    }
  }

  /**
   * Sign and submit a transaction
   */
  static async signAndSubmit(
    transaction: any,
    wallet: ConnectedWallet,
    connection: any // Solana Connection
  ): Promise<{ signature: string }> {
    // Sign transaction
    const signedTx = await wallet.signTransaction(transaction);

    // Submit to network
    const signature = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    return { signature };
  }

  /**
   * Get current connected wallet
   */
  static getConnectedWallet(): ConnectedWallet | null {
    return this.connectedWallet;
  }

  /**
   * Disconnect current wallet
   */
  static async disconnect(): Promise<void> {
    if (this.connectedWallet) {
      await this.connectedWallet.disconnect();
      this.connectedWallet = null;
    }
  }

  /**
   * Listen for wallet connection changes
   */
  static onAccountChange(callback: (publicKey: any) => void): () => void {
    if (typeof window === 'undefined') {
      return () => {};
    }

    // Try all wallet providers
    const cleanupFns: Array<() => void> = [];

    // @ts-ignore
    if (window.solana?.on) {
      // @ts-ignore
      window.solana.on('accountChanged', callback);
      cleanupFns.push(() => {
        // @ts-ignore
        window.solana?.removeListener('accountChanged', callback);
      });
    }

    // @ts-ignore
    if (window.solflare?.on) {
      // @ts-ignore
      window.solflare.on('accountChanged', callback);
      cleanupFns.push(() => {
        // @ts-ignore
        window.solflare?.removeListener('accountChanged', callback);
      });
    }

    // Return cleanup function
    return () => {
      cleanupFns.forEach(fn => fn());
    };
  }

  /**
   * Listen for wallet disconnection
   */
  static onDisconnect(callback: () => void): () => void {
    if (typeof window === 'undefined') {
      return () => {};
    }

    const cleanupFns: Array<() => void> = [];

    // @ts-ignore
    if (window.solana?.on) {
      // @ts-ignore
      window.solana.on('disconnect', callback);
      cleanupFns.push(() => {
        // @ts-ignore
        window.solana?.removeListener('disconnect', callback);
      });
    }

    // @ts-ignore
    if (window.solflare?.on) {
      // @ts-ignore
      window.solflare.on('disconnect', callback);
      cleanupFns.push(() => {
        // @ts-ignore
        window.solflare?.removeListener('disconnect', callback);
      });
    }

    return () => {
      cleanupFns.forEach(fn => fn());
    };
  }

  /**
   * Show install prompt UI
   */
  private static showInstallPrompt(): void {
    const message = `
No Solana wallet detected!

Install one of these wallets:
• Phantom: https://phantom.app
• Solflare: https://solflare.com
• Backpack: https://backpack.app
    `.trim();

    console.warn(message);

    // Try to show browser alert (if available)
    if (typeof window !== 'undefined') {
      const userChoice = window.confirm(
        'No Solana wallet detected.\n\nWould you like to install Phantom wallet?'
      );
      if (userChoice) {
        window.open('https://phantom.app', '_blank');
      }
    }
  }

  /**
   * Check if wallet is installed
   */
  static isWalletInstalled(provider: 'phantom' | 'solflare' | 'backpack' | 'coinbase' | 'trust'): boolean {
    return this.detectWallets().includes(provider);
  }

  /**
   * Get wallet download URL
   */
  static getWalletUrl(provider: 'phantom' | 'solflare' | 'backpack' | 'coinbase' | 'trust'): string {
    const urls = {
      phantom: 'https://phantom.app',
      solflare: 'https://solflare.com',
      backpack: 'https://backpack.app',
      coinbase: 'https://www.coinbase.com/wallet',
      trust: 'https://trustwallet.com',
    };
    return urls[provider];
  }
}

/**
 * React Hook for Wallet Connection (optional)
 * Export as separate module to avoid forcing React dependency
 */
export function createWalletHook() {
  // Only load React if available
  let useState: any;
  let useEffect: any;
  try {
    const React = require('react');
    useState = React.useState;
    useEffect = React.useEffect;
  } catch {
    throw new Error('React not found. Install react to use wallet hooks.');
  }

  return function useWallet() {
    const [wallet, setWallet] = useState(null as ConnectedWallet | null);
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState(null as Error | null);

    const connect = async (config?: WalletConnectorConfig) => {
      setConnecting(true);
      setError(null);
      try {
        const connected = await WalletConnector.detectAndConnect(config);
        setWallet(connected);
      } catch (err: any) {
        setError(err);
      } finally {
        setConnecting(false);
      }
    };

    const disconnect = async () => {
      await WalletConnector.disconnect();
      setWallet(null);
    };

    useEffect(() => {
      // Listen for account changes
      const cleanup = WalletConnector.onAccountChange((publicKey) => {
        if (wallet) {
          setWallet({ ...wallet, publicKey, address: publicKey.toString() });
        }
      });

      return cleanup;
    }, [wallet]);

    return {
      wallet,
      connecting,
      error,
      connect,
      disconnect,
      isConnected: wallet !== null,
    };
  };
}
