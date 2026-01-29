# Architecture Boundaries

This document describes the architectural boundaries enforced in the SnowRail codebase through automated ESLint rules.

## Overview

SnowRail follows **Hexagonal Architecture** (Ports & Adapters) to maintain clean separation of concerns and enforce dependency rules. The `eslint-plugin-boundaries` ensures these rules are automatically validated during development and CI.

## Architecture Layers

```
snowrail-core/
├── apps/                    # Application layer
│   ├── backend/            # Backend application
│   └── frontend/           # Frontend application
│
└── packages/               # Reusable packages
    ├── sentinel/
    │   ├── core/          # Domain logic (no external dependencies)
    │   ├── adapters/      # External integrations
    │   └── ports/         # Interfaces
    └── yuki/
        ├── core/          # Domain logic
        ├── adapters/      # External integrations
        └── ports/         # Interfaces
```

## Dependency Rules

### 1. Apps → Packages (✅ ALLOWED)

**Rule**: Applications can import from packages, but **never** the other way around.

**Rationale**: Packages are reusable components. If they depend on specific apps, they become coupled and non-reusable.

**Examples**:

```typescript
// ✅ ALLOWED: Apps importing packages
// apps/backend/src/server.ts
import { Sentinel } from '@snowrail/sentinel';
import { Yuki } from '@snowrail/yuki';
```

```typescript
// ❌ FORBIDDEN: Packages importing apps
// packages/sentinel/src/core/engine.ts
import { something } from '../../../apps/backend/...'; // ESLint error!
```

### 2. Adapters → Core (✅ ALLOWED)

**Rule**: Adapters can import from core, but **never** the other way around.

**Rationale**: Core contains domain logic and should be independent of external implementations. Adapters implement the ports defined in core.

**Examples**:

```typescript
// ✅ ALLOWED: Adapters importing core
// packages/sentinel/src/adapters/x402.ts
import { PaymentFacilitatorPort } from '../ports/payment';
import { TrustCheck } from '../core/trust';

export class X402Adapter implements PaymentFacilitatorPort {
  // Implementation...
}
```

```typescript
// ❌ FORBIDDEN: Core importing adapters
// packages/sentinel/src/core/engine.ts
import { X402Adapter } from '../adapters/x402'; // ESLint error!

// Instead, use dependency injection via ports:
import { PaymentFacilitatorPort } from '../ports/payment';
```

### 3. Adapters → Adapters (✅ ALLOWED)

**Rule**: Adapters can import other adapters when needed for composition.

**Rationale**: Sometimes adapters need to compose or decorate other adapters.

**Examples**:

```typescript
// ✅ ALLOWED: Adapter importing another adapter
// packages/sentinel/src/adapters/cached-payment.ts
import { X402Adapter } from './x402';

export class CachedPaymentAdapter {
  constructor(private wrapped: X402Adapter) {}
}
```

## ESLint Configuration

The boundaries are enforced through `.eslintrc.json`:

```json
{
  "plugins": ["boundaries"],
  "settings": {
    "boundaries/elements": [
      { "type": "apps", "pattern": "apps/*" },
      { "type": "packages", "pattern": "packages/*" },
      { "type": "core", "pattern": "packages/*/src/core/**/*" },
      { "type": "adapters", "pattern": "packages/*/src/adapters/**/*" }
    ]
  },
  "rules": {
    "boundaries/element-types": [
      "error",
      {
        "default": "disallow",
        "rules": [
          { "from": "apps", "allow": ["packages"] },
          { "from": "packages", "disallow": ["apps"] },
          { "from": "adapters", "allow": ["core", "adapters"] },
          { "from": "core", "disallow": ["adapters"] }
        ]
      }
    ]
  }
}
```

## Validation

### Running Locally

```bash
# Lint all packages
pnpm lint

# Lint specific package
pnpm --filter @snowrail/sentinel lint
```

### CI Enforcement

The boundaries are automatically validated in CI pipelines. Pull requests that violate these rules will fail the lint check.

## Common Violations and Fixes

### Violation: Core importing from Adapters

**❌ Problem**:
```typescript
// packages/sentinel/src/core/engine.ts
import { X402Adapter } from '../adapters/x402';

const facilitator = new X402Adapter();
```

**✅ Solution**: Use dependency injection via ports
```typescript
// packages/sentinel/src/core/engine.ts
import { PaymentFacilitatorPort } from '../ports/payment';

class Engine {
  constructor(private facilitator: PaymentFacilitatorPort) {}
}

// Wire dependencies at app level
// apps/backend/src/server.ts
import { Engine } from '@snowrail/sentinel';
import { X402Adapter } from '@snowrail/sentinel/adapters';

const facilitator = new X402Adapter();
const engine = new Engine(facilitator);
```

### Violation: Package importing from Apps

**❌ Problem**:
```typescript
// packages/sentinel/src/index.ts
import { config } from '../../apps/backend/config';
```

**✅ Solution**: Pass configuration as parameters
```typescript
// packages/sentinel/src/index.ts
export class Sentinel {
  constructor(config: SentinelConfig) {
    // Use config
  }
}

// apps/backend/src/server.ts
import { Sentinel } from '@snowrail/sentinel';
import { config } from './config';

const sentinel = new Sentinel(config.sentinel);
```

## Benefits

1. **Maintainability**: Clear separation of concerns
2. **Testability**: Core logic can be tested without external dependencies
3. **Reusability**: Packages remain independent and reusable
4. **Refactoring Safety**: Automated validation prevents architectural drift
5. **Onboarding**: New developers understand the architecture through tooling

## References

- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)
- [eslint-plugin-boundaries](https://github.com/javierbrea/eslint-plugin-boundaries)
- Related: [MULTICHAIN_DESIGN.md](./MULTICHAIN_DESIGN.md)

## Questions?

If you're unsure whether an import is allowed, run `pnpm lint` to check. The error message will clearly indicate if you're violating a boundary rule.
