# SnowRail Core - Documentation Index

**Version:** 2.0.1
**Last Updated:** 2026-01-28

---

## Quick Navigation

### For Developers (Start Here)

| Document | Purpose | Priority |
|----------|---------|----------|
| [DEV_IMPLEMENTATION_GUIDE.md](./DEV_IMPLEMENTATION_GUIDE.md) | Complete development guide with architecture, flows, and tasks | **START HERE** |
| [TASK_BACKLOG.md](./TASK_BACKLOG.md) | Detailed task breakdown with acceptance criteria | **For Sprint Planning** |
| [standing/STATE.md](./standing/STATE.md) | Current project health and status | **Check First** |

### Architecture

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE_DIAGRAMS.md) | Visual diagrams (Mermaid) of system architecture |
| [architecture/MULTICHAIN_DESIGN.md](./architecture/MULTICHAIN_DESIGN.md) | Multichain extension design and chain registry |
| [standing/DECISIONS.md](./standing/DECISIONS.md) | Product and technical decisions |

### Smart Contracts

| Document | Purpose |
|----------|---------|
| [contracts/DEPLOYMENT.md](./contracts/DEPLOYMENT.md) | **NEW** Complete deployment guide for Fuji testnet |
| [contracts/INTEGRATION.md](./contracts/INTEGRATION.md) | **NEW** How to integrate contracts into your app |

### API & Specifications

| Document | Purpose |
|----------|---------|
| [core/TRU_VALIDATION.md](./core/TRU_VALIDATION.md) | Trust validation contract specification |
| [Plan Maestro...](./Plan%20Maestro%20por%20hitos%20-%20Trust%20Layer%20+%20Sentinel%20+%20pol%C3%ADticas%20pre-pago%20(1).md) | Original milestone plan |

---

## Document Map

```
docs/
├── INDEX.md                          <- YOU ARE HERE
│
├── DEV_IMPLEMENTATION_GUIDE.md       <- Main developer guide
│   ├── Estado Actual vs Plan Maestro
│   ├── Arquitectura Hexagonal Multichain
│   ├── Mapa de Dependencias
│   ├── Flujo E2E Completo
│   ├── Descomposicion de Hitos en Tasks
│   ├── Testing Strategy
│   ├── Guia de Extensibilidad
│   └── Configuracion por Entorno
│
├── TASK_BACKLOG.md                   <- Sprint planning
│   ├── Sprint 1: E2E Demo Ready (CRITICAL)
│   ├── Sprint 2: Architecture & Quality (HIGH)
│   ├── Sprint 3: Documentation (MEDIUM)
│   ├── Sprint 4: Extensibility (MEDIUM)
│   └── Sprint 5: Testing & CI (HIGH)
│
├── ARCHITECTURE_DIAGRAMS.md          <- Visual reference
│   ├── System Architecture
│   ├── Payment Flow Sequence
│   ├── SENTINEL Validation Flow
│   └── Trust Score Decision Matrix
│
├── architecture/
│   └── MULTICHAIN_DESIGN.md          <- Chain extension guide
│       ├── Chain Configuration Schema
│       ├── Chain Registry Service
│       ├── Multichain Adapter Pattern
│       └── Adding New Chains
│
├── contracts/                         <- NEW: Smart contract docs
│   ├── DEPLOYMENT.md                 <- Deployment guide
│   │   ├── Prerequisites
│   │   ├── Deployment Commands
│   │   ├── Contract Verification
│   │   ├── Contract Details
│   │   └── Troubleshooting
│   │
│   └── INTEGRATION.md                <- Integration guide
│       ├── Contract ABIs
│       ├── Common Operations
│       ├── Role Management
│       ├── Events
│       └── Error Handling
│
├── core/
│   └── TRU_VALIDATION.md             <- API contract
│       ├── ValidationRequest spec
│       ├── ValidationResult spec
│       ├── 5 Initial Policies
│       └── Score Calculation
│
├── standing/
│   ├── STATE.md                      <- Current status
│   └── DECISIONS.md                  <- Product decisions
│
└── Plan Maestro...md                 <- Original roadmap
```

---

## Reading Order

### New to the Project?

1. **[standing/STATE.md](./standing/STATE.md)** - Understand current health
2. **[standing/DECISIONS.md](./standing/DECISIONS.md)** - Understand product direction
3. **[DEV_IMPLEMENTATION_GUIDE.md](./DEV_IMPLEMENTATION_GUIDE.md)** - Full context

### Ready to Contribute?

1. **[TASK_BACKLOG.md](./TASK_BACKLOG.md)** - Pick a task
2. **[DEV_IMPLEMENTATION_GUIDE.md](./DEV_IMPLEMENTATION_GUIDE.md)** - Reference during implementation
3. **[core/TRU_VALIDATION.md](./core/TRU_VALIDATION.md)** - API contracts

### Adding New Features?

1. **[DEV_IMPLEMENTATION_GUIDE.md#7-guia-de-extensibilidad](./DEV_IMPLEMENTATION_GUIDE.md)** - Extension patterns
2. **[architecture/MULTICHAIN_DESIGN.md](./architecture/MULTICHAIN_DESIGN.md)** - For chain support

---

## Key Concepts

| Term | Definition | Location |
|------|------------|----------|
| **SENTINEL** | Trust validation engine (core SDK) | packages/sentinel |
| **YUKI** | AI assistant for payments | packages/yuki |
| **Tru Validation** | Output contract of trust check | docs/core/TRU_VALIDATION.md |
| **x402** | Payment protocol for AI agents | HTTP 402 standard |
| **ERC-8004** | Agent identity standard | Ethereum proposal |
| **Trust Score** | 0-100 score indicating URL trustworthiness | SENTINEL output |
| **Check** | Individual validation rule (TLS, DNS, etc.) | BaseCheck class |
| **Port** | Interface for external integrations | Hexagonal pattern |
| **Adapter** | Implementation of a port | Hexagonal pattern |

---

## Quick Links

### Source Code

- **Sentinel SDK**: `packages/sentinel/src/`
- **Backend API**: `apps/backend/src/server.ts`
- **Smart Contracts**: `contracts/`

### Deployed Contracts (Fuji)

| Contract | Address |
|----------|---------|
| MockUSDC | `0x7435BB56D89Cf26A03fabaE6fA36b66295a2A676` |
| SnowRailTreasury | `0x79fa1E26938763Db1AD3d6d40bf79f3a23aE60dd` |
| SnowRailMixer | `0xE05DC7789038C669652bF3BfE4Fb684b7F420fCD` |

### Configuration

- **Root package.json**: `./package.json`
- **Turbo config**: `./turbo.json`
- **TypeScript config**: `./tsconfig.json`
- **Hardhat config**: `./hardhat.config.ts`

### Tests

- **Sentinel tests**: `packages/sentinel/src/__tests__/`
- **Yuki tests**: `packages/yuki/src/__tests__/`

---

## Changelog

| Date | Changes |
|------|---------|
| 2026-01-28 | **NEW** Added contracts/DEPLOYMENT.md and contracts/INTEGRATION.md |
| 2026-01-28 | Deployed and verified all contracts on Fuji testnet |
| 2026-01-27 | Added DEV_IMPLEMENTATION_GUIDE.md, TASK_BACKLOG.md, MULTICHAIN_DESIGN.md |
| 2026-01-27 | Updated STATE.md with current validation |
| 2026-01-26 | Initial documentation (ARCHITECTURE_DIAGRAMS.md, TRU_VALIDATION.md) |

---

*Index maintained by: Architecture Team*
*Last review: 2026-01-28*
