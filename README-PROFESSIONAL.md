# SnowRail v2.0

**Trust-Before-Pay for Autonomous Agent Payments**

Winner, x402 Hackathon (Avalanche) | A novel approach to pre-payment trust validation

---

## 5-Minute Demo

Test SENTINEL trust validation immediately:

### API Test

```bash
# Check a trusted merchant
curl -X POST https://api.snowrail.xyz/v1/sentinel/validate \
  -H "Content-Type: application/json" \
  -d '{"url": "https://api.stripe.com"}'

# Response: { "canPay": true, "trustScore": 92, "risk": "LOW" }
```

```bash
# Check a suspicious destination
curl -X POST https://api.snowrail.xyz/v1/sentinel/validate \
  -H "Content-Type: application/json" \
  -d '{"url": "https://unknown-merchant.xyz"}'

# Response: { "canPay": false, "trustScore": 31, "risk": "HIGH" }
```

### Interactive Demo

1. Visit [app.snowrail.xyz](https://app.snowrail.xyz)
2. Enter a URL in the SENTINEL panel
3. View trust score and risk assessment
4. Attempt payment - blocked if score < 60

### Deployed Contracts (Avalanche Fuji)

| Contract | Address | Explorer |
|----------|---------|----------|
| SnowRailTreasury | `[DEPLOY_ADDRESS]` | [Snowtrace](https://testnet.snowtrace.io/address/...) |
| MockUSDC | `[DEPLOY_ADDRESS]` | [Snowtrace](https://testnet.snowtrace.io/address/...) |

---

## Problem

AI agents increasingly need to pay for resources autonomously: APIs, compute, data services. Current payment systems have no mechanism to validate recipient trustworthiness before execution.

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

## Quick Start

```bash
git clone https://github.com/Colombia-Blockchain/SnowRail.git
cd SnowRail
pnpm install
pnpm dev
```

Requirements: Node.js 18+, pnpm

Optional: PostgreSQL (persistence), Redis (caching)

---

## SDK Usage

```typescript
import { createSentinel } from '@snowrail/sentinel';

const sentinel = createSentinel();

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
| @snowrail/yuki | AI assistant | Production |
| contracts/ | Solidity (Treasury) | Deployed (Fuji) |
| frontend/ | React dashboard | Production |

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

Colombia Blockchain - 1st Place, x402 Hackathon (Avalanche)

Building trust infrastructure for autonomous agent payments.

---

## Links

- Website: https://snowrail.xyz
- Documentation: https://docs.snowrail.xyz
- GitHub: https://github.com/Colombia-Blockchain/SnowRail

---

License: MIT
