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
pnpm dev
```

### Validate a URL

```bash
# Trusted endpoint
curl -X POST http://localhost:3000/v1/sentinel/validate \
  -H "Content-Type: application/json" \
  -d '{"url":"https://api.stripe.com"}'

# Response: {"canPay": true, "trustScore": 92, "risk": "none"}
```

```bash
# Scam endpoint  
curl -X POST http://localhost:3000/v1/sentinel/validate \
  -H "Content-Type: application/json" \
  -d '{"url":"https://free-gpt-unlimited.xyz"}'

# Response: {"canPay": false, "trustScore": 0, "risk": "critical"}
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
