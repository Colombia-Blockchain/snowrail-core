# SnowRail Core - Developer Implementation Guide

**Version:** 2.0.0
**Status:** GREEN (All builds/tests passing)
**Date:** 2026-01-27
**Architecture:** Hexagonal / Multichain / Modular

---

## Table of Contents

1. [Estado Actual vs Plan Maestro](#1-estado-actual-vs-plan-maestro)
2. [Arquitectura Hexagonal Multichain](#2-arquitectura-hexagonal-multichain)
3. [Mapa de Dependencias](#3-mapa-de-dependencias)
4. [Flujo E2E Completo](#4-flujo-e2e-completo)
5. [Descomposicion de Hitos en Tasks](#5-descomposicion-de-hitos-en-tasks)
6. [Testing Strategy](#6-testing-strategy)
7. [Guia de Extensibilidad](#7-guia-de-extensibilidad)
8. [Configuracion por Entorno](#8-configuracion-por-entorno)
9. [Checklist de Validacion](#9-checklist-de-validacion)

---

## 1. Estado Actual vs Plan Maestro

### 1.1 Health Matrix (Validado 2026-01-27)

| Operacion | Estado | Notas |
|-----------|--------|-------|
| `pnpm install` | **PASS** | 761 packages |
| `pnpm build` | **PASS** | 4/4 packages (warnings en exports order) |
| `pnpm test` | **PASS** | 6/6 tests |
| `pnpm lint` | **PASS** | ESLint configurado |
| `pnpm typecheck` | **PASS** | Sin errores TS |

### 1.2 Comparacion: Standing Report vs Estado Actual

| Item del Standing Report | Estado Anterior | Estado Actual | Resuelto |
|--------------------------|-----------------|---------------|----------|
| TS errors en sentinel | 9 errores | 0 errores | YES |
| TS errors en backend | 8+ errores | 0 errores | YES |
| Backend duplica validateUrl() | SI | NO - Usa @snowrail/sentinel | YES |
| ESLint sin config | FAIL | PASS | YES |
| Frontend sin package.json | FALTA | EXISTE | YES |

### 1.3 Estado de Hitos del Plan Maestro

| Hito | Descripcion | Estado | Evidencia |
|------|-------------|--------|-----------|
| **M0** | Single Source of Truth | **COMPLETO** | docs/standing/*.md existen |
| **M1** | Core Green (Sentinel compila) | **COMPLETO** | pnpm build pasa |
| **M2** | Backend como adapter | **COMPLETO** | server.ts importa @snowrail/sentinel |
| **M3** | Tru Validation + 5 politicas | **COMPLETO** | docs/core/TRU_VALIDATION.md |
| **M4** | Arquitectura hexagonal | **PARCIAL** | Ports/adapters existen, falta enforcement |
| **M5** | Adapter x402 Facilitador | **COMPLETO** | adapters/x402.ts implementado |
| **M6** | Flujo E2E completo | **PARCIAL** | Endpoints existen, falta integracion contracts |
| **M7** | SDKizacion | **PARCIAL** | READMEs basicos, falta ejemplos curl |
| **M8** | Extensibilidad 8004 | **PARCIAL** | Port definido, adapter stub existe |

### 1.4 Gaps Identificados para Produccion

```
GAP-1: [CONFIG] Package.json exports order (warnings en build)
GAP-2: [INFRA] Contratos no desplegados en Fuji
GAP-3: [TEST] Tests E2E no existen (solo unit tests)
GAP-4: [DOCS] Falta coleccion Postman/curl para endpoints
GAP-5: [ARCH] Falta eslint boundary rules (packages no debe importar apps)
GAP-6: [CHAIN] USDC addresses hardcoded, falta config por environment
```

---

## 2. Arquitectura Hexagonal Multichain

### 2.1 Principios Fundamentales

```
CORE (Dominio Puro)           ADAPTERS (Integraciones)
+------------------+          +----------------------+
|                  |          |                      |
|  SENTINEL        |  <---->  |  HTTP API (Express)  |  <- Entrada
|  (Trust Engine)  |          |                      |
|                  |          +----------------------+
|  - Checks        |          |                      |
|  - Scoring       |  <---->  |  X402 Facilitator    |  <- Salida
|  - Decision      |          |                      |
|                  |          +----------------------+
|  Define PORTS    |          |                      |
|  (Interfaces)    |  <---->  |  USDC Rail           |  <- Salida
|                  |          |  (por chain)         |
+------------------+          +----------------------+
                              |                      |
                              |  ERC-8004 Agent      |  <- Salida
                              |  Registry            |
                              +----------------------+
```

### 2.2 Estructura de Directorios (Hexagonal)

```
snowrail-core/
├── packages/
│   └── sentinel/                    # CORE (Dominio)
│       ├── src/
│       │   ├── core/
│       │   │   └── engine.ts        # Sentinel class - DOMINIO PURO
│       │   ├── types/
│       │   │   └── index.ts         # Tipos del dominio
│       │   ├── checks/              # Reglas de negocio (Checks)
│       │   │   ├── base.ts          # BaseCheck abstract
│       │   │   ├── tls.ts           # TLSCheck
│       │   │   ├── dns.ts           # DNSCheck
│       │   │   ├── infrastructure.ts
│       │   │   ├── fiat.ts
│       │   │   └── policy.ts
│       │   ├── ports/               # CONTRATOS (Interfaces)
│       │   │   └── index.ts
│       │   │       ├── X402FacilitatorPort
│       │   │       ├── USDCRailPort
│       │   │       ├── AgentDescriptorPort
│       │   │       ├── ReputationProviderPort
│       │   │       └── TelemetryPort
│       │   └── adapters/            # IMPLEMENTACIONES
│       │       ├── index.ts
│       │       ├── x402.ts          # X402FacilitatorAdapter
│       │       └── erc8004.ts       # AgentDescriptorAdapter
│       └── __tests__/
│
├── packages/
│   └── yuki/                        # APLICACION (AI Assistant)
│       └── src/
│           ├── engine/
│           │   └── core.ts          # Usa SENTINEL via ports
│           └── types/
│
├── apps/
│   ├── backend/                     # ADAPTER DE ENTRADA (HTTP)
│   │   └── src/
│   │       └── server.ts            # Express - consume @snowrail/sentinel
│   └── frontend/                    # ADAPTER DE ENTRADA (UI)
│       └── src/
│           └── components/
│
└── contracts/                       # ADAPTER DE SALIDA (Blockchain)
    ├── SnowRailTreasury.sol
    ├── SnowRailMixer.sol
    └── MockUSDC.sol
```

### 2.3 Reglas de Dependencia (Enforcement)

```
PERMITIDO:
  apps/* --> packages/*      (Apps consumen packages)
  packages/yuki --> packages/sentinel (Yuki usa Sentinel)
  adapters/* --> ports/*     (Adapters implementan ports)

PROHIBIDO:
  packages/* --> apps/*      (Core no conoce apps)
  core/* --> adapters/*      (Dominio no conoce implementaciones)
  contracts/* --> apps/*     (Contracts independientes)
```

### 2.4 Diseno Multichain

```typescript
// packages/sentinel/src/adapters/x402.ts

interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  usdc: {
    address: string;
    decimals: number;
  };
  treasury?: string;
  mixer?: string;
  explorer: string;
}

const SUPPORTED_CHAINS: Record<string, ChainConfig> = {
  'avalanche-mainnet': {
    chainId: 43114,
    name: 'Avalanche C-Chain',
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    usdc: {
      address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
      decimals: 6
    },
    explorer: 'https://snowtrace.io'
  },
  'avalanche-fuji': {
    chainId: 43113,
    name: 'Avalanche Fuji',
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    usdc: {
      address: '0x5425890298aed601595a70AB815c96711a31Bc65', // Official USDC on Fuji
      decimals: 6
    },
    explorer: 'https://testnet.snowtrace.io'
  },
  'localhost': {
    chainId: 31337,
    name: 'Hardhat Local',
    rpcUrl: 'http://127.0.0.1:8545',
    usdc: {
      address: 'DEPLOY_ADDRESS', // Set after deploy
      decimals: 6
    },
    explorer: ''
  },
  // EXTENSION: Nuevas chains se agregan aqui
  'ethereum-mainnet': {
    chainId: 1,
    name: 'Ethereum',
    rpcUrl: 'https://eth.llamarpc.com',
    usdc: {
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      decimals: 6
    },
    explorer: 'https://etherscan.io'
  },
  'polygon-mainnet': {
    chainId: 137,
    name: 'Polygon',
    rpcUrl: 'https://polygon-rpc.com',
    usdc: {
      address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      decimals: 6
    },
    explorer: 'https://polygonscan.com'
  }
};
```

---

## 3. Mapa de Dependencias

### 3.1 Grafo de Dependencias de Paquetes

```
                    +-------------------+
                    |   apps/frontend   |
                    |  (React UI)       |
                    +-------------------+
                              |
                              | HTTP
                              v
+-------------------+   +-------------------+   +-------------------+
|   apps/backend    |-->| @snowrail/yuki    |-->| @snowrail/sentinel|
|  (Express API)    |   | (AI Assistant)    |   | (Trust Engine)    |
+-------------------+   +-------------------+   +-------------------+
         |                                               |
         |                                               |
         v                                               v
+-------------------+                         +-------------------+
|   contracts/      |                         |   External APIs   |
| - Treasury        |                         | - DNS resolvers   |
| - Mixer           |                         | - TLS/SSL         |
| - MockUSDC        |                         | - Phishing DBs    |
+-------------------+                         +-------------------+
```

### 3.2 Matriz de Imports

| Desde \ Hacia | sentinel | yuki | backend | frontend | contracts |
|---------------|----------|------|---------|----------|-----------|
| **sentinel** | - | NO | NO | NO | NO |
| **yuki** | YES | - | NO | NO | NO |
| **backend** | YES | YES* | - | NO | NO |
| **frontend** | NO | NO | HTTP | - | NO |
| **contracts** | NO | NO | NO | NO | - |

*Backend usa YUKI internamente para el chat endpoint

### 3.3 Flujo de Datos por Capa

```
CAPA 1: ENTRADA (Inbound Adapters)
  ├── HTTP Request (Express)
  ├── WebSocket (futuro)
  └── CLI (futuro)
         │
         v
CAPA 2: APLICACION (Use Cases)
  ├── ValidateURLUseCase
  ├── CreatePaymentIntentUseCase
  ├── ProcessChatUseCase
  └── ExecutePaymentUseCase
         │
         v
CAPA 3: DOMINIO (Business Logic)
  ├── Sentinel.validate()
  ├── TrustScoreCalculator
  ├── PolicyEngine
  └── DecisionMaker
         │
         v
CAPA 4: SALIDA (Outbound Adapters)
  ├── X402FacilitatorAdapter
  ├── USDCRailAdapter
  ├── TelemetryAdapter
  └── BlockchainAdapter
```

---

## 4. Flujo E2E Completo

### 4.1 Sequence Diagram: Payment Flow

```
┌─────────┐     ┌─────────┐     ┌──────────┐     ┌───────┐     ┌──────────┐     ┌─────────┐
│  User/  │     │ Backend │     │ SENTINEL │     │ X402  │     │ Treasury │     │  USDC   │
│  Agent  │     │   API   │     │  Engine  │     │Adapter│     │ Contract │     │ Token   │
└────┬────┘     └────┬────┘     └────┬─────┘     └───┬───┘     └────┬─────┘     └────┬────┘
     │               │               │               │               │               │
     │ POST /v1/sentinel/validate    │               │               │               │
     │ {url, amount} │               │               │               │               │
     │──────────────>│               │               │               │               │
     │               │               │               │               │               │
     │               │ sentinel.validate(url)        │               │               │
     │               │──────────────>│               │               │               │
     │               │               │               │               │               │
     │               │               │ ┌───────────┐ │               │               │
     │               │               │ │Run Checks │ │               │               │
     │               │               │ │- TLS      │ │               │               │
     │               │               │ │- DNS      │ │               │               │
     │               │               │ │- Infra    │ │               │               │
     │               │               │ │- FIAT     │ │               │               │
     │               │               │ │- Policy   │ │               │               │
     │               │               │ └───────────┘ │               │               │
     │               │               │               │               │               │
     │               │ ValidationResult              │               │               │
     │               │ {score:87, canPay:true}       │               │               │
     │               │<──────────────│               │               │               │
     │               │               │               │               │               │
     │ 200 OK        │               │               │               │               │
     │ {trustScore:87, canPay:true}  │               │               │               │
     │<──────────────│               │               │               │               │
     │               │               │               │               │               │
     │ [IF canPay=true]              │               │               │               │
     │               │               │               │               │               │
     │ POST /v1/payments/x402/intent │               │               │               │
     │ {url, amount, recipient}      │               │               │               │
     │──────────────>│               │               │               │               │
     │               │               │               │               │               │
     │               │ facilitator.createIntent()    │               │               │
     │               │──────────────────────────────>│               │               │
     │               │               │               │               │               │
     │               │               │               │ EIP-712       │               │
     │               │               │               │ signatureData │               │
     │               │<──────────────────────────────│               │               │
     │               │               │               │               │               │
     │ 200 OK        │               │               │               │               │
     │ {intentId, signatureData}     │               │               │               │
     │<──────────────│               │               │               │               │
     │               │               │               │               │               │
     │ [USER SIGNS WITH WALLET]      │               │               │               │
     │               │               │               │               │               │
     │ POST /v1/payments/x402/confirm│               │               │               │
     │ {intentId, signature}         │               │               │               │
     │──────────────>│               │               │               │               │
     │               │               │               │               │               │
     │               │ treasury.executeX402Payment() │               │               │
     │               │──────────────────────────────────────────────>│               │
     │               │               │               │               │               │
     │               │               │               │               │ transferFrom()│
     │               │               │               │               │──────────────>│
     │               │               │               │               │               │
     │               │               │               │               │<──────────────│
     │               │               │               │               │               │
     │               │ txHash        │               │               │               │
     │               │<──────────────────────────────────────────────│               │
     │               │               │               │               │               │
     │ 200 OK        │               │               │               │               │
     │ {txHash, status: 'completed'} │               │               │               │
     │<──────────────│               │               │               │               │
     │               │               │               │               │               │
```

### 4.2 Endpoints del Flujo E2E

```yaml
# STEP 1: Trust Validation
POST /v1/sentinel/validate
Request:
  url: "https://merchant.com/api/pay"
  amount: 100
  currency: "USDC"
Response:
  id: "val-uuid-123"
  trustScore: 87
  canPay: true
  decision: "conditional"
  checks: [...]
  maxAmount: 50000

# STEP 2: Create Payment Intent
POST /v1/payments/x402/intent
Request:
  url: "https://merchant.com/api/pay"
  amount: 100
  recipient: "0x..."
  chain: "avalanche-fuji"
Response:
  intentId: "intent-uuid-456"
  validationId: "val-uuid-123"
  expiresAt: "2026-01-27T14:00:00Z"
  signatureData:
    domain: {...}
    types: {...}
    message: {...}

# STEP 3: Get Signature Data (optional, for wallet)
POST /v1/payments/x402/sign
Request:
  intentId: "intent-uuid-456"
Response:
  typedData: {...}  # EIP-712 typed data

# STEP 4: Confirm Payment
POST /v1/payments/x402/confirm
Request:
  intentId: "intent-uuid-456"
  signature: "0x..."
Response:
  status: "completed"
  txHash: "0x..."
  receipt:
    amount: 100
    currency: "USDC"
    recipient: "0x..."
    timestamp: "2026-01-27T13:05:00Z"

# STEP 5: Check Status (polling)
GET /v1/payments/x402/status/{intentId}
Response:
  intentId: "intent-uuid-456"
  status: "completed" | "pending" | "expired" | "failed"
  txHash: "0x..."
```

### 4.3 Error Handling en E2E

```yaml
# Validation Failed (Trust < 60)
POST /v1/sentinel/validate
Response 200:
  trustScore: 32
  canPay: false
  decision: "deny"
  blockedReasons:
    - "TLS certificate expired"
    - "Domain registered < 30 days"

# Payment Intent Rejected (no prior validation)
POST /v1/payments/x402/intent
Response 400:
  error: "VALIDATION_REQUIRED"
  message: "URL must be validated before creating payment intent"

# Intent Expired
POST /v1/payments/x402/confirm
Response 400:
  error: "INTENT_EXPIRED"
  message: "Payment intent has expired"
  expiredAt: "2026-01-27T13:00:00Z"

# Transaction Failed
POST /v1/payments/x402/confirm
Response 500:
  error: "TRANSACTION_FAILED"
  message: "Insufficient USDC balance"
  txHash: null
```

---

## 5. Descomposicion de Hitos en Tasks

### M4 - Arquitectura Hexagonal Enforceable

```yaml
TASK M4.1:
  title: "Configurar ESLint boundaries"
  description: |
    Agregar eslint-plugin-boundaries para enforcar reglas de import.
    packages/* NO debe importar de apps/*
    core/* NO debe importar de adapters/*
  files:
    - .eslintrc.js (crear/modificar)
    - package.json (agregar dependency)
  acceptance:
    - pnpm lint falla si alguien viola boundaries
    - CI bloquea PRs con violaciones
  priority: HIGH
  owner: TBD

TASK M4.2:
  title: "Fix package.json exports order"
  description: |
    Resolver warnings de tsup sobre "types" condition.
    Mover "types" antes de "import" y "require" en exports.
  files:
    - packages/sentinel/package.json
    - packages/yuki/package.json
  acceptance:
    - pnpm build sin warnings
  priority: MEDIUM
  owner: TBD

TASK M4.3:
  title: "Documentar contratos de Ports"
  description: |
    Crear docs/architecture/PORTS.md con:
    - Descripcion de cada Port
    - Metodos requeridos
    - Tipos de entrada/salida
    - Ejemplo de implementacion
  files:
    - docs/architecture/PORTS.md (crear)
  acceptance:
    - Un dev puede implementar un adapter nuevo leyendo solo el doc
  priority: MEDIUM
  owner: TBD
```

### M5 - Adapter del Facilitador x402 (Enhancement)

```yaml
TASK M5.1:
  title: "Parametrizar chains via environment"
  description: |
    Mover SUPPORTED_CHAINS a configuracion externa.
    Permitir agregar chains sin modificar codigo.
  files:
    - packages/sentinel/src/adapters/x402.ts
    - config/chains.json (crear)
    - .env.example
  acceptance:
    - Nueva chain se agrega en config, no en codigo
  priority: HIGH
  owner: TBD

TASK M5.2:
  title: "Implementar USDCRailPort completo"
  description: |
    El port existe pero el adapter esta incompleto.
    Implementar:
    - transfer()
    - approve()
    - balanceOf()
    - allowance()
  files:
    - packages/sentinel/src/adapters/usdc.ts (crear)
    - packages/sentinel/src/ports/index.ts
  acceptance:
    - Tests de integracion con MockUSDC pasan
  priority: HIGH
  owner: TBD

TASK M5.3:
  title: "Agregar validacion de token USDC"
  description: |
    Antes de crear intent, verificar que:
    - Token address es USDC valido para la chain
    - Rechazar cualquier otro token
  files:
    - packages/sentinel/src/adapters/x402.ts
  acceptance:
    - Test: intent con token != USDC es rechazado
  priority: MEDIUM
  owner: TBD
```

### M6 - Flujo E2E Completo

```yaml
TASK M6.1:
  title: "Deploy contracts a Fuji"
  description: |
    Ejecutar scripts de deploy en Avalanche Fuji:
    - MockUSDC (o usar official USDC)
    - SnowRailTreasury
    - SnowRailMixer (opcional)
  files:
    - scripts/deploy.ts
    - .env (PRIVATE_KEY, AVALANCHE_RPC_URL)
  acceptance:
    - Contracts verificados en Snowtrace Fuji
    - Addresses guardados en config
  priority: CRITICAL
  owner: TBD

TASK M6.2:
  title: "Conectar backend a Treasury contract"
  description: |
    El endpoint /v1/payments/x402/confirm debe:
    1. Validar signature
    2. Llamar treasury.executeX402Payment()
    3. Esperar confirmacion
    4. Retornar txHash
  files:
    - apps/backend/src/server.ts
    - apps/backend/src/services/treasury.ts (crear)
  acceptance:
    - E2E test: validate -> intent -> confirm -> tx on chain
  priority: CRITICAL
  owner: TBD

TASK M6.3:
  title: "Crear script de E2E test"
  description: |
    Script que ejecuta el flujo completo:
    1. Validate URL
    2. Create intent
    3. Sign (mock wallet)
    4. Confirm
    5. Verify on chain
  files:
    - scripts/e2e-test.ts (crear)
  acceptance:
    - Script ejecutable: pnpm e2e
    - Output muestra cada paso
  priority: HIGH
  owner: TBD

TASK M6.4:
  title: "Crear coleccion Postman/curl"
  description: |
    Documentar todos los endpoints con:
    - Request/Response examples
    - Variables de entorno
    - Flujo paso a paso
  files:
    - docs/api/postman-collection.json (crear)
    - docs/api/ENDPOINTS.md (crear)
  acceptance:
    - Un dev puede probar todos los endpoints sin leer codigo
  priority: MEDIUM
  owner: TBD
```

### M7 - SDKizacion

```yaml
TASK M7.1:
  title: "README de @snowrail/sentinel"
  description: |
    README completo con:
    - Instalacion (npm/pnpm)
    - Quick start (3 lineas)
    - API reference
    - Ejemplos de cada metodo
    - Configuracion
  files:
    - packages/sentinel/README.md
  acceptance:
    - Un dev puede integrar sentinel en 5 minutos
  priority: HIGH
  owner: TBD

TASK M7.2:
  title: "README de @snowrail/backend"
  description: |
    README con:
    - Como correr el servidor
    - Variables de entorno
    - Lista de endpoints
    - Ejemplos curl
  files:
    - apps/backend/README.md
  acceptance:
    - Un dev puede levantar el backend y probar endpoints
  priority: HIGH
  owner: TBD

TASK M7.3:
  title: "Publicar @snowrail/sentinel a npm"
  description: |
    Preparar package para publicacion:
    - Verificar package.json (name, version, files)
    - Build production
    - Publish (o setup GitHub packages)
  files:
    - packages/sentinel/package.json
    - .github/workflows/publish.yml (crear)
  acceptance:
    - npm install @snowrail/sentinel funciona
  priority: LOW (post-hackathon)
  owner: TBD
```

### M8 - Extensibilidad ERC-8004

```yaml
TASK M8.1:
  title: "Completar AgentDescriptorAdapter"
  description: |
    El adapter stub existe. Implementar:
    - getAgentCard(address)
    - verifyAgent(address)
    - getCapabilities(address)
  files:
    - packages/sentinel/src/adapters/erc8004.ts
  acceptance:
    - Tests con mock agent registry pasan
  priority: MEDIUM
  owner: TBD

TASK M8.2:
  title: "Agregar check de Agent Identity"
  description: |
    Nuevo check que verifica:
    - Si el sender tiene AgentCard registrada
    - Trust level del agent
    - Capabilities match con el recurso
  files:
    - packages/sentinel/src/checks/agent-identity.ts (crear)
  acceptance:
    - Check se puede habilitar via config
    - No rompe validaciones existentes
  priority: MEDIUM
  owner: TBD

TASK M8.3:
  title: "Documentar como agregar nuevo Check"
  description: |
    Guia paso a paso:
    - Extender BaseCheck
    - Implementar execute()
    - Registrar con sentinel
    - Agregar tests
  files:
    - docs/guides/ADDING_CHECKS.md (crear)
  acceptance:
    - Un dev puede agregar un check nuevo sin ayuda
  priority: MEDIUM
  owner: TBD
```

---

## 6. Testing Strategy

### 6.1 Piramide de Tests

```
                    /\
                   /  \
                  / E2E \        <- Flujo completo (pocos, lentos)
                 /______\
                /        \
               / Integ.   \      <- Adapters + External (moderados)
              /____________\
             /              \
            /    Unit        \   <- Checks, Engine (muchos, rapidos)
           /__________________\
```

### 6.2 Tests Criticos por Modulo

```yaml
SENTINEL (packages/sentinel):
  unit:
    - engine.test.ts:
      - validate() retorna score correcto
      - canPay() true si score >= 60
      - decide() respeta maxAmount del agent
      - caching funciona (misma URL = cache hit)
      - rate limiting bloquea exceso
    - checks/*.test.ts:
      - Cada check retorna CheckResult valido
      - Scores estan en rango 0-100
      - Timeouts se manejan correctamente
  integration:
    - x402.test.ts:
      - createIntent() genera EIP-712 valido
      - verifyReceipt() valida signature
    - Full validation con checks reales (red)

BACKEND (apps/backend):
  unit:
    - Middleware tests (rate limit, auth)
  integration:
    - API tests con supertest:
      - POST /v1/sentinel/validate
      - POST /v1/payments/x402/intent
      - POST /v1/payments/x402/confirm
  e2e:
    - Flujo completo con contracts en Fuji

CONTRACTS (contracts/):
  unit (Hardhat):
    - Treasury.executeX402Payment() con sig valida
    - Treasury.executeX402Payment() reverts con sig invalida
    - Mixer.deposit() actualiza Merkle tree
    - Mixer.withdraw() con proof valido
  integration:
    - Full payment flow con MockUSDC
```

### 6.3 Test Commands

```bash
# Unit tests (rapido, local)
pnpm test

# Sentinel tests only
pnpm --filter @snowrail/sentinel test

# Contract tests
pnpm hardhat test

# E2E tests (requiere Fuji)
pnpm e2e

# Coverage
pnpm test -- --coverage
```

### 6.4 CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
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

  contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm hardhat compile
      - run: pnpm hardhat test
```

---

## 7. Guia de Extensibilidad

### 7.1 Agregar Nueva Chain

```typescript
// 1. Agregar config en config/chains.json
{
  "arbitrum-mainnet": {
    "chainId": 42161,
    "name": "Arbitrum One",
    "rpcUrl": "https://arb1.arbitrum.io/rpc",
    "usdc": {
      "address": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      "decimals": 6
    },
    "explorer": "https://arbiscan.io"
  }
}

// 2. (Opcional) Agregar Treasury address despues de deploy
// config/deployments.json
{
  "arbitrum-mainnet": {
    "treasury": "0x...",
    "mixer": "0x..."
  }
}

// 3. Usar en el backend
// CHAIN=arbitrum-mainnet pnpm dev
```

### 7.2 Agregar Nuevo Check

```typescript
// 1. Crear archivo packages/sentinel/src/checks/custom.ts
import { BaseCheck, CheckResult, ValidationRequest } from '../types';

export class CustomCheck extends BaseCheck {
  public readonly type = 'custom_check' as const;
  public readonly category = 'policy';
  public readonly weight = 1.0;

  async execute(request: ValidationRequest): Promise<CheckResult> {
    try {
      // Tu logica aqui
      const score = await this.runCustomValidation(request.url);

      return this.success(
        score,
        `Custom check passed with score ${score}`,
        { customData: 'value' }
      );
    } catch (error) {
      return this.failure(
        `Custom check failed: ${error.message}`,
        { error: error.message }
      );
    }
  }

  private async runCustomValidation(url: string): Promise<number> {
    // Implementacion
    return 85;
  }
}

// 2. Exportar en packages/sentinel/src/checks/index.ts
export { CustomCheck } from './custom';

// 3. Registrar (opcional - se auto-registra via config)
const sentinel = createSentinel({
  checks: {
    custom_check: { enabled: true, weight: 1.0 }
  }
});
// O manualmente:
sentinel.registerCheck(new CustomCheck());

// 4. Agregar tests packages/sentinel/src/__tests__/custom.test.ts
```

### 7.3 Agregar Nuevo Adapter

```typescript
// 1. Definir Port (si no existe) en packages/sentinel/src/ports/index.ts
export interface NewServicePort {
  methodA(param: TypeA): Promise<ResultA>;
  methodB(param: TypeB): Promise<ResultB>;
}

// 2. Crear Adapter en packages/sentinel/src/adapters/new-service.ts
import { NewServicePort } from '../ports';

export class NewServiceAdapter implements NewServicePort {
  private config: NewServiceConfig;

  constructor(config: NewServiceConfig) {
    this.config = config;
  }

  async methodA(param: TypeA): Promise<ResultA> {
    // Implementacion
  }

  async methodB(param: TypeB): Promise<ResultB> {
    // Implementacion
  }
}

// 3. Factory function
export function createNewServiceAdapter(config?: Partial<NewServiceConfig>): NewServicePort {
  return new NewServiceAdapter({
    ...DEFAULT_CONFIG,
    ...config
  });
}

// 4. Exportar en packages/sentinel/src/adapters/index.ts
export { NewServiceAdapter, createNewServiceAdapter } from './new-service';

// 5. Agregar tests
```

---

## 8. Configuracion por Entorno

### 8.1 Variables de Entorno

```bash
# .env.example

# ===== SERVER =====
PORT=3000
NODE_ENV=development

# ===== BLOCKCHAIN =====
CHAIN=avalanche-fuji
AVALANCHE_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
PRIVATE_KEY=0x... # Solo para deploy/testing

# ===== CONTRACTS (Fuji) =====
USDC_ADDRESS=0x5425890298aed601595a70AB815c96711a31Bc65
TREASURY_ADDRESS=0x...
MIXER_ADDRESS=0x...

# ===== SENTINEL =====
SENTINEL_MIN_SCORE=60
SENTINEL_CACHE=true
SENTINEL_CACHE_TTL=300000
SENTINEL_RATE_LIMIT=100

# ===== YUKI (LLM) =====
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# ===== OPTIONAL =====
LOG_LEVEL=info
CORS_ORIGIN=http://localhost:3001
```

### 8.2 Configuracion por Ambiente

```typescript
// config/index.ts
const environments = {
  development: {
    chain: 'localhost',
    sentinel: {
      minScore: 50,  // Mas permisivo en dev
      cache: false,   // Sin cache para debug
    }
  },
  staging: {
    chain: 'avalanche-fuji',
    sentinel: {
      minScore: 60,
      cache: true,
    }
  },
  production: {
    chain: 'avalanche-mainnet',
    sentinel: {
      minScore: 70,  // Mas estricto en prod
      cache: true,
      rateLimitRequests: 50, // Mas restrictivo
    }
  }
};

export const config = environments[process.env.NODE_ENV || 'development'];
```

---

## 9. Checklist de Validacion

### 9.1 Pre-Development Checklist

```
[ ] pnpm install completa sin errores
[ ] pnpm build pasa (puede tener warnings)
[ ] pnpm test pasa (todos los tests)
[ ] .env configurado con variables requeridas
[ ] Node.js v20.x instalado
```

### 9.2 Pre-PR Checklist

```
[ ] pnpm lint pasa
[ ] pnpm typecheck pasa
[ ] pnpm test pasa
[ ] No hay console.log de debug
[ ] Nuevos archivos tienen tests
[ ] README actualizado si aplica
[ ] Types exportados si son publicos
```

### 9.3 Pre-Deploy Checklist (Fuji)

```
[ ] PRIVATE_KEY configurada (NO en git)
[ ] AVALANCHE_RPC_URL configurada
[ ] pnpm hardhat compile pasa
[ ] Contracts tienen gas suficiente para deploy
[ ] USDC address correcto para Fuji
```

### 9.4 Pre-Production Checklist

```
[ ] Todos los tests E2E pasan
[ ] Contracts verificados en Snowtrace
[ ] Rate limits configurados
[ ] Logging/monitoring activo
[ ] Secrets en vault (no en .env)
[ ] CORS configurado para dominios conocidos
[ ] SSL/TLS en API
```

---

## Apendice A: Comandos Utiles

```bash
# Desarrollo
pnpm dev                          # Backend en modo dev
pnpm --filter @snowrail/backend dev

# Build
pnpm build                        # Build todos
pnpm --filter @snowrail/sentinel build

# Tests
pnpm test                         # Todos los tests
pnpm sentinel:test                # Solo sentinel
pnpm hardhat test                 # Solo contracts

# Contracts
pnpm hardhat compile              # Compilar
pnpm hardhat test                 # Tests
pnpm hardhat run scripts/deploy.ts --network fuji  # Deploy

# Limpieza
pnpm clean                        # Limpiar dist/
rm -rf node_modules && pnpm install  # Reset deps
```

---

## Apendice B: Troubleshooting

### Error: "Cannot find module '@snowrail/sentinel'"
```bash
# Rebuild packages
pnpm build
```

### Error: "Transaction reverted"
```bash
# Verificar USDC balance
# Verificar gas en wallet
# Verificar USDC approval al Treasury
```

### Error: "Rate limit exceeded"
```bash
# Esperar 1 minuto o incrementar SENTINEL_RATE_LIMIT
```

### Warning: "types condition never used"
```bash
# Fix: Reordenar exports en package.json
# "types" debe ir ANTES de "import" y "require"
```

---

*Documento generado: 2026-01-27*
*Arquitecto: Claude Code*
*Version: 1.0.0*
