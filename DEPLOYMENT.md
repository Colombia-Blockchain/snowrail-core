# SnowRail Core - Deployment Guide

Complete step-by-step guide to deploy SnowRail to production.

## Prerequisites

- [x] Node.js 18+ and pnpm installed
- [x] Wallet with Fuji AVAX ([Get from faucet](https://core.app/tools/testnet-faucet/))
- [x] Snowtrace API key ([Get free key](https://snowtrace.io/myapikey))
- [x] Railway account ([Sign up](https://railway.app))
- [x] Private key exported (never commit to git!)

---

## Part 1: Deploy Smart Contracts (Avalanche Fuji)

### Step 1: Configure Environment

```bash
# Create .env file in project root
cp .env.example .env

# Edit .env and add:
# - PRIVATE_KEY=0x... (your wallet private key)
# - SNOWTRACE_API_KEY=... (from snowtrace.io)
```

### Step 2: Install Dependencies

```bash
pnpm install
```

### Step 3: Check Balance

```bash
npx hardhat run scripts/check-balance.ts --network fuji
```

You need at least 1 AVAX for deployment. Get testnet AVAX from:
- https://core.app/tools/testnet-faucet/

### Step 4: Deploy Contracts

```bash
npx hardhat run scripts/deploy.ts --network fuji
```

Expected output:
```
Deploying contracts with: 0x...
Balance: 5.0 AVAX

📦 Deploying Mock USDC...
✅ MockUSDC: 0xABCD...

📦 Deploying SnowRailTreasury...
✅ SnowRailTreasury: 0x1234...

📦 Deploying SnowRailMixer...
✅ SnowRailMixer: 0x5678...

🔗 Linking contracts...
✅ Mixer linked to Treasury

============================================================
🎉 DEPLOYMENT COMPLETE
============================================================
MockUSDC:          0xABCD...
SnowRailTreasury:  0x1234...
SnowRailMixer:     0x5678...
============================================================
```

### Step 5: Verify on Snowtrace

```bash
# Copy the verify command from the output above, example:
npx hardhat verify --network fuji \
  0x1234... \  # Treasury address
  0xABCD... \  # USDC address
  YOUR_WALLET_ADDRESS \
  YOUR_WALLET_ADDRESS
```

### Step 6: Save Contract Addresses

Update [README.md](README.md):
```markdown
| Contract | Address | Explorer |
|----------|---------|----------|
| SnowRailTreasury | 0x1234... | [View](https://testnet.snowtrace.io/address/0x1234...) |
| MockUSDC | 0xABCD... | [View](https://testnet.snowtrace.io/address/0xABCD...) |
```

---

## Part 2: Deploy Backend API (Railway)

### Step 1: Prepare Backend

```bash
cd apps/backend
pnpm build
```

### Step 2: Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your repository
5. Select root directory: `/apps/backend`

### Step 3: Configure Environment Variables

In Railway dashboard, add these variables:

```bash
NODE_ENV=production
PORT=4000

# Blockchain (from Part 1)
TREASURY_CONTRACT=0x1234...
USDC_CONTRACT=0xABCD...
AVALANCHE_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc

# Optional: Database (if needed)
DATABASE_URL=postgresql://...

# Optional: AI (for enhanced YUKI)
OPENAI_API_KEY=sk-...
```

### Step 4: Deploy

Railway auto-deploys on push. Get your URL:
```
https://snowrail-backend-production.up.railway.app
```

### Step 5: Test Live API

```bash
curl https://YOUR_RAILWAY_URL.railway.app/health

# Expected:
{"status":"healthy","timestamp":"2026-01-25T..."}
```

---

## Part 3: Verify Deployment

### Test SENTINEL Endpoint

```bash
# Test trusted merchant
curl -X POST https://YOUR_RAILWAY_URL.railway.app/v1/sentinel/validate \
  -H "Content-Type: application/json" \
  -d '{"url":"https://api.stripe.com"}'

# Expected: {"canPay":true,"trustScore":95,"risk":"LOW","decision":"APPROVE"}
```

```bash
# Test untrusted merchant
curl -X POST https://YOUR_RAILWAY_URL.railway.app/v1/sentinel/validate \
  -H "Content-Type: application/json" \
  -d '{"url":"https://suspicious-site.xyz"}'

# Expected: {"canPay":false,"trustScore":31,"risk":"HIGH","decision":"DENY"}
```

### Test YUKI Endpoint

```bash
curl -X POST https://YOUR_RAILWAY_URL.railway.app/v1/yuki/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "message": "Check https://api.stripe.com"
  }'

# Expected: Trust analysis with score
```

---

## Part 4: Frontend Deployment (Optional)

### Vercel Deployment

```bash
cd apps/frontend

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel deploy --prod

# Configure environment variables in Vercel dashboard:
# VITE_API_URL=https://YOUR_RAILWAY_URL.railway.app
# VITE_TREASURY_CONTRACT=0x1234...
```

### Update CORS

After deploying frontend, update backend CORS in Railway:
```bash
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app
```

---

## Part 5: Test End-to-End Flow

### 1. Get Test USDC

```bash
# Using Hardhat console
npx hardhat console --network fuji

> const MockUSDC = await ethers.getContractAt("MockUSDC", "0xABCD...")
> await MockUSDC.faucet()
> await MockUSDC.balanceOf("YOUR_WALLET")
# Should show 10000000000 (10k USDC with 6 decimals)
```

### 2. Approve Treasury

```bash
> const Treasury = await ethers.getContractAt("SnowRailTreasury", "0x1234...")
> await MockUSDC.approve(Treasury.address, ethers.parseUnits("1000", 6))
```

### 3. Execute Payment

```bash
> const resourceHash = ethers.id("https://api.stripe.com")
> const tx = await Treasury.pay(
    "RECIPIENT_ADDRESS",
    ethers.parseUnits("100", 6),  // 100 USDC
    resourceHash
  )
> await tx.wait()
```

### 4. Verify on Snowtrace

Check transaction on:
```
https://testnet.snowtrace.io/tx/0xTX_HASH...
```

---

## Multichain Deployment (Future)

### Cronos Testnet

Update hardhat.config.ts:
```typescript
networks: {
  cronos: {
    url: "https://evm-t3.cronos.org",
    chainId: 338,
    accounts: [PRIVATE_KEY]
  }
}
```

Deploy:
```bash
npx hardhat run scripts/deploy.ts --network cronos
```

### Mantle Testnet

```typescript
networks: {
  mantle: {
    url: "https://rpc.testnet.mantle.xyz",
    chainId: 5001,
    accounts: [PRIVATE_KEY]
  }
}
```

---

## Troubleshooting

### Error: Insufficient funds

Get testnet AVAX from faucet:
- https://core.app/tools/testnet-faucet/

### Error: Nonce too high

Reset your account in MetaMask:
Settings → Advanced → Clear Activity Tab Data

### Backend not responding

Check Railway logs:
```bash
railway logs
```

### CORS errors

Add your frontend URL to CORS_ALLOWED_ORIGINS in Railway env vars.

---

## Production Checklist

Before mainnet deployment:

- [ ] Audit smart contracts (external security audit)
- [ ] Test with real funds on testnet (minimum 1 week)
- [ ] Set up monitoring (Sentry, Grafana)
- [ ] Configure rate limiting per user
- [ ] Enable DDoS protection (Cloudflare)
- [ ] Set up automated backups
- [ ] Create incident response plan
- [ ] Get insurance for smart contracts
- [ ] Prepare emergency pause mechanism
- [ ] Document all admin keys and multisig

---

## Support

- GitHub Issues: https://github.com/Colombia-Blockchain/snowrail-core/issues
- Discord: [Coming soon]
- Email: team@snowrail.xyz

---

## Quick Reference

### Fuji Testnet
- Chain ID: 43113
- RPC: https://api.avax-test.network/ext/bc/C/rpc
- Explorer: https://testnet.snowtrace.io
- Faucet: https://core.app/tools/testnet-faucet/

### Mainnet (Production)
- Chain ID: 43114
- RPC: https://api.avax.network/ext/bc/C/rpc
- Explorer: https://snowtrace.io

### Contract Addresses (Update after deployment)

#### Fuji Testnet
```
MockUSDC:          [PENDING DEPLOYMENT]
SnowRailTreasury:  [PENDING DEPLOYMENT]
SnowRailMixer:     [PENDING DEPLOYMENT]
```

#### Mainnet
```
Production deployment: TBD
```

---

**Next:** Update [README.md](README.md) with deployed contract addresses and Railway URL.

**🎉 Ready for Build Games submission!**
