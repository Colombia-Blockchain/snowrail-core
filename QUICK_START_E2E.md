# 🚀 Quick Start: E2E Testing

Esta guía te llevará desde cero hasta ejecutar un pago real en Fuji en menos de 5 minutos.

## ✅ Pre-requisitos

- Node.js 18+
- pnpm instalado
- Testnet AVAX en tu wallet

## 📋 Paso a Paso

### 1. Verificar Configuración

```bash
pnpm check:config
```

Deberías ver:
```
✓ ALL CHECKS PASSED
Configuration looks good!
```

Si hay errores, edita tu `.env` con los valores faltantes.

### 2. Iniciar el Backend

**Terminal 1:**
```bash
pnpm backend:dev
```

Espera a ver:
```
[Server] Listening on http://localhost:4000
[Sentinel] Initialized
Treasury: ENABLED
```

### 3. Ejecutar E2E Test

**Terminal 2 (nueva terminal):**
```bash
pnpm e2e
```

## 🎬 Qué Esperar

El test ejecutará 5 pasos:

1. **SENTINEL Validation** (~2-5s)
   - Valida el URL de prueba
   - Muestra checks de seguridad
   - Trust score y decisión

2. **Create Intent** (~1s)
   - Crea intent de pago
   - Genera ID único
   - Establece expiración (5 min)

3. **Sign EIP-712** (~1s)
   - Obtiene datos de autorización
   - Firma con tu wallet
   - Genera signature

4. **Confirm Payment** (~20-45s)
   - Ejecuta transacción on-chain
   - Espera confirmación
   - Obtiene txHash

5. **Verify** (~1s)
   - Muestra link a Snowtrace
   - Resumen final

**Duración total esperada:** 30-60 segundos

## 🎯 Output Esperado

```
╔═══════════════════════════════════════════════════════════════════╗
║           SNOWRAIL E2E TEST - AVALANCHE FUJI TESTNET             ║
╚═══════════════════════════════════════════════════════════════════╝

ℹ Running pre-flight checks...
✓ Backend is running: http://localhost:4000
✓ RPC connected: Chain ID 43113
✓ Wallet has 0.5 AVAX for gas
✓ All pre-flight checks passed!

══════════════════════════════════════════════════════════════════════
STEP 1 – SENTINEL Validation
══════════════════════════════════════════════════════════════════════
[Tabla de checks...]
✓ SENTINEL validation passed

[... continúa con los otros pasos ...]

══════════════════════════════════════════════════════════════════════
✓ E2E TEST COMPLETED SUCCESSFULLY
══════════════════════════════════════════════════════════════════════

ℹ Total execution time: 28.45s
```

## ❗ Problemas Comunes

### "Backend is not responding"
```bash
# Terminal 1 - Inicia el backend
pnpm backend:dev
```

### "Wallet has no AVAX"
1. Ve a https://core.app/tools/testnet-faucet/
2. Pega tu wallet address: `0x22f6F000609d52A0b0efCD4349222cd9d70716Ba`
3. Solicita AVAX gratis
4. Espera 30 segundos
5. Intenta de nuevo

### "SENTINEL blocked payment"
Esto es esperado! SENTINEL está funcionando correctamente.
El test usa `https://example.com` que debería pasar.

Si quieres probar con URLs reales:
- ✅ `https://api.stripe.com` - Confiable
- ✅ `https://api.openai.com` - Confiable
- ❌ `https://free-crypto-unlimited.xyz` - Bloqueado (scam)

### "Transaction reverted"
Verifica que:
1. El Treasury contract está bien deployed
2. El ASSET_ADDRESS (USDC) es correcto
3. La wallet tiene AVAX para gas

## 🔧 Debugging

### Ver logs del backend
Los logs muestran cada paso:
```
[X402] Creating intent...
[SENTINEL] Validating https://example.com
[Treasury] Executing X402 payment...
[Treasury] Tx confirmed: 0x1234...
```

### Verificar transacción en Snowtrace
El test muestra un link al final:
```
Explorer: https://testnet.snowtrace.io/tx/0x1234...
```

Haz click o copia para ver la transacción en el explorador.

## 📊 Monitoreo

### Health Check
```bash
curl http://localhost:4000/health
```

### Estado del Backend
```bash
curl http://localhost:4000/v1/sentinel/validate \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

## 🎓 Próximos Pasos

Una vez que el E2E pase:

1. **Prueba con URLs reales** - Edita `CONFIG.testUrl` en `scripts/e2e-test.ts`
2. **Ajusta el monto** - Cambia `CONFIG.testAmount`
3. **Integra en tu app** - Usa los endpoints del backend
4. **Despliega a producción** - Sigue la guía en `README.md`

## 📚 Más Información

- [Scripts README](scripts/README.md) - Documentación completa del E2E
- [README Principal](README.md) - Guía completa del proyecto
- [STATE.md](docs/standing/STATE.md) - Estado actual del proyecto

---

**¿Problemas?** Abre un issue en GitHub con los logs completos.
