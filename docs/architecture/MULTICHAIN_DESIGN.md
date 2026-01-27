# SnowRail - Multichain Architecture Design

**Version:** 1.0.0
**Date:** 2026-01-27
**Status:** Design Document

---

## 1. Vision

SnowRail debe ser **chain-agnostic** en su core, permitiendo:
- Agregar nuevas chains sin modificar codigo del SDK
- Diferentes configuraciones de USDC por chain
- Contracts desplegados independientemente por chain
- Un unico backend sirviendo multiples chains

---

## 2. Arquitectura de Capas

```
┌─────────────────────────────────────────────────────────────────┐
│                        APPLICATION LAYER                         │
│                                                                  │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│   │   Backend    │    │   Frontend   │    │     CLI      │     │
│   │   (Express)  │    │   (React)    │    │   (Future)   │     │
│   └──────┬───────┘    └──────────────┘    └──────────────┘     │
│          │                                                       │
└──────────┼───────────────────────────────────────────────────────┘
           │
           │ imports
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                          SDK LAYER                               │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                   @snowrail/sentinel                     │   │
│   │                                                          │   │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │   │
│   │  │    CORE     │  │    PORTS    │  │  ADAPTERS   │     │   │
│   │  │   (Pure)    │◄─┤ (Interfaces)│◄─┤(Chain-aware)│     │   │
│   │  └─────────────┘  └─────────────┘  └─────────────┘     │   │
│   │                                                          │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
           │
           │ calls
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                       BLOCKCHAIN LAYER                           │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Avalanche   │  │   Ethereum   │  │   Polygon    │  ...     │
│  │    C-Chain   │  │   Mainnet    │  │   Mainnet    │          │
│  │              │  │              │  │              │          │
│  │ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌──────────┐ │          │
│  │ │ Treasury │ │  │ │ Treasury │ │  │ │ Treasury │ │          │
│  │ └──────────┘ │  │ └──────────┘ │  │ └──────────┘ │          │
│  │ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌──────────┐ │          │
│  │ │   USDC   │ │  │ │   USDC   │ │  │ │   USDC   │ │          │
│  │ └──────────┘ │  │ └──────────┘ │  │ └──────────┘ │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Chain Configuration Schema

### 3.1 Estructura de Configuracion

```typescript
// types/chain.ts

interface TokenConfig {
  address: string;
  decimals: number;
  symbol: string;
}

interface ContractAddresses {
  treasury?: string;
  mixer?: string;
  agentRegistry?: string;
}

interface ChainConfig {
  // Identity
  chainId: number;
  name: string;
  shortName: string;  // e.g., "avax", "eth", "matic"

  // Network
  rpcUrl: string;
  wsUrl?: string;
  explorer: string;

  // Native Token (for gas)
  nativeToken: {
    symbol: string;
    decimals: number;
  };

  // Stablecoins
  usdc: TokenConfig;
  usdt?: TokenConfig;  // Optional alternative

  // SnowRail Contracts
  contracts: ContractAddresses;

  // Features
  features: {
    eip1559: boolean;       // Supports EIP-1559 fees
    eip712: boolean;        // Supports typed signatures
    transferAuth: boolean;  // Supports EIP-3009
  };

  // Defaults
  defaults: {
    confirmations: number;
    gasMultiplier: number;
  };
}
```

### 3.2 Configuraciones por Chain

```json
// config/chains.json
{
  "avalanche-mainnet": {
    "chainId": 43114,
    "name": "Avalanche C-Chain",
    "shortName": "avax",
    "rpcUrl": "https://api.avax.network/ext/bc/C/rpc",
    "wsUrl": "wss://api.avax.network/ext/bc/C/ws",
    "explorer": "https://snowtrace.io",
    "nativeToken": {
      "symbol": "AVAX",
      "decimals": 18
    },
    "usdc": {
      "address": "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
      "decimals": 6,
      "symbol": "USDC"
    },
    "contracts": {
      "treasury": null,
      "mixer": null
    },
    "features": {
      "eip1559": true,
      "eip712": true,
      "transferAuth": true
    },
    "defaults": {
      "confirmations": 1,
      "gasMultiplier": 1.1
    }
  },

  "avalanche-fuji": {
    "chainId": 43113,
    "name": "Avalanche Fuji Testnet",
    "shortName": "fuji",
    "rpcUrl": "https://api.avax-test.network/ext/bc/C/rpc",
    "explorer": "https://testnet.snowtrace.io",
    "nativeToken": {
      "symbol": "AVAX",
      "decimals": 18
    },
    "usdc": {
      "address": "0x5425890298aed601595a70AB815c96711a31Bc65",
      "decimals": 6,
      "symbol": "USDC"
    },
    "contracts": {
      "treasury": null,
      "mixer": null
    },
    "features": {
      "eip1559": true,
      "eip712": true,
      "transferAuth": true
    },
    "defaults": {
      "confirmations": 1,
      "gasMultiplier": 1.2
    }
  },

  "ethereum-mainnet": {
    "chainId": 1,
    "name": "Ethereum Mainnet",
    "shortName": "eth",
    "rpcUrl": "https://eth.llamarpc.com",
    "explorer": "https://etherscan.io",
    "nativeToken": {
      "symbol": "ETH",
      "decimals": 18
    },
    "usdc": {
      "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      "decimals": 6,
      "symbol": "USDC"
    },
    "contracts": {
      "treasury": null
    },
    "features": {
      "eip1559": true,
      "eip712": true,
      "transferAuth": true
    },
    "defaults": {
      "confirmations": 2,
      "gasMultiplier": 1.1
    }
  },

  "polygon-mainnet": {
    "chainId": 137,
    "name": "Polygon PoS",
    "shortName": "matic",
    "rpcUrl": "https://polygon-rpc.com",
    "explorer": "https://polygonscan.com",
    "nativeToken": {
      "symbol": "MATIC",
      "decimals": 18
    },
    "usdc": {
      "address": "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
      "decimals": 6,
      "symbol": "USDC"
    },
    "contracts": {
      "treasury": null
    },
    "features": {
      "eip1559": true,
      "eip712": true,
      "transferAuth": true
    },
    "defaults": {
      "confirmations": 5,
      "gasMultiplier": 1.3
    }
  },

  "arbitrum-mainnet": {
    "chainId": 42161,
    "name": "Arbitrum One",
    "shortName": "arb",
    "rpcUrl": "https://arb1.arbitrum.io/rpc",
    "explorer": "https://arbiscan.io",
    "nativeToken": {
      "symbol": "ETH",
      "decimals": 18
    },
    "usdc": {
      "address": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      "decimals": 6,
      "symbol": "USDC"
    },
    "contracts": {
      "treasury": null
    },
    "features": {
      "eip1559": true,
      "eip712": true,
      "transferAuth": true
    },
    "defaults": {
      "confirmations": 1,
      "gasMultiplier": 1.0
    }
  },

  "base-mainnet": {
    "chainId": 8453,
    "name": "Base",
    "shortName": "base",
    "rpcUrl": "https://mainnet.base.org",
    "explorer": "https://basescan.org",
    "nativeToken": {
      "symbol": "ETH",
      "decimals": 18
    },
    "usdc": {
      "address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "decimals": 6,
      "symbol": "USDC"
    },
    "contracts": {
      "treasury": null
    },
    "features": {
      "eip1559": true,
      "eip712": true,
      "transferAuth": true
    },
    "defaults": {
      "confirmations": 1,
      "gasMultiplier": 1.0
    }
  },

  "localhost": {
    "chainId": 31337,
    "name": "Hardhat Local",
    "shortName": "local",
    "rpcUrl": "http://127.0.0.1:8545",
    "explorer": "",
    "nativeToken": {
      "symbol": "ETH",
      "decimals": 18
    },
    "usdc": {
      "address": "DEPLOY_ADDRESS",
      "decimals": 6,
      "symbol": "USDC"
    },
    "contracts": {
      "treasury": "DEPLOY_ADDRESS",
      "mixer": "DEPLOY_ADDRESS"
    },
    "features": {
      "eip1559": true,
      "eip712": true,
      "transferAuth": true
    },
    "defaults": {
      "confirmations": 1,
      "gasMultiplier": 1.0
    }
  }
}
```

---

## 4. Chain Registry Service

```typescript
// packages/sentinel/src/services/chain-registry.ts

import chainsConfig from '../../../config/chains.json';

export class ChainRegistry {
  private chains: Map<string, ChainConfig>;
  private byChainId: Map<number, ChainConfig>;

  constructor() {
    this.chains = new Map();
    this.byChainId = new Map();
    this.loadChains();
  }

  private loadChains(): void {
    for (const [key, config] of Object.entries(chainsConfig)) {
      this.chains.set(key, config as ChainConfig);
      this.byChainId.set(config.chainId, config as ChainConfig);
    }
  }

  /**
   * Get chain by name (e.g., "avalanche-fuji")
   */
  getChain(name: string): ChainConfig | undefined {
    return this.chains.get(name);
  }

  /**
   * Get chain by chainId (e.g., 43113)
   */
  getChainById(chainId: number): ChainConfig | undefined {
    return this.byChainId.get(chainId);
  }

  /**
   * List all supported chains
   */
  listChains(): string[] {
    return Array.from(this.chains.keys());
  }

  /**
   * List all mainnet chains
   */
  listMainnets(): string[] {
    return this.listChains().filter(name => !name.includes('testnet') && !name.includes('fuji') && name !== 'localhost');
  }

  /**
   * List all testnet chains
   */
  listTestnets(): string[] {
    return this.listChains().filter(name => name.includes('testnet') || name.includes('fuji'));
  }

  /**
   * Validate if a chain is supported
   */
  isSupported(name: string): boolean {
    return this.chains.has(name);
  }

  /**
   * Get USDC address for a chain
   */
  getUSDCAddress(chainName: string): string | undefined {
    return this.chains.get(chainName)?.usdc.address;
  }

  /**
   * Get Treasury address for a chain
   */
  getTreasuryAddress(chainName: string): string | undefined {
    return this.chains.get(chainName)?.contracts.treasury ?? undefined;
  }

  /**
   * Register a new chain at runtime
   */
  registerChain(name: string, config: ChainConfig): void {
    this.chains.set(name, config);
    this.byChainId.set(config.chainId, config);
  }

  /**
   * Update contract addresses for a chain (e.g., after deploy)
   */
  updateContracts(chainName: string, contracts: Partial<ContractAddresses>): void {
    const chain = this.chains.get(chainName);
    if (chain) {
      chain.contracts = { ...chain.contracts, ...contracts };
    }
  }
}

// Singleton instance
export const chainRegistry = new ChainRegistry();
```

---

## 5. Multichain Adapter Pattern

```typescript
// packages/sentinel/src/adapters/multichain-facilitator.ts

import { chainRegistry } from '../services/chain-registry';
import { X402FacilitatorPort, PaymentIntent, PaymentReceipt } from '../ports';

export class MultichainFacilitator implements X402FacilitatorPort {
  private adapters: Map<string, X402FacilitatorPort>;

  constructor() {
    this.adapters = new Map();
  }

  /**
   * Get or create adapter for a specific chain
   */
  private getAdapter(chainName: string): X402FacilitatorPort {
    if (!this.adapters.has(chainName)) {
      const chain = chainRegistry.getChain(chainName);
      if (!chain) {
        throw new Error(`Unsupported chain: ${chainName}`);
      }

      // Create chain-specific adapter
      this.adapters.set(chainName, new ChainSpecificFacilitator(chain));
    }

    return this.adapters.get(chainName)!;
  }

  /**
   * Create payment intent for any supported chain
   */
  async createIntent(
    chainName: string,
    amount: bigint,
    recipient: string,
    validUntil: number
  ): Promise<PaymentIntent> {
    const adapter = this.getAdapter(chainName);
    return adapter.createIntent(chainName, amount, recipient, validUntil);
  }

  /**
   * Sign authorization for any supported chain
   */
  async signAuthorization(
    chainName: string,
    intent: PaymentIntent,
    signer: unknown
  ): Promise<string> {
    const adapter = this.getAdapter(chainName);
    return adapter.signAuthorization(chainName, intent, signer);
  }

  /**
   * Verify receipt for any supported chain
   */
  async verifyReceipt(
    chainName: string,
    receipt: PaymentReceipt
  ): Promise<boolean> {
    const adapter = this.getAdapter(chainName);
    return adapter.verifyReceipt(chainName, receipt);
  }
}

class ChainSpecificFacilitator implements X402FacilitatorPort {
  private config: ChainConfig;

  constructor(config: ChainConfig) {
    this.config = config;
  }

  async createIntent(
    _chainName: string,
    amount: bigint,
    recipient: string,
    validUntil: number
  ): Promise<PaymentIntent> {
    return {
      id: crypto.randomUUID(),
      chainId: this.config.chainId,
      token: this.config.usdc.address,
      amount,
      recipient,
      validUntil,
      createdAt: Date.now(),
      domain: {
        name: 'SnowRail',
        version: '2',
        chainId: this.config.chainId,
        verifyingContract: this.config.contracts.treasury!
      }
    };
  }

  // ... otros metodos
}
```

---

## 6. API Design for Multichain

### 6.1 Request Schema (Chain-aware)

```typescript
// All payment-related requests include chain
interface ValidationRequest {
  url: string;
  amount?: number;
  currency?: string;  // "USDC" (default)
  chain?: string;     // "avalanche-fuji" (default from env)
  sender?: string;
  recipient?: string;
}

interface PaymentIntentRequest {
  url: string;
  amount: number;
  recipient: string;
  chain: string;      // Required for payments
}
```

### 6.2 Response Schema (Chain-aware)

```typescript
interface PaymentIntentResponse {
  intentId: string;
  chain: string;
  chainId: number;
  token: {
    address: string;
    symbol: string;
    decimals: number;
  };
  amount: string;     // BigInt as string
  recipient: string;
  validUntil: number;
  signatureData: EIP712TypedData;
  explorerUrl: string;
}

interface PaymentReceiptResponse {
  intentId: string;
  status: 'completed' | 'pending' | 'failed';
  chain: string;
  txHash: string;
  explorerUrl: string;  // e.g., "https://snowtrace.io/tx/0x..."
  receipt: {
    amount: string;
    token: string;
    from: string;
    to: string;
    timestamp: number;
    blockNumber: number;
  };
}
```

### 6.3 Endpoints

```yaml
# Validation (chain-aware for future reputation by chain)
POST /v1/sentinel/validate
Body: { url, amount?, chain? }
Response: { trustScore, canPay, chain }

# Payment Intent (requires chain)
POST /v1/payments/x402/intent
Body: { url, amount, recipient, chain }
Response: { intentId, chain, chainId, token, signatureData }

# Confirm Payment
POST /v1/payments/x402/confirm
Body: { intentId, signature }
Response: { status, txHash, explorerUrl }

# List Supported Chains
GET /v1/chains
Response: {
  chains: [
    { name: "avalanche-fuji", chainId: 43113, isTestnet: true },
    { name: "avalanche-mainnet", chainId: 43114, isTestnet: false },
    ...
  ]
}

# Get Chain Details
GET /v1/chains/:chainName
Response: {
  name: "avalanche-fuji",
  chainId: 43113,
  usdc: { address: "0x...", decimals: 6 },
  treasury: { address: "0x...", deployed: true },
  explorer: "https://testnet.snowtrace.io"
}
```

---

## 7. Deployment Strategy

### 7.1 Contract Deployment per Chain

```typescript
// scripts/deploy-multichain.ts

import { chainRegistry } from '../packages/sentinel/src/services/chain-registry';

async function deployToChain(chainName: string) {
  const chain = chainRegistry.getChain(chainName);
  if (!chain) throw new Error(`Unknown chain: ${chainName}`);

  console.log(`Deploying to ${chain.name} (${chain.chainId})...`);

  // Connect to chain
  const provider = new ethers.JsonRpcProvider(chain.rpcUrl);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  // Deploy Treasury
  const Treasury = await ethers.getContractFactory('SnowRailTreasury', signer);
  const treasury = await Treasury.deploy(chain.usdc.address);
  await treasury.waitForDeployment();

  const treasuryAddress = await treasury.getAddress();
  console.log(`Treasury deployed: ${treasuryAddress}`);

  // Update registry
  chainRegistry.updateContracts(chainName, { treasury: treasuryAddress });

  // Save to deployments file
  await saveDeployment(chainName, {
    treasury: treasuryAddress,
    deployedAt: new Date().toISOString(),
    txHash: treasury.deploymentTransaction()?.hash
  });

  // Verify on explorer
  if (chain.explorer) {
    console.log(`Verify: ${chain.explorer}/address/${treasuryAddress}`);
  }

  return treasuryAddress;
}

// Deploy to multiple chains
async function deployAll() {
  const chains = ['avalanche-fuji', 'polygon-mumbai', 'base-goerli'];

  for (const chain of chains) {
    try {
      await deployToChain(chain);
    } catch (error) {
      console.error(`Failed to deploy to ${chain}:`, error);
    }
  }
}
```

### 7.2 Deployments File

```json
// config/deployments.json
{
  "avalanche-fuji": {
    "treasury": "0x...",
    "mixer": "0x...",
    "deployedAt": "2026-01-27T12:00:00Z",
    "version": "2.0.0"
  },
  "avalanche-mainnet": {
    "treasury": null,
    "deployedAt": null,
    "version": null
  },
  "polygon-mainnet": {
    "treasury": null,
    "deployedAt": null,
    "version": null
  }
}
```

---

## 8. Extension: Adding a New Chain

### Step-by-Step Guide

```markdown
## Adding Support for a New Chain

### 1. Add Chain Config

Edit `config/chains.json`:

```json
{
  "new-chain-mainnet": {
    "chainId": 12345,
    "name": "New Chain Mainnet",
    "shortName": "new",
    "rpcUrl": "https://rpc.newchain.io",
    "explorer": "https://explorer.newchain.io",
    "nativeToken": {
      "symbol": "NEW",
      "decimals": 18
    },
    "usdc": {
      "address": "0x...",  // USDC on this chain
      "decimals": 6,
      "symbol": "USDC"
    },
    "contracts": {
      "treasury": null
    },
    "features": {
      "eip1559": true,
      "eip712": true,
      "transferAuth": true
    },
    "defaults": {
      "confirmations": 2,
      "gasMultiplier": 1.1
    }
  }
}
```

### 2. Deploy Contracts

```bash
# Set environment
export PRIVATE_KEY=0x...
export CHAIN=new-chain-mainnet

# Deploy
pnpm hardhat run scripts/deploy.ts --network newchain
```

### 3. Update Deployments

After deploy, update `config/deployments.json`:

```json
{
  "new-chain-mainnet": {
    "treasury": "0xDEPLOYED_ADDRESS",
    "deployedAt": "2026-01-27T12:00:00Z",
    "version": "2.0.0"
  }
}
```

### 4. Verify Contracts

```bash
pnpm hardhat verify --network newchain 0xDEPLOYED_ADDRESS
```

### 5. Test

```bash
# Set chain for testing
export CHAIN=new-chain-mainnet

# Run E2E test
pnpm e2e
```

### 6. Update Documentation

- Add chain to supported chains in README
- Add to API docs
- Update .env.example
```

---

## 9. Cross-Chain Considerations (Future)

### 9.1 Cross-Chain Payments (Not in Scope)

```
NOTE: Cross-chain payments (e.g., pay from Ethereum, receive on Avalanche)
are OUT OF SCOPE for v2.0. Each payment is single-chain.

Future considerations:
- Use Chainlink CCIP for message passing
- Use Circle's CCTP for native USDC bridging
- Or LayerZero/Axelar for generic bridging
```

### 9.2 Reputation Across Chains (Future)

```
NOTE: Currently, reputation is per-URL, not per-chain.
Future consideration: Should a URL have different trust scores
on different chains? (e.g., verified on Ethereum but not Polygon)

For now: Single reputation score regardless of payment chain.
```

---

## 10. Security Considerations

### 10.1 Chain-Specific Risks

| Chain | Consideration |
|-------|---------------|
| Ethereum | Higher gas, longer finality |
| Polygon | Reorg risk, faster confirmations |
| Arbitrum | L2 risks, sequencer dependency |
| Avalanche | Subnet considerations |

### 10.2 USDC Address Verification

```typescript
// Always verify USDC address before any operation
function verifyUSDCAddress(chainName: string, providedAddress: string): boolean {
  const expectedAddress = chainRegistry.getUSDCAddress(chainName);
  return expectedAddress?.toLowerCase() === providedAddress.toLowerCase();
}

// In payment flow
if (!verifyUSDCAddress(chain, tokenAddress)) {
  throw new Error('Invalid USDC address for chain');
}
```

### 10.3 RPC Fallbacks

```typescript
// Use multiple RPC endpoints for reliability
const RPC_FALLBACKS: Record<string, string[]> = {
  'avalanche-mainnet': [
    'https://api.avax.network/ext/bc/C/rpc',
    'https://avalanche-c-chain.publicnode.com',
    'https://rpc.ankr.com/avalanche'
  ],
  'ethereum-mainnet': [
    'https://eth.llamarpc.com',
    'https://rpc.ankr.com/eth',
    'https://cloudflare-eth.com'
  ]
};
```

---

*Document generated: 2026-01-27*
*Author: Architecture Team*
*Status: Design - Ready for Implementation*
