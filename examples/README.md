# SnowRail Code Examples

Ready-to-run examples for integrating SnowRail in multiple languages.

## Quick Start

Choose your language and start integrating:

| Language | Example | Complexity | Time |
|----------|---------|------------|------|
| [JavaScript](#nodejs-javascript) | Basic validation | Simple | 5 min |
| [TypeScript](#nodejs-typescript) | Complete E2E flow | Advanced | 15 min |
| [TypeScript](#nodejs-custom-check) | Custom security check | Advanced | 10 min |
| [Python](#python) | HTTP client | Medium | 5 min |
| [Go](#go) | HTTP client | Medium | 5 min |
| [Next.js](#nextjs-app) | Full app template | Advanced | 20 min |

---

## Examples Overview

### Node.js (JavaScript)

**File:** [node-js/basic-validation.js](./node-js/basic-validation.js)

Simple URL validation with SnowRail. Perfect for getting started.

**What it shows:**
- ✅ Basic validation with `validate()`
- ✅ Quick checks with `canPay()`
- ✅ Trust scoring with `trust()`
- ✅ Analyzing security checks

**Run it:**

```bash
cd examples/node-js
node basic-validation.js
```

**Output:**

```
🔍 SnowRail Basic Validation Example

Example 1: Validating trusted URL...
URL: https://api.stripe.com
✓ Can pay: true
  Trust score: 92/100
  Risk level: low
  Decision: approve
```

---

### Node.js (TypeScript)

#### 1. Complete E2E Flow

**File:** [node-js/complete-flow.ts](./node-js/complete-flow.ts)

Full X402 payment flow from validation to on-chain confirmation.

**What it shows:**
- ✅ SENTINEL validation
- ✅ Payment intent creation
- ✅ EIP-712 signing
- ✅ On-chain payment execution
- ✅ Receipt verification

**Prerequisites:**
- Backend running: `pnpm backend:dev`
- Private key in `.env`
- USDC balance and Treasury approval

**Run it:**

```bash
# Set up environment
echo "PRIVATE_KEY=your_key_here" > .env

# Run example
npx tsx examples/node-js/complete-flow.ts
```

**Output:**

```
🚀 SnowRail Complete Payment Flow

Step 1/5: Validating URL with SENTINEL...
  Trust Score: 92/100
  ✓ Validation passed

Step 2/5: Creating payment intent...
  Intent ID: intent_1738195200000_abc123
  ✓ Intent created

...

✨ Payment Completed Successfully!
TX Hash: 0xabcdef...
```

#### 2. Custom Security Check

**File:** [node-js/custom-check.ts](./node-js/custom-check.ts)

Learn how to create custom security checks.

**What it shows:**
- ✅ Extending `BaseCheck` class
- ✅ Implementing `execute()` method
- ✅ Registering custom checks
- ✅ Allowlist validation example
- ✅ Rate limit detection example

**Run it:**

```bash
npx tsx examples/node-js/custom-check.ts
```

**Output:**

```
🔧 Custom Security Check Example

Registering custom checks...
  ✓ AllowlistCheck registered
  ✓ RateLimitCheck registered

Test 1: Validating allowlisted domain...
URL: https://api.stripe.com
Trust Score: 95/100
Allowlist Check: ✓ PASS
```

---

### Python

**File:** [python/client.py](./python/client.py)

Python HTTP client for SnowRail API.

**What it shows:**
- ✅ Python client class
- ✅ URL validation
- ✅ Payment intent creation
- ✅ Batch validation
- ✅ Pretty-printed results

**Prerequisites:**

```bash
pip install -r examples/python/requirements.txt
```

**Run it:**

```bash
python examples/python/client.py
```

**Usage in your app:**

```python
from client import SnowRailClient

client = SnowRailClient()

# Validate URL
result = client.validate_url("https://api.stripe.com")
print(f"Can pay: {result['canPay']}")
print(f"Trust score: {result['trustScore']}/100")

# Create intent
intent = client.create_intent(
    url="https://merchant.com",
    amount=100,
    sender="0x...",
    recipient="0x..."
)
```

---

### Go

**File:** [go/main.go](./go/main.go)

Go HTTP client for SnowRail API.

**What it shows:**
- ✅ Go client struct
- ✅ URL validation
- ✅ Payment intent creation
- ✅ Batch validation
- ✅ Type-safe responses

**Prerequisites:**

```bash
cd examples/go
go mod tidy
```

**Run it:**

```bash
go run examples/go/main.go
```

**Usage in your app:**

```go
package main

import (
    "fmt"
    "github.com/colombia-blockchain/snowrail-examples"
)

func main() {
    client := NewClient("http://localhost:3000")

    // Validate URL
    result, err := client.ValidateURL("https://api.stripe.com", 100)
    if err != nil {
        panic(err)
    }

    fmt.Printf("Can pay: %v\n", result.CanPay)
    fmt.Printf("Trust score: %d/100\n", result.TrustScore)
}
```

---

### Next.js App

**Directory:** [nextjs-app/](./nextjs-app/)

Complete Next.js application with SnowRail integration.

**What it includes:**
- ✅ API routes for validation
- ✅ React components
- ✅ Trust score visualization
- ✅ TypeScript support
- ✅ Tailwind CSS styling
- ✅ Deployment-ready

**Features:**
- URL validator with real-time feedback
- Trust score progress bar
- Security checks breakdown
- Payment intent creation UI
- Responsive design

**Quick start:**

```bash
cd examples/nextjs-app
npm install
npm run dev

# Open http://localhost:3001
```

**Key files:**
- `app/api/validate/route.ts` - SENTINEL API endpoint
- `components/PaymentValidator.tsx` - Main validator UI
- `components/TrustScore.tsx` - Trust score display

See [nextjs-app/README.md](./nextjs-app/README.md) for full documentation.

---

## Running Examples

### Prerequisites

#### All Examples
- SnowRail backend running: `pnpm backend:dev`
- Backend accessible at `http://localhost:3000`

#### TypeScript Examples
- Node.js 18+ installed
- Run with: `npx tsx examples/node-js/filename.ts`

#### Python Examples
- Python 3.8+ installed
- Dependencies: `pip install -r examples/python/requirements.txt`

#### Go Examples
- Go 1.21+ installed
- Dependencies: `go mod tidy`

#### Next.js App
- Node.js 18+ installed
- Dependencies: `npm install`

---

## Example Comparison

| Feature | JS | TS (Flow) | TS (Custom) | Python | Go | Next.js |
|---------|----|-----------|----|--------|----|----|
| Basic validation | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Complete E2E flow | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Custom checks | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Payment intent | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ |
| UI components | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Type safety | ❌ | ✅ | ✅ | ⚠️ | ✅ | ✅ |
| Production ready | ⚠️ | ✅ | ✅ | ⚠️ | ✅ | ✅ |

✅ = Full support | ⚠️ = Partial support | ❌ = Not included

---

## Learning Path

### Path 1: Quick Start (15 minutes)

1. Run [basic-validation.js](./node-js/basic-validation.js) - 5 min
2. Try different URLs
3. Read output and understand trust scores
4. Check [Integration Guide](../docs/guides/INTEGRATION.md)

**Goal:** Understand basic validation

---

### Path 2: Complete Integration (45 minutes)

1. Review [complete-flow.ts](./node-js/complete-flow.ts) - 10 min
2. Set up environment (.env with PRIVATE_KEY) - 5 min
3. Run backend: `pnpm backend:dev` - 2 min
4. Execute complete flow - 3 min
5. Analyze each step - 15 min
6. Read [API Reference](../docs/api/ENDPOINTS.md) - 10 min

**Goal:** Master E2E payment flow

---

### Path 3: Custom Extensions (1 hour)

1. Study [custom-check.ts](./node-js/custom-check.ts) - 15 min
2. Run example and analyze output - 10 min
3. Read [Adding Checks Guide](../docs/guides/ADDING_CHECKS.md) - 20 min
4. Create your own check - 15 min

**Goal:** Create custom security checks

---

### Path 4: Full-Stack App (2 hours)

1. Review [nextjs-app/](./nextjs-app/) structure - 20 min
2. Install and run app - 10 min
3. Explore API routes and components - 30 min
4. Customize for your use case - 60 min

**Goal:** Deploy production-ready app

---

## Troubleshooting

### "Connection refused" error

**Issue:** Cannot connect to backend

**Solution:**
```bash
# Start backend
cd /path/to/snowrail-core
pnpm backend:dev

# Verify it's running
curl http://localhost:3000/health
```

### "Module not found: @snowrail/sentinel"

**Issue:** Package not built

**Solution:**
```bash
# Build Sentinel package
pnpm --filter @snowrail/sentinel build
```

### "Payment blocked by SENTINEL"

**Issue:** URL validation failed

**Solution:**
- Use HTTPS (not HTTP)
- Try known trusted URL first: `https://api.stripe.com`
- Check trust score - must be ≥60
- Lower threshold in `.env`: `SENTINEL_MIN_SCORE=40`

### "Intent expired"

**Issue:** Took too long between steps

**Solution:**
- Intents expire after 5 minutes
- Complete flow faster
- Create new intent with `/intent` endpoint

---

## Next Steps

After running examples:

1. **Integrate in your app**
   - Choose your language (JS/TS/Python/Go)
   - Copy example code
   - Customize for your use case

2. **Learn more**
   - Read [Integration Guide](../docs/guides/INTEGRATION.md)
   - Check [API Reference](../docs/api/ENDPOINTS.md)
   - Explore [Developer Guides](../docs/guides/README.md)

3. **Customize**
   - Create [custom checks](../docs/guides/ADDING_CHECKS.md)
   - Build [payment adapters](../docs/guides/ADDING_ADAPTERS.md)
   - Add your own validation rules

4. **Deploy**
   - Use Next.js template as starting point
   - Deploy to Vercel/Netlify
   - Connect to production contracts

---

## Contributing

Found a bug in an example? Want to add a new example?

1. Open an issue: [GitHub Issues](https://github.com/Colombia-Blockchain/snowrail-core/issues)
2. Submit a PR with fixes or new examples
3. Tag with `examples` label

**Example template:**
```
examples/
└── your-language/
    ├── README.md          # Setup and usage
    ├── example.ext        # Main example file
    ├── package.json       # Dependencies (if applicable)
    └── .env.example       # Environment template
```

---

## Resources

- **Main README**: [../../README.md](../../README.md)
- **API Docs**: [../docs/api/ENDPOINTS.md](../docs/api/ENDPOINTS.md)
- **Integration Guide**: [../docs/guides/INTEGRATION.md](../docs/guides/INTEGRATION.md)
- **Developer Guides**: [../docs/guides/README.md](../docs/guides/README.md)

---

**Last Updated**: 2026-01-29
**Examples Version**: 1.0.0
**Compatible with**: @snowrail/sentinel v2.0+

---

**Happy coding!** 🚀
