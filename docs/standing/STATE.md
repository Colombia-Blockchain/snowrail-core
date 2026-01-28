# SnowRail Core - State Document

**Version:** 2.0.1
**Date:** 2026-01-28 (Updated)
**Branch:** feat/contracts
**Commit:** 883dd1f

---

## Health Matrix (Validated 2026-01-27)

| Operation | Status | Notes |
|-----------|--------|-------|
| pnpm install | **PASS** | 761 packages |
| pnpm build | **PASS** | 4/4 packages (warnings on exports order) |
| pnpm test | **PASS** | 6/6 tests passing |
| pnpm lint | **PASS** | ESLint configured |
| pnpm typecheck | **PASS** | No TS errors |

### Build Output

```
@snowrail/sentinel:build   -> dist/index.js, dist/index.mjs, dist/index.d.ts
@snowrail/yuki:build       -> dist/index.js, dist/index.mjs, dist/index.d.ts
@snowrail/backend:build    -> Built successfully
@snowrail/frontend:build   -> tsc --noEmit passed
```

### Warnings (Non-blocking)

```
Warning: "types" condition in package.json exports comes after "import"/"require"
Affected: packages/sentinel/package.json, packages/yuki/package.json
Fix: Reorder exports to put "types" first
```

---

## Module Status

| Module | Path | Status | Tests | Description |
|--------|------|--------|-------|-------------|
| @snowrail/sentinel | packages/sentinel | **GREEN** | 5/5 | Trust Layer SDK |
| @snowrail/yuki | packages/yuki | **GREEN** | 4/4 | AI Assistant |
| @snowrail/backend | apps/backend | **GREEN** | N/A | API Server |
| @snowrail/frontend | apps/frontend | **PARTIAL** | N/A | React components |
| contracts | contracts/ | **GREEN** | N/A | Treasury, Mixer, MockUSDC |

---

## Architecture Status

```
packages/
  sentinel/              <- CORE (Trust Layer) - GREEN
    src/
      core/engine.ts     <- Sentinel class (746 lines)
      checks/            <- 11 security checks implemented
      ports/             <- 5 port interfaces defined
      adapters/          <- X402, ERC-8004 adapters
      types/             <- Complete TypeScript definitions
  yuki/                  <- AI Assistant - GREEN

apps/
  backend/               <- Express API - GREEN
    src/server.ts        <- Imports from @snowrail/sentinel
  frontend/              <- React UI - PARTIAL (needs integration)

contracts/               <- Solidity - GREEN (DEPLOYED to Fuji)
  SnowRailTreasury.sol   <- 596 lines (0x79fa1E26938763Db1AD3d6d40bf79f3a23aE60dd)
  SnowRailMixer.sol      <- 346 lines (0xE05DC7789038C669652bF3BfE4Fb684b7F420fCD)
  MockUSDC.sol           <- Test token (0x7435BB56D89Cf26A03fabaE6fA36b66295a2A676)
```

---

## Milestone Status (Plan Maestro)

| Hito | Description | Status | Evidence |
|------|-------------|--------|----------|
| M0 | Single Source of Truth | **COMPLETE** | docs/standing/*.md exist |
| M1 | Core Green (Sentinel compiles) | **COMPLETE** | `pnpm build` passes |
| M2 | Backend as adapter | **COMPLETE** | server.ts imports @snowrail/sentinel |
| M3 | Tru Validation + 5 policies | **COMPLETE** | docs/core/TRU_VALIDATION.md |
| M4 | Hexagonal architecture | **PARTIAL** | Ports/adapters exist, missing eslint boundaries |
| M5 | X402 Facilitator adapter | **COMPLETE** | adapters/x402.ts implemented |
| M6 | E2E Flow | **PARTIAL** | Endpoints exist, contracts not deployed |
| M7 | SDKization | **PARTIAL** | Basic READMEs, missing curl examples |
| M8 | Extensibility (8004) | **PARTIAL** | Port defined, adapter is stub |

---

## Deployed Contracts (Fuji Testnet)

| Contract | Address | Verified |
|----------|---------|----------|
| MockUSDC | `0x7435BB56D89Cf26A03fabaE6fA36b66295a2A676` | [Verified](https://testnet.snowtrace.io/address/0x7435BB56D89Cf26A03fabaE6fA36b66295a2A676#code) |
| SnowRailTreasury | `0x79fa1E26938763Db1AD3d6d40bf79f3a23aE60dd` | [Verified](https://testnet.snowtrace.io/address/0x79fa1E26938763Db1AD3d6d40bf79f3a23aE60dd#code) |
| SnowRailMixer | `0xE05DC7789038C669652bF3BfE4Fb684b7F420fCD` | [Verified](https://testnet.snowtrace.io/address/0xE05DC7789038C669652bF3BfE4Fb684b7F420fCD#code) |

Deployer: `0x22f6F000609d52A0b0efCD4349222cd9d70716Ba`

**Roles Configured:**
- SENTINEL_ROLE: Granted to deployer
- OPERATOR_ROLE: Granted to deployer
- ADMIN_ROLE: Granted to deployer

---

## Gaps for Production

| ID | Type | Description | Priority |
|----|------|-------------|----------|
| GAP-1 | CONFIG | Package.json exports order (warnings) | LOW |
| ~~GAP-2~~ | ~~INFRA~~ | ~~Contracts not deployed to Fuji~~ | ~~RESOLVED~~ |
| GAP-3 | TEST | No E2E tests (only unit tests) | HIGH |
| GAP-4 | DOCS | Missing Postman/curl collection | MEDIUM |
| GAP-5 | ARCH | Missing eslint boundary rules | HIGH |
| GAP-6 | CONFIG | USDC addresses hardcoded | MEDIUM |

---

## Comparison: Original Standing Report vs Current

The original `standing-report.md` documented issues that have been resolved:

| Original Issue | Current Status |
|----------------|----------------|
| 9 TS errors in sentinel | **RESOLVED** - 0 errors |
| 8+ TS errors in backend | **RESOLVED** - 0 errors |
| Backend duplicates validateUrl() | **RESOLVED** - Uses @snowrail/sentinel |
| ESLint missing config | **RESOLVED** - Configured |
| Frontend missing package.json | **RESOLVED** - Exists |
| pnpm build FAIL | **RESOLVED** - PASS |
| pnpm test FAIL | **RESOLVED** - PASS |

---

## Key Decisions (Unchanged)

1. **USDC Only**: All payments use USDC (ERC-20), never native tokens
2. **Hexagonal Architecture**: Core (sentinel) has ports/adapters pattern
3. **Single Source of Truth**: Backend imports from @snowrail/sentinel
4. **5 Initial Policies**: TLS, DNS, Infrastructure, FIAT, Protocol Policy
5. **Chain**: Avalanche Fuji (testnet) for hackathon

---

## Next Steps (Prioritized)

### Critical Path for Demo

1. ~~**TASK-001**: Deploy contracts to Fuji~~ **COMPLETE**
2. **TASK-002**: Connect backend to Treasury contract
3. **TASK-003**: Create E2E test script

### Quality Improvements

4. **TASK-004**: Configure ESLint boundaries
5. **TASK-005**: Fix package.json exports order
6. **TASK-013**: Add integration tests

### Documentation

7. **TASK-007**: Complete @snowrail/sentinel README
8. **TASK-008**: Create Postman collection

See `docs/TASK_BACKLOG.md` for full task breakdown.

---

## Commands Quick Reference

```bash
# Development
pnpm dev                     # Start backend in dev mode
pnpm build                   # Build all packages
pnpm test                    # Run all tests
pnpm lint                    # Run linter

# Specific packages
pnpm --filter @snowrail/sentinel build
pnpm --filter @snowrail/sentinel test

# Contracts - Full Deploy
pnpm hardhat compile
pnpm hardhat test
pnpm hardhat run scripts/deploy.ts --network fuji

# Contracts - Individual Deploy (Recommended)
pnpm hardhat run scripts/deploy-usdc.ts --network fuji
pnpm hardhat run scripts/deploy-treasury.ts --network fuji
pnpm hardhat run scripts/setup-roles.ts --network fuji

# Verify on Snowtrace
pnpm hardhat verify --network fuji <CONTRACT_ADDRESS> [CONSTRUCTOR_ARGS...]
```

---

*Document validated: 2026-01-28*
*Validator: Claude Code*
*Status: GREEN - Contracts deployed to Fuji*
