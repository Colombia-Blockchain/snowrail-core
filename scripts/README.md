# SnowRail Scripts Documentation

This directory contains utility scripts for deploying, testing, and managing the SnowRail Core system.

---

## E2E Test Automation Script

### Overview

The `e2e-test.ts` script executes a complete end-to-end test of the SnowRail payment flow on Avalanche Fuji Testnet.

**Flow tested:**
```
SENTINEL Validation → Create Intent → Sign EIP-712 → On-chain Confirm → Snowtrace Verification
```

### Setup

#### 1. Install Dependencies

```bash
pnpm install
```

#### 2. Required Environment Variables

Make sure your `.env` file contains:

```env
# Backend API
PORT=4000
API_URL=http://localhost:4000

# Blockchain (Fuji)
NETWORK=fuji
CHAIN_ID=43113
RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
EXPLORER_URL=https://testnet.snowtrace.io

# Your wallet (must have testnet AVAX for gas)
PRIVATE_KEY=0x...

# Contract addresses (update after deployment)
TREASURY_CONTRACT_ADDRESS=0x...
ASSET_ADDRESS=0x...  # MockUSDC on Fuji
PAY_TO_ADDRESS=0x...  # Recipient address (optional, defaults to Treasury)

# Snowtrace API Key (for verification)
SNOWTRACE_API_KEY=...
```

#### 3. Prerequisites

Before running the E2E test:

- Deploy contracts to Fuji: `pnpm contracts:deploy`
- Update `.env` with deployed contract addresses
- Get testnet AVAX from [Avalanche Faucet](https://core.app/tools/testnet-faucet/)
- Start the backend server: `pnpm backend:dev`

### Running the Test

```bash
pnpm e2e
```

### Expected Output

The script will display:

1. **STEP 1 - SENTINEL Validation**
   - Check results in a table (TLS, DNS, Infrastructure, etc.)
   - Trust score, risk level, and canPay decision
   - ✅ Blocks payment if URL is not safe

2. **STEP 2 - Create Intent**
   - Intent ID
   - Expiration timestamp
   - Sender/recipient addresses

3. **STEP 3 - Sign EIP-712**
   - Authorization data (nonce, validity period)
   - Truncated signature

4. **STEP 4 - Confirm Payment**
   - Transaction hash
   - Block number
   - Status (success/pending)

5. **STEP 5 - Verify**
   - Snowtrace explorer link
   - Final summary table with all transaction details

**Example output:**

```
╔═══════════════════════════════════════════════════════════════════╗
║           SNOWRAIL E2E TEST - AVALANCHE FUJI TESTNET             ║
╚═══════════════════════════════════════════════════════════════════╝

ℹ Backend: http://localhost:4000
ℹ Wallet: 0x22f6F000609d52A0b0efCD4349222cd9d70716Ba
ℹ Test URL: https://example.com
ℹ Test Amount: 1 USDC

══════════════════════════════════════════════════════════════════════
STEP 1 – SENTINEL Validation
══════════════════════════════════════════════════════════════════════

✓ SENTINEL validation passed

══════════════════════════════════════════════════════════════════════
STEP 2 – Create Payment Intent
══════════════════════════════════════════════════════════════════════

✓ Intent created: intent_abc123xyz

[... continues through all steps ...]

══════════════════════════════════════════════════════════════════════
✓ E2E TEST COMPLETED SUCCESSFULLY
══════════════════════════════════════════════════════════════════════

ℹ Total execution time: 28.45s
```

### Test Parameters

You can modify the test parameters in the script:

```typescript
const CONFIG = {
  testUrl: 'https://example.com',      // URL to validate
  testAmount: 1,                        // Amount in USDC
  recipientAddress: '0x...',            // Payment recipient
};
```

### Duration

Expected duration: **30-60 seconds**

- SENTINEL validation: ~2-5s
- Intent creation: ~1s
- Signature generation: ~1s
- On-chain confirmation: ~20-45s (depends on network congestion)
- Verification: ~1s

### Error Handling

The script handles common errors gracefully:

- **Missing environment variables**: Displays clear error message
- **SENTINEL blocks payment**: Shows blocked reasons
- **API errors**: Displays HTTP status and response data
- **Transaction failures**: Shows error details from contract

### Troubleshooting

| Error | Solution |
|-------|----------|
| `Missing PRIVATE_KEY` | Add your wallet private key to `.env` |
| `Backend connection failed` | Make sure backend is running: `pnpm backend:dev` |
| `Insufficient funds` | Get testnet AVAX from the faucet |
| `Contract not deployed` | Run `pnpm contracts:deploy` first |
| `SENTINEL blocked payment` | URL failed trust checks - this is expected behavior |
| `Transaction reverted` | Check contract addresses in `.env` are correct |

---

## Other Scripts

### Contract Deployment

```bash
# Deploy all contracts to Fuji
pnpm contracts:deploy

# Deploy individual contracts
pnpm contracts:deploy:usdc
pnpm contracts:deploy:treasury

# Setup roles and permissions
pnpm contracts:setup:roles

# Verify contracts on Snowtrace
pnpm contracts:verify --network fuji
```

### Development

```bash
# Compile contracts
pnpm contracts:compile

# Run contract tests
pnpm contracts:test

# Run SENTINEL unit tests
pnpm sentinel:test
```

---

## File Structure

```
scripts/
├── README.md              # This file
├── e2e-test.ts            # E2E test automation
├── deploy.ts              # Main deployment script
├── deploy-usdc.ts         # MockUSDC deployment
├── deploy-treasury.ts     # Treasury deployment
└── setup-roles.ts         # Role configuration
```

---

## Additional Notes

- The E2E script uses **real on-chain transactions** on Fuji testnet
- All transactions cost testnet AVAX (gas fees)
- The script automatically waits for transaction confirmation
- Explorer links are automatically generated for verification
- The test validates the complete X402 payment protocol flow

---

## Support

For issues or questions:
- GitHub: https://github.com/Colombia-Blockchain/snowrail-core/issues
- Documentation: `/docs/`
