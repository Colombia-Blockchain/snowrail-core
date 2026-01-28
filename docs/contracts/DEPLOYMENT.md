# Smart Contracts Deployment Guide

## Overview

SnowRail uses three main smart contracts deployed on Avalanche Fuji Testnet:

1. **MockUSDC** - ERC-20 test token for payments
2. **SnowRailTreasury** - Core payment and trust management system
3. **SnowRailMixer** - Zero-knowledge mixer for private payments

---

## Deployed Contracts (Fuji Testnet)

| Contract | Address | Snowtrace |
|----------|---------|-----------|
| MockUSDC | `0x7435BB56D89Cf26A03fabaE6fA36b66295a2A676` | [View](https://testnet.snowtrace.io/address/0x7435BB56D89Cf26A03fabaE6fA36b66295a2A676#code) |
| SnowRailTreasury | `0x79fa1E26938763Db1AD3d6d40bf79f3a23aE60dd` | [View](https://testnet.snowtrace.io/address/0x79fa1E26938763Db1AD3d6d40bf79f3a23aE60dd#code) |
| SnowRailMixer | `0xE05DC7789038C669652bF3BfE4Fb684b7F420fCD` | [View](https://testnet.snowtrace.io/address/0xE05DC7789038C669652bF3BfE4Fb684b7F420fCD#code) |

**Deployer:** `0x22f6F000609d52A0b0efCD4349222cd9d70716Ba`

**Deployment Date:** 2026-01-28

---

## Prerequisites

### 1. Environment Setup

Create a `.env` file with the following variables:

```bash
# Wallet with testnet AVAX
PRIVATE_KEY=0x...your_private_key...

# Snowtrace API Key for verification (get from https://snowtrace.io/myapikey)
SNOWTRACE_API_KEY=your_api_key
```

### 2. Get Testnet AVAX

Get free testnet AVAX from: https://core.app/tools/testnet-faucet/

### 3. Install Dependencies

```bash
pnpm install
```

---

## Deployment Commands

### Option 1: Individual Deployment (Recommended)

Deploy contracts one by one for better control:

```bash
# Step 1: Deploy MockUSDC token
pnpm contracts:deploy:usdc

# Step 2: Deploy Treasury and Mixer
pnpm contracts:deploy:treasury

# Step 3: Configure roles (SENTINEL, OPERATOR)
pnpm contracts:setup:roles
```

### Option 2: Full Deployment

Deploy all contracts in one command:

```bash
pnpm contracts:deploy
```

---

## Contract Verification

After deployment, verify contracts on Snowtrace:

```bash
# Verify MockUSDC (no constructor args)
pnpm hardhat verify --network fuji <USDC_ADDRESS>

# Verify Treasury (with constructor args)
pnpm hardhat verify --network fuji <TREASURY_ADDRESS> \
  <USDC_ADDRESS> <FEE_COLLECTOR> <ADMIN>

# Verify Mixer (with constructor args)
pnpm hardhat verify --network fuji <MIXER_ADDRESS> \
  <USDC_ADDRESS> <VERIFIER_ADDRESS> <OWNER>
```

---

## Contract Details

### MockUSDC

A test ERC-20 token that mimics USDC (6 decimals).

**Key Features:**
- 6 decimal places (standard USDC format)
- Anyone can mint tokens via `mint(address, amount)`
- Public `faucet()` function gives 10,000 USDC to caller

**Usage:**
```solidity
// Get test tokens
mockUSDC.faucet(); // Get 10,000 USDC

// Mint specific amount
mockUSDC.mint(address, amount);
```

---

### SnowRailTreasury

The core autonomous treasury system with X402 payment protocol and SENTINEL trust validation.

**Constructor Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `_paymentToken` | address | ERC-20 token address (MockUSDC) |
| `_feeCollector` | address | Address receiving protocol fees |
| `_admin` | address | Admin with all roles |

**Roles:**
| Role | Hash | Purpose |
|------|------|---------|
| `SENTINEL_ROLE` | `0x0e58f...` | Records trust attestations |
| `OPERATOR_ROLE` | `0x97667...` | Can pause/unpause contract |
| `DEFAULT_ADMIN_ROLE` | `0x00000...` | Full administrative access |

**Key Functions:**
```solidity
// Execute gasless payment with EIP-712 signature
executeX402Payment(X402Payment payment, bytes signature)

// Direct payment with fee deduction
pay(address to, uint256 amount, bytes32 resourceHash)

// Record trust attestation (SENTINEL only)
recordTrustAttestation(address target, uint256 trustScore, uint256 maxAmount, uint256 validUntil, bytes32 checkHash)

// Check if payment would be approved
canPay(address target, uint256 amount) returns (bool)

// Register AI agent (ERC-8004)
registerAgent(string name, string version, uint256 dailyLimit, bytes32 capabilitiesHash)
```

**Fee Configuration:**
- Default: 50 bps (0.5%)
- Maximum: 500 bps (5%)

---

### SnowRailMixer

Zero-knowledge mixer for private payments using Merkle tree commitments.

**Constructor Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `_token` | address | ERC-20 token (MockUSDC) |
| `_verifier` | address | ZK proof verifier (set later) |
| `_owner` | address | Contract owner |

**Fixed Denominations:**
| Level | Amount |
|-------|--------|
| Small | 100 USDC |
| Medium | 1,000 USDC |
| Large | 10,000 USDC |

**Key Functions:**
```solidity
// Deposit with Merkle commitment
deposit(bytes32 commitment, uint256 denomination)

// Withdraw with ZK proof
withdraw(bytes proof, bytes32 root, bytes32 nullifierHash, address recipient, address relayer, uint256 fee, uint256 denomination)
```

---

## Role Management

After deployment, roles are automatically configured:

```bash
# Check current roles
pnpm contracts:setup:roles

# Output shows:
# SENTINEL_ROLE: Granted to deployer
# OPERATOR_ROLE: Granted to deployer
# ADMIN_ROLE: Granted to deployer
```

To grant roles to other addresses, use the Treasury contract:

```solidity
// Grant SENTINEL_ROLE to backend wallet
treasury.grantRole(SENTINEL_ROLE, backendWalletAddress);
```

---

## Configuration Files

### config/deployments.json

Stores deployed contract addresses:

```json
{
  "fuji": {
    "usdc": "0x7435BB56D89Cf26A03fabaE6fA36b66295a2A676",
    "treasury": "0x79fa1E26938763Db1AD3d6d40bf79f3a23aE60dd",
    "mixer": "0xE05DC7789038C669652bF3BfE4Fb684b7F420fCD",
    "deployer": "0x22f6F000609d52A0b0efCD4349222cd9d70716Ba"
  }
}
```

### .env Contract Variables

```bash
TREASURY_CONTRACT_ADDRESS=0x79fa1E26938763Db1AD3d6d40bf79f3a23aE60dd
ASSET_ADDRESS=0x7435BB56D89Cf26A03fabaE6fA36b66295a2A676
MIXER_CONTRACT_ADDRESS=0xE05DC7789038C669652bF3BfE4Fb684b7F420fCD
```

---

## Troubleshooting

### "Insufficient funds" Error

Get testnet AVAX from: https://core.app/tools/testnet-faucet/

### "API token not found" during Verification

Add `SNOWTRACE_API_KEY` to your `.env` file.

### "Contract already verified"

The contract was previously verified. Use `--force` flag to re-verify.

### ESM/CommonJS Conflict

The project uses `tsconfig.hardhat.json` for Hardhat scripts. This is configured automatically.

---

## Network Configuration

### Fuji Testnet

| Property | Value |
|----------|-------|
| Chain ID | 43113 |
| RPC URL | https://api.avax-test.network/ext/bc/C/rpc |
| Explorer | https://testnet.snowtrace.io |
| Currency | AVAX |

### Mainnet (Future)

| Property | Value |
|----------|-------|
| Chain ID | 43114 |
| RPC URL | https://api.avax.network/ext/bc/C/rpc |
| Explorer | https://snowtrace.io |
| Currency | AVAX |

---

## Security Considerations

1. **Never commit private keys** - Use `.env` files (gitignored)
2. **Verify contracts** - Always verify on Snowtrace for transparency
3. **Test on Fuji first** - Never deploy untested code to mainnet
4. **Role management** - Only grant roles to trusted addresses
5. **Fee limits** - Protocol fee cannot exceed 5%

---

*Last Updated: 2026-01-28*
