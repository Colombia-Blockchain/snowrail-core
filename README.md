# SnowRail

**Trust-Before-Pay for Autonomous Agent Payments**

Avalanche-first trust validation layer for AI agents, powered by x402 + SENTINEL

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![Tests](https://img.shields.io/badge/tests-36%20passing-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()

---

## Quick Start

```bash
git clone https://github.com/Colombia-Blockchain/SnowRail.git
cd SnowRail
pnpm install
```

### 1. Setup Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your values:
# - PRIVATE_KEY (get testnet AVAX from https://core.app/tools/testnet-faucet/)
# - SNOWTRACE_API_KEY (get free key at https://snowtrace.io/myapikey)
```

### 2. Deploy Contracts (Fuji Testnet)

```bash
# Compile contracts
pnpm contracts:compile

# Deploy to Fuji
pnpm contracts:deploy

# Update .env with deployed addresses
# TREASURY_CONTRACT_ADDRESS=0x...
# ASSET_ADDRESS=0x...
# MIXER_CONTRACT_ADDRESS=0x...
```

### 3. Start Backend

```bash
# Start the API server
pnpm backend:dev

# Server runs on http://localhost:4000
```

### 4. Validate a URL

```bash
# Trusted endpoint
curl -X POST http://localhost:4000/v1/sentinel/validate \
  -H "Content-Type: application/json" \
  -d '{"url":"https://api.stripe.com"}'

# Response: {"canPay": true, "trustScore": 92, "risk": "none"}
```

```bash
# Scam endpoint
curl -X POST http://localhost:4000/v1/sentinel/validate \
  -H "Content-Type: application/json" \
  -d '{"url":"https://free-gpt-unlimited.xyz"}'

# Response: {"canPay": false, "trustScore": 0, "risk": "critical"}
```

### 5. Run E2E Test

```bash
# Execute complete payment flow on Fuji
pnpm e2e

# Tests: SENTINEL → Intent → Sign → Confirm → Snowtrace
# Duration: ~30-60 seconds
```

---

## Problem

AI agents need to pay for resources autonomously (APIs, compute, data). Current systems have no mechanism to validate recipient trustworthiness before payment execution.

**Result:** Agents get scammed, no accountability, merchants can't prove legitimacy.

---

## Solution

SnowRail implements **trust-before-pay**: validate the destination before executing any payment.

```
Payment Request → SENTINEL Validation → Trust Score → x402 Execution
```

---

## SENTINEL - 11 Security Checks

| Category | Checks | Purpose |
|----------|--------|---------|
| **Identity** | TLS, DNS, Domain Age | Verify claimed identity |
| **Infrastructure** | Cloud Provider, Headers | Assess operational maturity |
| **Policy** | x402, ERC-8004 | Confirm protocol compliance |
| **Reputation** | Phishing, Blacklists | Detect known threats |
| **Agent Economy** | Endpoint, Contract, Scam | Protect autonomous agents |

### Trust Score

- **85-100**: Auto-approve ✅
- **60-84**: Approve with monitoring ⚠️
- **40-59**: Manual review required 🔍
- **0-39**: Blocked ❌

---

## SDK Usage

```typescript
import { createSentinel } from '@snowrail/sentinel';

const sentinel = createSentinel();

// Simple check
const canPay = await sentinel.canPay('https://api.openai.com');
// true

// Full validation
const result = await sentinel.validate({
  url: 'https://api.stripe.com',
  amount: 100
});

console.log(result.trustScore);  // 92
console.log(result.canPay);      // true
console.log(result.risk);        // "none"
```

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                  │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│                Backend (Node.js/TypeScript)          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │    YUKI     │  │  SENTINEL   │  │    x402     │  │
│  │  AI Agent   │──│   11 Checks │──│  Payments   │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│           Smart Contracts (Avalanche C-Chain)        │
│  ┌─────────────────────┐  ┌─────────────────────┐   │
│  │  SnowRailTreasury   │  │   SnowRailMixer     │   │
│  │  (payments + trust) │  │   (ZK privacy)      │   │
│  └─────────────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## Packages

| Package | Description | 
|---------|-------------|
| `@snowrail/sentinel` | Trust validation SDK (11 checks) |
| `@snowrail/yuki` | AI payment assistant |
| `contracts/` | Solidity smart contracts |
| `apps/backend` | Express API server |
| `apps/frontend` | React dashboard |

---

## 🧪 E2E Test Automation

The E2E test executes the complete SnowRail payment flow on Avalanche Fuji:

```bash
pnpm e2e
```

**What it tests:**

1. **SENTINEL Validation** - Validates URL trust score and risk level
2. **Create Intent** - Creates payment intent with expiration
3. **Sign EIP-712** - Signs authorization with wallet
4. **Confirm Payment** - Executes on-chain transaction
5. **Verify** - Confirms on Snowtrace

**Requirements:**
- Backend running (`pnpm backend:dev`)
- Contracts deployed on Fuji
- Testnet AVAX in wallet (for gas)
- `.env` configured with contract addresses

See [scripts/README.md](scripts/README.md) for detailed documentation.

---

## 🔐 Roles & Wallets

SnowRail uses role-based access control for security:

| Role | Description | Address Type |
|------|-------------|--------------|
| **Deployer** | Deploys contracts, sets up roles | Your wallet (PRIVATE_KEY) |
| **Treasury** | Executes validated payments | Treasury contract |
| **Sender** | Agent/user initiating payment | Any wallet |
| **Recipient** | Receives payment | Merchant/service wallet |
| **SENTINEL** | Signs validation results | Service wallet (optional) |

**Fuji Testnet Addresses:**

```
Deployer:  0x22f6F000609d52A0b0efCD4349222cd9d70716Ba
Treasury:  0x79fa1E26938763Db1AD3d6d40bf79f3a23aE60dd
USDC:      0x7435BB56D89Cf26A03fabaE6fA36b66295a2A676
Mixer:     0xE05DC7789038C669652bF3BfE4Fb684b7F420fCD
```

---

## 🔎 Contract Verification

After deploying contracts, verify them on Snowtrace:

```bash
# Verify all contracts
pnpm contracts:verify --network fuji

# Verify specific contract
npx hardhat verify --network fuji <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

**Manual verification:**
1. Go to [Snowtrace Fuji](https://testnet.snowtrace.io)
2. Search for your contract address
3. Click "Verify and Publish"
4. Select compiler version (0.8.20), optimization (Yes, 200 runs)
5. Paste contract code

---

## ❗ Troubleshooting

### "Missing PRIVATE_KEY" Error

Add your private key to `.env`:
```bash
PRIVATE_KEY=0x...
```

Get testnet AVAX: https://core.app/tools/testnet-faucet/

### "Insufficient funds for gas"

Your wallet needs testnet AVAX for transaction fees. Get free AVAX from the faucet above.

### "Backend connection failed"

Make sure backend is running:
```bash
pnpm backend:dev
```

Check it's accessible at http://localhost:4000/health

### "Contract not deployed"

Deploy contracts first:
```bash
pnpm contracts:deploy
```

Update `.env` with deployed addresses.

### "SENTINEL blocked payment"

This is expected! SENTINEL blocks URLs that fail trust checks. Try a trusted URL like:
- https://api.stripe.com
- https://api.openai.com
- https://example.com

### E2E Test Fails

1. Check backend is running
2. Verify contract addresses in `.env`
3. Ensure wallet has testnet AVAX
4. Check RPC URL is correct for Fuji

### TypeScript Build Errors

```bash
# Clean and rebuild
pnpm clean
pnpm install
pnpm build
```

---

## Development

```bash
# Install
pnpm install

# Run all checks
pnpm lint       # ESLint
pnpm typecheck  # TypeScript
pnpm test       # 36 tests
pnpm build      # Production build

# Development server
pnpm dev

# E2E test
pnpm e2e
```

---

## Deployment

### Backend (Railway)

```bash
# Deploy to Railway
railway up
```

Environment variables:
```
PORT=3000
ANTHROPIC_API_KEY=sk-ant-...  # Optional, for YUKI LLM
```

### Contracts (Avalanche Fuji)

```bash
npx hardhat run scripts/deploy.ts --network fuji
```

---

## Team

**Colombia Blockchain**

1st Place - Hack2Build x402 (Avalanche)

---

## Links

- GitHub: https://github.com/Colombia-Blockchain/SnowRail
- Docs: https://docs.snowrail.xyz

---

## License

MIT
