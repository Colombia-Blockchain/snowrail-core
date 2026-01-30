# SnowRail Contract Deployments

Deployment records for all SnowRail smart contracts on Avalanche networks.

## Fuji Testnet (Chain ID: 43113)

### Core Contracts

| Contract | Address | Verified | Deployed |
|----------|---------|----------|----------|
| **MockUSDC** | [`0x457aB3A4F4968163E72dda3c06aF938D9782F49A`](https://testnet.snowtrace.io/address/0x457aB3A4F4968163E72dda3c06aF938D9782F49A) | ✅ | - |
| **SnowRailTreasury** | [`0xbB647E31e26aDe9e2Df18Ed22c3c3A3b6802F50A`](https://testnet.snowtrace.io/address/0xbB647E31e26aDe9e2Df18Ed22c3c3A3b6802F50A) | ✅ | - |
| **SnowRailMixer** | [`0xDC6C82D7cda35205b591CB763549b8d1268318Cd`](https://testnet.snowtrace.io/address/0xDC6C82D7cda35205b591CB763549b8d1268318Cd) | ✅ | - |
| **AgentRegistry** | [`0xd955B511969317b98076c25F14481fabf1A6862D`](https://testnet.snowtrace.io/address/0xd955B511969317b98076c25F14481fabf1A6862D#code) | ✅ | 2026-01-29 |

### Deployment Details

#### AgentRegistry (ERC-8004)

**Latest Deployment**: January 29, 2026

- **Contract**: `contracts/AgentRegistry.sol`
- **Address**: `0xd955B511969317b98076c25F14481fabf1A6862D`
- **Deployer**: `0x22f6F000609d52A0b0efCD4349222cd9d70716Ba`
- **Network**: Avalanche Fuji Testnet (43113)
- **Verified**: ✅ Yes
- **Verification URL**: https://testnet.snowtrace.io/address/0xd955B511969317b98076c25F14481fabf1A6862D#code

**Constructor Arguments**:
- `admin`: `0x22f6F000609d52A0b0efCD4349222cd9d70716Ba`

**Roles**:
- `DEFAULT_ADMIN_ROLE`: `0x22f6F000609d52A0b0efCD4349222cd9d70716Ba`
- `VERIFIER_ROLE`: `0x22f6F000609d52A0b0efCD4349222cd9d70716Ba`

**Features**:
- ✅ Agent registration
- ✅ Capability management
- ✅ Trust score tracking (auto-increment)
- ✅ Budget enforcement (max tx + daily limit)
- ✅ Payment history tracking
- ✅ Admin verification system

**Verification Command**:
```bash
pnpm hardhat verify --network fuji \
  0xd955B511969317b98076c25F14481fabf1A6862D \
  0x22f6F000609d52A0b0efCD4349222cd9d70716Ba
```

**Deployment Command**:
```bash
pnpm contracts:deploy:agent-registry
```

---

## Environment Variables

Add these to your `.env` file:

```bash
# Network
CHAIN=avalanche-fuji
AVALANCHE_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc

# Contracts
ASSET_ADDRESS=0x457aB3A4F4968163E72dda3c06aF938D9782F49A
TREASURY_CONTRACT_ADDRESS=0xbB647E31e26aDe9e2Df18Ed22c3c3A3b6802F50A
MIXER_CONTRACT_ADDRESS=0xDC6C82D7cda35205b591CB763549b8d1268318Cd
AGENT_REGISTRY_ADDRESS=0xd955B511969317b98076c25F14481fabf1A6862D

# Admin
DEPLOYER_ADDRESS=0x22f6F000609d52A0b0efCD4349222cd9d70716Ba

# Explorer
EXPLORER_URL=https://testnet.snowtrace.io
```

---

## Mainnet (Chain ID: 43114)

> 🚧 Not deployed yet

---

## Deployment History

### AgentRegistry

| Version | Date | Network | Address | Notes |
|---------|------|---------|---------|-------|
| 1.0.0 | 2026-01-29 | Fuji | `0xd955B511969317b98076c25F14481fabf1A6862D` | Initial deployment with ERC-8004 support |

---

## Quick Links

- **Fuji Explorer**: https://testnet.snowtrace.io
- **Mainnet Explorer**: https://snowtrace.io
- **Fuji Faucet**: https://faucet.avax.network/

---

## Contract Interactions

### AgentRegistry

**Read Functions** (no gas):
```typescript
// Get agent info
const agent = await registry.getAgent(agentId);

// Check capability
const hasCap = await registry.hasCapability(agentId, 'payment');

// Get agents by owner
const agents = await registry.getAgentsByOwner(ownerAddress);

// Generate agent ID
const agentId = await registry.generateAgentId('my-agent', ownerAddress);
```

**Write Functions** (requires gas):
```typescript
// Register agent (anyone)
await registry.registerAgent(
  agentId,
  'Agent Name',
  'ipfs://metadata',
  ethers.parseUnits('100', 6),   // maxTx
  ethers.parseUnits('1000', 6)   // dailyLimit
);

// Add capability (owner only)
await registry.addCapability(agentId, 'payment');

// Verify agent (VERIFIER_ROLE only)
await registry.verifyAgent(agentId);

// Update trust score (VERIFIER_ROLE only)
await registry.updateTrustScore(agentId, 85);

// Record payment (anyone - typically Treasury contract)
await registry.recordPayment(agentId, ethers.parseUnits('50', 6));
```

---

*Last updated: January 29, 2026*
