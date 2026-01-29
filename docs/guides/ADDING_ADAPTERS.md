# Adding Payment Adapters

Learn how to create adapters for new payment protocols.

## Table of Contents

- [What is an Adapter?](#what-is-an-adapter)
- [Adapter Interface](#adapter-interface)
- [Step-by-Step Guide](#step-by-step-guide)
- [Real Example: X402Adapter](#real-example-x402adapter)
- [Testing Your Adapter](#testing-your-adapter)
- [Best Practices](#best-practices)
- [Advanced Topics](#advanced-topics)

---

## What is an Adapter?

Adapters integrate external payment systems with SnowRail's core. They implement the hexagonal architecture pattern, keeping business logic separate from infrastructure.

**Current Adapters:**
- **X402Adapter** - HTTP 402 payment protocol with EIP-712 signatures
- **ERC8004Adapter** - Agent identity protocol (stub)

**Adapter Purpose:**

```
Core (Sentinel) → Port Interface → Adapter → External System
```

Adapters allow you to:
- Add new payment protocols (Lightning, Solana, etc.)
- Integrate with different chains (Ethereum, Polygon, etc.)
- Support various token standards (ERC-20, ERC-721, etc.)
- Connect to external services (Stripe, PayPal, etc.)

---

## Adapter Interface

All payment adapters implement the `PaymentFacilitatorPort` interface:

```typescript
export interface PaymentFacilitatorPort {
  /**
   * Create a payment intent
   */
  createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntent>;

  /**
   * Sign authorization for payment
   */
  signAuthorization(intent: PaymentIntent): Promise<AuthorizationData>;

  /**
   * Verify payment receipt
   */
  verifyReceipt(receipt: PaymentReceipt): Promise<boolean>;

  /**
   * Get intent status
   */
  getIntentStatus(intentId: string): Promise<PaymentIntent>;

  /**
   * Get USDC configuration for the chain
   */
  getUSDCConfig(): USDCConfig;
}
```

**Key Types:**

```typescript
export interface PaymentIntentRequest {
  url: string;
  amount: number;
  currency: string;
  token: string;
  chain: string;
  sender: string;
  recipient: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentIntent {
  id: string;
  status: 'pending' | 'completed' | 'failed' | 'expired';
  amount: number;
  currency: string;
  token: string;
  chain: string;
  sender: string;
  recipient: string;
  expiresAt: Date;
  authorization?: AuthorizationData;
}

export interface AuthorizationData {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  types: Record<string, Array<{ name: string; type: string }>>;
  message: Record<string, unknown>;
}
```

---

## Step-by-Step Guide

### Step 1: Define the Adapter

Create a new file in `packages/sentinel/src/adapters/`:

**File:** `packages/sentinel/src/adapters/lightning/LightningAdapter.ts`

```typescript
import {
  PaymentFacilitatorPort,
  PaymentIntentRequest,
  PaymentIntent,
  AuthorizationData,
  PaymentReceipt,
  USDCConfig
} from '../../ports';

export class LightningAdapter implements PaymentFacilitatorPort {
  private intents: Map<string, PaymentIntent> = new Map();
  private config: LightningConfig;

  constructor(config: LightningConfig) {
    this.config = config;
  }

  async createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntent> {
    // Generate Lightning invoice
    const intentId = this.generateIntentId();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Create Lightning invoice
    const invoice = await this.createInvoice({
      amount: request.amount,
      description: `Payment to ${request.recipient}`,
      expiry: 300 // 5 minutes
    });

    const intent: PaymentIntent = {
      id: intentId,
      status: 'pending',
      amount: request.amount,
      currency: request.currency,
      token: request.token,
      chain: 'lightning',
      sender: request.sender,
      recipient: request.recipient,
      expiresAt,
      authorization: {
        invoice, // Lightning-specific
        paymentHash: invoice.paymentHash
      }
    };

    this.intents.set(intentId, intent);
    return intent;
  }

  async signAuthorization(intent: PaymentIntent): Promise<AuthorizationData> {
    // Lightning doesn't need EIP-712 signing
    // Return invoice data instead
    return {
      invoice: intent.authorization?.invoice,
      paymentHash: intent.authorization?.paymentHash,
      expiresAt: intent.expiresAt
    } as unknown as AuthorizationData;
  }

  async verifyReceipt(receipt: PaymentReceipt): Promise<boolean> {
    // Verify Lightning payment
    const paymentHash = receipt.txHash; // Lightning payment hash
    const payment = await this.getPayment(paymentHash);

    return payment.settled && payment.value === receipt.amount;
  }

  async getIntentStatus(intentId: string): Promise<PaymentIntent> {
    const intent = this.intents.get(intentId);

    if (!intent) {
      throw new Error(`Intent not found: ${intentId}`);
    }

    // Check if expired
    if (new Date() > intent.expiresAt) {
      intent.status = 'expired';
    }

    return intent;
  }

  getUSDCConfig(): USDCConfig {
    // Lightning doesn't use USDC
    // Return equivalent config
    return {
      chainId: 0,
      chainName: 'Lightning Network',
      tokenAddress: '',
      decimals: 8 // Bitcoin decimals
    };
  }

  // Lightning-specific methods
  private async createInvoice(params: InvoiceParams): Promise<Invoice> {
    // Connect to Lightning node and create invoice
    // Implementation depends on your Lightning setup (LND, c-lightning, etc.)
    const response = await fetch(`${this.config.nodeUrl}/v1/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Grpc-Metadata-macaroon': this.config.macaroon
      },
      body: JSON.stringify({
        value: params.amount,
        memo: params.description,
        expiry: params.expiry
      })
    });

    const data = await response.json();
    return {
      paymentRequest: data.payment_request,
      paymentHash: data.r_hash,
      addIndex: data.add_index
    };
  }

  private async getPayment(paymentHash: string): Promise<Payment> {
    // Query payment status from Lightning node
    const response = await fetch(
      `${this.config.nodeUrl}/v1/invoice/${paymentHash}`,
      {
        headers: {
          'Grpc-Metadata-macaroon': this.config.macaroon
        }
      }
    );

    return await response.json();
  }

  private generateIntentId(): string {
    return `lightning_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}

// Configuration type
interface LightningConfig {
  nodeUrl: string;
  macaroon: string;
}

interface InvoiceParams {
  amount: number;
  description: string;
  expiry: number;
}

interface Invoice {
  paymentRequest: string;
  paymentHash: string;
  addIndex: string;
}

interface Payment {
  settled: boolean;
  value: number;
}
```

### Step 2: Export the Adapter

**File:** `packages/sentinel/src/adapters/index.ts`

```typescript
export { X402FacilitatorAdapter } from './x402';
export { ERC8004Adapter } from './erc8004';
export { LightningAdapter } from './lightning/LightningAdapter';

// Export factory functions
export { createX402Facilitator } from './x402';
export { createLightningFacilitator } from './lightning/factory';
```

### Step 3: Create Factory Function

**File:** `packages/sentinel/src/adapters/lightning/factory.ts`

```typescript
import { LightningAdapter } from './LightningAdapter';

export function createLightningFacilitator(nodeUrl: string, macaroon: string): LightningAdapter {
  return new LightningAdapter({
    nodeUrl,
    macaroon
  });
}
```

### Step 4: Register in Backend

Use your adapter in the backend:

**File:** `apps/backend/src/server.ts`

```typescript
import { createLightningFacilitator } from '@snowrail/sentinel/adapters';

// Create Lightning adapter
const lightning = createLightningFacilitator(
  process.env.LIGHTNING_NODE_URL,
  process.env.LIGHTNING_MACAROON
);

// Add endpoint
app.post('/v1/payments/lightning/intent', async (req, res) => {
  const { url, amount, sender, recipient } = req.body;

  // Validate with SENTINEL
  const validation = await sentinel.validate({ url, amount });

  if (!validation.canPay) {
    return res.status(403).json({
      error: 'Payment blocked by SENTINEL',
      trustScore: validation.trustScore
    });
  }

  // Create Lightning intent
  const intent = await lightning.createPaymentIntent({
    url,
    amount,
    currency: 'BTC',
    token: '',
    chain: 'lightning',
    sender,
    recipient
  });

  return res.json({ intent, validation });
});
```

### Step 5: Write Tests

**File:** `packages/sentinel/src/__tests__/LightningAdapter.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { LightningAdapter } from '../adapters/lightning/LightningAdapter';

describe('LightningAdapter', () => {
  let adapter: LightningAdapter;

  beforeEach(() => {
    adapter = new LightningAdapter({
      nodeUrl: 'http://localhost:8080',
      macaroon: 'test_macaroon'
    });
  });

  describe('createPaymentIntent', () => {
    it('should create Lightning invoice', async () => {
      const intent = await adapter.createPaymentIntent({
        url: 'https://merchant.com',
        amount: 1000,
        currency: 'BTC',
        token: '',
        chain: 'lightning',
        sender: 'sender@lightning',
        recipient: 'recipient@lightning'
      });

      expect(intent).toHaveProperty('id');
      expect(intent.status).toBe('pending');
      expect(intent.amount).toBe(1000);
      expect(intent.authorization).toHaveProperty('invoice');
    });

    it('should set 5-minute expiry', async () => {
      const intent = await adapter.createPaymentIntent({
        /* ... */
      });

      const expiryTime = intent.expiresAt.getTime();
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      expect(expiryTime).toBeGreaterThan(now);
      expect(expiryTime).toBeLessThan(now + fiveMinutes + 1000);
    });
  });

  describe('verifyReceipt', () => {
    it('should verify settled Lightning payment', async () => {
      const verified = await adapter.verifyReceipt({
        intentId: 'lightning_123',
        txHash: 'payment_hash_123',
        status: 'confirmed',
        amount: 1000,
        token: '',
        chain: 'lightning',
        timestamp: new Date()
      });

      expect(verified).toBe(true);
    });
  });
});
```

---

## Real Example: X402Adapter

Here's how the actual `X402FacilitatorAdapter` is implemented:

**File:** `packages/sentinel/src/adapters/x402.ts`

```typescript
import {
  X402FacilitatorPort,
  PaymentIntentRequest,
  PaymentIntent,
  AuthorizationData,
  PaymentReceipt,
  USDCConfig
} from '../ports';

// USDC configuration by chain
export const USDC_CONFIG: Record<string, USDCConfig> = {
  'avalanche-fuji': {
    chainId: 43113,
    chainName: 'Avalanche Fuji Testnet',
    tokenAddress: '0x5425890298aed601595a70AB815c96711a31Bc65',
    decimals: 6,
    treasuryAddress: '',
    mixerAddress: ''
  },
  'avalanche-mainnet': {
    chainId: 43114,
    chainName: 'Avalanche C-Chain',
    tokenAddress: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    decimals: 6
  }
};

export class X402FacilitatorAdapter implements X402FacilitatorPort {
  private intents: Map<string, PaymentIntent> = new Map();
  private config: USDCConfig;

  constructor(chain: string = 'avalanche-fuji') {
    const chainConfig = USDC_CONFIG[chain];
    if (!chainConfig) {
      throw new Error(`Unsupported chain: ${chain}`);
    }
    this.config = chainConfig;
  }

  async createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntent> {
    // Validate USDC only
    if (request.currency.toUpperCase() !== 'USDC') {
      throw new Error('Only USDC payments are supported');
    }

    const intentId = `intent_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

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

  async signAuthorization(intent: PaymentIntent): Promise<AuthorizationData> {
    const storedIntent = this.intents.get(intent.id);

    if (!storedIntent) {
      throw new Error(`Intent not found: ${intent.id}`);
    }

    // Generate EIP-712 authorization
    const nonce = this.generateNonce();
    const validBefore = Math.floor(intent.expiresAt.getTime() / 1000);

    const authorization: AuthorizationData = {
      domain: {
        name: 'USD Coin',
        version: '2',
        chainId: this.config.chainId,
        verifyingContract: this.config.tokenAddress
      },
      types: {
        TransferWithAuthorization: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'validAfter', type: 'uint256' },
          { name: 'validBefore', type: 'uint256' },
          { name: 'nonce', type: 'bytes32' }
        ]
      },
      message: {
        from: intent.sender,
        to: intent.recipient,
        value: (intent.amount * 10 ** this.config.decimals).toString(),
        validAfter: 0,
        validBefore,
        nonce
      }
    };

    // Store authorization in intent
    storedIntent.authorization = authorization;
    return authorization;
  }

  async verifyReceipt(receipt: PaymentReceipt): Promise<boolean> {
    // In production, verify on-chain transaction
    // For now, basic validation
    return (
      receipt.status === 'confirmed' &&
      receipt.amount > 0 &&
      receipt.txHash.startsWith('0x')
    );
  }

  async getIntentStatus(intentId: string): Promise<PaymentIntent> {
    const intent = this.intents.get(intentId);

    if (!intent) {
      throw new Error(`Intent not found: ${intentId}`);
    }

    if (new Date() > intent.expiresAt) {
      intent.status = 'expired';
    }

    return intent;
  }

  getUSDCConfig(): USDCConfig {
    return this.config;
  }

  setContractAddresses(addresses: {
    token?: string;
    treasury?: string;
    mixer?: string;
  }): void {
    if (addresses.token) this.config.tokenAddress = addresses.token;
    if (addresses.treasury) this.config.treasuryAddress = addresses.treasury;
    if (addresses.mixer) this.config.mixerAddress = addresses.mixer;
  }

  private generateNonce(): string {
    const random = Math.random().toString().slice(2);
    const timestamp = Date.now().toString();
    const nonce = (random + timestamp).padEnd(64, '0').slice(0, 64);
    return '0x' + nonce;
  }
}

// Factory function
export function createX402Facilitator(chain: string = 'avalanche-fuji'): X402FacilitatorAdapter {
  return new X402FacilitatorAdapter(chain);
}
```

**Key Features:**

1. **Chain Configuration**: Supports multiple chains (Fuji, Mainnet)
2. **USDC Only**: Enforces USDC payments by design
3. **EIP-712 Signing**: Generates standard authorization data
4. **5-Minute Expiry**: Intents expire after 5 minutes
5. **Factory Pattern**: Easy instantiation with `createX402Facilitator()`

---

## Testing Your Adapter

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { LightningAdapter } from '../adapters/lightning/LightningAdapter';

describe('LightningAdapter', () => {
  describe('Intent Creation', () => {
    it('should create valid intent', async () => {
      const adapter = new LightningAdapter(config);
      const intent = await adapter.createPaymentIntent({
        url: 'https://merchant.com',
        amount: 100,
        currency: 'BTC',
        /* ... */
      });

      expect(intent.id).toBeTruthy();
      expect(intent.status).toBe('pending');
    });
  });

  describe('Authorization', () => {
    it('should generate Lightning invoice', async () => {
      const adapter = new LightningAdapter(config);
      const intent = await adapter.createPaymentIntent({/* ... */});
      const auth = await adapter.signAuthorization(intent);

      expect(auth).toHaveProperty('invoice');
      expect(auth).toHaveProperty('paymentHash');
    });
  });

  describe('Receipt Verification', () => {
    it('should verify settled payments', async () => {
      const adapter = new LightningAdapter(config);
      const verified = await adapter.verifyReceipt({
        txHash: 'payment_hash',
        /* ... */
      });

      expect(verified).toBe(true);
    });
  });
});
```

### Integration Tests

```typescript
import { createSentinel } from '@snowrail/sentinel';
import { LightningAdapter } from '@snowrail/sentinel/adapters';

describe('Lightning Integration', () => {
  it('should complete E2E flow', async () => {
    const sentinel = createSentinel();
    const lightning = new LightningAdapter(config);

    // 1. Validate
    const validation = await sentinel.validate({
      url: 'https://merchant.com',
      amount: 100
    });
    expect(validation.canPay).toBe(true);

    // 2. Create intent
    const intent = await lightning.createPaymentIntent({
      url: 'https://merchant.com',
      amount: 100,
      currency: 'BTC',
      chain: 'lightning',
      sender: 'alice',
      recipient: 'bob'
    });
    expect(intent.id).toBeTruthy();

    // 3. Get authorization
    const auth = await lightning.signAuthorization(intent);
    expect(auth.invoice).toBeTruthy();

    // 4. Verify receipt (after payment)
    const verified = await lightning.verifyReceipt({
      intentId: intent.id,
      txHash: 'payment_hash',
      status: 'confirmed',
      amount: 100,
      token: '',
      chain: 'lightning',
      timestamp: new Date()
    });
    expect(verified).toBe(true);
  });
});
```

---

## Best Practices

### 1. Implement All Interface Methods

Don't leave methods empty:

```typescript
// ❌ BAD: Empty implementation
async verifyReceipt(receipt: PaymentReceipt): Promise<boolean> {
  return true; // Always returns true!
}

// ✅ GOOD: Actual verification
async verifyReceipt(receipt: PaymentReceipt): Promise<boolean> {
  const payment = await this.getPaymentFromChain(receipt.txHash);
  return payment.settled && payment.amount === receipt.amount;
}
```

### 2. Handle Chain-Specific Logic

```typescript
class MultiChainAdapter implements PaymentFacilitatorPort {
  constructor(private chain: string) {}

  async createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntent> {
    // Chain-specific logic
    switch (this.chain) {
      case 'ethereum':
        return this.createEthereumIntent(request);
      case 'solana':
        return this.createSolanaIntent(request);
      case 'lightning':
        return this.createLightningIntent(request);
      default:
        throw new Error(`Unsupported chain: ${this.chain}`);
    }
  }
}
```

### 3. Add Proper Error Handling

```typescript
async createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntent> {
  try {
    // Validate inputs
    if (!request.amount || request.amount <= 0) {
      throw new Error('Invalid amount');
    }

    if (!this.isValidAddress(request.sender)) {
      throw new Error('Invalid sender address');
    }

    // Create intent
    const intent = await this.doCreateIntent(request);
    return intent;

  } catch (error) {
    console.error('Failed to create intent:', error);
    throw new Error(`Intent creation failed: ${error.message}`);
  }
}
```

### 4. Use Configuration Objects

```typescript
interface AdapterConfig {
  chainId: number;
  rpcUrl: string;
  tokenAddress: string;
  timeout: number;
  retries: number;
}

class MyAdapter implements PaymentFacilitatorPort {
  constructor(private config: AdapterConfig) {
    this.validateConfig(config);
  }

  private validateConfig(config: AdapterConfig): void {
    if (!config.rpcUrl) throw new Error('RPC URL required');
    if (!config.tokenAddress) throw new Error('Token address required');
  }
}
```

### 5. Implement Timeouts

```typescript
async createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntent> {
  const timeout = 10000; // 10 seconds

  const intentPromise = this.doCreateIntent(request);
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Intent creation timeout')), timeout)
  );

  return Promise.race([intentPromise, timeoutPromise]) as Promise<PaymentIntent>;
}
```

---

## Advanced Topics

### Supporting Multiple Token Standards

```typescript
interface TokenConfig {
  standard: 'ERC-20' | 'ERC-721' | 'ERC-1155';
  address: string;
  decimals?: number;
}

class MultiTokenAdapter implements PaymentFacilitatorPort {
  async createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntent> {
    const token = this.getTokenConfig(request.token);

    switch (token.standard) {
      case 'ERC-20':
        return this.createERC20Intent(request, token);
      case 'ERC-721':
        return this.createNFTIntent(request, token);
      case 'ERC-1155':
        return this.createMultiTokenIntent(request, token);
    }
  }
}
```

### Cross-Chain Bridges

```typescript
class BridgeAdapter implements PaymentFacilitatorPort {
  async createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntent> {
    // Determine if bridging is needed
    const sourceCh ain = this.detectChain(request.sender);
    const targetChain = request.chain;

    if (sourceChain !== targetChain) {
      // Create bridge intent
      return this.createBridgeIntent(request, sourceChain, targetChain);
    } else {
      // Direct payment
      return this.createDirectIntent(request);
    }
  }

  private async createBridgeIntent(
    request: PaymentIntentRequest,
    from: string,
    to: string
  ): Promise<PaymentIntent> {
    // Bridge logic here
    // e.g., Wormhole, LayerZero, Axelar
  }
}
```

### Gasless Transactions (Meta-Transactions)

```typescript
class GaslessAdapter implements PaymentFacilitatorPort {
  async signAuthorization(intent: PaymentIntent): Promise<AuthorizationData> {
    // Use EIP-2771 for gasless transactions
    return {
      domain: {
        name: 'MinimalForwarder',
        version: '0.0.1',
        chainId: this.chainId,
        verifyingContract: this.forwarderAddress
      },
      types: {
        ForwardRequest: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'gas', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'data', type: 'bytes' }
        ]
      },
      message: {
        from: intent.sender,
        to: intent.recipient,
        value: '0',
        gas: '100000',
        nonce: await this.getNonce(intent.sender),
        data: this.encodeTransfer(intent)
      }
    };
  }
}
```

---

## Troubleshooting

### Adapter Not Found

**Issue:** `Cannot find module '@snowrail/sentinel/adapters'`

**Solution:**
1. Rebuild package: `pnpm --filter @snowrail/sentinel build`
2. Check exports in `adapters/index.ts`
3. Verify import path

### Chain Configuration Error

**Issue:** `Unsupported chain: xyz`

**Solution:**
```typescript
// Add chain to config
export const CHAIN_CONFIG = {
  'xyz': {
    chainId: 123,
    tokenAddress: '0x...',
    decimals: 18
  }
};
```

### Intent Expiry Issues

**Issue:** Intents expire too quickly

**Solution:**
```typescript
// Adjust expiry time
const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
```

---

## Next Steps

- [Adding Checks](./ADDING_CHECKS.md) - Create security checks
- [Integration Guide](./INTEGRATION.md) - Integrate SnowRail in your app
- [API Reference](../api/ENDPOINTS.md) - Complete API documentation

---

**Questions?** Open an issue on [GitHub](https://github.com/Colombia-Blockchain/snowrail-core/issues)

**Last Updated**: 2026-01-29
