# Adding Custom Security Checks

Learn how to create custom security checks for SENTINEL.

## Table of Contents

- [What is a Check?](#what-is-a-check)
- [Check Interface](#check-interface)
- [Step-by-Step Guide](#step-by-step-guide)
- [Real Example: PhishingCheck](#real-example-phishingcheck)
- [Testing Your Check](#testing-your-check)
- [Best Practices](#best-practices)
- [Advanced Topics](#advanced-topics)

---

## What is a Check?

Security checks validate URLs before payment. Each check examines a specific aspect of security:

**Current Checks:**
- **TLS Certificate** - SSL/TLS validation
- **DNS Security** - DNSSEC, SPF, DMARC
- **Infrastructure** - Cloud provider, security headers
- **FIAT Compliance** - Payment processor detection
- **Protocol Policy** - x402/ERC-8004 compliance
- **Phishing Detection** - URL pattern analysis
- **Reputation** - Domain trust scoring
- **Smart Contract** - On-chain address validation

**Check Flow:**

```
URL → Check → { passed, score, confidence, risk, details }
```

---

## Check Interface

All checks implement the `BaseCheck` abstract class:

```typescript
import { BaseCheck, CheckResult, ValidationRequest } from '@snowrail/sentinel';

export class MyCustomCheck extends BaseCheck {
  // Required properties
  public readonly type = CheckType.CUSTOM;
  public readonly category = CheckCategory.POLICY;
  public readonly name = 'My Custom Check';
  public readonly description = 'What this check does';

  // Main execution method
  async execute(request: ValidationRequest): Promise<CheckResult> {
    // Your validation logic here
    return this.success(score, confidence, details);
  }
}
```

**Key Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `type` | `CheckType` | Unique check identifier |
| `category` | `CheckCategory` | identity / infrastructure / fiat / policy |
| `name` | `string` | Human-readable name |
| `description` | `string` | What the check validates |

**Methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `execute(request)` | `Promise<CheckResult>` | Main validation logic |
| `success(score, confidence, details)` | `CheckResult` | Return success result |
| `failure(score, confidence, risk, details)` | `CheckResult` | Return failure result |
| `parseUrl(url)` | `URL \| null` | Helper to parse URLs |

---

## Step-by-Step Guide

### Step 1: Create the Check Class

Create a new file in `packages/sentinel/src/checks/`:

**File:** `packages/sentinel/src/checks/MyCustomCheck.ts`

```typescript
import { BaseCheck } from './base';
import {
  CheckResult,
  CheckType,
  CheckCategory,
  RiskLevel,
  ValidationRequest,
  Evidence
} from '../types';

export class MyCustomCheck extends BaseCheck {
  public readonly type = CheckType.CUSTOM_CHECK;
  public readonly category = CheckCategory.POLICY;
  public readonly name = 'My Custom Check';
  public readonly description = 'Validates custom security rules';

  async execute(request: ValidationRequest): Promise<CheckResult> {
    const url = this.parseUrl(request.url);

    if (!url) {
      return this.failure(0, 1, RiskLevel.CRITICAL, {
        error: 'Invalid URL format'
      });
    }

    try {
      // Your validation logic
      const passed = await this.validateSomething(url.hostname);
      const score = passed ? 100 : 20;

      if (passed) {
        return this.success(score, 0.9, {
          hostname: url.hostname,
          detail: 'Check passed'
        });
      } else {
        return this.failure(score, 0.85, RiskLevel.MEDIUM, {
          hostname: url.hostname,
          reason: 'Check failed'
        });
      }
    } catch (error) {
      return this.failure(20, 0.5, RiskLevel.HIGH, {
        error: 'Check execution failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async validateSomething(hostname: string): Promise<boolean> {
    // Your custom validation logic here
    // Example: Check against allowlist
    const allowlist = ['api.stripe.com', 'api.github.com'];
    return allowlist.includes(hostname);
  }
}
```

### Step 2: Register the Check

Add your check to the Sentinel engine:

**File:** `packages/sentinel/src/core/engine.ts`

```typescript
import { MyCustomCheck } from '../checks/MyCustomCheck';

// In the Sentinel constructor:
constructor(config: SentinelConfig) {
  // ... existing code ...

  // Register checks
  this.checks = [
    new TLSCheck(),
    new DNSCheck(),
    new InfrastructureCheck(),
    new FIATCheck(),
    new ProtocolPolicyCheck(),
    new MyCustomCheck(), // <-- Add your check here
  ];
}
```

### Step 3: Export the Check

Make your check importable:

**File:** `packages/sentinel/src/checks/index.ts`

```typescript
export { BaseCheck } from './base';
export { TLSCheck } from './tls';
export { DNSCheck } from './dns';
// ... other checks ...
export { MyCustomCheck } from './MyCustomCheck';
```

### Step 4: Write Tests

Create tests for your check:

**File:** `packages/sentinel/src/__tests__/MyCustomCheck.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { MyCustomCheck } from '../checks/MyCustomCheck';
import { ValidationRequest } from '../types';

describe('MyCustomCheck', () => {
  const check = new MyCustomCheck();

  it('should pass for valid URLs', async () => {
    const request: ValidationRequest = {
      url: 'https://api.stripe.com',
      amount: 100
    };

    const result = await check.execute(request);

    expect(result.passed).toBe(true);
    expect(result.score).toBeGreaterThan(60);
    expect(result.risk).toBe('none');
  });

  it('should fail for invalid URLs', async () => {
    const request: ValidationRequest = {
      url: 'https://suspicious-site.xyz',
      amount: 100
    };

    const result = await check.execute(request);

    expect(result.passed).toBe(false);
    expect(result.score).toBeLessThan(60);
    expect(result.risk).not.toBe('none');
  });

  it('should handle invalid URL format', async () => {
    const request: ValidationRequest = {
      url: 'not-a-url',
      amount: 100
    };

    const result = await check.execute(request);

    expect(result.passed).toBe(false);
    expect(result.details).toHaveProperty('error');
  });
});
```

### Step 5: Run Tests

```bash
# Test your specific check
pnpm --filter @snowrail/sentinel test MyCustomCheck

# Test all checks
pnpm --filter @snowrail/sentinel test

# Run with coverage
pnpm --filter @snowrail/sentinel test --coverage
```

### Step 6: Build and Use

```bash
# Build the package
pnpm --filter @snowrail/sentinel build

# Use in your code
import { createSentinel } from '@snowrail/sentinel';
const sentinel = createSentinel();
const result = await sentinel.validate({ url: 'https://example.com' });
```

---

## Real Example: PhishingCheck

Here's how the actual `PhishingCheck` is implemented:

**File:** `packages/sentinel/src/checks/phishing.ts`

```typescript
import { BaseCheck } from './base';
import {
  CheckResult,
  CheckType,
  CheckCategory,
  RiskLevel,
  ValidationRequest
} from '../types';

export class PhishingCheck extends BaseCheck {
  public readonly type = CheckType.PHISHING;
  public readonly category = CheckCategory.IDENTITY;
  public readonly name = 'Phishing Detection';
  public readonly description = 'Detects suspicious URLs and phishing patterns';

  // Known phishing patterns
  private readonly SUSPICIOUS_PATTERNS = [
    /paypal.*verify/i,
    /amazon.*login.*update/i,
    /apple.*id.*suspend/i,
    /secure.*account.*confirm/i,
    /click.*here.*now/i,
    /urgent.*action.*required/i,
  ];

  // Suspicious TLDs
  private readonly SUSPICIOUS_TLDS = [
    '.tk', '.ml', '.ga', '.cf', '.gq',  // Free domains
    '.xyz', '.top', '.work', '.click',  // Commonly abused
  ];

  async execute(request: ValidationRequest): Promise<CheckResult> {
    const url = this.parseUrl(request.url);

    if (!url) {
      return this.failure(0, 1, RiskLevel.CRITICAL, {
        error: 'Invalid URL format'
      });
    }

    const suspiciousCount = this.detectSuspiciousPatterns(url);
    const score = this.calculateScore(suspiciousCount);
    const risk = this.scoreToRisk(score);

    if (suspiciousCount === 0) {
      return this.success(score, 0.8, {
        hostname: url.hostname,
        suspiciousPatterns: 0,
        clean: true
      });
    } else {
      return this.failure(score, 0.9, risk, {
        hostname: url.hostname,
        suspiciousPatterns: suspiciousCount,
        warning: 'URL matches phishing patterns'
      });
    }
  }

  private detectSuspiciousPatterns(url: URL): number {
    let count = 0;

    // Check URL patterns
    const fullUrl = url.href;
    for (const pattern of this.SUSPICIOUS_PATTERNS) {
      if (pattern.test(fullUrl)) {
        count++;
      }
    }

    // Check TLD
    const hostname = url.hostname;
    for (const tld of this.SUSPICIOUS_TLDS) {
      if (hostname.endsWith(tld)) {
        count++;
      }
    }

    // Check for IP address
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      count++;
    }

    // Check for excessive subdomains (e.g., paypal.secure.verify.example.com)
    const subdomains = hostname.split('.');
    if (subdomains.length > 4) {
      count++;
    }

    return count;
  }

  private calculateScore(suspiciousCount: number): number {
    let score = 100;
    score -= suspiciousCount * 25;
    return Math.max(0, Math.min(100, score));
  }
}
```

**Key Takeaways:**

1. **Clear patterns**: Define what you're checking for
2. **Scoring logic**: Convert findings to score (0-100)
3. **Risk levels**: Map scores to risk (none/low/medium/high/critical)
4. **Detailed results**: Return useful information in `details`
5. **Error handling**: Catch and handle errors gracefully

---

## Testing Your Check

### Unit Tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MyCustomCheck } from '../checks/MyCustomCheck';

describe('MyCustomCheck', () => {
  let check: MyCustomCheck;

  beforeEach(() => {
    check = new MyCustomCheck();
  });

  describe('Basic Validation', () => {
    it('should validate trusted URLs', async () => {
      const result = await check.execute({
        url: 'https://api.stripe.com',
        amount: 100
      });

      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(60);
    });

    it('should reject suspicious URLs', async () => {
      const result = await check.execute({
        url: 'https://suspicious.xyz',
        amount: 100
      });

      expect(result.passed).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed URLs', async () => {
      const result = await check.execute({
        url: 'not-a-valid-url',
        amount: 100
      });

      expect(result.passed).toBe(false);
      expect(result.details).toHaveProperty('error');
    });

    it('should handle network errors', async () => {
      // Mock network failure
      const result = await check.execute({
        url: 'https://nonexistent-domain-12345.com',
        amount: 100
      });

      // Should fail gracefully
      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('score');
    });
  });
});
```

### Integration Tests

```typescript
import { createSentinel } from '@snowrail/sentinel';

describe('MyCustomCheck Integration', () => {
  it('should work with Sentinel', async () => {
    const sentinel = createSentinel();

    const result = await sentinel.validate({
      url: 'https://api.stripe.com',
      amount: 100
    });

    // Find your check in results
    const myCheck = result.checks.find(c => c.type === 'custom_check');
    expect(myCheck).toBeDefined();
    expect(myCheck?.passed).toBe(true);
  });
});
```

---

## Best Practices

### 1. Keep Checks Fast

Checks should complete in < 500ms:

```typescript
// ❌ BAD: Synchronous long operations
private validateDomain(domain: string): boolean {
  for (let i = 0; i < 1000000; i++) {
    // Slow loop
  }
}

// ✅ GOOD: Async with timeout
private async validateDomain(domain: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 500);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response.ok;
  } finally {
    clearTimeout(timeout);
  }
}
```

### 2. Handle Errors Gracefully

Never throw unhandled errors:

```typescript
// ❌ BAD: Unhandled errors
async execute(request: ValidationRequest): Promise<CheckResult> {
  const data = await fetchData(request.url); // May throw
  return this.success(100, 1, { data });
}

// ✅ GOOD: Wrapped in try-catch
async execute(request: ValidationRequest): Promise<CheckResult> {
  try {
    const data = await fetchData(request.url);
    return this.success(100, 1, { data });
  } catch (error) {
    return this.failure(20, 0.5, RiskLevel.HIGH, {
      error: 'Check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
```

### 3. Return Detailed Failure Reasons

Help users understand why a check failed:

```typescript
// ❌ BAD: Generic message
return this.failure(30, 0.8, RiskLevel.HIGH, {
  error: 'Failed'
});

// ✅ GOOD: Specific reason
return this.failure(30, 0.8, RiskLevel.HIGH, {
  error: 'Certificate expired',
  expiryDate: cert.validTo,
  daysExpired: daysSinceExpiry,
  hostname: url.hostname
});
```

### 4. Add Tests for Edge Cases

```typescript
describe('Edge Cases', () => {
  it('should handle IPv6 addresses', async () => {
    await check.execute({ url: 'https://[::1]:8080' });
  });

  it('should handle URLs with auth', async () => {
    await check.execute({ url: 'https://user:pass@example.com' });
  });

  it('should handle very long URLs', async () => {
    const longPath = 'a'.repeat(2000);
    await check.execute({ url: `https://example.com/${longPath}` });
  });

  it('should handle unicode domains', async () => {
    await check.execute({ url: 'https://münchen.de' });
  });
});
```

### 5. Use Confidence Scores

Express how confident you are in the result:

```typescript
// High confidence - definitive result
return this.success(100, 0.95, { /* ... */ });

// Medium confidence - heuristic-based
return this.success(80, 0.7, { /* ... */ });

// Low confidence - uncertain
return this.success(60, 0.5, { /* ... */ });
```

---

## Advanced Topics

### Custom Scoring Algorithms

```typescript
private calculateScore(analysis: MyAnalysis): number {
  let score = 100;

  // Critical factors (major deductions)
  if (analysis.critical) score -= 50;

  // Important factors
  score -= analysis.warnings * 10;

  // Minor factors
  score -= analysis.minorIssues * 5;

  // Bonuses
  if (analysis.hasSecurity) score += 10;
  if (analysis.verified) score += 5;

  // Clamp to 0-100
  return Math.max(0, Math.min(100, score));
}
```

### Collecting Evidence

```typescript
private collectEvidence(data: MyData): Evidence[] {
  return [
    this.createEvidence('certificate', 'tls_data', {
      issuer: data.issuer,
      validUntil: data.validTo
    }, true),

    this.createEvidence('dns', 'resolution', {
      ip: data.ip,
      hostname: data.hostname
    }, true)
  ];
}
```

### Weighted Checks

```typescript
// Set weight in check metadata
export class MyCustomCheck extends BaseCheck {
  public readonly weight = 1.5; // Higher weight = more important

  // ... rest of check
}
```

### Async Initialization

```typescript
export class MyCustomCheck extends BaseCheck {
  private cache: Map<string, boolean> = new Map();

  async initialize(): Promise<void> {
    // Load allowlist from external source
    const response = await fetch('https://api.example.com/allowlist');
    const allowlist = await response.json();

    allowlist.forEach((domain: string) => {
      this.cache.set(domain, true);
    });
  }

  async execute(request: ValidationRequest): Promise<CheckResult> {
    const url = this.parseUrl(request.url);
    const allowed = this.cache.has(url.hostname);
    // ... validation logic
  }
}
```

---

## Troubleshooting

### Check Not Running

**Issue:** Your check doesn't appear in results

**Solution:**
1. Verify registration in `engine.ts`
2. Check imports in `checks/index.ts`
3. Rebuild: `pnpm --filter @snowrail/sentinel build`

### Low Score Despite Passing

**Issue:** Check passes but contributes low score

**Solution:**
- Increase score in `this.success(score, ...)` call
- Adjust scoring algorithm
- Consider increasing check weight

### Timeout Errors

**Issue:** Check times out

**Solution:**
```typescript
// Add timeout to async operations
const timeout = 500;
const result = await Promise.race([
  yourAsyncOperation(),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), timeout)
  )
]);
```

---

## Next Steps

- [Adding Adapters](./ADDING_ADAPTERS.md) - Create payment adapters
- [Integration Guide](./INTEGRATION.md) - Integrate SnowRail in your app
- [API Reference](../api/ENDPOINTS.md) - Complete API documentation

---

**Questions?** Open an issue on [GitHub](https://github.com/Colombia-Blockchain/snowrail-core/issues)

**Last Updated**: 2026-01-29
