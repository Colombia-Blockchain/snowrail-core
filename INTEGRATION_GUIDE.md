# 🔧 SnowRail Integration Guide

## Integrating YUKI + SENTINEL into Colombia-Blockchain/SnowRail

This guide walks you through integrating the new YUKI AI Assistant and SENTINEL Trust Layer into the existing SnowRail repository.

---

## 📋 Pre-requisites

1. Clone the existing repository:
```bash
git clone https://github.com/Colombia-Blockchain/SnowRail.git
cd SnowRail
```

2. Ensure you have:
- Node.js 18+
- pnpm (or npm)
- Git

---

## 🚀 Step 1: Extract and Copy Files

Extract the `snowrail-core.zip` to a temporary location, then copy the new packages:

```bash
# From the extracted snowrail-core directory:

# Copy SENTINEL package
cp -r packages/sentinel ../SnowRail/packages/

# Copy YUKI package  
cp -r packages/yuki ../SnowRail/packages/

# Copy frontend components
cp -r apps/frontend/src/components/yuki ../SnowRail/frontend/src/components/
cp -r apps/frontend/src/components/sentinel ../SnowRail/frontend/src/components/

# Copy new contracts
cp contracts/SnowRailMixer.sol ../SnowRail/contracts/
# Note: Don't overwrite existing SnowRailTreasury.sol - merge manually

# Copy documentation
cp README.md ../SnowRail/
cp INTEGRATION_GUIDE.md ../SnowRail/docs/
```

---

## 🔧 Step 2: Update Package.json

Add the new workspaces to your root `package.json`:

```json
{
  "workspaces": [
    "packages/*",
    "frontend",
    "backend",
    "api"
  ],
  "scripts": {
    "sentinel:build": "cd packages/sentinel && npm run build",
    "sentinel:test": "cd packages/sentinel && npm test",
    "yuki:build": "cd packages/yuki && npm run build",
    "yuki:test": "cd packages/yuki && npm test"
  }
}
```

---

## 🔌 Step 3: Integrate SENTINEL into Backend

### 3.1 Add SENTINEL to dependencies

In `backend/package.json`:
```json
{
  "dependencies": {
    "@snowrail/sentinel": "workspace:*"
  }
}
```

### 3.2 Create SENTINEL service

Create `backend/src/services/sentinel.service.ts`:

```typescript
import { createSentinel, Sentinel, ValidationResult } from '@snowrail/sentinel';

let sentinel: Sentinel | null = null;

export function getSentinel(): Sentinel {
  if (!sentinel) {
    sentinel = createSentinel({
      defaultMinScore: 60,
      cacheEnabled: true,
      cacheTTL: 300000 // 5 minutes
    });
  }
  return sentinel;
}

export async function validatePaymentDestination(
  url: string,
  amount?: number
): Promise<ValidationResult> {
  const s = getSentinel();
  return s.validate({ url, amount });
}

export async function canPay(url: string): Promise<boolean> {
  const s = getSentinel();
  return s.canPay(url);
}

export async function getTrustScore(url: string): Promise<number> {
  const s = getSentinel();
  return s.trust(url);
}
```

### 3.3 Add API routes

Create `backend/src/routes/sentinel.routes.ts`:

```typescript
import { Router } from 'express';
import { validatePaymentDestination, canPay, getTrustScore } from '../services/sentinel.service';

const router = Router();

// Full validation
router.post('/validate', async (req, res) => {
  try {
    const { url, amount } = req.body;
    const result = await validatePaymentDestination(url, amount);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Validation failed' });
  }
});

// Simple can-pay check
router.post('/can-pay', async (req, res) => {
  try {
    const { url } = req.body;
    const canPayResult = await canPay(url);
    res.json({ canPay: canPayResult });
  } catch (error) {
    res.status(500).json({ error: 'Check failed' });
  }
});

// Trust score only
router.get('/trust', async (req, res) => {
  try {
    const { url } = req.query;
    const trust = await getTrustScore(url as string);
    res.json({ trust, trustPercent: Math.round(trust * 100) });
  } catch (error) {
    res.status(500).json({ error: 'Trust check failed' });
  }
});

export default router;
```

### 3.4 Register routes in main app

In `backend/src/index.ts` or `backend/src/app.ts`:

```typescript
import sentinelRoutes from './routes/sentinel.routes';

// ... after other routes
app.use('/api/v1/sentinel', sentinelRoutes);
```

---

## 🤖 Step 4: Integrate YUKI into Backend

### 4.1 Add YUKI to dependencies

In `backend/package.json`:
```json
{
  "dependencies": {
    "@snowrail/yuki": "workspace:*"
  }
}
```

### 4.2 Create YUKI service with SENTINEL integration

Create `backend/src/services/yuki.service.ts`:

```typescript
import { createYuki, Yuki } from '@snowrail/yuki';
import { getSentinel } from './sentinel.service';

let yuki: Yuki | null = null;

export function getYuki(): Yuki {
  if (!yuki) {
    yuki = createYuki();
    
    // Override sentinel_check tool with real SENTINEL
    const sentinel = getSentinel();
    
    yuki.registerTool({
      name: 'sentinel_check',
      description: 'Check URL trust score using SENTINEL',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to check' }
        },
        required: ['url']
      },
      execute: async (params) => {
        const url = params.url as string;
        const result = await sentinel.validate({ url });
        return {
          toolCallId: crypto.randomUUID(),
          success: true,
          data: {
            canPay: result.canPay,
            trustScore: result.trustScore,
            risk: result.risk,
            decision: result.decision,
            checks: result.checks.map(c => ({
              type: c.type,
              passed: c.passed,
              score: c.score
            }))
          }
        };
      }
    });
  }
  return yuki;
}

export async function chat(
  userId: string,
  message: string,
  context?: { walletAddress?: string }
) {
  const y = getYuki();
  return y.chat(userId, message, context);
}
```

### 4.3 Add YUKI API routes

Create `backend/src/routes/yuki.routes.ts`:

```typescript
import { Router } from 'express';
import { chat, getYuki } from '../services/yuki.service';

const router = Router();

router.post('/chat', async (req, res) => {
  try {
    const { userId, message, walletAddress } = req.body;
    const response = await chat(userId, message, { walletAddress });
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Chat failed' });
  }
});

router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit } = req.query;
    const yuki = getYuki();
    const history = yuki.getHistory(userId, Number(limit) || 50);
    res.json({ messages: history });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get history' });
  }
});

router.delete('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const yuki = getYuki();
    yuki.clearHistory(userId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

export default router;
```

---

## 🎨 Step 5: Integrate Frontend Components

### 5.1 Add components to frontend

The components are already copied. Now import them in your pages:

```tsx
// In your dashboard or payment page
import { YukiChat } from '../components/yuki/YukiChat';
import { SentinelTrust } from '../components/sentinel/SentinelTrust';

export default function PaymentPage() {
  const [trustResult, setTrustResult] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  
  const handleTrustCheck = async (url: string) => {
    setIsChecking(true);
    const res = await fetch('/api/v1/sentinel/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const result = await res.json();
    setTrustResult(result);
    setIsChecking(false);
  };
  
  return (
    <div className="flex gap-6">
      {/* YUKI Chat */}
      <YukiChat 
        userId={user.id}
        walletAddress={user.wallet}
      />
      
      {/* SENTINEL Trust Check */}
      <SentinelTrust
        result={trustResult}
        isLoading={isChecking}
        onCheck={handleTrustCheck}
      />
    </div>
  );
}
```

---

## 📝 Step 6: Update Smart Contracts

### 6.1 Merge Treasury features

Add SENTINEL trust attestations to your existing `SnowRailTreasury.sol`:

```solidity
// Add to state variables
mapping(address => TrustAttestation) public trustCache;

struct TrustAttestation {
    uint256 trustScore;
    uint256 maxAmount;
    uint256 validUntil;
    bytes32 checkHash;
    address attestor;
}

// Add function to record attestations
function recordTrustAttestation(
    address target,
    uint256 trustScore,
    uint256 maxAmount,
    uint256 validUntil,
    bytes32 checkHash
) external onlyRole(SENTINEL_ROLE) {
    trustCache[target] = TrustAttestation({
        trustScore: trustScore,
        maxAmount: maxAmount,
        validUntil: validUntil,
        checkHash: checkHash,
        attestor: msg.sender
    });
}
```

### 6.2 Deploy Mixer contract

```bash
cd contracts
npx hardhat run scripts/deploy-mixer.ts --network fuji
```

---

## ✅ Step 7: Test Integration

### 7.1 Run tests

```bash
# Test SENTINEL
cd packages/sentinel
npm test

# Test YUKI
cd ../yuki
npm test

# Test backend integration
cd ../../backend
npm test
```

### 7.2 Manual testing

1. Start the dev server:
```bash
npm run dev
```

2. Open the dashboard and test:
   - Enter a URL in SENTINEL → Check trust score
   - Chat with YUKI → "Check https://merchant.com"
   - Verify YUKI uses SENTINEL for trust checks

---

## 🎯 Hackathon Demo Checklist

For Build Games, demonstrate:

- [ ] **SENTINEL Trust Check**: Show URL validation with score
- [ ] **YUKI Chat**: Natural language payment commands
- [ ] **x402 Payment**: Execute payment with trust validation
- [ ] **ZK Mixer**: Private deposit (optional)
- [ ] **Agent Registry**: ERC-8004 registration

### Demo Script

1. "Let me show you SENTINEL validating a merchant..."
2. Enter `https://api.stripe.com` → High trust score
3. "Now I'll ask YUKI to make a payment..."
4. Chat: "Pay $100 to https://api.merchant.com"
5. Show YUKI calling SENTINEL automatically
6. Confirm payment → Show transaction

---

## 🚨 Troubleshooting

### Common Issues

**1. Module not found: @snowrail/sentinel**
```bash
# Rebuild packages
npm run build --workspace=@snowrail/sentinel
```

**2. TypeScript errors**
```bash
# Install types
npm i -D @types/node
```

**3. SENTINEL checks timing out**
- Increase timeout in config
- Check network connectivity

**4. YUKI not responding**
- Check API endpoint configuration
- Verify userId is being passed

---

## 📞 Support

- GitHub Issues: [Colombia-Blockchain/SnowRail/issues](https://github.com/Colombia-Blockchain/SnowRail/issues)
- Discord: [snowrail.xyz/discord](https://discord.gg/snowrail)
- Email: team@snowrail.xyz

---

**Good luck with the hackathon! 🚀❄️**
