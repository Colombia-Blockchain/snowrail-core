# SnowRail API Endpoints

Complete API reference for SnowRail Trust Layer and X402 Payment Protocol.

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://api.snowrail.com` (coming soon)

## Authentication

None required for testnet. Production will use API keys.

---

## Table of Contents

- [SENTINEL Endpoints](#sentinel-endpoints)
  - [POST /v1/sentinel/validate](#post-v1sentinelvalidate)
- [X402 Payment Endpoints](#x402-payment-endpoints)
  - [POST /v1/payments/x402/intent](#post-v1paymentsx402intent)
  - [POST /v1/payments/x402/sign](#post-v1paymentsx402sign)
  - [POST /v1/payments/x402/confirm](#post-v1paymentsx402confirm)
  - [GET /v1/payments/x402/status/:intentId](#get-v1paymentsx402statusintentid)
- [Health Endpoint](#health-endpoint)
  - [GET /health](#get-health)

---

## SENTINEL Endpoints

### POST /v1/sentinel/validate

Validate if a URL is safe to pay. Runs comprehensive security checks including TLS, DNS, infrastructure analysis, and more.

**Request:**

```json
{
  "url": "https://api.stripe.com",
  "amount": 100
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| url | string | Yes | Target URL to validate |
| amount | number | No | Payment amount (affects risk scoring) |

**Response (Success - canPay: true):**

```json
{
  "id": "val_1738195200000_abc123",
  "url": "https://api.stripe.com",
  "timestamp": "2026-01-29T10:00:00.000Z",
  "duration": 234,
  "canPay": true,
  "trustScore": 92,
  "confidence": 0.95,
  "risk": "low",
  "decision": "approve",
  "checks": [
    {
      "type": "tls_certificate",
      "category": "identity",
      "name": "TLS Certificate Validation",
      "passed": true,
      "score": 95,
      "confidence": 0.95,
      "risk": "none",
      "details": {
        "grade": "A",
        "protocol": "TLSv1.3",
        "cipher": "TLS_AES_256_GCM_SHA384",
        "issuer": "DigiCert",
        "validUntil": "2027-01-15T23:59:59.000Z",
        "daysRemaining": 351
      }
    },
    {
      "type": "dns_security",
      "category": "identity",
      "name": "DNS Security Analysis",
      "passed": true,
      "score": 90,
      "confidence": 0.9,
      "risk": "none",
      "details": {
        "domain": "api.stripe.com",
        "ipv4Count": 2,
        "ipv6Enabled": true,
        "dnssec": true,
        "cloudflare": true,
        "hasSpf": true,
        "hasDmarc": true
      }
    }
  ],
  "maxAmount": 50000,
  "warnings": []
}
```

**Response (Blocked - canPay: false):**

```json
{
  "id": "val_1738195200000_xyz789",
  "url": "http://suspicious-site.xyz",
  "timestamp": "2026-01-29T10:00:00.000Z",
  "duration": 156,
  "canPay": false,
  "trustScore": 25,
  "confidence": 0.85,
  "risk": "critical",
  "decision": "deny",
  "checks": [
    {
      "type": "tls_certificate",
      "category": "identity",
      "name": "TLS Certificate Validation",
      "passed": false,
      "score": 0,
      "confidence": 1.0,
      "risk": "critical",
      "details": {
        "error": "URL does not use HTTPS",
        "protocol": "http:"
      }
    }
  ],
  "blockedReasons": [
    "URL does not use HTTPS",
    "Trust score below minimum threshold (25 < 60)"
  ]
}
```

**curl Example:**

```bash
curl -X POST http://localhost:3000/v1/sentinel/validate \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.stripe.com",
    "amount": 100
  }'
```

**Error Responses:**

- `400 Bad Request` - Missing required field (url)
- `500 Internal Server Error` - Validation failed

---

## X402 Payment Endpoints

### POST /v1/payments/x402/intent

Create a payment intent after trust validation. This is **Step 1** of the X402 payment flow.

**Flow:** validate → **intent** → sign → confirm

**Request:**

```json
{
  "url": "https://api.merchant.com",
  "amount": 100,
  "sender": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7",
  "recipient": "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199"
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| url | string | Yes | Destination URL (validated with SENTINEL) |
| amount | number | Yes | Payment amount in USDC |
| sender | string | Yes | Sender wallet address (0x...) |
| recipient | string | Yes | Recipient wallet address (0x...) |

**Response (Success):**

```json
{
  "intent": {
    "id": "intent_1738195200000_abc123",
    "status": "pending",
    "amount": 100,
    "currency": "USDC",
    "token": "0x7435BB56D89Cf26A03fabaE6fA36b66295a2A676",
    "chain": "avalanche-fuji",
    "sender": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7",
    "recipient": "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
    "expiresAt": "2026-01-29T10:05:00.000Z"
  },
  "validation": {
    "id": "val_1738195200000_xyz789",
    "trustScore": 92,
    "decision": "approve"
  },
  "usdcConfig": {
    "chainId": 43113,
    "chainName": "Avalanche Fuji Testnet",
    "tokenAddress": "0x7435BB56D89Cf26A03fabaE6fA36b66295a2A676",
    "decimals": 6
  }
}
```

**Response (Blocked by SENTINEL):**

```json
{
  "error": "Payment blocked by SENTINEL",
  "trustScore": 25,
  "risk": "critical",
  "reasons": [
    "URL does not use HTTPS",
    "Trust score below minimum threshold"
  ]
}
```

**curl Example:**

```bash
curl -X POST http://localhost:3000/v1/payments/x402/intent \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.merchant.com",
    "amount": 100,
    "sender": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7",
    "recipient": "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199"
  }'
```

**Error Responses:**

- `400 Bad Request` - Missing required fields
- `403 Forbidden` - Payment blocked by SENTINEL
- `500 Internal Server Error` - Failed to create intent

---

### POST /v1/payments/x402/sign

Get EIP-712 authorization data for signing. This is **Step 2** of the X402 payment flow.

**Flow:** validate → intent → **sign** → confirm

**Request:**

```json
{
  "intentId": "intent_1738195200000_abc123"
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| intentId | string | Yes | Intent ID from /intent response |

**Response:**

```json
{
  "intentId": "intent_1738195200000_abc123",
  "authorization": {
    "domain": {
      "name": "USD Coin",
      "version": "2",
      "chainId": 43113,
      "verifyingContract": "0x7435BB56D89Cf26A03fabaE6fA36b66295a2A676"
    },
    "types": {
      "TransferWithAuthorization": [
        { "name": "from", "type": "address" },
        { "name": "to", "type": "address" },
        { "name": "value", "type": "uint256" },
        { "name": "validAfter", "type": "uint256" },
        { "name": "validBefore", "type": "uint256" },
        { "name": "nonce", "type": "bytes32" }
      ]
    },
    "message": {
      "from": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7",
      "to": "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
      "value": "100000000",
      "validAfter": 0,
      "validBefore": 1738195500,
      "nonce": "0x3132333435363738393031323334353637383930313233343536373839303132"
    }
  },
  "message": "Sign this data with your wallet to authorize the USDC transfer"
}
```

**Usage with ethers.js:**

```javascript
const wallet = new ethers.Wallet(privateKey);
const signature = await wallet.signTypedData(
  authorization.domain,
  authorization.types,
  authorization.message
);
// Use signature in /confirm endpoint
```

**curl Example:**

```bash
curl -X POST http://localhost:3000/v1/payments/x402/sign \
  -H "Content-Type: application/json" \
  -d '{
    "intentId": "intent_1738195200000_abc123"
  }'
```

**Error Responses:**

- `400 Bad Request` - Missing intentId
- `410 Gone` - Intent expired
- `500 Internal Server Error` - Failed to prepare authorization

---

### POST /v1/payments/x402/confirm

Execute X402 payment on-chain. This is **Step 3** of the X402 payment flow.

**Flow:** validate → intent → sign → **confirm**

**Request:**

```json
{
  "intentId": "intent_1738195200000_abc123",
  "signature": "0x1234567890abcdef..."
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| intentId | string | Yes | Intent ID from /intent response |
| signature | string | Yes | EIP-712 signature from wallet |

**Response (Success):**

```json
{
  "success": true,
  "txHash": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
  "explorerUrl": "https://testnet.snowtrace.io/tx/0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
  "status": "confirmed",
  "receipt": {
    "intentId": "intent_1738195200000_abc123",
    "txHash": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    "amount": 100,
    "currency": "USDC",
    "chain": "avalanche-fuji",
    "sender": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7",
    "recipient": "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
    "status": "confirmed",
    "timestamp": "2026-01-29T10:02:34.567Z",
    "blockNumber": 12345678,
    "gasUsed": "65432"
  }
}
```

**Response (Failed):**

```json
{
  "error": "Insufficient USDC balance",
  "errorCode": "INSUFFICIENT_BALANCE"
}
```

**curl Example:**

```bash
curl -X POST http://localhost:3000/v1/payments/x402/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "intentId": "intent_1738195200000_abc123",
    "signature": "0x1234567890abcdef..."
  }'
```

**Error Codes:**

| Code | Status | Description |
|------|--------|-------------|
| INSUFFICIENT_BALANCE | 400 | Sender has insufficient USDC balance |
| INSUFFICIENT_ALLOWANCE | 400 | Treasury contract not approved for USDC |
| INVALID_SIGNATURE | 400 | EIP-712 signature verification failed |
| PAYMENT_EXPIRED | 410 | Payment intent has expired |
| TRUST_TOO_LOW | 403 | Trust score fell below threshold |
| CONTRACT_PAUSED | 503 | Treasury contract is paused |
| NETWORK_ERROR | 503 | Blockchain network error |

**Error Responses:**

- `400 Bad Request` - Missing fields or payment validation failed
- `410 Gone` - Intent expired
- `503 Service Unavailable` - Treasury service not configured
- `500 Internal Server Error` - Payment execution failed

---

### GET /v1/payments/x402/status/:intentId

Check the status of a payment intent.

**Request:**

```
GET /v1/payments/x402/status/intent_1738195200000_abc123
```

**Response:**

```json
{
  "intent": {
    "id": "intent_1738195200000_abc123",
    "status": "pending",
    "amount": 100,
    "currency": "USDC",
    "token": "0x7435BB56D89Cf26A03fabaE6fA36b66295a2A676",
    "chain": "avalanche-fuji",
    "sender": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7",
    "recipient": "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
    "expiresAt": "2026-01-29T10:05:00.000Z"
  },
  "receipt": {
    "intentId": "intent_1738195200000_abc123",
    "txHash": "0xabcdef...",
    "status": "confirmed",
    "timestamp": "2026-01-29T10:02:34.567Z"
  },
  "paid": true
}
```

**curl Example:**

```bash
curl http://localhost:3000/v1/payments/x402/status/intent_1738195200000_abc123
```

**Error Responses:**

- `404 Not Found` - Intent not found

---

## Health Endpoint

### GET /health

Check API server health status.

**Request:**

```
GET /health
```

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2026-01-29T10:00:00.000Z",
  "sentinel": {
    "healthy": true,
    "cacheSize": 42,
    "rateLimitRemaining": 98
  },
  "treasury": "enabled"
}
```

**curl Example:**

```bash
curl http://localhost:3000/health
```

---

## Complete E2E Flow Example

Here's how all endpoints work together:

```bash
# 1. Validate URL with SENTINEL
curl -X POST http://localhost:3000/v1/sentinel/validate \
  -H "Content-Type: application/json" \
  -d '{"url":"https://api.merchant.com","amount":100}'

# 2. Create payment intent
curl -X POST http://localhost:3000/v1/payments/x402/intent \
  -H "Content-Type: application/json" \
  -d '{
    "url":"https://api.merchant.com",
    "amount":100,
    "sender":"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7",
    "recipient":"0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199"
  }'

# 3. Get authorization data for signing
curl -X POST http://localhost:3000/v1/payments/x402/sign \
  -H "Content-Type: application/json" \
  -d '{"intentId":"intent_1738195200000_abc123"}'

# 4. Sign with wallet (use ethers.js or similar)
# const signature = await wallet.signTypedData(...)

# 5. Confirm payment on-chain
curl -X POST http://localhost:3000/v1/payments/x402/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "intentId":"intent_1738195200000_abc123",
    "signature":"0x1234567890abcdef..."
  }'

# 6. Check status
curl http://localhost:3000/v1/payments/x402/status/intent_1738195200000_abc123
```

---

## Rate Limits

- **Default**: 100 requests per minute per IP
- **Burst**: Up to 10 requests per second

Exceeded rate limits return `429 Too Many Requests`.

---

## Error Handling

All endpoints return consistent error format:

```json
{
  "error": "Error message",
  "errorCode": "ERROR_CODE"
}
```

Common HTTP status codes:

- `200 OK` - Success
- `400 Bad Request` - Invalid input
- `403 Forbidden` - Payment blocked
- `404 Not Found` - Resource not found
- `410 Gone` - Resource expired
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Service temporarily unavailable

---

## SDK Support

For easier integration, use the official SDK:

```typescript
import { createSentinel, createX402Facilitator } from '@snowrail/sentinel';

const sentinel = createSentinel();
const x402 = createX402Facilitator('avalanche-fuji');

// Complete flow in TypeScript
const validation = await sentinel.validate({ url, amount });
const intent = await x402.createPaymentIntent({ ... });
const auth = await x402.signAuthorization(intent);
// ... sign and execute
```

See [Sentinel README](../../packages/sentinel/README.md) for full SDK documentation.

---

## Support

- **Issues**: [GitHub Issues](https://github.com/Colombia-Blockchain/snowrail-core/issues)
- **Docs**: [Main README](../../README.md)
- **Contract Addresses**: [STATE.md](../standing/STATE.md)

---

**Last Updated**: 2026-01-29
**API Version**: v1
**Protocol**: X402 Payment Protocol + SENTINEL Trust Layer
