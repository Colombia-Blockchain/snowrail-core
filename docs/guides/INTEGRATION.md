# Integrating SnowRail

Learn how to integrate SnowRail Trust Layer into your application.

## Table of Contents

- [Quick Start](#quick-start)
- [Use Cases](#use-cases)
- [Integration Patterns](#integration-patterns)
- [Platform-Specific Guides](#platform-specific-guides)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Installation

```bash
# Using npm
npm install @snowrail/sentinel

# Using pnpm
pnpm add @snowrail/sentinel

# Using yarn
yarn add @snowrail/sentinel
```

### Basic Usage (Node.js)

```typescript
import { createSentinel } from '@snowrail/sentinel';

const sentinel = createSentinel({
  defaultMinScore: 60,
  cacheEnabled: true
});

// Validate URL before payment
const validation = await sentinel.validate({
  url: 'https://api.merchant.com',
  amount: 100
});

if (validation.canPay) {
  console.log('✓ Safe to pay');
  console.log('Trust score:', validation.trustScore);
  // Proceed with payment
} else {
  console.log('✗ Payment blocked');
  console.log('Reasons:', validation.blockedReasons);
  // Show error to user
}
```

---

## Use Cases

### Use Case 1: Pre-Payment Validation

Validate URLs before making any payment:

```typescript
import { createSentinel } from '@snowrail/sentinel';

async function validateBeforePayment(url: string, amount: number) {
  const sentinel = createSentinel({ defaultMinScore: 70 });

  const result = await sentinel.validate({ url, amount });

  if (!result.canPay) {
    throw new Error(`Payment blocked: ${result.blockedReasons.join(', ')}`);
  }

  return result.trustScore;
}

// Usage
try {
  const trustScore = await validateBeforePayment('https://merchant.com', 1000);
  console.log(`Validated with trust score: ${trustScore}/100`);
  // Proceed with payment
} catch (error) {
  console.error('Validation failed:', error.message);
}
```

### Use Case 2: Agent Payment System

Integrate with AI agents:

```typescript
import { createSentinel } from '@snowrail/sentinel';

class AgentPaymentSystem {
  private sentinel = createSentinel();

  async authorizePayment(agentId: string, url: string, amount: number) {
    // Get agent trust level
    const agentTrust = await this.getAgentTrustLevel(agentId);

    // Validate destination
    const validation = await this.sentinel.validate({
      url,
      amount,
      context: {
        agentId,
        agentTrust
      }
    });

    // Combine agent trust + destination trust
    const combinedTrust = (validation.trustScore + agentTrust) / 2;

    return {
      authorized: combinedTrust >= 60,
      trustScore: combinedTrust,
      details: validation
    };
  }

  private async getAgentTrustLevel(agentId: string): Promise<number> {
    // Query agent reputation from your system
    return 80; // Example
  }
}
```

### Use Case 3: Multi-Chain Router

Route payments across different chains:

```typescript
import { createSentinel, createX402Facilitator } from '@snowrail/sentinel';

class MultiChainRouter {
  private sentinel = createSentinel();
  private chains = new Map([
    ['avalanche-fuji', createX402Facilitator('avalanche-fuji')],
    ['avalanche-mainnet', createX402Facilitator('avalanche-mainnet')]
  ]);

  async routePayment(params: {
    url: string;
    amount: number;
    preferredChain: string;
    sender: string;
    recipient: string;
  }) {
    // 1. Validate with SENTINEL
    const validation = await this.sentinel.validate({
      url: params.url,
      amount: params.amount
    });

    if (!validation.canPay) {
      throw new Error('Payment blocked by SENTINEL');
    }

    // 2. Select chain
    const facilitator = this.chains.get(params.preferredChain);
    if (!facilitator) {
      throw new Error(`Unsupported chain: ${params.preferredChain}`);
    }

    // 3. Create intent
    const intent = await facilitator.createPaymentIntent({
      url: params.url,
      amount: params.amount,
      currency: 'USDC',
      token: facilitator.getUSDCConfig().tokenAddress,
      chain: params.preferredChain,
      sender: params.sender,
      recipient: params.recipient
    });

    return {
      validation,
      intent,
      chain: params.preferredChain
    };
  }
}
```

### Use Case 4: Trust Scoring Dashboard

Build a dashboard showing URL trust scores:

```typescript
import { createSentinel } from '@snowrail/sentinel';

class TrustDashboard {
  private sentinel = createSentinel();

  async analyzeDomain(domain: string) {
    const validation = await this.sentinel.validate({
      url: `https://${domain}`
    });

    return {
      domain,
      trustScore: validation.trustScore,
      risk: validation.risk,
      checks: validation.checks.map(check => ({
        name: check.name,
        passed: check.passed,
        score: check.score
      })),
      warnings: validation.warnings,
      timestamp: validation.timestamp
    };
  }

  async compareURLs(urls: string[]) {
    const results = await Promise.all(
      urls.map(url => this.sentinel.validate({ url }))
    );

    return results
      .map((result, index) => ({
        url: urls[index],
        trustScore: result.trustScore,
        canPay: result.canPay
      }))
      .sort((a, b) => b.trustScore - a.trustScore);
  }
}
```

---

## Integration Patterns

### Pattern 1: Gateway Validation

Use SENTINEL as a gateway before all payments:

```typescript
import { createSentinel } from '@snowrail/sentinel';
import express from 'express';

const app = express();
const sentinel = createSentinel();

// Middleware to validate all payment requests
app.use('/api/payments', async (req, res, next) => {
  const { url, amount } = req.body;

  const validation = await sentinel.validate({ url, amount });

  if (!validation.canPay) {
    return res.status(403).json({
      error: 'Payment blocked',
      trustScore: validation.trustScore,
      reasons: validation.blockedReasons
    });
  }

  // Attach validation to request
  req.validation = validation;
  next();
});

// Payment endpoint (validation already done)
app.post('/api/payments/create', async (req, res) => {
  const { url, amount } = req.body;
  const validation = req.validation; // From middleware

  // Create payment with confidence
  const payment = await createPayment(url, amount);

  res.json({
    payment,
    validation: {
      trustScore: validation.trustScore,
      decision: validation.decision
    }
  });
});

app.listen(3000);
```

### Pattern 2: Pre-Payment Hook

Add SENTINEL validation to existing payment flow:

```typescript
import { createSentinel } from '@snowrail/sentinel';

class PaymentProcessor {
  private sentinel = createSentinel();

  async processPayment(params: PaymentParams) {
    // Hook 1: Pre-validation
    const validation = await this.preValidate(params);

    // Hook 2: Create payment
    const payment = await this.createPayment(params);

    // Hook 3: Execute payment
    const result = await this.executePayment(payment);

    return result;
  }

  private async preValidate(params: PaymentParams) {
    const validation = await this.sentinel.validate({
      url: params.url,
      amount: params.amount
    });

    if (!validation.canPay) {
      throw new Error(`Validation failed: ${validation.blockedReasons.join(', ')}`);
    }

    return validation;
  }

  private async createPayment(params: PaymentParams) {
    // Your payment creation logic
    return { id: 'payment_123', ...params };
  }

  private async executePayment(payment: any) {
    // Your payment execution logic
    return { success: true, txHash: '0x...' };
  }
}
```

### Pattern 3: Caching Layer

Cache validation results for better performance:

```typescript
import { createSentinel } from '@snowrail/sentinel';
import NodeCache from 'node-cache';

class CachedValidator {
  private sentinel = createSentinel();
  private cache = new NodeCache({ stdTTL: 300 }); // 5 minutes

  async validate(url: string, amount: number) {
    // Create cache key
    const cacheKey = `${url}:${amount}`;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log('Cache hit');
      return cached;
    }

    // Validate with SENTINEL
    console.log('Cache miss - validating...');
    const validation = await this.sentinel.validate({ url, amount });

    // Store in cache
    this.cache.set(cacheKey, validation);

    return validation;
  }
}
```

---

## Platform-Specific Guides

### Next.js App

```typescript
// pages/api/validate.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createSentinel } from '@snowrail/sentinel';

const sentinel = createSentinel();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, amount } = req.body;

  try {
    const validation = await sentinel.validate({ url, amount });
    return res.status(200).json(validation);
  } catch (error) {
    return res.status(500).json({ error: 'Validation failed' });
  }
}

// pages/payment.tsx
import { useState } from 'react';

export default function PaymentPage() {
  const [url, setUrl] = useState('');
  const [trustScore, setTrustScore] = useState<number | null>(null);

  const validateURL = async () => {
    const response = await fetch('/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, amount: 100 })
    });

    const data = await response.json();
    setTrustScore(data.trustScore);

    if (!data.canPay) {
      alert('Payment blocked: ' + data.blockedReasons.join(', '));
    }
  };

  return (
    <div>
      <h1>Payment Validator</h1>
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://merchant.com"
      />
      <button onClick={validateURL}>Validate</button>

      {trustScore !== null && (
        <div>
          <h2>Trust Score: {trustScore}/100</h2>
          <progress value={trustScore} max="100" />
        </div>
      )}
    </div>
  );
}
```

### Express.js API

```typescript
import express from 'express';
import { createSentinel, createX402Facilitator } from '@snowrail/sentinel';

const app = express();
app.use(express.json());

const sentinel = createSentinel();
const x402 = createX402Facilitator('avalanche-fuji');

// Validate endpoint
app.post('/api/validate', async (req, res) => {
  const { url, amount } = req.body;

  const validation = await sentinel.validate({ url, amount });
  res.json(validation);
});

// Payment intent endpoint
app.post('/api/payment/intent', async (req, res) => {
  const { url, amount, sender, recipient } = req.body;

  // Validate first
  const validation = await sentinel.validate({ url, amount });

  if (!validation.canPay) {
    return res.status(403).json({
      error: 'Payment blocked',
      trustScore: validation.trustScore
    });
  }

  // Create intent
  const intent = await x402.createPaymentIntent({
    url,
    amount,
    currency: 'USDC',
    token: x402.getUSDCConfig().tokenAddress,
    chain: 'avalanche-fuji',
    sender,
    recipient
  });

  res.json({ intent, validation });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### React Native App

```typescript
// services/sentinel.ts
import { createSentinel } from '@snowrail/sentinel';

const sentinel = createSentinel({
  defaultMinScore: 60,
  cacheEnabled: true
});

export async function validatePayment(url: string, amount: number) {
  try {
    const validation = await sentinel.validate({ url, amount });
    return validation;
  } catch (error) {
    console.error('Validation error:', error);
    throw error;
  }
}

// components/PaymentScreen.tsx
import React, { useState } from 'react';
import { View, TextInput, Button, Text } from 'react-native';
import { validatePayment } from '../services/sentinel';

export function PaymentScreen() {
  const [url, setUrl] = useState('');
  const [trustScore, setTrustScore] = useState<number | null>(null);

  const handleValidate = async () => {
    const result = await validatePayment(url, 100);

    setTrustScore(result.trustScore);

    if (!result.canPay) {
      alert(`Blocked: ${result.blockedReasons.join(', ')}`);
    }
  };

  return (
    <View>
      <Text>Payment Validator</Text>
      <TextInput
        value={url}
        onChangeText={setUrl}
        placeholder="https://merchant.com"
      />
      <Button title="Validate" onPress={handleValidate} />

      {trustScore !== null && (
        <Text>Trust Score: {trustScore}/100</Text>
      )}
    </View>
  );
}
```

### CLI Tool

```typescript
#!/usr/bin/env node
import { createSentinel } from '@snowrail/sentinel';
import { Command } from 'commander';
import chalk from 'chalk';

const program = new Command();
const sentinel = createSentinel();

program
  .name('snowrail-cli')
  .description('SnowRail Trust Layer CLI')
  .version('1.0.0');

program
  .command('validate <url>')
  .description('Validate URL trust score')
  .option('-a, --amount <number>', 'Payment amount', '100')
  .action(async (url, options) => {
    console.log(chalk.blue('Validating...'), url);

    const validation = await sentinel.validate({
      url,
      amount: parseInt(options.amount)
    });

    if (validation.canPay) {
      console.log(chalk.green('✓ PASS'));
      console.log(`Trust Score: ${validation.trustScore}/100`);
    } else {
      console.log(chalk.red('✗ BLOCKED'));
      console.log('Reasons:', validation.blockedReasons);
    }

    console.log('\nChecks:');
    validation.checks.forEach(check => {
      const icon = check.passed ? chalk.green('✓') : chalk.red('✗');
      console.log(`${icon} ${check.name}: ${check.score}/100`);
    });
  });

program.parse();
```

---

## Best Practices

### 1. Initialize Once, Reuse Everywhere

```typescript
// ❌ BAD: Creating new instance every time
async function validateURL(url: string) {
  const sentinel = createSentinel(); // New instance each call
  return await sentinel.validate({ url });
}

// ✅ GOOD: Singleton pattern
const sentinel = createSentinel();

async function validateURL(url: string) {
  return await sentinel.validate({ url });
}
```

### 2. Handle Validation Errors

```typescript
// ✅ GOOD: Proper error handling
async function validateWithRetry(url: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await sentinel.validate({ url });
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

### 3. Use Environment Variables

```typescript
// .env
SENTINEL_MIN_SCORE=60
SENTINEL_CACHE=true
SENTINEL_CACHE_TTL=300000

// app.ts
import * as dotenv from 'dotenv';
dotenv.config();

const sentinel = createSentinel({
  defaultMinScore: parseInt(process.env.SENTINEL_MIN_SCORE || '60'),
  cacheEnabled: process.env.SENTINEL_CACHE === 'true',
  cacheTTL: parseInt(process.env.SENTINEL_CACHE_TTL || '300000')
});
```

### 4. Log Validation Results

```typescript
import { createSentinel } from '@snowrail/sentinel';

const sentinel = createSentinel();

sentinel.on('validation:complete', (event) => {
  console.log(`[SENTINEL] ${event.data.url} → ${event.data.trustScore}/100`);
});

sentinel.on('validation:blocked', (event) => {
  console.warn(`[SENTINEL] BLOCKED: ${event.data.url}`);
});
```

### 5. Test with Known URLs

```typescript
import { describe, it, expect } from 'vitest';
import { createSentinel } from '@snowrail/sentinel';

describe('SENTINEL Integration', () => {
  const sentinel = createSentinel();

  it('should approve trusted URLs', async () => {
    const result = await sentinel.validate({
      url: 'https://api.stripe.com'
    });

    expect(result.canPay).toBe(true);
    expect(result.trustScore).toBeGreaterThan(70);
  });

  it('should block HTTP URLs', async () => {
    const result = await sentinel.validate({
      url: 'http://insecure-site.com'
    });

    expect(result.canPay).toBe(false);
  });
});
```

---

## Troubleshooting

### "Module not found: @snowrail/sentinel"

**Solution:**
```bash
# Install package
pnpm add @snowrail/sentinel

# If using TypeScript, rebuild
pnpm build
```

### "Validation fails for all URLs"

**Solution:**
```typescript
// Lower minimum score for testing
const sentinel = createSentinel({
  defaultMinScore: 40 // Lower threshold
});
```

### "Slow validation times"

**Solution:**
```typescript
// Enable caching
const sentinel = createSentinel({
  cacheEnabled: true,
  cacheTTL: 300000 // 5 minutes
});
```

### "TypeError: Cannot read property 'validate'"

**Solution:**
```typescript
// Ensure proper import
import { createSentinel } from '@snowrail/sentinel';

// Not: import createSentinel from '@snowrail/sentinel'
```

---

## Next Steps

- [Adding Checks](./ADDING_CHECKS.md) - Create custom security checks
- [Adding Adapters](./ADDING_ADAPTERS.md) - Create payment adapters
- [API Reference](../api/ENDPOINTS.md) - Complete API documentation
- [Examples](../../examples/README.md) - Code examples

---

**Questions?** Open an issue on [GitHub](https://github.com/Colombia-Blockchain/snowrail-core/issues)

**Last Updated**: 2026-01-29
