# SnowRail Core - Task Backlog

**Version:** 1.0.0
**Date:** 2026-01-27
**Status:** Ready for Development

---

## Resumen de Prioridades

| Prioridad | Criterio | Ejemplos |
|-----------|----------|----------|
| **CRITICAL** | Bloquea hackathon demo | Deploy contracts, E2E flow |
| **HIGH** | Necesario para MVP | Boundaries, configs, docs |
| **MEDIUM** | Mejora calidad/DX | READMEs, tests adicionales |
| **LOW** | Post-hackathon | npm publish, CI/CD avanzado |

---

## Sprint 1: E2E Demo Ready (CRITICAL)

### TASK-001: Deploy Contracts a Fuji
```yaml
id: TASK-001
title: Deploy Treasury y MockUSDC a Avalanche Fuji
priority: CRITICAL
estimate: 2-4h
status: TODO
owner: TBD

description: |
  Desplegar los smart contracts necesarios para el flujo E2E en la
  testnet Fuji de Avalanche.

acceptance_criteria:
  - [ ] MockUSDC desplegado y verificado en Snowtrace Fuji
  - [ ] SnowRailTreasury desplegado y verificado
  - [ ] Treasury tiene SENTINEL_ROLE configurado
  - [ ] Addresses guardados en .env.fuji

files_to_modify:
  - scripts/deploy.ts
  - .env.fuji (crear)
  - docs/standing/STATE.md (actualizar addresses)

commands:
  - pnpm hardhat run scripts/deploy.ts --network fuji
  - pnpm hardhat verify --network fuji <TREASURY_ADDRESS>

dependencies: []

notes: |
  - Usar USDC oficial de Fuji: 0x5425890298aed601595a70AB815c96711a31Bc65
  - O desplegar MockUSDC si se necesita mint libre
  - PRIVATE_KEY debe tener AVAX para gas
```

### TASK-002: Conectar Backend a Treasury Contract
```yaml
id: TASK-002
title: Implementar llamada real a Treasury.executeX402Payment()
priority: CRITICAL
estimate: 4-6h
status: TODO
owner: TBD

description: |
  El endpoint /v1/payments/x402/confirm actualmente es mock.
  Conectarlo al contrato Treasury desplegado para ejecutar
  el pago real en blockchain.

acceptance_criteria:
  - [ ] POST /v1/payments/x402/confirm ejecuta tx on-chain
  - [ ] Retorna txHash real de Fuji
  - [ ] Maneja errores de tx (insufficient balance, reverts)
  - [ ] Logs incluyen txHash para debugging

files_to_modify:
  - apps/backend/src/server.ts
  - apps/backend/src/services/treasury.ts (crear)

code_snippet: |
  // services/treasury.ts
  import { ethers } from 'ethers';
  import TreasuryABI from '../../../contracts/artifacts/SnowRailTreasury.json';

  export async function executePayment(intent: PaymentIntent, signature: string) {
    const provider = new ethers.JsonRpcProvider(process.env.AVALANCHE_RPC_URL);
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const treasury = new ethers.Contract(
      process.env.TREASURY_ADDRESS,
      TreasuryABI.abi,
      signer
    );

    const tx = await treasury.executeX402Payment(
      intent.recipient,
      intent.amount,
      signature,
      intent.validUntil
    );

    return tx.wait();
  }

dependencies:
  - TASK-001 (Contracts deployed)

notes: |
  - Considerar usar @openzeppelin/defender para tx management
  - Agregar retry logic para tx fallidas
```

### TASK-003: Script E2E Test
```yaml
id: TASK-003
title: Crear script de test E2E automatizado
priority: CRITICAL
estimate: 3-4h
status: TODO
owner: TBD

description: |
  Script que ejecuta el flujo completo de pago para validar
  que todo funciona end-to-end antes de la demo.

acceptance_criteria:
  - [ ] Script ejecutable: pnpm e2e
  - [ ] Flujo: validate -> intent -> sign -> confirm
  - [ ] Output muestra cada paso con colores
  - [ ] Al final muestra link a Snowtrace con tx

files_to_modify:
  - scripts/e2e-test.ts (crear)
  - package.json (agregar script)

code_snippet: |
  // scripts/e2e-test.ts
  async function runE2ETest() {
    console.log('=== SnowRail E2E Test ===\n');

    // Step 1: Validate URL
    console.log('1. Validating URL...');
    const validation = await fetch(`${API_URL}/v1/sentinel/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: TEST_URL, amount: 100 })
    }).then(r => r.json());
    console.log(`   Trust Score: ${validation.trustScore}`);
    console.log(`   Can Pay: ${validation.canPay}\n`);

    if (!validation.canPay) {
      console.error('FAILED: URL did not pass validation');
      process.exit(1);
    }

    // Step 2: Create intent
    // Step 3: Sign
    // Step 4: Confirm
    // Step 5: Verify on chain
  }

dependencies:
  - TASK-001
  - TASK-002

notes: |
  - Usar wallet de test con USDC pre-funded
  - Guardar txHash para verificacion manual
```

---

## Sprint 2: Architecture & Quality (HIGH)

### TASK-004: Configurar ESLint Boundaries
```yaml
id: TASK-004
title: Enforcar reglas de import con eslint-plugin-boundaries
priority: HIGH
estimate: 2-3h
status: TODO
owner: TBD

description: |
  Agregar eslint-plugin-boundaries para prevenir que packages/
  importe de apps/ y mantener la arquitectura hexagonal.

acceptance_criteria:
  - [ ] pnpm lint falla si packages/* importa de apps/*
  - [ ] pnpm lint falla si core/* importa de adapters/*
  - [ ] Reglas documentadas en .eslintrc.js

files_to_modify:
  - .eslintrc.js
  - package.json (devDependencies)

code_snippet: |
  // .eslintrc.js
  module.exports = {
    plugins: ['@typescript-eslint', 'boundaries'],
    settings: {
      'boundaries/elements': [
        { type: 'core', pattern: 'packages/*/src/core/*' },
        { type: 'adapters', pattern: 'packages/*/src/adapters/*' },
        { type: 'packages', pattern: 'packages/*' },
        { type: 'apps', pattern: 'apps/*' },
      ]
    },
    rules: {
      'boundaries/element-types': [2, {
        default: 'disallow',
        rules: [
          { from: 'apps', allow: ['packages'] },
          { from: 'packages', allow: ['packages'], disallow: ['apps'] },
          { from: 'core', allow: ['core'], disallow: ['adapters'] },
          { from: 'adapters', allow: ['core', 'adapters'] },
        ]
      }]
    }
  };

dependencies: []
```

### TASK-005: Fix Package.json Exports Order
```yaml
id: TASK-005
title: Resolver warnings de tsup sobre exports order
priority: HIGH
estimate: 30m
status: TODO
owner: TBD

description: |
  tsup muestra warnings porque "types" viene despues de
  "import"/"require" en package.json exports.

acceptance_criteria:
  - [ ] pnpm build sin warnings
  - [ ] Types siguen funcionando correctamente

files_to_modify:
  - packages/sentinel/package.json
  - packages/yuki/package.json

code_snippet: |
  // ANTES (warning)
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  }

  // DESPUES (correcto)
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js"
    }
  }

dependencies: []
```

### TASK-006: Parametrizar Chains via Config
```yaml
id: TASK-006
title: Mover SUPPORTED_CHAINS a configuracion externa
priority: HIGH
estimate: 2-3h
status: TODO
owner: TBD

description: |
  Actualmente las chains estan hardcodeadas en el adapter.
  Moverlas a un archivo de configuracion para facilitar
  agregar nuevas chains sin modificar codigo.

acceptance_criteria:
  - [ ] Chains definidas en config/chains.json
  - [ ] Nueva chain se agrega editando JSON, no codigo
  - [ ] Validacion de chain config al startup

files_to_modify:
  - packages/sentinel/src/adapters/x402.ts
  - config/chains.json (crear)
  - packages/sentinel/src/config/index.ts (crear)

code_snippet: |
  // config/chains.json
  {
    "avalanche-fuji": {
      "chainId": 43113,
      "name": "Avalanche Fuji",
      "rpcUrl": "https://api.avax-test.network/ext/bc/C/rpc",
      "usdc": {
        "address": "0x5425890298aed601595a70AB815c96711a31Bc65",
        "decimals": 6
      },
      "contracts": {
        "treasury": null,
        "mixer": null
      },
      "explorer": "https://testnet.snowtrace.io"
    }
  }

dependencies: []
```

---

## Sprint 3: Documentation (MEDIUM)

### TASK-007: README de @snowrail/sentinel
```yaml
id: TASK-007
title: Crear README completo para el SDK Sentinel
priority: MEDIUM
estimate: 2h
status: TODO
owner: TBD

description: |
  README que permita a un desarrollador externo integrar
  Sentinel en menos de 5 minutos.

acceptance_criteria:
  - [ ] Quick start en 3 lineas de codigo
  - [ ] Todos los metodos documentados
  - [ ] Ejemplos de configuracion
  - [ ] TypeScript types explicados

files_to_modify:
  - packages/sentinel/README.md

template: |
  # @snowrail/sentinel

  Trust validation engine for AI agent payments.

  ## Installation

  ```bash
  npm install @snowrail/sentinel
  ```

  ## Quick Start

  ```typescript
  import { createSentinel } from '@snowrail/sentinel';

  const sentinel = createSentinel();
  const canPay = await sentinel.canPay('https://merchant.com');
  ```

  ## API Reference

  ### sentinel.canPay(url)
  ...

dependencies: []
```

### TASK-008: Coleccion Postman/curl
```yaml
id: TASK-008
title: Crear coleccion de requests para testing manual
priority: MEDIUM
estimate: 2h
status: TODO
owner: TBD

description: |
  Documentacion de endpoints con ejemplos listos para
  copiar/pegar en terminal o Postman.

acceptance_criteria:
  - [ ] Todos los endpoints documentados
  - [ ] Ejemplos curl funcionan copy/paste
  - [ ] Variables de entorno explicadas
  - [ ] Flujo E2E paso a paso

files_to_modify:
  - docs/api/ENDPOINTS.md (crear)
  - docs/api/postman-collection.json (crear)

template: |
  # API Endpoints

  ## Sentinel Validation

  ### POST /v1/sentinel/validate

  Validate a URL for trust before payment.

  ```bash
  curl -X POST http://localhost:3000/v1/sentinel/validate \
    -H "Content-Type: application/json" \
    -d '{"url": "https://example.com", "amount": 100}'
  ```

  Response:
  ```json
  {
    "trustScore": 87,
    "canPay": true,
    "decision": "conditional"
  }
  ```

dependencies: []
```

### TASK-009: Guia de Agregar Checks
```yaml
id: TASK-009
title: Documentar como extender Sentinel con nuevos Checks
priority: MEDIUM
estimate: 1.5h
status: TODO
owner: TBD

description: |
  Guia paso a paso para que otros devs puedan agregar
  nuevos checks de validacion.

acceptance_criteria:
  - [ ] Template de Check incluido
  - [ ] Explicacion de BaseCheck
  - [ ] Ejemplo completo funcional
  - [ ] Como agregar tests

files_to_modify:
  - docs/guides/ADDING_CHECKS.md (crear)

dependencies: []
```

---

## Sprint 4: Extensibility (MEDIUM)

### TASK-010: Completar AgentDescriptorAdapter
```yaml
id: TASK-010
title: Implementar adapter ERC-8004 completo
priority: MEDIUM
estimate: 4h
status: TODO
owner: TBD

description: |
  El adapter stub existe. Implementar los metodos para
  consultar el Agent Registry on-chain.

acceptance_criteria:
  - [ ] getAgentCard(address) retorna datos del agent
  - [ ] verifyAgent(address) verifica firma del agent
  - [ ] Tests con mock contract pasan

files_to_modify:
  - packages/sentinel/src/adapters/erc8004.ts
  - packages/sentinel/src/__tests__/erc8004.test.ts (crear)

dependencies:
  - Requiere definir ABI de AgentRegistry
```

### TASK-011: Check de Agent Identity
```yaml
id: TASK-011
title: Agregar check que verifica identidad del agent
priority: MEDIUM
estimate: 3h
status: TODO
owner: TBD

description: |
  Nuevo check que consulta el AgentRegistry para verificar
  que el sender tiene una identidad registrada.

acceptance_criteria:
  - [ ] Check implementado extendiendo BaseCheck
  - [ ] Score basado en trust level del agent
  - [ ] Configurable (enabled: true/false)
  - [ ] Tests unitarios

files_to_modify:
  - packages/sentinel/src/checks/agent-identity.ts (crear)
  - packages/sentinel/src/checks/index.ts

dependencies:
  - TASK-010
```

### TASK-012: Implementar USDCRailAdapter
```yaml
id: TASK-012
title: Adapter completo para operaciones USDC
priority: MEDIUM
estimate: 3h
status: TODO
owner: TBD

description: |
  El USDCRailPort esta definido pero no tiene adapter.
  Implementar para operaciones ERC-20.

acceptance_criteria:
  - [ ] transfer() ejecuta transferFrom
  - [ ] balanceOf() consulta balance
  - [ ] approve() da allowance
  - [ ] Tests con MockUSDC

files_to_modify:
  - packages/sentinel/src/adapters/usdc.ts (crear)
  - packages/sentinel/src/adapters/index.ts

code_snippet: |
  export class USDCRailAdapter implements USDCRailPort {
    private contract: ethers.Contract;

    constructor(address: string, provider: ethers.Provider) {
      this.contract = new ethers.Contract(address, ERC20_ABI, provider);
    }

    async transfer(to: string, amount: bigint): Promise<string> {
      const tx = await this.contract.transfer(to, amount);
      const receipt = await tx.wait();
      return receipt.hash;
    }

    async balanceOf(address: string): Promise<bigint> {
      return this.contract.balanceOf(address);
    }
  }

dependencies: []
```

---

## Sprint 5: Testing & CI (HIGH)

### TASK-013: Tests de Integracion para Backend
```yaml
id: TASK-013
title: Agregar tests de integracion con supertest
priority: HIGH
estimate: 4h
status: TODO
owner: TBD

description: |
  Tests que verifican los endpoints del backend sin
  necesidad de llamadas externas reales.

acceptance_criteria:
  - [ ] Test para cada endpoint
  - [ ] Mock de Sentinel para tests rapidos
  - [ ] Coverage > 80% en server.ts

files_to_modify:
  - apps/backend/src/__tests__/api.test.ts (crear)
  - apps/backend/package.json (agregar supertest)

code_snippet: |
  import request from 'supertest';
  import { app } from '../server';

  describe('Sentinel API', () => {
    it('POST /v1/sentinel/validate returns trust score', async () => {
      const res = await request(app)
        .post('/v1/sentinel/validate')
        .send({ url: 'https://example.com' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('trustScore');
      expect(res.body.trustScore).toBeGreaterThanOrEqual(0);
      expect(res.body.trustScore).toBeLessThanOrEqual(100);
    });
  });

dependencies: []
```

### TASK-014: CI Pipeline en GitHub Actions
```yaml
id: TASK-014
title: Configurar CI con GitHub Actions
priority: HIGH
estimate: 2h
status: TODO
owner: TBD

description: |
  Pipeline que corre lint, typecheck, build y tests
  en cada push y PR.

acceptance_criteria:
  - [ ] CI corre en push a main
  - [ ] CI corre en PRs
  - [ ] Falla si lint/test/build fallan
  - [ ] Badge en README

files_to_modify:
  - .github/workflows/ci.yml (crear)
  - README.md (agregar badge)

code_snippet: |
  name: CI
  on: [push, pull_request]
  jobs:
    test:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: pnpm/action-setup@v2
        - uses: actions/setup-node@v4
          with:
            node-version: '20'
            cache: 'pnpm'
        - run: pnpm install
        - run: pnpm lint
        - run: pnpm typecheck
        - run: pnpm build
        - run: pnpm test

dependencies: []
```

### TASK-015: Tests de Contratos
```yaml
id: TASK-015
title: Completar test suite de smart contracts
priority: HIGH
estimate: 4h
status: TODO
owner: TBD

description: |
  Tests comprehensivos para Treasury y Mixer usando
  Hardhat test framework.

acceptance_criteria:
  - [ ] Test executeX402Payment con sig valida
  - [ ] Test executeX402Payment reverts con sig invalida
  - [ ] Test rate limits y daily limits
  - [ ] Test Mixer deposit/withdraw

files_to_modify:
  - test/Treasury.test.ts (crear/completar)
  - test/Mixer.test.ts (crear/completar)

dependencies: []
```

---

## Backlog (LOW Priority / Post-Hackathon)

### TASK-016: Publicar @snowrail/sentinel a npm
```yaml
id: TASK-016
priority: LOW
status: BACKLOG
description: Setup npm publish workflow
```

### TASK-017: Dashboard de Telemetria
```yaml
id: TASK-017
priority: LOW
status: BACKLOG
description: UI para ver validaciones y pagos en tiempo real
```

### TASK-018: Multi-tenant API Keys
```yaml
id: TASK-018
priority: LOW
status: BACKLOG
description: Autenticacion por API key para diferentes clientes
```

### TASK-019: ZK Proofs para Trust Attestations
```yaml
id: TASK-019
priority: LOW
status: BACKLOG
description: Generar ZK proofs de validaciones para privacidad
```

### TASK-020: Reputation Scoring Historico
```yaml
id: TASK-020
priority: LOW
status: BACKLOG
description: Almacenar y consultar historico de validaciones
```

---

## Task Board Summary

### Por Prioridad

| Prioridad | Count | IDs |
|-----------|-------|-----|
| CRITICAL | 3 | TASK-001, TASK-002, TASK-003 |
| HIGH | 6 | TASK-004, TASK-005, TASK-006, TASK-013, TASK-014, TASK-015 |
| MEDIUM | 6 | TASK-007, TASK-008, TASK-009, TASK-010, TASK-011, TASK-012 |
| LOW | 5 | TASK-016 to TASK-020 |

### Por Area

| Area | Tasks |
|------|-------|
| Contracts | TASK-001, TASK-015 |
| Backend | TASK-002, TASK-006, TASK-013 |
| SDK | TASK-005, TASK-007, TASK-010, TASK-011, TASK-012 |
| E2E | TASK-003 |
| Config/Infra | TASK-004, TASK-014 |
| Docs | TASK-007, TASK-008, TASK-009 |

### Sprint Planning Sugerido

```
Sprint 1 (CRITICAL - Demo Ready):
  TASK-001 -> TASK-002 -> TASK-003
  (secuencial, cada uno depende del anterior)

Sprint 2 (HIGH - Quality):
  TASK-004, TASK-005, TASK-006
  (paralelo, independientes)

  TASK-013, TASK-014, TASK-015
  (paralelo, independientes)

Sprint 3 (MEDIUM - Docs & Extension):
  TASK-007, TASK-008, TASK-009
  (paralelo)

  TASK-010 -> TASK-011
  (secuencial)

  TASK-012
  (independiente)
```

---

## Definition of Done (Global)

Cada task se considera DONE cuando:

1. [ ] Codigo implementado
2. [ ] Tests escritos y pasando
3. [ ] Lint pasando
4. [ ] Typecheck pasando
5. [ ] PR revieweado
6. [ ] Mergeado a main
7. [ ] Documentacion actualizada (si aplica)

---

*Documento generado: 2026-01-27*
*Total Tasks: 20*
*Critical Path: TASK-001 -> TASK-002 -> TASK-003*
