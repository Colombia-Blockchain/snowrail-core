# SnowRail Core - Product Decisions

Version: 2.0.0
Date: 2026-01-26

---

## Strategic Decisions

### 1. Trust Layer First

**Decision**: SENTINEL (trust validation) is the core product, not payments.

**Rationale**: 
- Unique value proposition for AI agent payments
- Pre-payment validation prevents fraud before it happens
- Can integrate with any payment rail (x402, 8004, others)

### 2. USDC Only

**Decision**: All payments use USDC (ERC-20 stablecoin), never native tokens.

**Rationale**:
- Predictable value for merchants
- No volatility risk
- Standard ERC-20 interface
- Compatible with transferWithAuthorization (EIP-3009)

### 3. Avalanche Network

**Decision**: Primary deployment on Avalanche (Fuji testnet, then mainnet).

**Rationale**:
- Build Games hackathon requirement
- Fast finality for payment confirmation
- Low gas costs
- Growing DeFi ecosystem

### 4. 5 Initial Policies

**Decision**: Launch with exactly 5 trust policies:

1. **TLS Certificate** (Identity) - SSL/TLS validation
2. **DNS Security** (Identity) - DNSSEC, SPF, DMARC
3. **Infrastructure** (Infrastructure) - Cloud provider, security headers
4. **FIAT Compliance** (FIAT) - Payment processor detection
5. **Protocol Policy** (Policy) - x402/ERC-8004 compliance

**Rationale**:
- Covers essential security vectors
- Extensible via BaseCheck
- Manageable for hackathon timeline
- Each has clear scoring criteria

### 5. Hexagonal Architecture

**Decision**: Core (sentinel) uses ports/adapters pattern.

**Rationale**:
- Core never imports from apps
- Easy to swap payment rails
- Testable in isolation
- Future-proof for new integrations

### 6. Agent-First API

**Decision**: API designed for autonomous agents, not just humans.

**Rationale**:
- Primary use case is AI agent payments
- Simple boolean API: `canPay()`, `trust()`
- Rich decision API: `decide()` with reasoning
- Budget/capability aware

---

## Technical Decisions

### Package Structure

```
@snowrail/sentinel  <- SDK (npm publishable)
@snowrail/yuki      <- AI assistant (internal)
@snowrail/backend   <- API server (deployable)
```

### Dependencies

- **Runtime**: Node.js 20.x
- **Build**: TypeScript 5.x, tsup
- **Monorepo**: pnpm + turborepo
- **API**: Express.js
- **Contracts**: Solidity 0.8.20, Hardhat

### Scoring Algorithm

```
TrustScore = SUM(check.score * check.weight) / SUM(weights)
```

Weights:
- TLS: 1.5
- DNS: 1.2
- Infrastructure: 1.0
- FIAT: 1.3
- Policy: 1.4

Thresholds:
- 80+: APPROVE (low risk)
- 60-79: CONDITIONAL (medium risk)
- 40-59: REVIEW (high risk)
- <40: DENY (critical risk)

---

## Product Roadmap

### v2.0 (Current - Hackathon)

- SENTINEL SDK with 5 policies
- X402 payment flow
- USDC integration
- Basic YUKI assistant

### v2.1 (Post-Hackathon)

- Reputation scoring (historical data)
- On-chain attestations
- Multi-chain support

### v2.2 (Future)

- ZK trust proofs
- Decentralized reputation
- DAO governance for policies

---

## Non-Goals (Explicitly Out of Scope)

1. Native token payments
2. Cross-chain bridges
3. NFT payments
4. Fiat on/off ramps
5. KYC/AML (delegated to payment processors)

---

Document generated: 2026-01-26
