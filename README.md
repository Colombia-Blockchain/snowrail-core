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
git clone https://github.com/Colombia-Blockchain/snowrail-core.git
cd snowrail-core
pnpm install
pnpm dev
```

Server runs at `http://localhost:3000`

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

### Deployed Contracts (Avalanche Fuji)

| Contract | Address | Explorer |
|----------|---------|----------|
| SnowRailTreasury | TBD | TBD (Fuji) |
| MockUSDC | TBD | TBD (Fuji) |

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

## Deploy

### Backend (Railway/Render)

```bash
cd apps/backend
npm install
npm start
```

Environment variables:
```
PORT=3000
ANTHROPIC_API_KEY=sk-ant-...  # optional, for YUKI LLM
```

### Contracts (Avalanche Fuji)

```bash
export PRIVATE_KEY="your_private_key"
npx hardhat run scripts/deploy.ts --network fuji
```

### Ports

- Backend API: `http://localhost:3000`
- Frontend (Vite): `http://localhost:5173`

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
