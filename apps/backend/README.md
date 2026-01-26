# @snowrail/backend

SnowRail API Server with SENTINEL trust validation and X402 payment flow.

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Server runs on http://localhost:3000
```

## Environment Variables

```bash
# Server
PORT=3000
NODE_ENV=development

# Chain
CHAIN=avalanche-fuji

# Sentinel
SENTINEL_MIN_SCORE=60
SENTINEL_CACHE=true
SENTINEL_CACHE_TTL=300000
SENTINEL_RATE_LIMIT=100

# Contracts (after deployment)
USDC_ADDRESS=0x...
TREASURY_ADDRESS=0x...
MIXER_ADDRESS=0x...
```

## API Endpoints

### Health Check

```bash
curl http://localhost:3000/health
```

---

## SENTINEL Endpoints

### POST /v1/sentinel/validate

Full trust validation.

```bash
curl -X POST http://localhost:3000/v1/sentinel/validate \
  -H "Content-Type: application/json" \
  -d '{"url": "https://api.stripe.com", "amount": 1000}'
```

Response:
```json
{
  "id": "val_123",
  "url": "https://api.stripe.com",
  "canPay": true,
  "trustScore": 92,
  "risk": "low",
  "decision": "approve",
  "checks": [...],
  "maxAmount": 100000
}
```

### POST /v1/sentinel/can-pay

Quick boolean check.

```bash
curl -X POST http://localhost:3000/v1/sentinel/can-pay \
  -H "Content-Type: application/json" \
  -d '{"url": "https://api.stripe.com"}'
```

Response:
```json
{
  "canPay": true,
  "trustScore": 92
}
```

### GET /v1/sentinel/trust

Get trust score.

```bash
curl "http://localhost:3000/v1/sentinel/trust?url=https://api.stripe.com"
```

Response:
```json
{
  "trust": 0.92,
  "trustScore": 92,
  "risk": "low"
}
```

### POST /v1/sentinel/decide

Agent decision API.

```bash
curl -X POST http://localhost:3000/v1/sentinel/decide \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.stripe.com",
    "amount": 1000,
    "context": {
      "agentId": "agent-123",
      "agentType": "autonomous"
    }
  }'
```

---

## X402 Payment Endpoints

### Complete Payment Flow

```bash
# Step 1: Create intent (validates with SENTINEL first)
curl -X POST http://localhost:3000/v1/payments/x402/intent \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://merchant.com/api",
    "amount": 100,
    "sender": "0xYourWallet...",
    "recipient": "0xMerchant..."
  }'

# Response includes intent ID and EIP-712 data
```

```bash
# Step 2: Get authorization to sign
curl -X POST http://localhost:3000/v1/payments/x402/sign \
  -H "Content-Type: application/json" \
  -d '{"intentId": "intent_123..."}'

# Response includes EIP-712 typed data for wallet signing
```

```bash
# Step 3: After executing on-chain, confirm receipt
curl -X POST http://localhost:3000/v1/payments/x402/confirm \
  -H "Content-Type: application/json" \
  -d '{
    "intentId": "intent_123...",
    "txHash": "0xabc..."
  }'
```

```bash
# Check status anytime
curl http://localhost:3000/v1/payments/x402/status/intent_123...
```

---

## YUKI Endpoints

### POST /v1/yuki/chat

Chat with AI assistant.

```bash
curl -X POST http://localhost:3000/v1/yuki/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "message": "Check https://api.stripe.com"
  }'
```

### GET /v1/yuki/history/:userId

Get chat history.

```bash
curl http://localhost:3000/v1/yuki/history/user123
```

---

## E2E Flow Example

```bash
# 1. Validate destination
VALIDATION=$(curl -s -X POST http://localhost:3000/v1/sentinel/validate \
  -H "Content-Type: application/json" \
  -d '{"url": "https://merchant.com", "amount": 100}')

echo $VALIDATION | jq '.canPay'  # true

# 2. Create payment intent
INTENT=$(curl -s -X POST http://localhost:3000/v1/payments/x402/intent \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://merchant.com",
    "amount": 100,
    "sender": "0x1234...",
    "recipient": "0x5678..."
  }')

INTENT_ID=$(echo $INTENT | jq -r '.intent.id')

# 3. Get authorization
AUTH=$(curl -s -X POST http://localhost:3000/v1/payments/x402/sign \
  -H "Content-Type: application/json" \
  -d "{\"intentId\": \"$INTENT_ID\"}")

# 4. Sign with wallet and execute USDC transfer on-chain
# ... (client-side wallet interaction)

# 5. Confirm receipt
curl -X POST http://localhost:3000/v1/payments/x402/confirm \
  -H "Content-Type: application/json" \
  -d "{\"intentId\": \"$INTENT_ID\", \"txHash\": \"0xabc...\"}"
```

## Architecture

```
Request -> Backend -> SENTINEL (validate) -> X402 (intent) -> USDC Transfer
                          |                      |
                     Trust Layer            Payment Layer
                     (5 policies)           (USDC only)
```

## License

MIT - Colombia Blockchain
