# SnowRail API Documentation

This directory contains complete API documentation and testing tools for SnowRail.

## Files

| File | Description |
|------|-------------|
| [ENDPOINTS.md](./ENDPOINTS.md) | Complete API reference with curl examples |
| [postman-collection.json](./postman-collection.json) | Importable Postman collection |
| README.md | This file - Quick start guide |

---

## Quick Start

### 1. Using curl (Command Line)

See [ENDPOINTS.md](./ENDPOINTS.md) for complete curl examples.

**Example - Validate URL:**

```bash
curl -X POST http://localhost:3000/v1/sentinel/validate \
  -H "Content-Type: application/json" \
  -d '{"url":"https://api.stripe.com","amount":100}'
```

### 2. Using Postman

#### Import Collection

1. Open Postman
2. Click **Import** button
3. Select [postman-collection.json](./postman-collection.json)
4. Collection "SnowRail API Collection" will appear in your workspace

#### Configure Environment

Create a new environment with these variables:

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `baseUrl` | `http://localhost:3000` | API server URL |
| `walletAddress` | `0x742d35Cc...` | Your wallet address |
| `recipientAddress` | `0x8626f69...` | Recipient wallet address |
| `intentId` | *(auto-set)* | Set automatically by /intent |
| `signature` | *(manual)* | Your EIP-712 signature |

**Quick Setup:**

```json
{
  "baseUrl": "http://localhost:3000",
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7",
  "recipientAddress": "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199"
}
```

#### Run E2E Flow

The collection includes automatic tests and variable chaining:

1. **SENTINEL / Validate URL** ✓
   - Tests URL trust score
   - No setup required

2. **X402 Payment / 1. Create Intent** ✓
   - Auto-saves `intentId` to environment
   - Validates SENTINEL approval

3. **X402 Payment / 2. Get Authorization** ✓
   - Returns EIP-712 signing data
   - Copy authorization from response

4. **Sign with Wallet** (External)
   ```javascript
   // Using ethers.js
   const { ethers } = require('ethers');
   const wallet = new ethers.Wallet('YOUR_PRIVATE_KEY');

   // Copy authorization from Postman response
   const signature = await wallet.signTypedData(
     authorization.domain,
     authorization.types,
     authorization.message
   );

   // Paste signature into Postman environment variable
   console.log('Signature:', signature);
   ```

5. **X402 Payment / 3. Confirm Payment** ✓
   - Executes on-chain payment
   - Returns transaction hash

6. **X402 Payment / 4. Check Status** ✓
   - Verifies payment completion

---

## Environment Setup

### Local Development

```bash
# Start SnowRail backend
pnpm backend:dev

# Backend runs on http://localhost:3000
# Set baseUrl=http://localhost:3000 in Postman
```

### Fuji Testnet Setup

For on-chain payments, configure `.env`:

```bash
# Avalanche Fuji Testnet
CHAIN=avalanche-fuji
PRIVATE_KEY=your_private_key_here

# Contract Addresses (from docs/standing/STATE.md)
ASSET_ADDRESS=0x7435BB56D89Cf26A03fabaE6fA36b66295a2A676
TREASURY_CONTRACT_ADDRESS=0x79fa1E26938763Db1AD3d6d40bf79f3a23aE60dd
MIXER_CONTRACT_ADDRESS=0xE05DC7789038C669652bF3BfE4Fb684b7F420fCD

# Explorer
EXPLORER_URL=https://testnet.snowtrace.io
```

**Get Test USDC:**

1. Get AVAX from [Fuji Faucet](https://faucet.avax.network/)
2. Mint test USDC: `pnpm contracts:mint-usdc`

---

## API Endpoints Overview

### SENTINEL (Trust Validation)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/sentinel/validate` | POST | Validate URL safety |

**Use Cases:**
- Pre-payment trust scoring
- Phishing detection
- Agent payment validation

### X402 Payment Flow

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/payments/x402/intent` | POST | Create payment intent |
| `/v1/payments/x402/sign` | POST | Get EIP-712 authorization |
| `/v1/payments/x402/confirm` | POST | Execute on-chain payment |
| `/v1/payments/x402/status/:id` | GET | Check payment status |

**Complete Flow:**
```
validate → intent → sign → confirm → status
```

### Health

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Server health check |

---

## Signing Authorization (Step-by-Step)

The X402 flow requires EIP-712 signature signing. Here's how to do it:

### Option 1: Node.js Script

```javascript
const { ethers } = require('ethers');

async function signAuthorization() {
  // 1. Get authorization from /sign endpoint
  const response = await fetch('http://localhost:3000/v1/payments/x402/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ intentId: 'intent_...' })
  });

  const { authorization } = await response.json();

  // 2. Sign with your wallet
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
  const signature = await wallet.signTypedData(
    authorization.domain,
    authorization.types,
    authorization.message
  );

  console.log('Signature:', signature);

  // 3. Use signature in /confirm endpoint
  return signature;
}

signAuthorization();
```

### Option 2: Browser Wallet (MetaMask)

```javascript
// In browser console
const accounts = await ethereum.request({ method: 'eth_requestAccounts' });

// Copy authorization from Postman
const signature = await ethereum.request({
  method: 'eth_signTypedData_v4',
  params: [accounts[0], JSON.stringify({
    domain: authorization.domain,
    types: authorization.types,
    primaryType: 'TransferWithAuthorization',
    message: authorization.message
  })]
});

console.log('Signature:', signature);
```

---

## Testing Tips

### 1. Test with Known URLs

**Trusted URLs** (should pass):
- `https://api.stripe.com`
- `https://api.github.com`
- `https://www.google.com`

**Suspicious URLs** (should block):
- `http://free-money.xyz` (no HTTPS)
- `https://expired-cert.badssl.com` (expired cert)

### 2. Check Automatic Tests

Postman collection includes automatic tests:

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has canPay field", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('canPay');
});
```

Run entire collection with **Collection Runner** to see test results.

### 3. Monitor Console Output

Enable Postman Console (**View → Show Postman Console**) to see:
- Auto-saved environment variables
- Test results
- Request/response details

---

## Troubleshooting

### "Payment blocked by SENTINEL"

**Issue:** URL validation failed

**Solutions:**
1. Check URL uses HTTPS
2. Verify URL has valid TLS certificate
3. Try a known trusted URL first (e.g., `https://api.stripe.com`)
4. Check `trustScore` in response - must be ≥60

### "Treasury service not available"

**Issue:** On-chain payments not configured

**Solutions:**
1. Check `.env` has `TREASURY_CONTRACT_ADDRESS`
2. Check `.env` has `PRIVATE_KEY`
3. Restart backend: `pnpm backend:dev`
4. Verify contracts deployed: See [STATE.md](../standing/STATE.md)

### "Intent expired"

**Issue:** Payment intent expired (5-minute window)

**Solutions:**
1. Create new intent with `/intent` endpoint
2. Complete flow faster (intent valid for 5 minutes)
3. Check system time is synchronized

### "Insufficient USDC balance"

**Issue:** Wallet doesn't have enough USDC

**Solutions:**
1. Get test AVAX: [Fuji Faucet](https://faucet.avax.network/)
2. Mint test USDC: `pnpm contracts:mint-usdc`
3. Check balance on [Snowtrace](https://testnet.snowtrace.io)

### "Insufficient allowance"

**Issue:** Treasury contract not approved for USDC

**Solutions:**
1. Approve Treasury contract:
   ```bash
   pnpm contracts:approve-treasury
   ```
2. Verify approval on [Snowtrace](https://testnet.snowtrace.io)

---

## Rate Limits

- **Default**: 100 requests per minute per IP
- **Burst**: Up to 10 requests per second

Exceeded limits return:
```json
{
  "error": "Rate limit exceeded"
}
```

---

## Advanced Usage

### Custom Headers

```javascript
// Add custom headers in Postman
Headers:
  Content-Type: application/json
  X-Request-ID: custom-id-123
```

### Pre-request Scripts

```javascript
// Auto-generate unique intentId
pm.environment.set('testUrl', 'https://api.stripe.com');

// Add timestamp
pm.environment.set('timestamp', Date.now());
```

### Environment Variables

Create multiple environments:
- **Local** - `http://localhost:3000`
- **Staging** - `https://staging.snowrail.com`
- **Production** - `https://api.snowrail.com`

Switch between environments in Postman dropdown.

---

## SDK Alternative

For programmatic access, use the official SDK:

```typescript
import { createSentinel, createX402Facilitator } from '@snowrail/sentinel';

const sentinel = createSentinel();
const x402 = createX402Facilitator('avalanche-fuji');

// Validation
const result = await sentinel.validate({ url, amount });

// Payment
const intent = await x402.createPaymentIntent({ ... });
```

See [Sentinel README](../../packages/sentinel/README.md) for SDK documentation.

---

## Resources

- **API Reference**: [ENDPOINTS.md](./ENDPOINTS.md)
- **Postman Collection**: [postman-collection.json](./postman-collection.json)
- **Main README**: [../../README.md](../../README.md)
- **Contract Addresses**: [STATE.md](../standing/STATE.md)
- **GitHub Issues**: [Issues](https://github.com/Colombia-Blockchain/snowrail-core/issues)

---

## Contributing

Found an issue with the API docs or Postman collection?

1. Open an issue: [GitHub Issues](https://github.com/Colombia-Blockchain/snowrail-core/issues)
2. Submit a PR with fixes
3. Tag with `documentation` label

---

**Last Updated**: 2026-01-29
**Postman Collection Version**: 1.0.0
**API Version**: v1
