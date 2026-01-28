# Contract Integration Guide

## Overview

This guide explains how to integrate SnowRail smart contracts into your application.

---

## Contract ABIs

After running `pnpm contracts:compile`, ABIs are generated in:

```
typechain-types/
├── MockUSDC.ts
├── SnowRailTreasury.ts
├── SnowRailMixer.ts
└── factories/
    ├── MockUSDC__factory.ts
    ├── SnowRailTreasury__factory.ts
    └── SnowRailMixer__factory.ts
```

### Using TypeChain Types

```typescript
import { MockUSDC__factory, SnowRailTreasury__factory } from "../typechain-types";
import { ethers } from "ethers";

// Connect to contracts
const provider = new ethers.JsonRpcProvider("https://api.avax-test.network/ext/bc/C/rpc");
const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

const usdc = MockUSDC__factory.connect(
  "0x7435BB56D89Cf26A03fabaE6fA36b66295a2A676",
  signer
);

const treasury = SnowRailTreasury__factory.connect(
  "0x79fa1E26938763Db1AD3d6d40bf79f3a23aE60dd",
  signer
);
```

---

## Common Operations

### 1. Get Test USDC

```typescript
// Option 1: Use faucet (anyone can call)
await usdc.faucet(); // Gets 10,000 USDC

// Option 2: Mint specific amount (anyone can call)
await usdc.mint(recipientAddress, ethers.parseUnits("1000", 6));
```

### 2. Check USDC Balance

```typescript
const balance = await usdc.balanceOf(userAddress);
console.log(`Balance: ${ethers.formatUnits(balance, 6)} USDC`);
```

### 3. Approve Treasury to Spend USDC

```typescript
// Approve treasury to spend USDC
const amount = ethers.parseUnits("1000", 6); // 1000 USDC
await usdc.approve(treasury.target, amount);
```

### 4. Make a Payment via Treasury

```typescript
// Direct payment (requires approval first)
const resourceHash = ethers.keccak256(ethers.toUtf8Bytes("service-123"));
await treasury.pay(recipientAddress, amount, resourceHash);
```

### 5. Execute X402 Gasless Payment

```typescript
// Create X402 payment struct
const payment = {
  from: signerAddress,
  to: recipientAddress,
  value: ethers.parseUnits("100", 6),
  validAfter: 0,
  validBefore: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  nonce: await treasury.nonces(signerAddress),
  resourceHash: ethers.keccak256(ethers.toUtf8Bytes("resource-id"))
};

// Sign with EIP-712
const domain = {
  name: "SnowRailTreasury",
  version: "1",
  chainId: 43113,
  verifyingContract: treasury.target
};

const types = {
  X402Payment: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "resourceHash", type: "bytes32" }
  ]
};

const signature = await signer.signTypedData(domain, types, payment);

// Execute payment (can be called by anyone - gasless for the payer)
await treasury.executeX402Payment(payment, signature);
```

### 6. Record Trust Attestation (SENTINEL only)

```typescript
// Requires SENTINEL_ROLE
await treasury.recordTrustAttestation(
  targetAddress,     // Address being attested
  85,                // Trust score (0-100)
  ethers.parseUnits("10000", 6), // Max recommended amount
  Math.floor(Date.now() / 1000) + 86400, // Valid for 24 hours
  ethers.keccak256(ethers.toUtf8Bytes("checks-performed"))
);
```

### 7. Check if Payment Can Proceed

```typescript
const canProceed = await treasury.canPay(targetAddress, amount);
if (canProceed) {
  // Safe to make payment
}
```

### 8. Register an AI Agent (ERC-8004)

```typescript
await treasury.registerAgent(
  "MyAgent",           // name
  "1.0.0",             // version
  ethers.parseUnits("1000", 6), // daily limit
  ethers.keccak256(ethers.toUtf8Bytes("capabilities-hash"))
);

// Get agent card
const agentCard = await treasury.getAgentCard(agentAddress);
console.log(`Agent: ${agentCard.name} v${agentCard.version}`);
console.log(`Trust Level: ${agentCard.trustLevel}`);
console.log(`Daily Limit: ${ethers.formatUnits(agentCard.dailyLimit, 6)} USDC`);
```

---

## Role Management

### Check Role

```typescript
const SENTINEL_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SENTINEL_ROLE"));
const hasSentinel = await treasury.hasRole(SENTINEL_ROLE, address);
```

### Grant Role (Admin only)

```typescript
const SENTINEL_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SENTINEL_ROLE"));
await treasury.grantRole(SENTINEL_ROLE, newSentinelAddress);
```

### Revoke Role (Admin only)

```typescript
await treasury.revokeRole(SENTINEL_ROLE, oldSentinelAddress);
```

---

## Events

### Listen for Payments

```typescript
treasury.on("PaymentExecuted", (from, to, amount, fee, resourceHash, event) => {
  console.log(`Payment: ${from} -> ${to}`);
  console.log(`Amount: ${ethers.formatUnits(amount, 6)} USDC`);
  console.log(`Fee: ${ethers.formatUnits(fee, 6)} USDC`);
});
```

### Listen for Trust Attestations

```typescript
treasury.on("TrustAttestationRecorded", (target, attestor, trustScore, maxAmount, validUntil) => {
  console.log(`Trust recorded for ${target}`);
  console.log(`Score: ${trustScore}/100`);
  console.log(`Max Amount: ${ethers.formatUnits(maxAmount, 6)} USDC`);
});
```

### Listen for Agent Registration

```typescript
treasury.on("AgentRegistered", (agent, name, version, dailyLimit) => {
  console.log(`New agent: ${name} v${version}`);
  console.log(`Address: ${agent}`);
  console.log(`Daily Limit: ${ethers.formatUnits(dailyLimit, 6)} USDC`);
});
```

---

## Error Handling

Common errors and their meanings:

| Error | Meaning | Solution |
|-------|---------|----------|
| `InsufficientBalance` | Not enough USDC | Fund account or reduce amount |
| `InsufficientAllowance` | Treasury not approved | Call `usdc.approve()` |
| `Unauthorized` | Missing role | Grant required role |
| `PaymentExpired` | X402 payment expired | Create new signature |
| `InvalidSignature` | EIP-712 signature invalid | Check domain and types |
| `ContractPaused` | Treasury is paused | Wait for admin to unpause |
| `TrustTooLow` | Target trust score too low | Improve trust or reduce amount |

---

## Environment Variables

Required in your `.env`:

```bash
# Network
RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
CHAIN_ID=43113

# Contracts
TREASURY_CONTRACT_ADDRESS=0x79fa1E26938763Db1AD3d6d40bf79f3a23aE60dd
ASSET_ADDRESS=0x7435BB56D89Cf26A03fabaE6fA36b66295a2A676
MIXER_CONTRACT_ADDRESS=0xE05DC7789038C669652bF3BfE4Fb684b7F420fCD

# Wallet
PRIVATE_KEY=0x...
```

---

## Testing Integration

```typescript
import { expect } from "chai";

describe("Treasury Integration", () => {
  it("should execute payment", async () => {
    // Approve
    await usdc.approve(treasury.target, amount);

    // Get balances before
    const balanceBefore = await usdc.balanceOf(recipient);

    // Pay
    await treasury.pay(recipient, amount, resourceHash);

    // Check balance after (minus fee)
    const balanceAfter = await usdc.balanceOf(recipient);
    const fee = amount * 50n / 10000n; // 0.5% fee
    expect(balanceAfter - balanceBefore).to.equal(amount - fee);
  });
});
```

---

*Last Updated: 2026-01-28*
