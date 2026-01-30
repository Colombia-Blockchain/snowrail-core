# Agent Registration Guide

Complete guide for registering and managing AI agents with ERC-8004.

## Table of Contents

- [What is ERC-8004?](#what-is-erc-8004)
- [Quick Start](#quick-start)
- [Smart Contract Integration](#smart-contract-integration)
- [API Usage](#api-usage)
- [Trust Score System](#trust-score-system)
- [Best Practices](#best-practices)
- [Examples](#examples)

## What is ERC-8004?

ERC-8004 is SnowRail's standard for on-chain agent identity and reputation.

### Benefits

- **Verifiable Identity**: Agents have on-chain identities that can be verified
- **On-Chain Reputation**: Trust scores are stored on-chain and updated based on activity
- **Capability Matching**: Agents declare capabilities that can be queried
- **Budget Enforcement**: Spending limits are enforced at the contract level
- **Payment History**: All agent payments are recorded on-chain

### Key Features

| Feature | Description |
|---------|-------------|
| **Agent ID** | Unique identifier (bytes32) generated from name + owner |
| **Trust Score** | 0-100 score that increases with successful payments |
| **Capabilities** | String tags like "payment", "validation", "query" |
| **Budget Limits** | Max per-transaction and daily spending limits |
| **Verification** | Optional team verification for trusted agents |

## Quick Start

### 1. Generate Agent ID

The agent ID is a bytes32 hash of your agent name and owner address:

```typescript
import { ethers } from 'ethers';

const agentName = 'my-ai-agent';
const ownerAddress = '0x1234...'; // Your wallet address

// Generate agent ID
const agentId = ethers.id(agentName + ownerAddress);
console.log('Agent ID:', agentId);
// Output: 0xabc123...
```

### 2. Register Agent On-Chain

Connect to the AgentRegistry contract and register your agent:

```typescript
import { ethers } from 'ethers';

// Setup provider and signer
const provider = new ethers.JsonRpcProvider('https://api.avax-test.network/ext/bc/C/rpc');
const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

// Contract address (from deployments.json)
const registryAddress = '0x...'; // AgentRegistry contract address

// Contract ABI (import from artifacts)
import AgentRegistryABI from '../artifacts/contracts/AgentRegistry.sol/AgentRegistry.json';

// Create contract instance
const registry = new ethers.Contract(
  registryAddress,
  AgentRegistryABI.abi,
  signer
);

// Generate agent ID
const agentId = ethers.id('my-ai-agent' + signer.address);

// Register agent
const tx = await registry.registerAgent(
  agentId,
  'My AI Agent',                      // Name
  'ipfs://Qm...',                     // Metadata (IPFS hash)
  ethers.parseUnits('100', 6),        // Max transaction: 100 USDC
  ethers.parseUnits('1000', 6)        // Daily limit: 1000 USDC
);

await tx.wait();
console.log('Agent registered! TX:', tx.hash);
```

### 3. Add Capabilities

Declare what your agent can do:

```typescript
// Add capabilities one by one
await registry.addCapability(agentId, 'payment');
await registry.addCapability(agentId, 'validation');
await registry.addCapability(agentId, 'query');
await registry.addCapability(agentId, 'negotiate');

console.log('Capabilities added!');
```

### 4. Request Verification (Optional)

Get your agent verified by the SnowRail team for higher trust:

**Email**: team@snowrail.com

**Include**:
- Agent ID: `0xabc123...`
- Agent Name: `My AI Agent`
- Description: Brief description of what your agent does
- Use Case: How you'll use the agent
- GitHub/Website: (optional) Link to your project

Once verified, your agent will have the `verified` flag set to `true` on-chain.

## Smart Contract Integration

### Reading Agent Data

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IAgentRegistry {
    struct Agent {
        address owner;
        string name;
        string metadata;
        uint256 trustScore;
        uint256 paymentsCount;
        uint256 totalVolume;
        uint256 maxTransaction;
        uint256 dailyLimit;
        bool verified;
        bool active;
        uint256 registeredAt;
    }

    function getAgent(bytes32 agentId) external view returns (Agent memory);
    function hasCapability(bytes32 agentId, string calldata capability) external view returns (bool);
}

contract MyContract {
    IAgentRegistry public agentRegistry;

    constructor(address _registry) {
        agentRegistry = IAgentRegistry(_registry);
    }

    function checkAgent(bytes32 agentId) external view returns (bool) {
        IAgentRegistry.Agent memory agent = agentRegistry.getAgent(agentId);

        // Check if agent exists
        if (agent.owner == address(0)) return false;

        // Check if agent is active
        if (!agent.active) return false;

        // Check trust score
        if (agent.trustScore < 60) return false;

        // Check capabilities
        if (!agentRegistry.hasCapability(agentId, "payment")) return false;

        return true;
    }
}
```

### Treasury Integration

The Treasury contract can check agent permissions before executing payments:

```solidity
function executePayment(bytes32 agentId, uint256 amount) external {
    // Get agent info
    IAgentRegistry.Agent memory agent = agentRegistry.getAgent(agentId);

    // Validate agent
    require(agent.active, "Agent not active");
    require(agent.trustScore >= 60, "Trust score too low");
    require(amount <= agent.maxTransaction, "Exceeds max transaction");

    // Execute payment
    // ... payment logic ...

    // Record payment (updates stats and trust score)
    agentRegistry.recordPayment(agentId, amount);
}
```

## API Usage

SnowRail provides REST API endpoints for querying agent data.

### Get Agent Info

```bash
curl http://localhost:3000/v1/agents/agent-demo-001
```

**Response**:
```json
{
  "agent": {
    "agentId": "agent-demo-001",
    "owner": "0x1234567890123456789012345678901234567890",
    "capabilities": ["payment", "validation", "query"],
    "trustScore": 85,
    "budget": {
      "maxTransaction": 10000,
      "dailyLimit": 50000,
      "spent": 0
    },
    "metadata": {
      "name": "Demo Agent",
      "version": "1.0.0",
      "provider": "SnowRail",
      "verified": true,
      "active": true
    },
    "registeredAt": "2026-01-01T00:00:00.000Z",
    "lastActive": "2026-01-29T00:00:00.000Z"
  }
}
```

### Check Capabilities

```bash
curl -X POST http://localhost:3000/v1/agents/agent-demo-001/capabilities/verify \
  -H "Content-Type: application/json" \
  -d '{"required": ["payment", "validation"]}'
```

**Response**:
```json
{
  "agentId": "agent-demo-001",
  "required": ["payment", "validation"],
  "hasCapabilities": true
}
```

### Check Budget

```bash
curl -X POST http://localhost:3000/v1/agents/agent-demo-001/can-spend \
  -H "Content-Type: application/json" \
  -d '{"amount": 100}'
```

**Response**:
```json
{
  "agentId": "agent-demo-001",
  "amount": 100,
  "canSpend": true,
  "budget": {
    "maxTransaction": 10000,
    "dailyLimit": 50000,
    "spent": 0
  }
}
```

### Get Leaderboard

```bash
curl http://localhost:3000/v1/agents/leaderboard/top?limit=10
```

**Response**:
```json
{
  "leaderboard": [
    {
      "agentId": "agent-autonomous-002",
      "name": "Autonomous Trading Agent",
      "trustScore": 92,
      "paymentsCount": 150,
      "totalVolume": 15000,
      "verified": true,
      "active": true
    },
    {
      "agentId": "agent-demo-001",
      "name": "Demo Agent",
      "trustScore": 85,
      "paymentsCount": 100,
      "totalVolume": 10000,
      "verified": true,
      "active": true
    }
  ],
  "count": 2
}
```

## Trust Score System

Trust score is a number from 0 to 100 that represents agent reputation.

### How Trust Score Works

| Trust Score | Meaning | Payment Status |
|-------------|---------|----------------|
| 0-40 | **Very Low** | ⛔ Blocked |
| 41-59 | **Low** | ⚠️ Restricted |
| 60-79 | **Medium** | ✅ Allowed |
| 80-89 | **High** | ✅✅ Trusted |
| 90-100 | **Very High** | 🌟 Premium |

### Trust Score Increases

Trust score automatically increases based on:

1. **Successful Payments**: +1 point every 10 successful payments
2. **Manual Verification**: Team can manually adjust score
3. **Volume Processed**: Higher volume = higher trust
4. **Time Active**: Longer active time = higher trust

### Trust Score Decreases

Trust score can be manually decreased by verifiers for:

- Failed payments
- Suspicious activity
- Policy violations
- User reports

## Best Practices

### 1. Start Small

Begin with low limits and increase over time:

```typescript
// Initial registration - conservative limits
await registry.registerAgent(
  agentId,
  'My New Agent',
  'ipfs://...',
  ethers.parseUnits('10', 6),    // Max tx: $10
  ethers.parseUnits('100', 6)    // Daily: $100
);

// After building trust, increase limits (requires re-registration or upgrade mechanism)
```

### 2. Add Only Needed Capabilities

Don't add capabilities you don't use:

```typescript
// Good - only what's needed
await registry.addCapability(agentId, 'payment');
await registry.addCapability(agentId, 'validation');

// Bad - adding everything
await registry.addCapability(agentId, 'payment');
await registry.addCapability(agentId, 'validation');
await registry.addCapability(agentId, 'query');
await registry.addCapability(agentId, 'negotiate');
await registry.addCapability(agentId, 'admin'); // ⚠️ Dangerous if not needed
```

### 3. Monitor Your Budget

Track daily spending to avoid hitting limits:

```typescript
async function checkBudget(agentId: string) {
  const agent = await registry.getAgent(agentId);
  const spentPercentage = (agent.totalVolume / agent.dailyLimit) * 100;

  if (spentPercentage > 80) {
    console.warn(`⚠️ Warning: ${spentPercentage}% of daily budget used`);
  }
}
```

### 4. Get Verified

Verified agents get:
- Higher default trust
- Better visibility
- Premium features access
- Priority support

### 5. Keep Metadata Current

Update your IPFS metadata when things change:

```json
{
  "name": "My AI Agent",
  "version": "2.0.0",
  "description": "Automated payment processor",
  "provider": "MyCompany",
  "website": "https://mycompany.com",
  "contact": "agent@mycompany.com",
  "capabilities": {
    "payment": {
      "description": "Can execute USDC payments",
      "maxAmount": 100
    },
    "validation": {
      "description": "Can validate payment intents"
    }
  },
  "lastUpdated": "2026-01-29T00:00:00.000Z"
}
```

## Examples

### Complete Registration Flow

```typescript
import { ethers } from 'ethers';
import AgentRegistryABI from './artifacts/contracts/AgentRegistry.sol/AgentRegistry.json';

async function registerAndSetupAgent() {
  // 1. Setup
  const provider = new ethers.JsonRpcProvider('https://api.avax-test.network/ext/bc/C/rpc');
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const registryAddress = '0x...'; // From deployments.json

  const registry = new ethers.Contract(
    registryAddress,
    AgentRegistryABI.abi,
    signer
  );

  // 2. Generate agent ID
  const agentName = 'payment-bot-001';
  const agentId = ethers.id(agentName + signer.address);
  console.log('Agent ID:', agentId);

  // 3. Register agent
  console.log('Registering agent...');
  const registerTx = await registry.registerAgent(
    agentId,
    'Payment Bot 001',
    'ipfs://QmXyZ...', // Upload metadata to IPFS first
    ethers.parseUnits('100', 6),   // Max: $100 per tx
    ethers.parseUnits('1000', 6)   // Daily: $1000
  );
  await registerTx.wait();
  console.log('✅ Agent registered!');

  // 4. Add capabilities
  console.log('Adding capabilities...');
  const caps = ['payment', 'validation', 'query'];
  for (const cap of caps) {
    const tx = await registry.addCapability(agentId, cap);
    await tx.wait();
    console.log(`✅ Added capability: ${cap}`);
  }

  // 5. Verify agent info
  const agent = await registry.getAgent(agentId);
  console.log('\nAgent Info:');
  console.log('  Name:', agent.name);
  console.log('  Owner:', agent.owner);
  console.log('  Trust Score:', agent.trustScore.toString());
  console.log('  Max Transaction:', ethers.formatUnits(agent.maxTransaction, 6), 'USDC');
  console.log('  Daily Limit:', ethers.formatUnits(agent.dailyLimit, 6), 'USDC');
  console.log('  Verified:', agent.verified);
  console.log('  Active:', agent.active);

  console.log('\n🎉 Agent setup complete!');
  console.log('📧 Email team@snowrail.com to request verification');

  return agentId;
}

// Run
registerAndSetupAgent()
  .then((agentId) => console.log('\nAgent ID:', agentId))
  .catch(console.error);
```

### Checking Agent Before Payment

```typescript
async function canAgentPay(agentId: string, amount: number): Promise<boolean> {
  const agent = await registry.getAgent(agentId);

  // Check 1: Agent exists
  if (agent.owner === ethers.ZeroAddress) {
    console.log('❌ Agent does not exist');
    return false;
  }

  // Check 2: Agent is active
  if (!agent.active) {
    console.log('❌ Agent is not active');
    return false;
  }

  // Check 3: Trust score
  if (agent.trustScore < 60) {
    console.log('❌ Trust score too low:', agent.trustScore);
    return false;
  }

  // Check 4: Transaction limit
  const amountInUSDC = ethers.parseUnits(amount.toString(), 6);
  if (amountInUSDC > agent.maxTransaction) {
    console.log('❌ Amount exceeds max transaction');
    return false;
  }

  // Check 5: Daily limit (simplified)
  if (agent.totalVolume + amountInUSDC > agent.dailyLimit) {
    console.log('❌ Would exceed daily limit');
    return false;
  }

  // Check 6: Has payment capability
  const hasPaymentCap = await registry.hasCapability(agentId, 'payment');
  if (!hasPaymentCap) {
    console.log('❌ Agent lacks payment capability');
    return false;
  }

  console.log('✅ Agent can pay');
  return true;
}
```

## Next Steps

1. **Deploy Contract**: Run `pnpm contracts:deploy:agent-registry`
2. **Register Agent**: Use the quick start guide above
3. **Add Capabilities**: Declare what your agent can do
4. **Request Verification**: Email team@snowrail.com
5. **Start Building**: Integrate with SnowRail Treasury

## Support

- **GitHub**: [Issues](https://github.com/Colombia-Blockchain/SnowRail/issues)
- **Email**: team@snowrail.com
- **Docs**: [https://docs.snowrail.com](https://docs.snowrail.com)

---

Built with ❄️ by [Colombia Blockchain](https://github.com/Colombia-Blockchain)
