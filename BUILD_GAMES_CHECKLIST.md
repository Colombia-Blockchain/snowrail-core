# BUILD GAMES SUBMISSION CHECKLIST

## Pre-Submission (Complete Before Week 1)

### Contracts
- [ ] Deploy SnowRailTreasury to Fuji
- [ ] Deploy MockUSDC to Fuji  
- [ ] Verify contracts on Snowtrace
- [ ] Update README with real addresses
- [ ] Test payment flow end-to-end

### Demo
- [ ] API endpoint live and accessible
- [ ] Frontend deployed (Vercel/Railway)
- [ ] Test both cases:
  - [ ] High trust merchant --> payment succeeds
  - [ ] Low trust merchant --> payment blocked
- [ ] Record 60-second demo video

### Documentation
- [ ] Replace all `0x...` placeholders
- [ ] Remove "The first" claim
- [ ] Add 5-Minute Demo section at top
- [ ] Reduce visible scope (core only)

---

## Week 1: Idea Pitch

Deliverable: 1-minute video

Structure:
1. Problem (10s): "AI agents pay blindly, no trust verification"
2. Solution (20s): "SENTINEL validates before payment"
3. Demo (25s): Show high score --> pay, low score --> block
4. Why Avalanche (5s): "Fast finality, low fees, x402 ecosystem"

---

## Week 2-3: MVP

Deliverable: Working demo + GitHub + walkthrough

Requirements:
- [ ] Judge can test in 5 minutes
- [ ] One command setup: `pnpm install && pnpm dev`
- [ ] Public API endpoint
- [ ] Transaction visible on Snowtrace

Core Demo Flow:
```
1. Enter URL in SENTINEL
2. See trust score (e.g., 87/100)
3. Click "Pay"
4. See attestation recorded
5. View transaction on explorer
```

---

## Week 4-5: GTM

Deliverable: Business plan

Content:
- [ ] Pricing table (Free/Builder/Enterprise)
- [ ] Target users:
  - Agent developers building autonomous systems
  - Merchants wanting trust verification
- [ ] Distribution: SDK + Dashboard + Templates
- [ ] 3 target integrations (specific names)

---

## Week 6: Finals

Deliverable: Final pitch

Pitch Structure (3 minutes):
1. Hook: "What if your AI agent got scammed?" (15s)
2. Problem: Autonomous payments lack trust layer (30s)
3. Solution: Trust-before-pay with SENTINEL (45s)
4. Demo: Live or recorded (60s)
5. Traction: x402 hackathon win, metrics (20s)
6. Ask: What we're building next (10s)

---

## Critical Success Factors

1. **Demo must work**: Judge tests it, it works, no excuses
2. **Contracts deployed**: Real addresses, real transactions
3. **Clear differentiator**: "We validate BEFORE payment" (repeat this)
4. **Scope control**: Show 3 features well, not 15 features poorly

---

## What NOT to Do

- Don't claim "first" without proof
- Don't show architecture diagrams without working code
- Don't list features that aren't demo-ready
- Don't require complex setup (Postgres, Redis, etc.)
- Don't use excessive emojis or marketing language

---

## Comparison: SnowRail vs Competitors

| Feature | SnowRail | Generic x402 SDK |
|---------|----------|------------------|
| Pre-payment validation | Yes | No |
| Trust scoring | Yes | No |
| On-chain attestations | Yes | No |
| AI assistant | Yes | No |
| Simple SDK | Yes | Yes |

Our advantage: Security layer that others don't have.

---

## Deploy Commands

```bash
# Deploy contracts
cd contracts
cp .env.example .env
# Add PRIVATE_KEY and SNOWTRACE_API_KEY
npx hardhat run scripts/deploy.ts --network fuji

# Verify
npx hardhat verify --network fuji [TREASURY_ADDRESS] [USDC_ADDRESS] [ADMIN_ADDRESS] [ADMIN_ADDRESS]

# Deploy frontend
cd frontend
vercel deploy --prod

# Deploy backend
cd backend
railway up
```

---

## Contact

If something breaks during judging:
- Discord: [your-discord]
- Email: team@snowrail.xyz
- Backup demo video: [youtube-link]
