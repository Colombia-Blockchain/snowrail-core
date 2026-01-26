# SnowRail Core - State Document

Version: 2.0.0
Date: 2026-01-26
Branch: main

---

## Health Matrix

| Operation | Status | Notes |
|-----------|--------|-------|
| pnpm install | PASS | 761 packages |
| pnpm build | PASS | All packages compile |
| pnpm test | PASS | Sentinel tests pass |
| pnpm lint | PASS | ESLint configured |
| pnpm typecheck | PASS | No TS errors |

---

## Module Status

| Module | Path | Status | Description |
|--------|------|--------|-------------|
| @snowrail/sentinel | packages/sentinel | GREEN | Trust Layer SDK |
| @snowrail/yuki | packages/yuki | GREEN | AI Assistant |
| @snowrail/backend | apps/backend | GREEN | API Server |
| apps/frontend | apps/frontend | PARTIAL | React components (no package.json) |
| contracts | contracts/ | GREEN | Treasury, Mixer, MockUSDC |

---

## Architecture

```
packages/
  sentinel/         <- CORE (Trust Layer)
    src/
      core/         <- Engine
      checks/       <- 5 Policy checks (TLS, DNS, Infra, FIAT, Policy)
      ports/        <- Hexagonal interfaces
      adapters/     <- X402, ERC-8004 implementations
      types/        <- TypeScript definitions
  yuki/             <- AI Assistant

apps/
  backend/          <- Express API (consumes @snowrail/sentinel)
  frontend/         <- React UI (partial)

contracts/
  SnowRailTreasury.sol
  SnowRailMixer.sol
  MockUSDC.sol
```

---

## Key Decisions

1. **USDC Only**: All payments use USDC (ERC-20), never native tokens
2. **Hexagonal Architecture**: Core (sentinel) has ports/adapters pattern
3. **Single Source of Truth**: Backend imports from @snowrail/sentinel, no duplication
4. **5 Initial Policies**: TLS, DNS, Infrastructure, FIAT, Protocol Policy
5. **Chain**: Avalanche Fuji (testnet) for hackathon

---

## Blockers

None. All milestones M0-M8 are complete.

---

## Next Steps

1. Deploy contracts to Fuji
2. Configure USDC addresses
3. Run E2E demo
4. Submit to Build Games

---

Document generated: 2026-01-26
