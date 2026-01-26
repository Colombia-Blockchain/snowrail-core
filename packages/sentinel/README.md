# @snowrail/sentinel

Trust Layer SDK for AI Agent Payments. Pre-payment validation engine for x402 protocol.

## Installation

```bash
npm install @snowrail/sentinel
# or
pnpm add @snowrail/sentinel
```

## Quick Start

```typescript
import { createSentinel } from '@snowrail/sentinel';

const sentinel = createSentinel();

// Simple check: can I pay this URL?
const canPay = await sentinel.canPay('https://api.merchant.com');
console.log(canPay); // true or false

// Get trust score (0-1)
const trust = await sentinel.trust('https://api.merchant.com');
console.log(`Trust: ${trust * 100}%`); // Trust: 85%
```

## API Reference

### `createSentinel(config?)`

Create a new Sentinel instance.

```typescript
const sentinel = createSentinel({
  defaultMinScore: 60,      // Minimum score to allow payment (0-100)
  cacheEnabled: true,       // Cache validation results
  cacheTTL: 300000,         // Cache TTL in ms (5 minutes)
  rateLimitEnabled: true,   // Enable rate limiting
  rateLimitRequests: 100    // Requests per minute
});
```

### `sentinel.canPay(url)`

Quick boolean check if URL is safe to pay.

```typescript
if (await sentinel.canPay('https://api.stripe.com')) {
  // Safe to proceed
}
```

### `sentinel.trust(url)`

Get trust score as decimal (0-1).

```typescript
const trust = await sentinel.trust('https://merchant.com');
// Returns 0.85 for 85% trust
```

### `sentinel.validate(request)`

Full validation with detailed results.

```typescript
const result = await sentinel.validate({
  url: 'https://api.merchant.com',
  amount: 1000,
  currency: 'USDC'
});

console.log(result.trustScore);     // 85
console.log(result.canPay);         // true
console.log(result.risk);           // 'low'
console.log(result.decision);       // 'approve'
console.log(result.checks);         // Array of check results
console.log(result.maxAmount);      // 50000 (recommended max)
```

### `sentinel.decide(url, amount, context?)`

Agent-first decision API.

```typescript
const decision = await sentinel.decide('https://api.merchant.com', 1000, {
  agentId: 'agent-123',
  agentType: 'autonomous',
  trustLevel: 0.8
});

if (decision.pay && amount <= decision.maxAmount) {
  await executePayment();
}

console.log(decision.reasoning); // ['Trusted domain', 'Valid TLS', ...]
```

## Validation Result

```typescript
interface ValidationResult {
  id: string;              // Unique validation ID
  url: string;             // Validated URL
  timestamp: Date;
  duration: number;        // Validation time (ms)
  
  // Core decision
  canPay: boolean;         // Safe to pay?
  trustScore: number;      // 0-100
  confidence: number;      // 0-1
  risk: 'low' | 'medium' | 'high' | 'critical';
  decision: 'approve' | 'deny' | 'review' | 'conditional';
  
  // Details
  checks: CheckResult[];   // Individual check results
  maxAmount?: number;      // Recommended max payment
  warnings?: string[];     // Non-blocking issues
  blockedReasons?: string[]; // Why blocked (if denied)
}
```

## Checks (Policies)

Sentinel runs 5 policy checks:

| Check | Category | Weight | Description |
|-------|----------|--------|-------------|
| TLS Certificate | Identity | 1.5 | SSL/TLS validation |
| DNS Security | Identity | 1.2 | DNSSEC, SPF, DMARC |
| Infrastructure | Infrastructure | 1.0 | Cloud provider, security headers |
| FIAT Compliance | FIAT | 1.3 | Payment processor detection |
| Protocol Policy | Policy | 1.4 | x402/ERC-8004 compliance |

## Events

```typescript
sentinel.on('validation:start', (event) => {
  console.log('Starting validation:', event.data.url);
});

sentinel.on('validation:complete', (event) => {
  console.log('Completed:', event.data.trustScore);
});

sentinel.on('check:error', (event) => {
  console.error('Check failed:', event.data);
});
```

## X402 Integration

```typescript
import { createSentinel, createX402Facilitator } from '@snowrail/sentinel';

const sentinel = createSentinel();
const x402 = createX402Facilitator('avalanche-fuji');

// 1. Validate
const validation = await sentinel.validate({ url, amount });
if (!validation.canPay) throw new Error('Blocked');

// 2. Create intent
const intent = await x402.createPaymentIntent({
  url,
  amount,
  currency: 'USDC',
  token: x402.getUSDCConfig().tokenAddress,
  chain: 'avalanche-fuji',
  sender: walletAddress,
  recipient: merchantAddress
});

// 3. Get authorization for signing
const auth = await x402.signAuthorization(intent);

// 4. Sign with wallet and execute transfer
// ... wallet.signTypedData(auth.domain, auth.message)

// 5. Confirm receipt
const verified = await x402.verifyReceipt({
  intentId: intent.id,
  txHash,
  status: 'confirmed',
  amount: intent.amount,
  token: intent.token,
  chain: intent.chain,
  timestamp: new Date()
});
```

## Custom Checks

Extend Sentinel with custom policies:

```typescript
import { BaseCheck, CheckResult, ValidationRequest } from '@snowrail/sentinel';

class MyCustomCheck extends BaseCheck {
  public readonly type = 'my_custom_check';
  public readonly category = 'policy';
  public readonly name = 'My Custom Check';
  
  async execute(request: ValidationRequest): Promise<CheckResult> {
    // Your validation logic
    const score = await this.validateSomething(request.url);
    
    return this.success(score, 0.9, {
      detail: 'Check passed'
    });
  }
}

// Register
const sentinel = createSentinel();
sentinel.registerCheck(new MyCustomCheck());
```

## Configuration

Environment variables:

```bash
SENTINEL_MIN_SCORE=60       # Minimum trust score
SENTINEL_CACHE=true         # Enable caching
SENTINEL_CACHE_TTL=300000   # Cache TTL (ms)
SENTINEL_RATE_LIMIT=100     # Requests per minute
```

## License

MIT - Colombia Blockchain
