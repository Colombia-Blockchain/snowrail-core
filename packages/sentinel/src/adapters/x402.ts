/**
 * @snowrail/sentinel - X402 Facilitator Adapter
 * Implementation of X402FacilitatorPort for payment facilitation
 * 
 * USDC ONLY - No native token support by design
 * 
 * @author Colombia Blockchain
 * @license MIT
 */

import {
  X402FacilitatorPort,
  PaymentIntentRequest,
  PaymentIntent,
  AuthorizationData,
  PaymentReceipt,
  USDCConfig
} from '../ports';

// ============================================================================
// USDC CONFIGURATION BY CHAIN
// ============================================================================

export const USDC_CONFIG: Record<string, USDCConfig> = {
  'avalanche-fuji': {
    chainId: 43113,
    chainName: 'Avalanche Fuji Testnet',
    tokenAddress: '0x5425890298aed601595a70AB815c96711a31Bc65', // USDC on Fuji
    decimals: 6,
    treasuryAddress: '', // Set after deployment
    mixerAddress: ''     // Set after deployment
  },
  'avalanche-mainnet': {
    chainId: 43114,
    chainName: 'Avalanche C-Chain',
    tokenAddress: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', // Native USDC
    decimals: 6
  },
  'localhost': {
    chainId: 31337,
    chainName: 'Localhost',
    tokenAddress: '', // MockUSDC - set after deployment
    decimals: 6,
    treasuryAddress: '',
    mixerAddress: ''
  }
};

// ============================================================================
// X402 FACILITATOR ADAPTER
// ============================================================================

export class X402FacilitatorAdapter implements X402FacilitatorPort {
  private intents: Map<string, PaymentIntent> = new Map();
  private config: USDCConfig;

  constructor(chain: string = 'avalanche-fuji') {
    const chainConfig = USDC_CONFIG[chain];
    if (!chainConfig) {
      throw new Error(`Unsupported chain: ${chain}. Supported: ${Object.keys(USDC_CONFIG).join(', ')}`);
    }
    this.config = chainConfig;
  }

  /**
   * Create a payment intent after trust validation passes
   * Intent is valid for 5 minutes
   */
  async createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntent> {
    // Validate token is USDC
    if (request.token.toLowerCase() !== this.config.tokenAddress.toLowerCase() && 
        request.currency.toUpperCase() !== 'USDC') {
      throw new Error('Only USDC payments are supported. Native tokens are not allowed.');
    }

    const intentId = `intent_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const intent: PaymentIntent = {
      id: intentId,
      status: 'pending',
      amount: request.amount,
      currency: 'USDC',
      token: this.config.tokenAddress,
      chain: request.chain,
      sender: request.sender,
      recipient: request.recipient,
      expiresAt
    };

    this.intents.set(intentId, intent);
    return intent;
  }

  /**
   * Sign authorization for USDC transfer using EIP-712
   * Uses transferWithAuthorization pattern (EIP-3009)
   */
  async signAuthorization(intent: PaymentIntent): Promise<AuthorizationData> {
    const storedIntent = this.intents.get(intent.id);
    if (!storedIntent) {
      throw new Error(`Intent not found: ${intent.id}`);
    }

    if (new Date() > storedIntent.expiresAt) {
      storedIntent.status = 'expired';
      throw new Error('Intent expired');
    }

    // EIP-712 domain for USDC transferWithAuthorization
    const domain = {
      name: 'USD Coin',
      version: '2',
      chainId: this.config.chainId,
      verifyingContract: this.config.tokenAddress
    };

    // EIP-3009 TransferWithAuthorization message
    const validAfter = Math.floor(Date.now() / 1000);
    const validBefore = Math.floor(storedIntent.expiresAt.getTime() / 1000);
    const nonce = `0x${Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex')}`;

    const message = {
      from: storedIntent.sender,
      to: storedIntent.recipient,
      value: BigInt(storedIntent.amount * 10 ** this.config.decimals).toString(),
      validAfter,
      validBefore,
      nonce
    };

    const authorization: AuthorizationData = {
      type: 'transferWithAuthorization',
      domain,
      message
      // signature will be added by the client wallet
    };

    storedIntent.authorization = authorization;
    storedIntent.status = 'ready';

    return authorization;
  }

  /**
   * Verify a payment receipt after execution
   */
  async verifyReceipt(receipt: PaymentReceipt): Promise<boolean> {
    const intent = this.intents.get(receipt.intentId);
    if (!intent) {
      return false;
    }

    // Basic validation
    if (receipt.status !== 'confirmed') {
      return false;
    }

    if (receipt.amount !== intent.amount) {
      return false;
    }

    if (receipt.token.toLowerCase() !== intent.token.toLowerCase()) {
      return false;
    }

    // In production, verify txHash on-chain
    // For now, trust the receipt if basic validation passes
    return true;
  }

  /**
   * Get intent status
   */
  async getIntentStatus(intentId: string): Promise<PaymentIntent> {
    const intent = this.intents.get(intentId);
    if (!intent) {
      throw new Error(`Intent not found: ${intentId}`);
    }

    // Check expiration
    if (intent.status === 'pending' && new Date() > intent.expiresAt) {
      intent.status = 'expired';
    }

    return intent;
  }

  /**
   * Get USDC config for current chain
   */
  getUSDCConfig(): USDCConfig {
    return this.config;
  }

  /**
   * Update contract addresses after deployment
   */
  setContractAddresses(addresses: { 
    token?: string; 
    treasury?: string; 
    mixer?: string 
  }): void {
    if (addresses.token) this.config.tokenAddress = addresses.token;
    if (addresses.treasury) this.config.treasuryAddress = addresses.treasury;
    if (addresses.mixer) this.config.mixerAddress = addresses.mixer;
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createX402Facilitator(chain: string = 'avalanche-fuji'): X402FacilitatorAdapter {
  return new X402FacilitatorAdapter(chain);
}
