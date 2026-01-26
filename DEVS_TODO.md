# 🚀 SnowRail - Guía de Despliegue para Devs

## Estado Actual

| Componente | Estado | Notas |
|------------|--------|-------|
| README.md | ✅ Listo | Profesional, demo-first |
| SENTINEL SDK | ✅ Código completo | Falta testing E2E |
| YUKI Engine | ✅ Código completo | LLM real + fallback mock |
| Smart Contracts | ✅ Código completo | **NO DEPLOYADOS** |
| Backend API | ✅ Código completo | **NO DEPLOYADO** |
| Frontend | ⚠️ Componentes only | Falta app completa |
| Tests | ⚠️ Básicos | Faltan E2E |

---

## 🔴 CRÍTICO - Hacer ANTES de presentar

### 1. Deploy Contratos en Fuji (2-3 horas)

```bash
cd snowrail-core

# Instalar dependencias
pnpm install

# Configurar .env
cp .env.example .env
# Editar .env con:
# - PRIVATE_KEY (wallet con AVAX de testnet)
# - SNOWTRACE_API_KEY (para verificar)

# Obtener AVAX testnet
# Faucet: https://faucet.avax.network/

# Deploy
npx hardhat run scripts/deploy.ts --network fuji

# Guardar las direcciones que salgan:
# - SnowRailTreasury: 0x...
# - SnowRailMixer: 0x...
# - MockUSDC: 0x...

# Verificar en Snowtrace
npx hardhat verify --network fuji <TREASURY_ADDRESS> <USDC_ADDRESS>
```

**Después de deploy:** Actualizar README.md con direcciones reales.

---

### 2. Deploy Backend API (1-2 horas)

**Opción A: Railway (recomendado)**

1. Ir a https://railway.app
2. New Project → Deploy from GitHub
3. Seleccionar `snowrail-core`
4. Root Directory: `apps/backend`
5. Variables de entorno:
   ```
   PORT=3000
   NODE_ENV=production
   ANTHROPIC_API_KEY=sk-ant-...  (opcional, para YUKI con LLM real)
   ```
6. Deploy

**Opción B: Render**

1. Ir a https://render.com
2. New Web Service
3. Connect repo `snowrail-core`
4. Build Command: `cd apps/backend && npm install && npm run build`
5. Start Command: `cd apps/backend && npm start`

**Después de deploy:** 
- Obtener URL (ej: `https://snowrail-api.railway.app`)
- Probar: `curl https://snowrail-api.railway.app/health`

---

### 3. Actualizar README con URLs reales (30 min)

Una vez deployado, cambiar en README.md:

```markdown
# Antes (localhost)
curl -X POST http://localhost:3000/v1/sentinel/validate

# Después (producción)
curl -X POST https://snowrail-api.railway.app/v1/sentinel/validate
```

Y en contratos:
```markdown
| SnowRailTreasury | 0x1234...abcd | [Snowtrace](https://testnet.snowtrace.io/address/0x1234...abcd) |
```

---

## 🟡 IMPORTANTE - Hacer esta semana

### 4. Frontend Completo (4-6 horas)

Los componentes React existen pero falta la app. Necesitan:

```bash
cd apps/frontend

# Crear app Vite + React
pnpm create vite . --template react-ts

# Instalar dependencias
pnpm add @tanstack/react-query wagmi viem tailwindcss

# Integrar componentes existentes:
# - src/components/yuki/YukiChat.tsx
# - src/components/sentinel/SentinelTrust.tsx
```

**Estructura mínima:**
```
apps/frontend/
├── src/
│   ├── App.tsx          # Layout principal
│   ├── main.tsx         # Entry point
│   ├── components/
│   │   ├── yuki/        # Ya existe
│   │   ├── sentinel/    # Ya existe
│   │   └── layout/      # CREAR: Header, Sidebar
│   ├── pages/
│   │   ├── Dashboard.tsx    # CREAR
│   │   ├── Validate.tsx     # CREAR: UI para SENTINEL
│   │   └── Chat.tsx         # CREAR: UI para YUKI
│   └── hooks/
│       └── useSentinel.ts   # CREAR: Hook para API
├── index.html
└── vite.config.ts
```

**Deploy Frontend:** Vercel o Netlify (gratis)

---

### 5. Conectar YUKI a LLM Real (1 hora)

YUKI ya tiene el código para Claude/OpenAI. Solo necesitan:

1. Obtener API key de Anthropic: https://console.anthropic.com
2. Agregar a `.env` del backend:
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-...
   ```
3. Reiniciar backend

**Sin API key:** YUKI funciona en modo mock (determinístico, bueno para demo).

---

### 6. Tests E2E (2-3 horas)

```bash
# Instalar vitest
pnpm add -D vitest @testing-library/react

# Correr tests existentes
pnpm test

# Tests faltantes por crear:
# - packages/sentinel/src/__tests__/e2e.test.ts
# - apps/backend/src/__tests__/api.test.ts
```

---

## 🟢 OPCIONAL - Nice to have

### 7. Dominio Personalizado

Si quieren `api.snowrail.xyz`:

1. Comprar dominio en Namecheap/Cloudflare
2. En Railway/Render: Settings → Custom Domain
3. Agregar DNS record (CNAME)

### 8. CI/CD con GitHub Actions

Crear `.github/workflows/ci.yml`:

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test
      - run: pnpm build
```

### 9. Monitoreo

- Sentry para errores: https://sentry.io
- UptimeRobot para uptime: https://uptimerobot.com

---

## 📋 Checklist Final para Build Games

```
[ ] Contratos deployados en Fuji
[ ] README actualizado con direcciones reales
[ ] Backend API deployado y funcionando
[ ] curl de ejemplo funciona públicamente
[ ] Video demo de 60 segundos grabado
[ ] Frontend básico deployado (opcional pero recomendado)
```

---

## 🎯 Orden de Prioridad

1. **HOY:** Deploy contratos + Backend API
2. **MAÑANA:** Actualizar README + Probar todo
3. **ESTA SEMANA:** Frontend + Video demo

---

## 💡 Tips para el Demo

### Demo de 2 casos (OBLIGATORIO)

Siempre mostrar:

1. **URL confiable** (api.stripe.com) → Score alto → Pago aprobado
2. **URL sospechosa** (scam-site.xyz) → Score bajo → Pago bloqueado

Esto demuestra el diferenciador de SnowRail.

### Pitch de 1 minuto

> "SnowRail es trust-before-pay para agentes de IA.
> Antes de que un agente pague, SENTINEL valida el destino.
> Si el score es bajo, el pago se bloquea automáticamente.
> Ganamos 1er lugar en Hack2Build x402.
> Ahora estamos en Build Games para llevarlo a producción."

---

## 📞 Recursos

- Faucet AVAX Testnet: https://faucet.avax.network/
- Snowtrace Fuji: https://testnet.snowtrace.io/
- Railway: https://railway.app
- Anthropic Console: https://console.anthropic.com

---

**El código está listo. Solo falta deployar.**

¡Éxito en Build Games! 🏆
