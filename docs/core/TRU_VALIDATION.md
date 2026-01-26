# Tru Validation - Trust Layer Contract

Version: 2.0.0
Status: Stable
Package: @snowrail/sentinel

---

## Overview

Tru Validation is the core output contract of SENTINEL. It defines the formal specification for pre-payment trust validation in the x402 protocol.

---

## Input: ValidationRequest

```typescript
interface ValidationRequest {
  // Required
  url: string;                    // Target URL to validate

  // Optional - Payment Context
  amount?: number;                // Payment amount (affects maxAmount recommendation)
  currency?: string;              // Currency code (default: USDC)
  sender?: string;                // Sender address
  recipient?: string;             // Recipient address
  
  // Optional - Metadata
  metadata?: Record<string, unknown>;  // Additional context
  
  // Optional - Validation Options
  options?: {
    timeout?: number;             // Max validation time (ms)
    checks?: CheckType[];         // Specific checks to run
    skipChecks?: CheckType[];     // Checks to skip
    minScore?: number;            // Override minimum score (default: 60)
    maxRisk?: RiskLevel;          // Max acceptable risk
    parallel?: boolean;           // Run checks in parallel (default: true)
    cache?: boolean;              // Use cached results (default: true)
    cacheTTL?: number;            // Cache duration (ms)
  };
}
```

### Minimal Request

```typescript
{ url: "https://api.merchant.com" }
```

### Full Request

```typescript
{
  url: "https://api.merchant.com/pay",
  amount: 1000,
  currency: "USDC",
  sender: "0x1234...",
  recipient: "0x5678...",
  metadata: {
    resourceId: "invoice-123",
    chain: "avalanche"
  },
  options: {
    timeout: 15000,
    minScore: 70,
    checks: ["tls_certificate", "dns_security", "x402_support"]
  }
}
```

---

## Output: ValidationResult

```typescript
interface ValidationResult {
  // Identifiers
  id: string;                     // Unique validation ID (UUID)
  url: string;                    // Validated URL
  timestamp: Date;                // Validation time
  duration: number;               // Total duration (ms)
  
  // Core Decision
  canPay: boolean;                // Primary decision: safe to pay?
  trustScore: number;             // Aggregate score (0-100)
  confidence: number;             // Result confidence (0-1)
  risk: RiskLevel;                // Risk classification
  decision: Decision;             // Detailed decision

  // Check Breakdown
  checks: CheckResult[];          // Individual check results
  checksRun: number;              // Total checks executed
  checksPassed: number;           // Checks that passed
  checksFailed: number;           // Checks that failed

  // Recommendations
  maxAmount?: number;             // Max recommended payment
  conditions?: string[];          // Conditions for approval
  warnings?: string[];            // Non-blocking issues
  blockedReasons?: string[];      // Reasons for denial

  // Audit Trail
  hash: string;                   // Result hash for verification
  signature?: string;             // Optional cryptographic signature
}
```

### Decision Matrix

| Trust Score | Risk Level | Decision | canPay |
|-------------|------------|----------|--------|
| 80-100 | LOW | APPROVE | true |
| 60-79 | MEDIUM | CONDITIONAL | true |
| 40-59 | HIGH | REVIEW | false |
| 0-39 | CRITICAL | DENY | false |

### Risk Levels

| Level | Description | Action |
|-------|-------------|--------|
| LOW | Trusted destination | Auto-approve |
| MEDIUM | Some concerns | Approve with monitoring |
| HIGH | Significant issues | Requires manual review |
| CRITICAL | Major red flags | Block transaction |

### Decision Types

| Decision | Meaning |
|----------|---------|
| APPROVE | Safe to proceed |
| CONDITIONAL | Safe with conditions (amount limits, etc) |
| REVIEW | Requires human approval |
| DENY | Do not proceed |

---

## 5 Initial Policies (Checks)

SENTINEL v2.0 implements 5 policy categories with specific checks:

### 1. TLS Certificate (Identity)

**File:** `checks/tls.ts`
**Type:** `tls_certificate`
**Weight:** 1.5

Validates:
- Certificate validity (not expired, not future-dated)
- Certificate chain completeness
- Trusted CA issuer
- Protocol version (TLS 1.2+)
- Cipher strength
- HTTPS enforcement

**Scoring:**
- Valid cert from trusted CA: 90-100
- Valid cert, unknown CA: 70-89
- Expired/invalid cert: 0-39

---

### 2. DNS Security (Identity)

**File:** `checks/dns.ts`
**Type:** `dns_security`
**Weight:** 1.2

Validates:
- DNS resolution success
- DNSSEC status
- SPF records
- DMARC records
- CAA records
- CDN/WAF detection (Cloudflare, etc)

**Scoring:**
- Full DNS security (DNSSEC + SPF + DMARC): 90-100
- Basic DNS with email security: 70-89
- DNS only, no security records: 50-69
- DNS issues: 0-49

---

### 3. Infrastructure (Infrastructure)

**File:** `checks/infrastructure.ts`
**Type:** `cloud_provider`, `security_headers`
**Weight:** 1.0

Validates:
- Cloud provider identification (AWS, GCP, Azure, Cloudflare)
- Security headers (CSP, HSTS, X-Frame-Options, etc)
- WAF detection
- Rate limiting presence
- API versioning

**Scoring:**
- Enterprise cloud + all security headers: 90-100
- Known cloud + partial headers: 70-89
- Unknown hosting, minimal headers: 50-69
- No security measures: 0-49

---

### 4. FIAT Compliance (FIAT)

**File:** `checks/fiat.ts`
**Type:** `payment_processor`, `pci_compliance`
**Weight:** 1.3

Validates:
- Known payment processor integration (Stripe, PayPal, etc)
- PCI DSS compliance indicators
- Merchant verification
- Payment API patterns

**Scoring:**
- Known processor + PCI indicators: 90-100
- Payment capabilities detected: 70-89
- Unknown payment handling: 50-69
- Suspicious patterns: 0-49

---

### 5. Protocol Policy (Policy)

**File:** `checks/policy.ts`
**Type:** `x402_support`, `erc8004_compliance`, `rate_limits`
**Weight:** 1.4

Validates:
- x402 protocol support (HTTP 402 handling)
- ERC-8004 agent identity compliance
- Rate limit headers
- API documentation presence
- Terms of service

**Scoring:**
- Full x402 + ERC-8004 compliance: 90-100
- Partial protocol support: 70-89
- Standard API, no agent support: 50-69
- No protocol compliance: 0-49

---

## Score Calculation

```
TrustScore = SUM(check.score * check.weight) / SUM(weights)
```

**Default Weights:**
- TLS Certificate: 1.5
- DNS Security: 1.2
- Infrastructure: 1.0
- FIAT Compliance: 1.3
- Protocol Policy: 1.4

**Total Weight:** 6.4

**Example:**
```
TLS:    85 * 1.5 = 127.5
DNS:    90 * 1.2 = 108.0
Infra:  70 * 1.0 = 70.0
FIAT:   80 * 1.3 = 104.0
Policy: 75 * 1.4 = 105.0
-------------------------
Total:  514.5 / 6.4 = 80.4 -> Trust Score: 80
```

---

## API Usage

### Simple Check

```typescript
import { createSentinel } from '@snowrail/sentinel';

const sentinel = createSentinel();

// Boolean check
const canPay = await sentinel.canPay('https://api.merchant.com');

// Trust score (0-1)
const trust = await sentinel.trust('https://api.merchant.com');
```

### Full Validation

```typescript
const result = await sentinel.validate({
  url: 'https://api.merchant.com',
  amount: 1000
});

console.log(result.trustScore);  // 80
console.log(result.canPay);      // true
console.log(result.decision);    // 'conditional'
console.log(result.maxAmount);   // 50000
```

### Agent Decision

```typescript
const decision = await sentinel.decide('https://api.merchant.com', 1000, {
  agentId: 'agent-123',
  agentType: 'autonomous',
  trustLevel: 0.8
});

if (decision.pay && amount <= decision.maxAmount) {
  await executePayment();
}
```

---

## Evidence Collection

Each check collects evidence for audit:

```typescript
interface Evidence {
  type: 'certificate' | 'dns_record' | 'header' | 'api_response' | 'blockchain' | 'external';
  source: string;
  data: unknown;
  verified: boolean;
  hash?: string;
}
```

Evidence is stored in `ValidationResult.checks[].evidence` for compliance and dispute resolution.

---

## Extensibility

New checks can be added by extending `BaseCheck`:

```typescript
import { BaseCheck, CheckResult, ValidationRequest } from '@snowrail/sentinel';

export class CustomCheck extends BaseCheck {
  public readonly type = 'custom_check';
  public readonly category = 'policy';
  
  async execute(request: ValidationRequest): Promise<CheckResult> {
    // Implementation
  }
}
```

Register with sentinel:

```typescript
const sentinel = createSentinel();
sentinel.registerCheck(new CustomCheck());
```

---

## Changelog

- v2.0.0: Initial stable release with 5 policies
- v2.1.0: (Planned) Add reputation scoring
- v2.2.0: (Planned) Add ZK attestation support

---

Document generated: 2026-01-26
Author: Colombia Blockchain
