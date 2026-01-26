# SnowRail Core

**Avalanche-first trust-before-pay for agent payments, powered by x402 + SENTINEL**

Canonical repo for SnowRail core (Avalanche-first)

1st Place - Hack2Build: Payments x402 (Avalanche) | [Submission](https://github.com/Colombia-Blockchain/SnowRail)

---

> **Note:** This is the core implementation. Deployment adapters for other chains:
> - Cronos: [cronos-snowrail](https://github.com/Colombia-Blockchain/cronos-snowrail)
> - Mantle: [SnowRail-Mantle](https://github.com/Colombia-Blockchain/SnowRail-Mantle)

---

## 5-Minute Demo

Test SENTINEL trust validation:

### Quick Start

```bash
# Clone repository
git clone https://github.com/Colombia-Blockchain/snowrail-core.git
cd snowrail-core

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env and add your PRIVATE_KEY

# Check deployment readiness
pnpm check:deployment

# Start backend (development)
pnpm backend:dev
```

Backend runs at `http://localhost:3000`

### API Test

```bash
curl -X POST http://localhost:3000/v1/sentinel/validate \
  -H "Content-Type: application/json" \
  -d '{"url":"https://api.stripe.com"}'
```

Expected response:
```json
{"canPay": true, "trustScore": 92, "risk": "LOW", "decision": "APPROVE"}
```

```bash
curl -X POST http://localhost:3000/v1/sentinel/validate \
  -H "Content-Type: application/json" \
  -d '{"url":"https://unknown-merchant.xyz"}'
```

Expected response:
```json
{"canPay": false, "trustScore": 31, "risk": "HIGH", "decision": "DENY"}
```

### Interactive Demo

1. Run `pnpm dev`
2. Open http://localhost:5173 (frontend, Vite default)
3. Enter a URL in the SENTINEL panel
4. View trust score and risk assessment
5. Attempt payment - blocked if score below threshold (default: 60, configurable)

> **Ports:** Backend runs on `:3000`, Frontend on `:5173`

### Deployed Contracts

#### Avalanche Fuji Testnet ✅ DEPLOYED

| Contract | Address | Explorer |
|----------|---------|----------|
| SnowRailTreasury | `0x51B60D552De6A381a78DFEFffa646e36257239c8` | [View](https://testnet.snowtrace.io/address/0x51B60D552De6A381a78DFEFffa646e36257239c8) |
| MockUSDC | `0x114f12A1e97598EDE59C7f3A7dBFaB5b5FDA0E5E` | [View](https://testnet.snowtrace.io/address/0x114f12A1e97598EDE59C7f3A7dBFaB5b5FDA0E5E) |
| SnowRailMixer | `0xE38BaF7dD7F4CdA1170D2aA539B0c0B4Ca8DB057` | [View](https://testnet.snowtrace.io/address/0xE38BaF7dD7F4CdA1170D2aA539B0c0B4Ca8DB057) |

> 🎉 **Live on Fuji!** Use MockUSDC faucet: Call `faucet()` to get 10,000 test USDC
>
> **Deployment Date:** January 25, 2026 | **Status:** Production Ready

---

## Problem

AI agents increasingly need to pay for resources autonomously: APIs, compute, data services. Current payment systems have no standard mechanism to validate recipient trustworthiness before execution.

Consequences:
- Agents pay fraudulent endpoints
- No accountability for payment decisions
- Merchants have no way to prove legitimacy

---

## Solution

SnowRail implements trust-before-pay: validate the destination before executing any payment.

```
Payment Request --> SENTINEL Validation --> Trust Score + Attestation --> x402 Execution
```

Core flow:

```
Trusted Merchant (Score: 87)          Untrusted Merchant (Score: 23)
- TLS: Valid                          - TLS: Self-signed
- Infrastructure: AWS                 - Infrastructure: Unknown
- Policy: x402 compliant              - Policy: Non-compliant
--> Payment APPROVED                  --> Payment BLOCKED
--> On-chain attestation              --> Reason logged
```

---

## SENTINEL Trust Validation

Three validation categories:

| Category | Checks | Purpose |
|----------|--------|---------|
| Identity | TLS certificate, DNS records, domain age | Verify claimed identity |
| Infrastructure | Cloud provider, security headers, WAF | Assess operational maturity |
| Policy | x402 support, rate limits, compliance | Confirm protocol adherence |

Trust Score: 0-100 weighted aggregate
- 80-100: Auto-approve
- 60-79: Approve with monitoring
- 40-59: Manual review required
- 0-39: Blocked

Note: Checks may vary by integration; scores are heuristics. Thresholds are configurable per deployment.

---

## Architecture

```
Frontend (React)
    |
    v
Backend (Node.js/TypeScript)
    |
    +-- YUKI Engine (AI Assistant)
    |       |
    |       v
    +-- SENTINEL (Trust Validation)
    |       |
    |       v
    +-- x402 Payment Executor
            |
            v
Smart Contracts (Avalanche C-Chain)
    +-- SnowRailTreasury (payments, attestations)
    +-- SnowRailMixer (optional: ZK privacy)
```

---

## SDK Usage

```typescript
import { createSentinel } from '@snowrail/sentinel';

const sentinel = createSentinel({
  defaultMinScore: 60  // configurable threshold
});

// Simple check
const canPay = await sentinel.canPay('https://merchant.com/api');

// Full validation
const result = await sentinel.validate({
  url: 'https://merchant.com/api',
  amount: 1000
});

console.log(result.trustScore);  // 87
console.log(result.canPay);      // true
console.log(result.risk);        // "LOW"
```

---

## Packages

| Package | Description | Status |
|---------|-------------|--------|
| @snowrail/sentinel | Trust validation SDK | Production |
| @snowrail/yuki | AI assistant | Alpha |
| contracts/ | Solidity (Treasury) | Ready for deployment |
| frontend/ | React dashboard | Beta |

---

## Deployment

### Complete Deployment Guide

See [DEPLOYMENT.md](DEPLOYMENT.md) for step-by-step instructions.

### Quick Deploy (Fuji Testnet)

```bash
# 1. Check prerequisites
pnpm check:deployment

# 2. Deploy contracts to Avalanche Fuji
pnpm contracts:deploy

# 3. Verify contracts on Snowtrace
pnpm contracts:verify --network fuji <CONTRACT_ADDRESS> <ARGS>

# 4. Deploy backend to Railway (see DEPLOYMENT.md)
```

### Multichain Support

SnowRail is designed multichain-first with Avalanche as the primary chain.

```bash
# View supported chains
pnpm setup:chain list

# Get chain information
pnpm setup:chain info avalanche-fuji

# Deploy to Cronos
pnpm contracts:deploy:cronos

# Deploy to Mantle
pnpm contracts:deploy:mantle
```

#### Supported Chains

| Chain | Network | Status | RPC |
|-------|---------|--------|-----|
| Avalanche | Fuji Testnet | ✅ Primary | `https://api.avax-test.network/ext/bc/C/rpc` |
| Avalanche | C-Chain Mainnet | 🔜 Soon | `https://api.avax.network/ext/bc/C/rpc` |
| Cronos | Testnet | ✅ Ready | `https://evm-t3.cronos.org` |
| Mantle | Testnet | ✅ Ready | `https://rpc.testnet.mantle.xyz` |

### Environment Configuration

```bash
# Blockchain
PRIVATE_KEY=0x...
TREASURY_CONTRACT=0x...
USDC_CONTRACT=0x...
AVALANCHE_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc

# API Server
NODE_ENV=production
PORT=4000

# Optional: Database (for production)
DATABASE_URL=postgresql://...

# Optional: AI (for enhanced YUKI)
OPENAI_API_KEY=sk-...
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini

# Optional: Rail API (fiat payments)
RAIL_API_KEY=...
RAIL_CLIENT_ID=...
RAIL_CLIENT_SECRET=...

# Optional: Merchant API
MERCHANT_API_ENABLED=true
```

### Backend Deployment (Railway)

1. Connect GitHub repository to Railway
2. Set environment variables (see above)
3. Deploy automatically on push
4. Get public URL: `https://your-app.railway.app`

### Frontend Deployment (Vercel)

```bash
cd apps/frontend
vercel deploy --prod
```

Configure environment:
```
VITE_API_URL=https://your-backend.railway.app
VITE_TREASURY_CONTRACT=0x...
```

---

## Development Scripts

### Core Commands

```bash
# Development
pnpm dev                    # Start all services (backend, frontend, packages)
pnpm backend:dev            # Start backend only
pnpm frontend:dev           # Start frontend only
pnpm yuki:dev               # Develop YUKI package

# Building
pnpm build                  # Build all packages
pnpm typecheck              # Type check all TypeScript

# Testing
pnpm test                   # Run all tests
pnpm sentinel:test          # Test SENTINEL package
pnpm contracts:test         # Test smart contracts

# Code Quality
pnpm lint                   # Lint all code
pnpm format                 # Format with Prettier
```

### Deployment Commands

```bash
# Pre-deployment Checks
pnpm check:deployment       # Run deployment checklist
pnpm check:balance          # Check wallet balance

# Contract Deployment
pnpm contracts:deploy       # Deploy to Avalanche Fuji
pnpm contracts:deploy:cronos # Deploy to Cronos testnet
pnpm contracts:deploy:mantle # Deploy to Mantle testnet
pnpm contracts:verify       # Verify on Snowtrace

# Multichain Setup
pnpm setup:chain list       # List supported chains
pnpm setup:chain info fuji  # Get chain information
pnpm setup:chain config avalanche-fuji,cronos-testnet
                            # Generate hardhat config

# Full Deployment Pipeline
pnpm deploy:all             # Run checks + deploy contracts
```

---

## Advanced Features

### Rail API Integration (Fiat Payments)

SnowRail integrates with Layer2 Financial's Rail API for traditional payment processing.

```bash
# Configure in .env
RAIL_API_BASE_URL=https://sandbox.layer2financial.com/api
RAIL_AUTH_URL=https://auth.layer2financial.com/oauth2/.../v1/token
RAIL_CLIENT_ID=...
RAIL_CLIENT_SECRET=...
RAIL_SIGNING_KEY=...
RAIL_SOURCE_ACCOUNT_ID=...
```

**Features:**
- OAuth2 authentication with automatic token refresh
- Request signing for security
- Account balance queries
- Payment initiation and tracking
- Settlement verification
- Webhook support

### Merchant API

Enable merchants to integrate SnowRail payments into their applications.

```bash
# Enable in .env
MERCHANT_API_ENABLED=true
```

**Endpoints:**
- `POST /v1/merchant/register` - Register new merchant
- `POST /v1/merchant/payment` - Create payment request
- `GET /v1/merchant/status/:id` - Check payment status
- `POST /v1/merchant/webhook` - Configure webhooks

**Authentication:** API key + HMAC signature

### Database Layer (PostgreSQL)

Production deployments use PostgreSQL for persistence.

```bash
DATABASE_URL=postgresql://user:pass@host:5432/snowrail
```

**Entities:**
- Users and authentication
- Merchant profiles
- Payment transactions
- Trust validation cache
- Audit logs

### AI Assistant (YUKI)

YUKI can be enhanced with OpenAI or Anthropic for natural language processing.

```bash
# OpenAI
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
AI_MODEL=gpt-4o-mini

# Anthropic
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
AI_MODEL=claude-3-5-sonnet-20241022
```

**Capabilities:**
- Natural language payment commands
- Trust score explanations
- Transaction history queries
- Risk assessment insights

---

## Testing

### Unit Tests

```bash
# All tests
pnpm test

# Specific package
pnpm sentinel:test

# Smart contracts
pnpm contracts:test

# Watch mode
pnpm test --watch
```

### Integration Tests

```bash
# Test SENTINEL endpoint
curl -X POST http://localhost:3000/v1/sentinel/validate \
  -H "Content-Type: application/json" \
  -d '{"url":"https://api.stripe.com"}'

# Test YUKI chat
curl -X POST http://localhost:3000/v1/yuki/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","message":"Check https://api.stripe.com"}'

# Test payment (requires deployed contracts)
npx hardhat run scripts/test-payment.ts --network fuji
```

### E2E Testing

See [BUILD_GAMES_CHECKLIST.md](BUILD_GAMES_CHECKLIST.md) for complete E2E test scenarios.

---

## Architecture Deep Dive

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│                   (React + Vite + Wagmi)                     │
└─────────────┬───────────────────────────────────────────────┘
              │ REST API
              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend (Express)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   SENTINEL   │  │     YUKI     │  │  Merchant    │      │
│  │   Validation │  │   Assistant  │  │     API      │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│   Blockchain   │  │   PostgreSQL   │  │   Rail API     │
│   (Avalanche)  │  │   (Optional)   │  │   (Optional)   │
└────────────────┘  └────────────────┘  └────────────────┘
```

### Smart Contract Architecture

```solidity
SnowRailTreasury {
  - ERC20 payment handling
  - x402 protocol implementation
  - SENTINEL trust validation
  - ERC-8004 agent registry
  - Rate limiting & daily quotas
  - Fee collection
  - ZK mixer integration
}

SnowRailMixer {
  - Zero-knowledge privacy layer
  - Commitment/nullifier system
  - Merkle tree proofs
  - Anonymous withdrawals
}
```

### Trust Validation Flow

```
1. Client requests payment to URL
2. SENTINEL runs validation checks:
   ├── TLS certificate verification
   ├── DNS security check
   ├── Infrastructure assessment
   ├── Security headers scan
   └── x402 protocol support
3. Calculate weighted trust score (0-100)
4. Determine risk level: LOW/MEDIUM/HIGH/CRITICAL
5. Make decision: APPROVE/CONDITIONAL/REVIEW/DENY
6. Cache attestation on-chain (optional)
7. Execute payment if approved
```

---

## Security

### Smart Contract Security

- ✅ ReentrancyGuard on all state-changing functions
- ✅ AccessControl for admin functions
- ✅ EIP-712 typed signatures
- ✅ Rate limiting per address
- ✅ Daily spending limits for agents
- ✅ Pausable in emergency
- ✅ SafeERC20 for token transfers

**Audits:** Pending (recommend before mainnet)

### API Security

- ✅ Helmet.js security headers
- ✅ Rate limiting (100 req/min)
- ✅ CORS configuration
- ✅ Input validation
- ✅ Request logging
- ✅ JWT authentication (optional)

### Private Key Management

Never commit private keys! Use:
- `.env` files (gitignored)
- Hardware wallets for mainnet
- Multisig for admin functions
- Key rotation policy

---

## Performance

### Backend

- Response time: <200ms (SENTINEL validation)
- Throughput: 100 req/s per instance
- Caching: Trust scores cached for 5 minutes
- Scaling: Horizontal scaling via Railway/Render

### Smart Contracts

- Gas optimized with `viaIR` compiler
- Typical payment cost: ~80k gas (~$0.10 on Avalanche)
- Batch operations supported
- Event-driven architecture for indexing

---

## Roadmap

### Current (Build Games)
- SENTINEL SDK v2.0
- YUKI AI Assistant
- x402 payment integration
- Fuji testnet deployment

### Next 6 Weeks
- Mainnet deployment
- SDK documentation
- 2 partner integrations

### Future Modules
- ZK Mixer (private payments)
- ERC-8004 agent identity
- Multi-chain support

---

## Business Model

| Tier | Price | Volume |
|------|-------|--------|
| Free | $0 | 100 validations/month |
| Builder | $49/month | 10,000 validations |
| Enterprise | Custom | Unlimited + SLA |

---

## Team

Colombia Blockchain

Building trust infrastructure for autonomous agent payments.

---

## Links

- GitHub: https://github.com/Colombia-Blockchain/snowrail-core

---

License: MIT
